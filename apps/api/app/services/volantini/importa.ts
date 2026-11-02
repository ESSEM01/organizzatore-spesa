import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Catena from '#models/catena'
import Offerta from '#models/offerta'
import RichiestaLlm from '#models/richiesta_llm'
import Volantino from '#models/volantino'
import { metadatiDaNomeFile } from '#services/volantini/metadati'
import { OffertaLetta, type VolantinoLetto } from '#services/volantini/schema'

/** Esito di una lettura: lo produce il modello vero (lettore_claude.ts) o un finto nei test. */
export interface LetturaVolantino {
  esito: 'ok' | 'rifiuto' | 'errore'
  modello: string
  stopReason: string | null
  usage: { input: number; output: number; cacheLettura: number }
  dati: VolantinoLetto | null
  errore?: string
}

export type LettoreVolantino = (
  pdf: Buffer,
  contesto: { catena: string; titolo: string }
) => Promise<LetturaVolantino>

export interface EsitoImportazione {
  file: string
  stato: 'letto' | 'gia_letto' | 'errore'
  offerte: number
  scartate: number
  errore?: string
}

const DATA = /^\d{4}-\d{2}-\d{2}$/

function dataValida(valore: string | null | undefined): string | null {
  return valore && DATA.test(valore) && DateTime.fromISO(valore).isValid ? valore : null
}

/**
 * Legge un volantino con il modello e salva le offerte come proposte (D7).
 * Le date del nome del file prevalgono su quelle lette; le offerte non valide si scartano, mai si correggono.
 */
export async function importaVolantino(
  nomeFile: string,
  pdf: Buffer,
  leggi: LettoreVolantino
): Promise<EsitoImportazione> {
  const meta = metadatiDaNomeFile(nomeFile)
  const hash = createHash('sha256').update(pdf).digest('hex')

  const esistente = await Volantino.findBy('hashContenuto', hash)
  if (esistente?.stato === 'letto') {
    return { file: nomeFile, stato: 'gia_letto', offerte: 0, scartate: 0 }
  }

  const catena = await Catena.findByOrFail('codice', meta.catena)
  const volantino =
    esistente ??
    (await Volantino.create({
      catenaId: catena.id,
      titolo: meta.titolo,
      ambito: meta.ambito,
      regione: meta.regione,
      file: nomeFile,
      hashContenuto: hash,
      stato: 'da_leggere',
    }))

  const lettura = await leggi(pdf, { catena: catena.nome, titolo: meta.titolo })
  const richiesta = await RichiestaLlm.create({
    userId: null,
    scopo: 'volantino',
    modello: lettura.modello,
    tokenInput: lettura.usage.input,
    tokenOutput: lettura.usage.output,
    tokenCacheLettura: lettura.usage.cacheLettura,
    stopReason: lettura.stopReason,
    esito: lettura.esito,
  })

  const dal = meta.validoDal ?? dataValida(lettura.dati?.valido_dal)
  const al = meta.validoAl ?? dataValida(lettura.dati?.valido_al)

  if (lettura.esito !== 'ok' || !lettura.dati || !dal || !al) {
    const errore =
      lettura.errore ??
      (lettura.esito === 'rifiuto'
        ? `Il modello ha rifiutato la lettura (${lettura.stopReason})`
        : 'Validità del volantino non trovata')
    volantino.merge({ stato: 'errore', errore, richiestaLlmId: richiesta.id })
    await volantino.save()
    return { file: nomeFile, stato: 'errore', offerte: 0, scartate: 0, errore }
  }

  const valide = lettura.dati.offerte.filter(
    (o) =>
      OffertaLetta.safeParse(o).success &&
      o.nome.trim() !== '' &&
      o.prezzo_centesimi >= 0 &&
      (o.prezzo_pieno_centesimi === null || o.prezzo_pieno_centesimi >= 0)
  )

  await db.transaction(async (trx) => {
    volantino.useTransaction(trx)
    volantino.merge({
      stato: 'letto',
      errore: null,
      validoDal: DateTime.fromISO(dal),
      validoAl: DateTime.fromISO(al),
      lettoIl: DateTime.now(),
      richiestaLlmId: richiesta.id,
    })
    await volantino.save()
    await Offerta.createMany(
      valide.map((o) => ({
        volantinoId: volantino.id,
        catenaId: catena.id,
        nome: o.nome.trim(),
        marca: o.marca,
        formato: o.formato,
        quantita: o.quantita,
        unita: o.unita,
        categoria: o.categoria,
        centesimi: o.prezzo_centesimi,
        prezzoPienoCentesimi: o.prezzo_pieno_centesimi,
        condizione: o.condizione,
        pagina: o.pagina,
        validoDal: DateTime.fromISO(dal),
        validoAl: DateTime.fromISO(al),
        stato: 'proposta',
      })),
      { client: trx }
    )
  })

  return {
    file: nomeFile,
    stato: 'letto',
    offerte: valide.length,
    scartate: lettura.dati.offerte.length - valide.length,
  }
}
