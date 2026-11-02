/**
 * Supermercati vicini da OpenStreetMap (docs/decisioni.md, D1, D5, D7).
 * Funzioni pure: la rete (Overpass, Nominatim) sta nell'app, qui solo calcoli e conversioni.
 */

export interface Posizione {
  lat: number
  lon: number
}

export interface NegozioVicino {
  /** Es. `node/521790382`: identifica il negozio su OpenStreetMap. */
  osmId: string
  nome: string
  /** Codice della catena (es. `conad`), `null` per un negozio indipendente o non riconosciuto. */
  catena: string | null
  indirizzo: string | null
  comune: string | null
  lat: number
  lon: number
  distanzaMetri: number
}

const RAGGIO_TERRA_M = 6_371_000

/** D5: la posizione si arrotonda a 3 decimali (circa 100 m) prima di uscire dal telefono. */
export function arrotondaPosizione(p: Posizione, decimali = 3): Posizione {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) {
    throw new RangeError(`Le coordinate non sono valide: ${p.lat}, ${p.lon}`)
  }
  const f = 10 ** decimali
  return { lat: Math.round(p.lat * f) / f, lon: Math.round(p.lon * f) / f }
}

/** Distanza in linea d'aria (formula dell'emisenoverso). */
export function distanzaMetri(a: Posizione, b: Posizione): number {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * RAGGIO_TERRA_M * Math.asin(Math.sqrt(x))
}

/** Riconoscimento della catena dal nome normalizzato. L'ordine conta: i nomi più specifici prima. */
const CATENE: [codice: string, regola: RegExp][] = [
  ['conad', /conad/], // anche "Cityconad", scritto attaccato su OSM
  ['todis', /\btodis\b/],
  ['tuodi', /\btuodi\b/],
  ['carrefour', /\bcarrefour\b/],
  ['elite', /^elite\b|\bsuper elite\b/],
  ['pam', /\bpam\b|\bpanorama\b/],
  ['ins', /\bins\b/],
  ['coop', /\bcoop\b/],
  ['naturasi', /\bnaturasi\b/],
  ['penny', /\bpenny\b/],
  ['tigre', /\btigre\b/],
  ['crai', /\bcrai\b/],
  ['pewex', /\bpewex\b/],
  ['sacoph', /\bsacoph\b/],
  ['castoro', /\bcastoro\b/],
  ['ma', /^ma\b/],
  ['lidl', /\blidl\b/],
  ['eurospin', /\beurospin\b/],
  ['md', /^md\b/],
  ['aldi', /\baldi\b/],
  ['esselunga', /\besselunga\b/],
  ['despar', /\b(de|euro|inter)?spar\b/],
  ['sigma', /\bsigma\b/],
]

function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function catenaDaOsm(tag: { brand?: string; name?: string }): string | null {
  for (const testo of [tag.brand, tag.name]) {
    if (!testo) continue
    const n = normalizza(testo)
    const trovata = CATENE.find(([, regola]) => regola.test(n))
    if (trovata) return trovata[0]
  }
  return null
}

/** `IT-RM` → `RM`. Nominatim restituisce la provincia come `ISO3166-2-lvl6`. */
export function provinciaDaIso(codice: string | undefined): string | null {
  const m = /^IT-([A-Z]{2})$/.exec(codice ?? '')
  return m?.[1] ?? null
}

function indirizzo(via: string | undefined, civico: string | undefined): string | null {
  if (!via) return null
  return civico ? `${via} ${civico}` : via
}

function ordinaPerDistanza(negozi: NegozioVicino[]): NegozioVicino[] {
  return negozi.sort((a, b) => a.distanzaMetri - b.distanzaMetri)
}

const NOME_PREDEFINITO = 'Supermercato senza nome'

interface ElementoOverpass {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

/** Converte la risposta JSON di Overpass (`out center tags`). */
export function negoziDaOverpass(risposta: { elements?: ElementoOverpass[] }, origine: Posizione): NegozioVicino[] {
  const negozi: NegozioVicino[] = []
  for (const e of risposta.elements ?? []) {
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat === undefined || lon === undefined || e.type === undefined || e.id === undefined) continue
    const tag = e.tags ?? {}
    negozi.push({
      osmId: `${e.type}/${e.id}`,
      nome: tag.name ?? tag.brand ?? NOME_PREDEFINITO,
      catena: catenaDaOsm({ ...(tag.brand && { brand: tag.brand }), ...(tag.name && { name: tag.name }) }),
      indirizzo: indirizzo(tag['addr:street'], tag['addr:housenumber']),
      comune: tag['addr:city'] ?? null,
      lat,
      lon,
      distanzaMetri: distanzaMetri(origine, { lat, lon }),
    })
  }
  return ordinaPerDistanza(negozi)
}

interface RisultatoNominatim {
  osm_type?: string
  osm_id?: number
  lat?: string
  lon?: string
  name?: string
  extratags?: Record<string, string>
  address?: Record<string, string>
}

/** Ripiego quando Overpass non risponde: ricerca `supermarket` di Nominatim. */
export function negoziDaNominatim(risultati: RisultatoNominatim[], origine: Posizione): NegozioVicino[] {
  const negozi: NegozioVicino[] = []
  for (const r of risultati) {
    const lat = Number(r.lat)
    const lon = Number(r.lon)
    if (!r.osm_type || r.osm_id === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const brand = r.extratags?.brand
    const a = r.address ?? {}
    negozi.push({
      osmId: `${r.osm_type}/${r.osm_id}`,
      nome: r.name || brand || NOME_PREDEFINITO,
      catena: catenaDaOsm({ ...(brand && { brand }), ...(r.name && { name: r.name }) }),
      indirizzo: indirizzo(a.road, a.house_number),
      comune: a.city ?? a.town ?? a.village ?? null,
      lat,
      lon,
      distanzaMetri: distanzaMetri(origine, { lat, lon }),
    })
  }
  return ordinaPerDistanza(negozi)
}
