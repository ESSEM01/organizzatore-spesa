import { describe, expect, it } from 'vitest'
import { formatEuro } from './format'

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
