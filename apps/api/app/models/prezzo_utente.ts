import { PrezziUtenteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Negozio from '#models/negozio'
import Prodotto from '#models/prodotto'

/** Prezzo rilevato dall'utente (D3): lo storico non si sovrascrive. */
export default class PrezzoUtente extends PrezziUtenteSchema {
  static table = 'prezzi_utente'

  @belongsTo(() => Prodotto)
  declare prodotto: BelongsTo<typeof Prodotto>

  @belongsTo(() => Negozio)
  declare negozio: BelongsTo<typeof Negozio>
}
