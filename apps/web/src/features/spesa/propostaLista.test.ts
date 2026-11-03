import { describe, expect, it } from 'vitest'
import { scegliDaProposta, vociDaSalvare, type Proposta } from './propostaLista'

// Proposta di esempio con la forma della risposta di POST /api/v1/liste/proposta.
const voce = (codice: number, nome: string, centesimi: number, fonte: 'offerta' | 'stima', offertaId: number | null) => ({
  codice,
  nome,
  grammi: 1000,
  priorita: 1 as const,
  confezioni: fonte === 'offerta' ? 2 : null,
  centesimi,
  scelta: { nome: `${nome} (scelta)`, centesimi: centesimi / 2, grammiConfezione: 500, fonte, offertaId },
})

const proposta: Proposta = {
  periodo: { id: 7, dal: '2026-11-02', al: '2026-11-08' },
  budgetCentesimi: 5000,
  persone: 2,
  giorni: 6,
  nota: 'Esempio',
  piano: [],
  nutrizione: { alGiorno: { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0 }, quoteEnergia: { proteine: 0, carboidrati: 0, grassi: 0 }, copertura: 1 },
  negozi: [
    {
      negozioId: 1,
      nome: 'Lontano',
      catena: 'conad',
      indirizzo: null,
      lat: 41.9,
      lon: 12.5,
      lista: { voci: [voce(9810, 'Pasta', 400, 'offerta', 11)], mancanti: [], totaleCentesimi: 400, tolte: [], sforamentoCentesimi: 0 },
    },
    {
      negozioId: 2,
      nome: 'Vicino',
      catena: 'todis',
      indirizzo: null,
      lat: 41.851,
      lon: 12.49,
      lista: { voci: [voce(9810, 'Pasta', 450, 'stima', null)], mancanti: [], totaleCentesimi: 450, tolte: [], sforamentoCentesimi: 0 },
    },
  ],
}

describe('scegliDaProposta', () => {
  it('con la posizione pesa anche la distanza (sul telefono)', () => {
    const s = scegliDaProposta(proposta, { lat: 41.85, lon: 12.49 })

    // Lontano: 4,00 € + ~5,6 km × 1,50 €; Vicino: 4,50 € + 0,1 km: vince il vicino.
    expect(s.scelto?.negozioId).toBe(2)
    expect(s.classifica[1]?.distanzaMetri).toBeGreaterThan(5000)
  })

  it('senza posizione sceglie solo per totale', () => {
    expect(scegliDaProposta(proposta, null).scelto?.negozioId).toBe(1)
  })
})

describe('vociDaSalvare', () => {
  it('trasforma le voci del negozio scelto nel formato da salvare', () => {
    expect(vociDaSalvare(proposta.negozi[0]!)).toEqual([
      { nome: 'Pasta (scelta)', grammi: 1000, confezioni: 2, centesimi: 400, offertaId: 11 },
    ])
    expect(vociDaSalvare(proposta.negozi[1]!)).toEqual([
      { nome: 'Pasta', grammi: 1000, confezioni: null, centesimi: 450, offertaId: null },
    ])
  })
})
