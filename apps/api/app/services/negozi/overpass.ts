import { importaNegozi, type EsitoImportazioneNegozi } from '#services/negozi/importa'

/** Server pubblici di Overpass, provati in ordine (gli stessi della PWA, D10). */
const SERVER_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Comune di Roma, identificato dal codice ISTAT per non confonderlo con altri luoghi chiamati "Roma".
 * Stessi tipi di negozio della ricerca nella PWA: supermercati e discount.
 */
const QUERY_ROMA = `[out:json][timeout:120];
area["boundary"="administrative"]["ref:ISTAT"="058091"]->.roma;
nwr(area.roma)[shop~"^(supermarket|discount)$"];
out center tags;`

/**
 * Scarica da OpenStreetMap tutti i supermercati di Roma e li salva nel database (D17): una sola
 * richiesta pesante a settimana al posto di una richiesta lenta a ogni ricerca dell'utente.
 * Dati © OpenStreetMap contributors (ODbL): l'app ne mostra l'attribuzione.
 */
export async function aggiornaNegoziRoma(
  avviso: (messaggio: string) => void = () => {}
): Promise<EsitoImportazioneNegozi> {
  const errori: string[] = []
  for (const server of SERVER_OVERPASS) {
    const host = new URL(server).host
    try {
      const r = await fetch(server, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'organizzatore-spesa/0.1 (supermercati di Roma, una volta a settimana)',
        },
        body: `data=${encodeURIComponent(QUERY_ROMA)}`,
        signal: AbortSignal.timeout(150_000),
      })
      if (!r.ok) throw new Error(`risposta ${r.status}`)
      const json = (await r.json()) as Parameters<typeof importaNegozi>[0]
      if (!Array.isArray(json?.elements)) throw new Error('risposta senza elementi')
      return await importaNegozi(json, { catene: null, comune: 'Roma', provincia: 'RM' })
    } catch (e) {
      const messaggio = `${host}: ${e instanceof Error ? e.message : String(e)}`
      errori.push(messaggio)
      avviso(`${messaggio}, provo il successivo`)
    }
  }
  throw new Error(`Nessun server Overpass ha risposto (${errori.join('; ')})`)
}
