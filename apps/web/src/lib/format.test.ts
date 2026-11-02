import { describe, expect, it } from 'vitest'
import { formatDistanza, formatEuro, leggiEuro, oggiLocale } from './format'

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

describe('leggiEuro', () => {
  it('legge importi scritti all’italiana e restituisce centesimi interi', () => {
    expect(leggiEuro('1,29')).toBe(129)
    expect(leggiEuro('2')).toBe(200)
    expect(leggiEuro('1,2')).toBe(120)
    expect(leggiEuro(' 1.234,50 € ')).toBe(123_450)
  })

  it('accetta anche il punto come separatore decimale', () => {
    expect(leggiEuro('3.49')).toBe(349)
  })

  it('restituisce null per testi non validi, negativi o con troppi decimali', () => {
    expect(leggiEuro('')).toBeNull()
    expect(leggiEuro('abc')).toBeNull()
    expect(leggiEuro('-1')).toBeNull()
    expect(leggiEuro('1,299')).toBeNull()
  })
})

describe('oggiLocale', () => {
  it('usa la data del telefono, non quella UTC', () => {
    // 1:30 del 3 novembre in un fuso a est di UTC: in UTC è ancora il 2.
    const d = new Date(2026, 10, 3, 1, 30)
    expect(oggiLocale(d)).toBe('2026-11-03')
  })
})
