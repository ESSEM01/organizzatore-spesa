import { PeriodiBudgetSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Lista from '#models/lista'

/** Budget per periodo: le liste del periodo lo consumano. */
export default class PeriodoBudget extends PeriodiBudgetSchema {
  static table = 'periodi_budget'

  @hasMany(() => Lista)
  declare liste: HasMany<typeof Lista>
}
