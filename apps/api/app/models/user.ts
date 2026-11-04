import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import CondizioneUtente from '#models/condizione_utente'
import Lista from '#models/lista'
import NegozioUtente from '#models/negozio_utente'
import PeriodoBudget from '#models/periodo_budget'
import PreferenzeUtente from '#models/preferenze_utente'
import PrezzoUtente from '#models/prezzo_utente'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @hasOne(() => PreferenzeUtente)
  declare preferenze: HasOne<typeof PreferenzeUtente>

  @hasMany(() => NegozioUtente)
  declare negozi: HasMany<typeof NegozioUtente>

  @hasMany(() => CondizioneUtente)
  declare condizioni: HasMany<typeof CondizioneUtente>

  @hasMany(() => PrezzoUtente)
  declare prezzi: HasMany<typeof PrezzoUtente>

  @hasMany(() => PeriodoBudget)
  declare periodiBudget: HasMany<typeof PeriodoBudget>

  @hasMany(() => Lista)
  declare liste: HasMany<typeof Lista>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
