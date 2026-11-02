import { ListeSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Negozio from '#models/negozio'
import PeriodoBudget from '#models/periodo_budget'
import VoceLista from '#models/voce_lista'

export default class Lista extends ListeSchema {
  static table = 'liste'

  @belongsTo(() => PeriodoBudget)
  declare periodoBudget: BelongsTo<typeof PeriodoBudget>

  @belongsTo(() => Negozio)
  declare negozio: BelongsTo<typeof Negozio>

  @hasMany(() => VoceLista)
  declare voci: HasMany<typeof VoceLista>
}
