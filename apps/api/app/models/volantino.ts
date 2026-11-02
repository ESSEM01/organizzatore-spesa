import { VolantiniSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Catena from '#models/catena'
import Offerta from '#models/offerta'

export default class Volantino extends VolantiniSchema {
  static table = 'volantini'

  @belongsTo(() => Catena)
  declare catena: BelongsTo<typeof Catena>

  @hasMany(() => Offerta)
  declare offerte: HasMany<typeof Offerta>
}
