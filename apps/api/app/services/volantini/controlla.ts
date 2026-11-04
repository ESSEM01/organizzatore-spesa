import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Volantino from '#models/volantino'
import {
  elencoMyego,
  linkVolantiniConad,
  pdfMyego,
  pdfTodis,
  volantinoConad,
} from '#services/volantini/fonti'
import {
  improntaDaSalvare,
  leggiImpronta,
  SOGLIA_DOPPIONE,
  somiglianza,
} from '#services/volantini/impronta'
import { importaVolantino, type LettoreVolantino } from '#services/volantini/importa'
import { metadatiDaNomeFile } from '#services/volantini/metadati'
import Catena from '#models/catena'
import { richiediBudgetModello, TettoSuperato } from '#services/costi_llm'

/** Accesso alla rete, finto nei test. */
export interface Scaricatore {
  testo(url: string): Promise<string>
  pdf(url: string): Promise<Buffer>
}

/** Fonti con PDF scaricabile dal sito della catena (D7). Coop e NaturaSì restano manuali (D15). */
export type Fonte = 'gros' | 'elite' | 'todis' | 'conad'
export const FONTI: Fonte[] = ['gros', 'elite', 'todis', 'conad']

/** Insegne del gruppo GROS: slug della pagina → prefisso del nome del file (metadati.ts). */
const INSEGNE_GROS: Record<string, string> = {
  'ma': 'gros-ma',
  'pewex': 'gros-pewex',
  'sacoph': 'gros-sacoph',
  'il-castoro': 'gros-il-castoro',
}

/**
 * Negozio Conad di riferimento per i volantini del Lazio (cooperativa PAC 2000A): quello di
 * Viale delle Accademie, nella zona dell'utente (D7).
 */
const NEGOZIO_CONAD =
  'https://www.conad.it/ricerca-negozi/conad-via-attilio-ambrosini-183-00147-roma--006571'

interface Candidato {
  prefisso: string
  titolo: string
  pdf: string
  validoDal: string | null
  validoAl: string | null
}

const scaduto = (validoAl: string | null, oggi: string) => validoAl !== null && validoAl < oggi

/** Volantini pubblicati da una fonte; quelli già scaduti non si aprono nemmeno. */
async function candidati(
  fonte: Fonte,
  s: Scaricatore,
  oggi: string,
  errori: string[]
): Promise<{ trovati: number; validi: Candidato[] }> {
  switch (fonte) {
    case 'gros':
    case 'elite': {
      const base = fonte === 'gros' ? 'https://www.cedigros.com' : 'https://superelite.it'
      const elenco = elencoMyego(
        await s.testo(`${base}/promozioni`),
        base,
        fonte === 'gros' ? Object.keys(INSEGNE_GROS) : null
      )
      const validi: Candidato[] = []
      for (const v of elenco) {
        if (scaduto(v.validoAl, oggi)) continue
        const pdf = pdfMyego(await s.testo(v.pagina), base)
        if (!pdf) {
          errori.push(`${fonte}: nessun link al PDF in ${v.pagina}`)
          continue
        }
        validi.push({
          prefisso: fonte === 'gros' ? INSEGNE_GROS[v.chiave] : 'elite',
          titolo: v.titolo,
          pdf,
          validoDal: v.validoDal,
          validoAl: v.validoAl,
        })
      }
      return { trovati: elenco.length, validi }
    }
    case 'todis': {
      const validi = pdfTodis(await s.testo('https://www.todis.it/volantini/lazio/')).map(
        (pdf): Candidato => ({
          prefisso: 'todis-lazio',
          titolo: 'Volantino',
          pdf,
          validoDal: null,
          validoAl: null,
        })
      )
      return { trovati: validi.length, validi }
    }
    case 'conad': {
      // I cataloghi (ceste regalo, prodotti a marchio) non sono offerte: non si aprono né si pagano.
      const pagine = linkVolantiniConad(
        await s.testo(NEGOZIO_CONAD),
        'https://www.conad.it'
      ).filter((p) => !/catalogo|mdd/i.test(p))
      const validi: Candidato[] = []
      for (const pagina of pagine) {
        const v = volantinoConad(await s.testo(pagina))
        if (!v) {
          errori.push(`conad: PDF non scaricabile o dati mancanti in ${pagina}`)
          continue
        }
        if (!scaduto(v.validoAl, oggi)) validi.push({ prefisso: 'conad-lazio', ...v })
      }
      return { trovati: pagine.length, validi }
    }
  }
}

/** "PREZZI TONDI 1€ e 2€" → "prezzi-tondi-1-e-2". */
function slug(testo: string): string {
  return (
    testo
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'volantino'
  )
}

/** Nome del file nel formato letto da metadatiDaNomeFile: le date, se note, alla fine. */
function nomeFile(c: Candidato): string {
  const date = c.validoDal && c.validoAl ? `-${c.validoDal}_${c.validoAl}` : ''
  return `${c.prefisso}-${slug(c.titolo)}${date}.pdf`
}

export interface OpzioniControllo {
  scarica: Scaricatore
  leggi: LettoreVolantino
  /** Data di oggi, AAAA-MM-GG: i volantini già scaduti non si scaricano. */
  oggi: string
  /** Cartella in cui salvare i PDF scaricati. */
  cartella: string
  fonti?: Fonte[]
  /** Tetto ai volantini letti in un controllo, per limitare il costo (circa $1 a volantino). */
  massimo?: number
  /** Ripete un salvataggio se cade la connessione al database (Turso). */
  riprova?: <T>(azione: () => Promise<T>) => Promise<T>
}

export interface EsitoControllo {
  trovati: number
  nuovi: number
  letti: number
  /** Volantini nuovi per indirizzo ma con le stesse immagini di uno già letto: non si leggono. */
  doppioni: number
  offerte: number
  errori: string[]
}

/** Un volantino ancora valido della stessa catena con quasi tutte le stesse immagini. */
async function doppione(nome: string, impronte: string | null, oggi: string) {
  if (!impronte) return null
  const catena = await Catena.findBy('codice', metadatiDaNomeFile(nome).catena)
  if (!catena) return null
  const letti = await Volantino.query()
    .where('catenaId', catena.id)
    .where('stato', 'letto')
    .whereNotNull('impronte')
    .where((q) => q.whereNull('validoAl').orWhere('validoAl', '>=', oggi))
  return (
    letti.find(
      (v) => somiglianza(leggiImpronta(v.impronte), leggiImpronta(impronte)) >= SOGLIA_DOPPIONE
    ) ?? null
  )
}

/**
 * Controllo dei volantini pubblicati (D15): per ogni fonte elenca i volantini, salta quelli scaduti
 * o già letti (stesso indirizzo del PDF), scarica i nuovi e li legge con il modello.
 * Gli errori di una fonte o di un volantino si raccolgono senza fermare gli altri.
 */
export async function controllaVolantini({
  scarica,
  leggi,
  oggi,
  cartella,
  fonti = FONTI,
  massimo = 15,
  riprova = (azione) => azione(),
}: OpzioniControllo): Promise<EsitoControllo> {
  const esito: EsitoControllo = {
    trovati: 0,
    nuovi: 0,
    letti: 0,
    doppioni: 0,
    offerte: 0,
    errori: [],
  }
  const daLeggere: Candidato[] = []

  for (const fonte of fonti) {
    try {
      const { trovati, validi } = await candidati(fonte, scarica, oggi, esito.errori)
      if (trovati === 0) {
        esito.errori.push(`${fonte}: nessun volantino trovato, la pagina potrebbe essere cambiata`)
      }
      esito.trovati += trovati
      for (const c of validi) {
        const giaVisto = await riprova(() =>
          Volantino.query().where('urlFonte', c.pdf).where('stato', 'letto').first()
        )
        if (!giaVisto) daLeggere.push(c)
      }
    } catch (e) {
      esito.errori.push(`${fonte}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  esito.nuovi = daLeggere.length
  if (daLeggere.length > massimo) {
    esito.errori.push(
      `${daLeggere.length} volantini nuovi, ne leggo al massimo ${massimo}: gli altri al prossimo controllo`
    )
  }

  await mkdir(cartella, { recursive: true })
  for (const c of daLeggere.slice(0, massimo)) {
    const nome = nomeFile(c)
    // Tetto mensile di spesa del modello: i volantini rimasti si leggeranno al controllo successivo.
    const tetto = await riprova(() => richiediBudgetModello()).catch((e: unknown) => e)
    if (tetto instanceof TettoSuperato) {
      esito.errori.push(tetto.message)
      break
    }
    try {
      const pdf = await scarica.pdf(c.pdf)
      // Stesso volantino sotto un altro indirizzo (es. Elite "Prezzi tondi"): non si ripaga.
      const impronte = await improntaDaSalvare(pdf)
      const gia = await riprova(() => doppione(nome, impronte, oggi))
      if (gia) {
        esito.doppioni++
        continue
      }
      await writeFile(join(cartella, nome), pdf)
      const r = await riprova(() => importaVolantino(nome, pdf, leggi, { urlFonte: c.pdf }))
      if (r.stato === 'errore') {
        esito.errori.push(`${nome}: ${r.errore}`)
      } else if (r.stato === 'letto') {
        esito.letti++
        esito.offerte += r.offerte
      }
    } catch (e) {
      esito.errori.push(`${nome}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return esito
}
