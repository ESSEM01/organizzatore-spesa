import { OfferteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Catena from '#models/catena'
import Volantino from '#models/volantino'

/** Offerta di un volantino (D7): `proposta` finché non viene confermata. */
export default class Offerta extends OfferteSchema {
  static table = 'offerte'

  @belongsTo(() => Catena)
  declare catena: BelongsTo<typeof Catena>

  @belongsTo(() => Volantino)
  declare volantino: BelongsTo<typeof Volantino>
}
