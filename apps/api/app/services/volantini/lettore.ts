import Anthropic from '@anthropic-ai/sdk'
import db from '@adonisjs/lucid/services/db'
import { aBlocchi } from '#services/volantini/blocchi'
import { conCache } from '#services/volantini/cache'
import { creaLettoreClaude } from '#services/volantini/lettore_claude'

/**
 * Lettore usato davvero: a blocchi di 8 pagine, ogni blocco in cache su disco (esclusa da git),
 * così se un blocco o il salvataggio nel database falliscono i blocchi già pagati non si ripagano.
 */
export function lettoreVolantini(chiave: string, cartellaCache: string) {
  return aBlocchi(conCache(creaLettoreClaude(new Anthropic({ apiKey: chiave })), cartellaCache), 8)
}

const connessioneCaduta = (e: unknown) =>
  e instanceof Error &&
  /ECONNRESET|Stream is closed|socket hang up|ETIMEDOUT|ENOTFOUND|terminated/.test(e.message)

/**
 * Turso chiude le connessioni rimaste ferme durante letture lunghe: se il salvataggio trova la
 * connessione caduta se ne apre una nuova e si riprova una volta (la lettura è in cache, non si
 * ripaga). Non si chiude nulla in anticipo: nel server altre richieste usano le stesse connessioni.
 */
export async function conRiconnessione<T>(
  azione: () => Promise<T>,
  avviso?: (messaggio: string) => void
): Promise<T> {
  try {
    return await azione()
  } catch (e) {
    if (!connessioneCaduta(e)) throw e
    avviso?.('connessione al database caduta, riprovo')
    await db.manager.closeAll()
    return azione()
  }
}
