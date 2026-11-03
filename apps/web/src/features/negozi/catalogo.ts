import { distanzaMetri, type NegozioVicino, type Posizione } from '@spesa/domain'
import { creaApi, type Api } from '../../lib/api'

/**
 * Catalogo dei supermercati salvati nel database (D14) con i volantini validi per catena (D16).
 * Si scarica intero e le distanze si calcolano qui: la posizione non lascia il telefono (D5).
 */
export interface NegozioCatalogo {
  osmId: string
  nome: string
  catena: string | null
  indirizzo: string | null
  comune: string | null
  lat: number
  lon: number
}

export interface VolantiniCatena {
  offerte: number
  volantini: { titolo: string; validoDal: string | null; validoAl: string | null }[]
}

export interface Catalogo {
  negozi: NegozioCatalogo[]
  volantini: Record<string, VolantiniCatena>
}

let inArrivo: Promise<Catalogo> | null = null

/** Una sola richiesta per sessione dell'app; se fallisce si riprova alla ricerca successiva. */
export function scaricaCatalogo(api: Api = creaApi()): Promise<Catalogo> {
  inArrivo ??= api.richiesta<Catalogo>('GET', '/negozi').catch((e: unknown) => {
    inArrivo = null
    throw e
  })
  return inArrivo
}

export function negoziEntroRaggio(c: Catalogo, centro: Posizione, raggioMetri: number): NegozioVicino[] {
  return c.negozi
    .map((n) => ({ ...n, distanzaMetri: distanzaMetri(centro, n) }))
    .filter((n) => n.distanzaMetri <= raggioMetri)
    .sort((a, b) => a.distanzaMetri - b.distanzaMetri)
}

/** Risultati dell'archivio e di OpenStreetMap insieme, una volta per negozio. */
export function unisciRisultati(archivio: NegozioVicino[], osm: NegozioVicino[]): NegozioVicino[] {
  const perId = new Map<string, NegozioVicino>()
  for (const n of [...osm, ...archivio]) if (!perId.has(n.osmId)) perId.set(n.osmId, n)
  return [...perId.values()].sort((a, b) => a.distanzaMetri - b.distanzaMetri)
}

const giornoMese = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** "2 volantini · 290 offerte · fino al 14 nov", oppure null se la catena non ha volantini validi. */
export function descriviVolantini(c: Catalogo, catena: string | null): string | null {
  const v = catena ? c.volantini[catena] : undefined
  if (!v || v.volantini.length === 0) return null
  const scadenze = v.volantini.map((x) => x.validoAl).filter((d): d is string => d !== null).sort()
  const ultima = scadenze.at(-1)
  return [
    v.volantini.length === 1 ? '1 volantino' : `${v.volantini.length} volantini`,
    `${new Intl.NumberFormat('it-IT').format(v.offerte)} offerte`,
    ultima ? `fino al ${giornoMese.format(new Date(`${ultima}T00:00:00Z`)).replace('.', '')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
