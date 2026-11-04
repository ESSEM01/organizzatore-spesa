import { arrotondaPosizione, type Posizione } from '@spesa/domain'

/**
 * Da OpenStreetMap resta solo Nominatim per trasformare città o CAP scritti dall'utente in una
 * posizione. I supermercati vengono dal nostro archivio di Roma, aggiornato ogni settimana (D17):
 * la ricerca dal vivo su Overpass è stata tolta il 2026-11-04 (piano di riordino, fase 1).
 * Nominatim chiede al massimo 1 richiesta al secondo: si usa solo quando l'utente cerca.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const TIMEOUT_MS = 8_000

type Fetch = typeof fetch

/** Comune e provincia di un negozio: servono a collegarlo alle stime Osservaprezzi (D1). */
export interface Localita {
  comune: string | null
  provincia: string | null
}

/** Alternativa al GPS: città o CAP scritti dall'utente. */
export async function posizioneDaTesto(testo: string, f: Fetch = fetch): Promise<Posizione | null> {
  const parametri = new URLSearchParams({ q: testo, format: 'jsonv2', limit: '1', countrycodes: 'it' })
  const r = await f(`${NOMINATIM}/search?${parametri}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  const json = (await r.json()) as { lat?: string; lon?: string }[]
  const primo = json[0]
  if (!primo?.lat || !primo.lon) return null
  return arrotondaPosizione({ lat: Number(primo.lat), lon: Number(primo.lon) })
}
