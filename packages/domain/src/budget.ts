import type { DataIso } from './prezzi.js'

/** Budget per periodo (D9): le liste del periodo lo consumano. */
export type TipoPeriodo = 'settimana' | 'mese'

export interface Periodo {
  dal: DataIso
  al: DataIso
}

export interface RiepilogoBudget {
  budgetCentesimi: number
  /** Somma dei totali delle liste del periodo (prezzi noti o stimati). */
  previstoCentesimi: number
  /** Quanto resta, mai sotto zero. */
  residuoCentesimi: number
  /** Quanto si supera il budget: la regola di dominio vuole che l'app lo dica chiaramente. */
  sforamentoCentesimi: number
}

function aIso(d: Date): DataIso {
  return d.toISOString().slice(0, 10)
}

function daIso(iso: DataIso): Date {
  return new Date(`${iso}T00:00:00Z`)
}

/** Settimana da lunedì a domenica, oppure mese dal primo all'ultimo giorno, che contiene `oggi`. */
export function periodoDi(tipo: TipoPeriodo, oggi: DataIso): Periodo {
  const d = daIso(oggi)
  if (tipo === 'mese') {
    const anno = d.getUTCFullYear()
    const mese = d.getUTCMonth()
    return { dal: aIso(new Date(Date.UTC(anno, mese, 1))), al: aIso(new Date(Date.UTC(anno, mese + 1, 0))) }
  }
  const giornoDaLunedi = (d.getUTCDay() + 6) % 7
  const lunedi = new Date(d)
  lunedi.setUTCDate(d.getUTCDate() - giornoDaLunedi)
  const domenica = new Date(lunedi)
  domenica.setUTCDate(lunedi.getUTCDate() + 6)
  return { dal: aIso(lunedi), al: aIso(domenica) }
}

export function riepilogoBudget(budgetCentesimi: number, totaliListeCentesimi: readonly number[]): RiepilogoBudget {
  if (!Number.isInteger(budgetCentesimi) || budgetCentesimi < 0) {
    throw new RangeError(`Il budget deve essere un intero di centesimi non negativo, non ${budgetCentesimi}`)
  }
  let previsto = 0
  for (const t of totaliListeCentesimi) {
    if (!Number.isInteger(t) || t < 0) throw new RangeError(`Il totale di una lista non è valido: ${t}`)
    previsto += t
  }
  const differenza = budgetCentesimi - previsto
  return {
    budgetCentesimi,
    previstoCentesimi: previsto,
    residuoCentesimi: Math.max(differenza, 0),
    sforamentoCentesimi: Math.max(-differenza, 0),
  }
}
