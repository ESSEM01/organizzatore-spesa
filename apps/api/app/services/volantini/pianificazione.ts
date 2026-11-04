import { join } from 'node:path'
import { DateTime } from 'luxon'
import ControlloVolantini from '#models/controllo_volantini'
import { controllaVolantini, type Scaricatore } from '#services/volantini/controlla'
import { conRiconnessione, lettoreVolantini } from '#services/volantini/lettore'
import { importaOsservaprezzi, scaricaOsservaprezzi } from '#services/osservaprezzi/importa'
import { aggiornaNegoziRoma } from '#services/negozi/overpass'

/**
 * Controllo settimanale dei volantini (D15) con la rete vera: lo lancia GitHub Actions ogni lunedì (D20).
 */

const USER_AGENT = 'organizzatore-spesa/0.1 (controllo settimanale dei volantini, uso personale)'

/** Richieste identificate e con tempo massimo, una alla volta (D7). */
export const scaricatoreWeb: Scaricatore = {
  async testo(url) {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) throw new Error(`risposta ${r.status} da ${new URL(url).host}`)
    return r.text()
  },
  async pdf(url) {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    })
    if (!r.ok) throw new Error(`risposta ${r.status} da ${new URL(url).host}`)
    const pdf = Buffer.from(await r.arrayBuffer())
    if (!pdf.subarray(0, 5).toString().startsWith('%PDF')) {
      throw new Error(`${new URL(url).host} non ha restituito un PDF`)
    }
    return pdf
  },
}

/**
 * Esegue un controllo e lo registra in `controlli_volantini`. `radice` è la radice del progetto
 * (cartella `data/volantini`, esclusa da git).
 */
export async function eseguiControllo(
  chiave: string,
  radice: string,
  avviso?: (messaggio: string) => void
) {
  const ora = DateTime.now().setZone('Europe/Rome')
  const controllo = await conRiconnessione(() =>
    ControlloVolantini.create({ iniziatoIl: ora, esito: 'in_corso' })
  )
  try {
    const esito = await controllaVolantini({
      scarica: scaricatoreWeb,
      leggi: lettoreVolantini(chiave, join(radice, 'data/volantini/letture')),
      oggi: ora.toISODate()!,
      cartella: join(radice, 'data/volantini', ora.toISODate()!),
      riprova: (azione) => conRiconnessione(azione, avviso),
    })
    // I supermercati di Roma da OpenStreetMap (D17): una richiesta a settimana, gratis.
    try {
      await conRiconnessione(() => aggiornaNegoziRoma(avviso), avviso)
    } catch (e) {
      esito.errori.push(`Supermercati: ${e instanceof Error ? e.message : String(e)}`)
    }
    // Già che ci siamo, le medie mensili di Osservaprezzi (D16): gratis, un mese già importato si salta.
    try {
      const stime = await conRiconnessione(
        () => importaOsservaprezzi({ scarica: scaricaOsservaprezzi, sigla: 'RM' }),
        avviso
      )
      esito.errori.push(...stime.errori)
    } catch (e) {
      esito.errori.push(`Osservaprezzi: ${e instanceof Error ? e.message : String(e)}`)
    }
    controllo.merge({
      esito: 'ok',
      finitoIl: DateTime.now(),
      trovati: esito.trovati,
      nuovi: esito.nuovi,
      letti: esito.letti,
      offerte: esito.offerte,
      errori: esito.errori.length ? esito.errori.join('\n') : null,
    })
    await conRiconnessione(() => controllo.save())
    return esito
  } catch (e) {
    controllo.merge({
      esito: 'errore',
      finitoIl: DateTime.now(),
      errori: e instanceof Error ? e.message : String(e),
    })
    await conRiconnessione(() => controllo.save())
    throw e
  }
}
