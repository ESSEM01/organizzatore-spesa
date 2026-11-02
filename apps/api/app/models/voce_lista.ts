import { VociListaSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Lista from '#models/lista'
import Prodotto from '#models/prodotto'

export default class VoceLista extends VociListaSchema {
  static table = 'voci_lista'

  @belongsTo(() => Lista)
  declare lista: BelongsTo<typeof Lista>

  @belongsTo(() => Prodotto)
  declare prodotto: BelongsTo<typeof Prodotto>
}
