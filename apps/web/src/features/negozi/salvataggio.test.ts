import { describe, expect, it } from 'vitest'
import type { NegozioVicino } from '@spesa/domain'
import { datiPerSalvare } from './salvataggio'

// Negozio di esempio come lo restituisce la ricerca OSM.
const negozio: NegozioVicino = {
  osmId: 'node/521790382',
  nome: 'Conad',
  catena: 'conad',
  indirizzo: 'Via Tito 13/15',
  comune: null,
  lat: 41.8544841,
  lon: 12.4869757,
  distanzaMetri: 499,
}

describe('datiPerSalvare', () => {
  it('prepara i dati per l’API, senza la distanza dalla posizione dell’utente (D5)', () => {
    expect(datiPerSalvare(negozio, { comune: 'Roma', provincia: 'RM' })).toEqual({
      osmId: 'node/521790382',
      nome: 'Conad',
      catena: 'conad',
      indirizzo: 'Via Tito 13/15',
      comune: 'Roma',
      provincia: 'RM',
      lat: 41.8544841,
      lon: 12.4869757,
    })
  })

  it('preferisce il comune indicato su OSM per il negozio', () => {
    expect(datiPerSalvare({ ...negozio, comune: 'Fiumicino' }, { comune: 'Roma', provincia: 'RM' }).comune).toBe(
      'Fiumicino',
    )
  })

  it('senza provincia non si può salvare e lo dice', () => {
    expect(() => datiPerSalvare(negozio, { comune: 'Roma', provincia: null })).toThrow(/provincia/)
    expect(() => datiPerSalvare(negozio, null)).toThrow(/provincia/)
  })
})
