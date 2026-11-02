import { NegoziUtenteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Negozio from '#models/negozio'

/** Negozio scelto dall'utente tra quelli vicini. */
export default class NegozioUtente extends NegoziUtenteSchema {
  static table = 'negozi_utente'

  @belongsTo(() => Negozio)
  declare negozio: BelongsTo<typeof Negozio>
}
