import { describe, expect, it } from 'vitest'
import type { NegozioVicino } from '@spesa/domain'
import { copreArea, descriviVolantini, negoziEntroRaggio, unisciRisultati, type Catalogo } from './catalogo'

// Negozi e volantini di esempio, non dati reali.
const catalogo: Catalogo = {
  negozi: [
    { osmId: 'node/1', nome: 'Conad', catena: 'conad', indirizzo: 'Via A 1', comune: 'Roma', provincia: 'RM', lat: 41.85, lon: 12.49 },
    { osmId: 'node/2', nome: 'Todis', catena: 'todis', indirizzo: null, comune: 'Roma', provincia: 'RM', lat: 41.9, lon: 12.49 },
    { osmId: 'node/3', nome: 'Esempio', catena: null, indirizzo: null, comune: 'Roma', provincia: 'RM', lat: 41.8, lon: 12.6 },
    { osmId: 'node/4', nome: 'Esempio', catena: null, indirizzo: null, comune: 'Roma', provincia: 'RM', lat: 41.95, lon: 12.35 },
  ],
  volantini: {
    conad: {
      offerte: 290,
      volantini: [
        { titolo: 'Convenienza', validoDal: '2026-10-28', validoAl: '2026-11-04' },
        { titolo: 'Sottocosto', validoDal: '2026-11-05', validoAl: '2026-11-14' },
      ],
    },
  },
}

const vicino = (osmId: string, distanzaMetri: number): NegozioVicino => ({
  osmId,
  nome: 'Esempio',
  catena: null,
  indirizzo: null,
  comune: null,
  lat: 41.85,
  lon: 12.49,
  distanzaMetri,
})

describe('catalogo dei negozi', () => {
  it('tiene solo i negozi entro il raggio, con la distanza calcolata sul telefono', () => {
    const vicini = negoziEntroRaggio(catalogo, { lat: 41.851, lon: 12.49 }, 1000)

    expect(vicini.map((n) => n.osmId)).toEqual(['node/1'])
    expect(vicini[0]?.distanzaMetri).toBeCloseTo(111, 0)
  })

  it('copre la zona dei negozi salvati, non quella fuori', () => {
    expect(copreArea(catalogo, { lat: 41.87, lon: 12.49 })).toBe(true)
    // Fiumicino, fuori dal comune di Roma salvato: serve OpenStreetMap.
    expect(copreArea(catalogo, { lat: 41.77, lon: 12.24 })).toBe(false)
    expect(copreArea({ negozi: [], volantini: {} }, { lat: 41.87, lon: 12.49 })).toBe(false)
  })

  it('unisce archivio e OpenStreetMap senza doppioni, in ordine di distanza', () => {
    const uniti = unisciRisultati([vicino('node/1', 300)], [vicino('node/9', 100), vicino('node/1', 300)])

    expect(uniti.map((n) => n.osmId)).toEqual(['node/9', 'node/1'])
  })

  it('descrive i volantini validi della catena con le offerte e l’ultima scadenza', () => {
    expect(descriviVolantini(catalogo, 'conad')).toBe('2 volantini · 290 offerte · fino al 14 nov')
    expect(descriviVolantini(catalogo, 'todis')).toBeNull()
    expect(descriviVolantini(catalogo, null)).toBeNull()
  })
})
