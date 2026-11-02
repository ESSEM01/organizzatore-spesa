import { describe, expect, it } from 'vitest'
import { periodoDi, riepilogoBudget } from './budget.js'

describe('periodoDi', () => {
  it('la settimana va da lunedì a domenica', () => {
    // 2026-11-02 è un lunedì; 2026-11-05 un giovedì; 2026-11-08 una domenica.
    expect(periodoDi('settimana', '2026-11-02')).toEqual({ dal: '2026-11-02', al: '2026-11-08' })
    expect(periodoDi('settimana', '2026-11-05')).toEqual({ dal: '2026-11-02', al: '2026-11-08' })
    expect(periodoDi('settimana', '2026-11-08')).toEqual({ dal: '2026-11-02', al: '2026-11-08' })
  })

  it('una settimana può attraversare mesi e anni', () => {
    // 2026-12-31 è un giovedì.
    expect(periodoDi('settimana', '2026-12-31')).toEqual({ dal: '2026-12-28', al: '2027-01-03' })
  })

  it('il mese va dal primo all’ultimo giorno, anche a febbraio', () => {
    expect(periodoDi('mese', '2026-11-17')).toEqual({ dal: '2026-11-01', al: '2026-11-30' })
    expect(periodoDi('mese', '2028-02-10')).toEqual({ dal: '2028-02-01', al: '2028-02-29' })
  })
})

describe('riepilogoBudget', () => {
  it('somma le liste del periodo e calcola quanto resta', () => {
    expect(riepilogoBudget(20_000, [4_230, 1_500])).toEqual({
      budgetCentesimi: 20_000,
      previstoCentesimi: 5_730,
      residuoCentesimi: 14_270,
      sforamentoCentesimi: 0,
    })
  })

  it('senza liste resta tutto il budget', () => {
    expect(riepilogoBudget(15_000, [])).toMatchObject({ previstoCentesimi: 0, residuoCentesimi: 15_000 })
  })

  it('quando si supera il budget lo dice con lo sforamento, il residuo non va sotto zero', () => {
    expect(riepilogoBudget(10_000, [8_000, 3_500])).toEqual({
      budgetCentesimi: 10_000,
      previstoCentesimi: 11_500,
      residuoCentesimi: 0,
      sforamentoCentesimi: 1_500,
    })
  })

  it('rifiuta importi non interi o negativi', () => {
    expect(() => riepilogoBudget(-1, [])).toThrow(/budget/)
    expect(() => riepilogoBudget(100, [1.5])).toThrow(/totale/)
  })
})
