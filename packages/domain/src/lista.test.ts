import { describe, expect, it } from 'vitest'
import { totaleLista } from './lista.js'
import type { PrezzoRisolto } from './prezzi.js'

// I dati qui sotto sono di esempio, non prezzi reali.
function risolto(centesimi: number, fonte: PrezzoRisolto['fonte'] = 'utente'): PrezzoRisolto {
  return { centesimi, fonte, data: '2026-10-30', giorniEta: 3, vecchio: false, altroNegozio: false }
}

describe('totaleLista', () => {
  it('una lista vuota costa zero e non ha prodotti senza prezzo', () => {
    expect(totaleLista([], () => null)).toEqual({ totaleCentesimi: 0, senzaPrezzo: [], stimati: [] })
  })

  it('somma prezzo per quantità di ogni voce', () => {
    const prezzi: Record<string, PrezzoRisolto> = { pasta: risolto(89), latte: risolto(145) }

    const esito = totaleLista(
      [
        { prodottoId: 'pasta', quantita: 3 },
        { prodottoId: 'latte', quantita: 2 },
      ],
      (id) => prezzi[id] ?? null,
    )

    expect(esito.totaleCentesimi).toBe(3 * 89 + 2 * 145)
  })

  it('lascia fuori dal totale i prodotti senza prezzo e li elenca', () => {
    const esito = totaleLista(
      [
        { prodottoId: 'pasta', quantita: 1 },
        { prodottoId: 'detersivo', quantita: 1 },
      ],
      (id) => (id === 'pasta' ? risolto(89) : null),
    )

    expect(esito).toEqual({ totaleCentesimi: 89, senzaPrezzo: ['detersivo'], stimati: [] })
  })

  it('include nel totale i prezzi stimati ma li elenca a parte', () => {
    const esito = totaleLista([{ prodottoId: 'mele', quantita: 2 }], () => risolto(250, 'stima'))

    expect(esito).toEqual({ totaleCentesimi: 500, senzaPrezzo: [], stimati: ['mele'] })
  })

  it('rifiuta quantità non intere o non positive', () => {
    expect(() => totaleLista([{ prodottoId: 'pasta', quantita: 0 }], () => risolto(89))).toThrow(/quantità/)
    expect(() => totaleLista([{ prodottoId: 'pasta', quantita: 1.5 }], () => risolto(89))).toThrow(/quantità/)
  })
})
