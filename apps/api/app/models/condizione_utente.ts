import { CondizioniUtenteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Catena from '#models/catena'

/** Condizione per ottenere un'offerta, es. carta fedeltà. Mai il numero della carta (D5). */
export default class CondizioneUtente extends CondizioniUtenteSchema {
  static table = 'condizioni_utente'

  @belongsTo(() => Catena)
  declare catena: BelongsTo<typeof Catena>
}
