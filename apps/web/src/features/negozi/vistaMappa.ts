import { distanzaMetri, type Posizione } from '@spesa/domain'

/**
 * Tile raster di OpenStreetMap: consentite per la consultazione interattiva, con attribuzione
 * visibile e senza scaricamento anticipato né uso offline (policy OSMF, verificata il 2026-11-02).
 * Per questo il service worker non le mette in cache. L'indirizzo è configurabile per poter
 * passare a un altro fornitore senza toccare il codice.
 */
export const TILE_URL: string =
  import.meta.env.VITE_MAPPA_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const ATTRIBUZIONE =
  '© <a href="https://www.openstreetmap.org/copyright">contributori OpenStreetMap</a> · <a href="https://www.openstreetmap.org/fixthemap">segnala un errore</a>'

type Limiti = [[number, number], [number, number]]

/** Riquadro che comprende il centro della ricerca e tutti i negozi, oppure `null` se non ce ne sono. */
export function limitiMappa(centro: Posizione, negozi: readonly Posizione[]): Limiti | null {
  if (negozi.length === 0) return null
  const punti = [centro, ...negozi]
  const lat = punti.map((p) => p.lat)
  const lon = punti.map((p) => p.lon)
  return [
    [Math.min(...lat), Math.min(...lon)],
    [Math.max(...lat), Math.max(...lon)],
  ]
}

/** Propone "Cerca in quest'area" solo quando la mappa si è spostata più di un quarto del raggio. */
export function serveNuovaRicerca(centroRicerca: Posizione | null, centroMappa: Posizione, raggioMetri: number): boolean {
  if (!centroRicerca) return false
  return distanzaMetri(centroRicerca, centroMappa) > raggioMetri / 4
}
