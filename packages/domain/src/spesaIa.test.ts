import { describe, expect, it } from 'vitest'
import {
  prezzaPiano,
  riduciAlBudget,
  riepilogoNutrizionale,
  scegliNegozio,
  type OpzioneAcquisto,
  type VocePiano,
} from './spesaIa.js'

// Piani, offerte e stime di esempio, non dati reali.
const pasta: VocePiano = { codice: 9810, nome: 'Pasta di semola', grammi: 1200, priorita: 1 }
const pollo: VocePiano = { codice: 36017, nome: 'Petto di pollo', grammi: 800, priorita: 2 }
const fragole: VocePiano = { codice: 13014, nome: 'Fragole', grammi: 500, priorita: 3 }

const offerta = (nome: string, centesimi: number, grammiConfezione: number, offertaId = 1): OpzioneAcquisto => ({
  nome,
  centesimi,
  grammiConfezione,
  fonte: 'offerta',
  offertaId,
})
const stima = (nome: string, centesimiAlKg: number): OpzioneAcquisto => ({
  nome,
  centesimi: centesimiAlKg,
  grammiConfezione: 1000,
  fonte: 'stima',
  offertaId: null,
})

describe('prezzaPiano', () => {
  it('compra confezioni intere dell’offerta più conveniente per la quantità chiesta', () => {
    const opzioni = new Map([
      [9810, [offerta('Spaghetti 500 g', 79, 500, 1), offerta('Penne 1 kg', 149, 1000, 2)]],
    ])

    const lista = prezzaPiano([pasta], (c) => opzioni.get(c) ?? [])

    // 1200 g: 3 × 500 g = 237 cent; 2 × 1 kg = 298 cent → vince lo spaghetto.
    expect(lista.voci[0]).toMatchObject({ confezioni: 3, centesimi: 237, scelta: { offertaId: 1 } })
    expect(lista.totaleCentesimi).toBe(237)
  })

  it('con la stima Osservaprezzi paga i grammi chiesti al prezzo medio al kg', () => {
    const lista = prezzaPiano([pollo], () => [stima('Petto di pollo (1000 Gr)', 1649)])

    expect(lista.voci[0]).toMatchObject({ confezioni: null, centesimi: 1319, scelta: { fonte: 'stima' } })
  })

  it('un alimento senza prezzo resta fuori dal totale e si segnala', () => {
    const lista = prezzaPiano([pasta, fragole], (c) => (c === 9810 ? [offerta('Pasta 1 kg', 100, 1000)] : []))

    expect(lista.mancanti.map((v) => v.nome)).toEqual(['Fragole'])
    expect(lista.totaleCentesimi).toBe(200)
  })
})

describe('riduciAlBudget', () => {
  const opzioni = new Map<number, OpzioneAcquisto[]>([
    [9810, [offerta('Pasta 1 kg', 100, 1000)]],
    [36017, [offerta('Pollo 400 g', 400, 400)]],
    [13014, [offerta('Fragole 250 g', 250, 250)]],
  ])
  const lista = prezzaPiano([pasta, pollo, fragole], (c) => opzioni.get(c) ?? [])
  // pasta 200 + pollo 800 + fragole 500 = 1500

  it('dentro il budget non cambia nulla', () => {
    expect(riduciAlBudget(lista, 2000)).toMatchObject({ totaleCentesimi: 1500, tolte: [], sforamentoCentesimi: 0 })
  })

  it('toglie prima le voci meno importanti, finché rientra', () => {
    const ridotta = riduciAlBudget(lista, 1100)

    expect(ridotta.tolte.map((v) => v.nome)).toEqual(['Fragole'])
    expect(ridotta.totaleCentesimi).toBe(1000)
  })

  it('non toglie mai l’essenziale: se non basta, dichiara lo sforamento', () => {
    const ridotta = riduciAlBudget(lista, 100)

    expect(ridotta.voci.map((v) => v.nome)).toEqual(['Pasta di semola'])
    expect(ridotta.sforamentoCentesimi).toBe(100)
  })
})

describe('scegliNegozio', () => {
  const a = { negozioId: 1, totaleCentesimi: 4000, distanzaMetri: 3000, mancanti: 0 }
  const b = { negozioId: 2, totaleCentesimi: 4200, distanzaMetri: 500, mancanti: 0 }
  const c = { negozioId: 3, totaleCentesimi: 6000, distanzaMetri: 100, mancanti: 0 }

  it('nel budget vince il costo effettivo più basso: totale più km per costo al km', () => {
    // a: 40,00 + 3 km × 1,50 = 44,50; b: 42,00 + 0,5 × 1,50 = 42,75; c è fuori budget.
    const scelta = scegliNegozio([a, b, c], 5000, 150)

    expect(scelta.scelto?.negozioId).toBe(2)
    expect(scelta.nelBudget).toBe(true)
    expect(scelta.classifica.map((x) => x.negozioId)).toEqual([2, 1, 3])
  })

  it('se tutti sforano vince quello che sfora di meno, e lo dice', () => {
    const scelta = scegliNegozio([a, b], 3500, 150)

    expect(scelta.scelto?.negozioId).toBe(1)
    expect(scelta.nelBudget).toBe(false)
  })

  it('a parità vince il più vicino', () => {
    const scelta = scegliNegozio([{ ...a, distanzaMetri: 1000 }, { ...a, negozioId: 9, distanzaMetri: 1000 }], 5000, 0)

    expect(scelta.scelto?.negozioId).toBe(1)
  })

  it('senza candidati non sceglie nulla', () => {
    expect(scegliNegozio([], 5000, 150).scelto).toBeNull()
  })
})

describe('riepilogoNutrizionale', () => {
  const per100 = (kcal: number, proteine: number, carboidrati: number, grassi: number, fibre: number) => ({
    kcal,
    proteine,
    carboidrati,
    grassi,
    fibre,
    zuccheri: null,
    saturi: null,
    sale: null,
  })

  it('riporta i valori a persona e al giorno, con le quote di energia', () => {
    const r = riepilogoNutrizionale(
      [
        { grammi: 1400, per100: per100(350, 12, 70, 1.5, 3) },
        { grammi: 700, per100: per100(110, 23, 0, 1.5, 0) },
      ],
      1,
      7,
    )

    // 1400 g pasta = 4900 kcal, 700 g pollo = 770 kcal → 810 kcal al giorno.
    expect(r.alGiorno.kcal).toBe(810)
    expect(r.quoteEnergia.carboidrati).toBeGreaterThan(0.45)
    expect(r.copertura).toBe(1)
  })

  it('segnala gli alimenti senza valori invece di contarli zero', () => {
    const r = riepilogoNutrizionale(
      [
        { grammi: 1000, per100: per100(100, 5, 10, 2, 1) },
        { grammi: 1000, per100: null },
      ],
      2,
      7,
    )

    expect(r.copertura).toBe(0.5)
  })
})
