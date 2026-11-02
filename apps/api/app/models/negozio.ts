import { NegoziSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Catena from '#models/catena'

/** Supermercato da OpenStreetMap: dato comune a tutti gli utenti. */
export default class Negozio extends NegoziSchema {
  static table = 'negozi'

  @belongsTo(() => Catena)
  declare catena: BelongsTo<typeof Catena>
}
