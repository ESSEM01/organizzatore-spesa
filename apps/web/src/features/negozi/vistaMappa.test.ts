import { describe, expect, it } from 'vitest'
import { limitiMappa, serveNuovaRicerca } from './vistaMappa'

// Posizioni di esempio.
const centro = { lat: 41.852, lon: 12.492 }

describe('limitiMappa', () => {
  it('senza negozi restituisce null: la mappa resta centrata sulla ricerca', () => {
    expect(limitiMappa(centro, [])).toBeNull()
  })

  it('comprende il centro della ricerca e tutti i negozi', () => {
    const negozi = [
      { lat: 41.86, lon: 12.48 },
      { lat: 41.845, lon: 12.5 },
    ]

    expect(limitiMappa(centro, negozi)).toEqual([
      [41.845, 12.48],
      [41.86, 12.5],
    ])
  })
})

describe('serveNuovaRicerca', () => {
  it('non propone una nuova ricerca per piccoli spostamenti della mappa', () => {
    expect(serveNuovaRicerca(centro, { lat: 41.853, lon: 12.492 }, 2000)).toBe(false)
  })

  it('la propone quando il centro si sposta oltre un quarto del raggio', () => {
    // 0,005° di latitudine ≈ 556 m, più di 500 m (un quarto di 2 km).
    expect(serveNuovaRicerca(centro, { lat: 41.857, lon: 12.492 }, 2000)).toBe(true)
  })

  it('senza una ricerca precedente non propone nulla', () => {
    expect(serveNuovaRicerca(null, centro, 2000)).toBe(false)
  })
})
