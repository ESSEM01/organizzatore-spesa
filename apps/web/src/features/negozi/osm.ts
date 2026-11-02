import {
  arrotondaPosizione,
  negoziDaNominatim,
  negoziDaOverpass,
  provinciaDaIso,
  type NegozioVicino,
  type Posizione,
} from '@spesa/domain'

/**
 * Chiamate dirette dal telefono a OpenStreetMap: le coordinate non passano dal nostro backend (D5)
 * e partono sempre arrotondate a circa 100 m. Overpass accetta richieste dal browser (CORS).
 * I server pubblici a volte sono sovraccarichi (verificato il 2026-11-02): si provano in ordine,
 * poi si ripiega su Nominatim, che ha un limite di uso di 1 richiesta al secondo.
 */
export const SERVER_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const

const NOMINATIM = 'https://nominatim.openstreetmap.org'
// Per server: con tre server lenti l'attesa massima resta sotto il mezzo minuto.
const TIMEOUT_MS = 8_000

type Fetch = typeof fetch

export interface EsitoRicerca {
  negozi: NegozioVicino[]
  fonte: 'overpass' | 'nominatim'
}

function queryOverpass(p: Posizione, raggioMetri: number): string {
  return `[out:json][timeout:25];nwr(around:${raggioMetri},${p.lat},${p.lon})[shop~"^(supermarket|discount)$"];out center tags;`
}

async function daOverpass(p: Posizione, raggioMetri: number, f: Fetch): Promise<NegozioVicino[] | null> {
  for (const server of SERVER_OVERPASS) {
    try {
      const r = await f(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(queryOverpass(p, raggioMetri))}`,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!r.ok) continue
      const json: unknown = await r.json()
      if (json && typeof json === 'object' && Array.isArray((json as { elements?: unknown }).elements)) {
        return negoziDaOverpass(json as Parameters<typeof negoziDaOverpass>[0], p)
      }
    } catch {
      // Server irraggiungibile o lento: si prova il successivo.
    }
  }
  return null
}

async function daNominatim(p: Posizione, raggioMetri: number, f: Fetch): Promise<NegozioVicino[] | null> {
  const dLat = raggioMetri / 111_320
  const dLon = raggioMetri / (111_320 * Math.cos((p.lat * Math.PI) / 180))
  const parametri = new URLSearchParams({
    q: 'supermarket',
    format: 'jsonv2',
    limit: '50',
    bounded: '1',
    addressdetails: '1',
    extratags: '1',
    viewbox: [p.lon - dLon, p.lat + dLat, p.lon + dLon, p.lat - dLat].map((n) => n.toFixed(5)).join(','),
  })
  try {
    const r = await f(`${NOMINATIM}/search?${parametri}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) return null
    const json: unknown = await r.json()
    if (!Array.isArray(json)) return null
    // Il riquadro di Nominatim è un quadrato: si tengono solo i negozi dentro il cerchio richiesto.
    return negoziDaNominatim(json, p).filter((n) => n.distanzaMetri <= raggioMetri)
  } catch {
    return null
  }
}

export async function cercaNegoziVicini(posizione: Posizione, raggioMetri: number, f: Fetch = fetch): Promise<EsitoRicerca> {
  const p = arrotondaPosizione(posizione)
  const overpass = await daOverpass(p, raggioMetri, f)
  if (overpass) return { negozi: overpass, fonte: 'overpass' }
  const nominatim = await daNominatim(p, raggioMetri, f)
  if (nominatim) return { negozi: nominatim, fonte: 'nominatim' }
  throw new Error('Non riesco a raggiungere il servizio dei supermercati. Riprova tra qualche minuto.')
}

export interface Localita {
  comune: string | null
  provincia: string | null
}

/** Comune e provincia (per le stime Osservaprezzi, D1) dalla posizione arrotondata. */
export async function localitaDaPosizione(posizione: Posizione, f: Fetch = fetch): Promise<Localita> {
  const p = arrotondaPosizione(posizione)
  const r = await f(`${NOMINATIM}/reverse?lat=${p.lat}&lon=${p.lon}&format=jsonv2&zoom=10`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const json = (await r.json()) as { address?: Record<string, string> }
  const a = json.address ?? {}
  return { comune: a.city ?? a.town ?? a.village ?? null, provincia: provinciaDaIso(a['ISO3166-2-lvl6']) }
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

