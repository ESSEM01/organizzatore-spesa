import { describe, expect, it } from 'vitest'
import { etichettaCatena } from './catene'

describe('etichettaCatena', () => {
  it('non ripete la catena quando il nome del negozio la contiene già', () => {
    expect(etichettaCatena('Conad City', 'conad')).toBeNull()
    expect(etichettaCatena("In's Mercato", 'ins')).toBeNull()
  })

  it('mostra la catena quando il nome non la dice', () => {
    expect(etichettaCatena('Cityconad', 'conad')).toBe('Conad')
    expect(etichettaCatena('Castoro Supermercati', 'castoro')).toBe('Il Castoro')
  })

  it('segnala i negozi indipendenti', () => {
    expect(etichettaCatena('Supermercato Navigatori', null)).toBe('Negozio indipendente')
  })
})
