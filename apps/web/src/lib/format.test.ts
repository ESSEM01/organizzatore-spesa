import { describe, expect, it } from 'vitest'
import { formatDistanza, formatEuro } from './format'

// Intl usa spazi non separabili tra cifra e simbolo: si normalizzano per confrontare.
const normalizza = (s: string) => s.replace(/\s/g, ' ')

describe('formatEuro', () => {
  it('formatta i centesimi come euro italiani', () => {
    expect(normalizza(formatEuro(1234))).toBe('12,34 €')
  })

  it('formatta lo zero', () => {
    expect(normalizza(formatEuro(0))).toBe('0,00 €')
  })

  it('usa il separatore delle migliaia', () => {
    expect(normalizza(formatEuro(123456))).toBe('1.234,56 €')
  })
})

describe('formatDistanza', () => {
  it('sotto il chilometro mostra i metri, arrotondati a 10', () => {
    expect(formatDistanza(0)).toBe('0 m')
    expect(formatDistanza(154)).toBe('150 m')
    expect(formatDistanza(995)).toBe('1,0 km')
  })

  it('da un chilometro in su mostra i km con un decimale', () => {
    expect(normalizza(formatDistanza(1234))).toBe('1,2 km')
    expect(normalizza(formatDistanza(12_340))).toBe('12,3 km')
  })
})
