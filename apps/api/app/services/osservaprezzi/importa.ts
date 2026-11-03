import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import ImportOsservaprezzi from '#models/import_osservaprezzi'
import StimaOsservaprezzi from '#models/stima_osservaprezzi'
import { leggiPaginaOsservaprezzi } from '#services/osservaprezzi/pagina'

/** Tipologie della pagina: alimentari, ortofrutta, ittici, cura della persona e della casa. */
export const TIPOLOGIE = ['altri_alim', 'orto', 'ittici', 'groc'] as const
type Tipologia = (typeof TIPOLOGIE)[number]

/** Sigla → nome usato da Osservaprezzi nel filtro della provincia. Per ora solo Roma (D14). */
const PROVINCE: Record<string, string> = { RM: 'Roma' }

export const PAGINA_OSSERVAPREZZI =
  'https://osservaprezzi.mise.gov.it/prezzi/livelli/beni-e-servizi-di-largo-consumo/archivio-rilevazioni-beni-e-servizi-di-largo-consumo'

/** Scarica la pagina con i parametri GET dati; finto nei test. */
export type ScaricaPagina = (parametri: Record<string, string>) => Promise<string>

export interface EsitoOsservaprezzi {
  anno: number | null
  mese: number | null
  /** Righe salvate in questa importazione (0 se il mese era già importato). */
  righe: number
  errori: string[]
}

/**
 * Importa le medie mensili di una provincia (D1, D16). Senza anno e mese prende il più recente
 * pubblicato. Ogni tipologia già importata con successo si salta; se il sito risponde con un'altra
 * selezione (provincia o mese non riconosciuti) non si salva nulla per quella tipologia.
 */
export async function importaOsservaprezzi({
  scarica,
  sigla,
  anno,
  mese,
}: {
  scarica: ScaricaPagina
  sigla: string
  anno?: number
  mese?: number
}): Promise<EsitoOsservaprezzi> {
  const provincia = PROVINCE[sigla]
  if (!provincia) throw new Error(`Provincia non gestita: ${sigla}`)
  const esito: EsitoOsservaprezzi = { anno: anno ?? null, mese: mese ?? null, righe: 0, errori: [] }
  const parametri = (t: Tipologia): Record<string, string> => ({
    ...(esito.anno && esito.mese && { ANNO: String(esito.anno), MESE: String(esito.mese) }),
    'f[PROVINCIA]': provincia,
    'f[TIPO_RECORD_MISE]': t,
  })

  // Senza mese indicato: la pagina mostra il più recente, che si legge dai filtri selezionati.
  let primaPagina: string | null = null
  if (!esito.anno || !esito.mese) {
    primaPagina = await scarica(parametri(TIPOLOGIE[0]))
    const { selezione } = leggiPaginaOsservaprezzi(primaPagina)
    esito.anno = selezione.anno
    esito.mese = selezione.mese
    if (!esito.anno || !esito.mese) {
      esito.errori.push('Osservaprezzi: non riesco a capire qual è il mese più recente')
      return esito
    }
  }

  for (const tipologia of TIPOLOGIE) {
    const gia = await ImportOsservaprezzi.query()
      .where({ provincia: sigla, anno: esito.anno, mese: esito.mese, tipologia, esito: 'ok' })
      .first()
    if (gia) continue

    try {
      const html =
        tipologia === TIPOLOGIE[0] && primaPagina
          ? primaPagina
          : await scarica(parametri(tipologia))
      const { selezione, righe } = leggiPaginaOsservaprezzi(html)
      if (
        selezione.provincia !== provincia ||
        selezione.anno !== esito.anno ||
        selezione.mese !== esito.mese
      ) {
        throw new Error(
          `il sito ha risposto con ${selezione.provincia ?? '?'} ${selezione.mese ?? '?'}/${selezione.anno ?? '?'}`
        )
      }

      await db.transaction(async (trx) => {
        await StimaOsservaprezzi.updateOrCreateMany(
          ['voce', 'provincia', 'anno', 'mese'],
          righe.map((r) => ({
            voce: r.voce,
            tipologia,
            quantita: r.quantita,
            unita: r.unita,
            provincia: sigla,
            anno: esito.anno!,
            mese: esito.mese!,
            minCentesimi: r.minCentesimi,
            medioCentesimi: r.medioCentesimi,
            maxCentesimi: r.maxCentesimi,
          })),
          { client: trx }
        )
        await ImportOsservaprezzi.updateOrCreate(
          { provincia: sigla, anno: esito.anno!, mese: esito.mese!, tipologia },
          { righe: righe.length, esito: 'ok', errore: null, eseguitoIl: DateTime.now() },
          { client: trx }
        )
      })
      esito.righe += righe.length
    } catch (e) {
      const messaggio = e instanceof Error ? e.message : String(e)
      esito.errori.push(`Osservaprezzi ${tipologia}: ${messaggio}`)
      await ImportOsservaprezzi.updateOrCreate(
        { provincia: sigla, anno: esito.anno, mese: esito.mese, tipologia },
        { righe: 0, esito: 'errore', errore: messaggio, eseguitoIl: DateTime.now() }
      )
    }
  }
  return esito
}

/** Scaricatore vero: GET identificato, una pagina alla volta. */
export const scaricaOsservaprezzi: ScaricaPagina = async (parametri) => {
  const r = await fetch(`${PAGINA_OSSERVAPREZZI}?${new URLSearchParams(parametri)}`, {
    headers: {
      'User-Agent': 'organizzatore-spesa/0.1 (medie mensili Osservaprezzi, uso personale)',
    },
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`Osservaprezzi: risposta ${r.status}`)
  return r.text()
}
