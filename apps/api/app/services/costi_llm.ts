import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import env from '#start/env'

/**
 * Tetto mensile di spesa per il modello (piano di riordino, decisione 7). Il costo si ricava dai token
 * registrati in `richieste_llm` (D4: solo numeri, nessun contenuto). Oltre il tetto non si leggono
 * volantini e non si preparano liste fino al mese successivo, e l'app lo dice.
 */

/** Listino di Claude Opus 5.5 in dollari per milione di token (D4). */
export const DOLLARI_PER_MILIONE = { input: 4, output: 20, cacheLettura: 0.4 }

/** Tetto predefinito se `LIMITE_SPESA_LLM_DOLLARI` non è impostato. */
const LIMITE_PREDEFINITO = 10

export class TettoSuperato extends Error {
  constructor(
    readonly spesa: number,
    readonly limite: number
  ) {
    super(
      `Questo mese il modello è già costato ${spesa.toFixed(2)} $ su ${limite.toFixed(2)} $ previsti: ` +
        'riprova il mese prossimo o alza LIMITE_SPESA_LLM_DOLLARI.'
    )
  }
}

export function costoDollari(t: { input: number; output: number; cacheLettura: number }): number {
  return (
    (t.input * DOLLARI_PER_MILIONE.input +
      t.output * DOLLARI_PER_MILIONE.output +
      t.cacheLettura * DOLLARI_PER_MILIONE.cacheLettura) /
    1_000_000
  )
}

/** Dollari spesi nel mese di `ora` (ora di Roma). */
export async function spesaDelMese(ora: DateTime = DateTime.now()): Promise<number> {
  const inizio = ora.setZone('Europe/Rome').startOf('month').toUTC()
  const fine = inizio.plus({ months: 1 })
  const [riga] = await db
    .from('richieste_llm')
    .where('created_at', '>=', inizio.toSQL({ includeOffset: false })!)
    .where('created_at', '<', fine.toSQL({ includeOffset: false })!)
    .sum('token_input as input')
    .sum('token_output as output')
    .sum('token_cache_lettura as cache')
  return costoDollari({
    input: Number(riga?.input ?? 0),
    output: Number(riga?.output ?? 0),
    cacheLettura: Number(riga?.cache ?? 0),
  })
}

export function limiteMensile(): number {
  return env.get('LIMITE_SPESA_LLM_DOLLARI') ?? LIMITE_PREDEFINITO
}

/** Da chiamare prima di ogni richiesta al modello: lancia `TettoSuperato` se il mese è già pieno. */
export async function richiediBudgetModello(limite: number = limiteMensile()) {
  const spesa = await spesaDelMese()
  if (spesa >= limite) throw new TettoSuperato(spesa, limite)
  return { spesa, limite }
}
