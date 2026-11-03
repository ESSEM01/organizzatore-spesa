import { describe, expect, it } from 'vitest'
import { alimentoDaNome, valoriPerQuantita, type Abbinamento } from './nutrizione.js'

// Abbinamenti di esempio con la forma di apps/api/database/data/alimenti_it.csv.
const abbinamenti: Abbinamento[] = [
  { nome: 'Pasta di semola', parole: ['pasta', 'spaghetti', 'penne'], codice: 9810 },
  { nome: 'Pasta integrale', parole: ['pasta integrale', 'spaghetti integrali'], codice: 9870 },
  { nome: 'Petto di pollo', parole: ['petto di pollo', 'fesa di pollo'], codice: 36017 },
  { nome: 'Pollo intero', parole: ['pollo'], codice: 36016 },
  { nome: 'Latte parzialmente scremato', parole: ['latte'], codice: 19042 },
  { nome: "Succo d'arancia", parole: ["succo d'arancia"], codice: 2070 },
]

describe('alimentoDaNome', () => {
  it('riconosce il nome del volantino, senza badare a maiuscole e accenti', () => {
    expect(alimentoDaNome('SPAGHETTI N.5', abbinamenti)?.codice).toBe(9810)
    expect(alimentoDaNome('Petto di Pollo a fette', abbinamenti)?.codice).toBe(36017)
  })

  it('vince la corrispondenza più lunga', () => {
    expect(alimentoDaNome('Pasta integrale fusilli', abbinamenti)?.codice).toBe(9870)
    expect(alimentoDaNome('Fesa di pollo', abbinamenti)?.codice).toBe(36017)
    expect(alimentoDaNome('Pollo allo spiedo', abbinamenti)?.codice).toBe(36016)
  })

  it('a parità di parole vince quella che viene prima nel nome', () => {
    const conPesche: Abbinamento[] = [...abbinamenti, { nome: 'Pesche', parole: ['pesche'], codice: 13195 }]

    // Osservaprezzi: "Pesche Pasta Gialla" sono pesche, non pasta (trovato il 2026-11-03).
    expect(alimentoDaNome('Pesche Pasta Gialla (1000 Gr)', conPesche)?.codice).toBe(13195)
    expect(alimentoDaNome('Pasta con pesche', conPesche)?.codice).toBe(9810)
  })

  it('confronta parole intere: "lattuga" non è latte', () => {
    expect(alimentoDaNome('Lattuga iceberg', abbinamenti)).toBeNull()
  })

  it('gestisce gli apostrofi', () => {
    expect(alimentoDaNome("Succo d'arancia 100%", abbinamenti)?.codice).toBe(2070)
    expect(alimentoDaNome('Succo d’arancia', abbinamenti)?.codice).toBe(2070)
  })

  it('senza corrispondenza restituisce null, mai un alimento a caso', () => {
    expect(alimentoDaNome('Detersivo piatti', abbinamenti)).toBeNull()
  })
})

describe('valoriPerQuantita', () => {
  it('riporta i valori per 100 g alla quantità della confezione', () => {
    const per100 = { kcal: 336, proteine: 12.5, carboidrati: 70, grassi: 1.5, fibre: 3, zuccheri: 3.5, saturi: 0.3, sale: 0.01 }

    expect(valoriPerQuantita(per100, 500)).toEqual({
      kcal: 1680,
      proteine: 62.5,
      carboidrati: 350,
      grassi: 7.5,
      fibre: 15,
      zuccheri: 17.5,
      saturi: 1.5,
      sale: 0.05,
    })
  })

  it('un valore mancante resta mancante', () => {
    const per100 = { kcal: 100, proteine: null, carboidrati: 10, grassi: 1, fibre: null, zuccheri: null, saturi: null, sale: null }

    expect(valoriPerQuantita(per100, 200).proteine).toBeNull()
  })
})
