import { CateneSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Negozio from '#models/negozio'

export default class Catena extends CateneSchema {
  static table = 'catene'

  @hasMany(() => Negozio)
  declare negozi: HasMany<typeof Negozio>
}
