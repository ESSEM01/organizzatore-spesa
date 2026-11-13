import { createHash } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { SessionGuard, type SessionLucidUserProvider } from '@adonisjs/auth/session'
import type { GuardConfigProvider } from '@adonisjs/auth/types'
import type User from '#models/user'

/**
 * Sessioni legate alla password (D16). Al login la sessione salva l'impronta della password; le
 * route con l'accesso la confrontano con quella attuale (middleware auth). Dopo un reset o un
 * cambio di password l'impronta non coincide più e le sessioni aperte, anche quelle rubate,
 * smettono di valere. Questo file è letto da config/auth.ts: niente servizi importati qui.
 */

export const CHIAVE_IMPRONTA = 'impronta_password'

/**
 * Impronta della password attuale: cambia a ogni nuova password (l'hash ha un sale nuovo).
 * La usano anche i link di reset, che così valgono una volta sola.
 */
export function improntaPassword(utente: User) {
  return createHash('sha256').update(utente.password).digest('hex').slice(0, 16)
}

/** Vero se la sessione è stata aperta con la password che l'utente ha adesso. */
export function sessioneValida(session: HttpContext['session'], utente: User) {
  return session.get(CHIAVE_IMPRONTA) === improntaPassword(utente)
}

type Provider = SessionLucidUserProvider<typeof User>

/** Guardia di sessione che al login salva anche l'impronta della password. */
export class GuardiaSessione extends SessionGuard<false, Provider> {
  #ctx: HttpContext

  constructor(...args: ConstructorParameters<typeof SessionGuard<false, Provider>>) {
    super(...args)
    this.#ctx = args[1]
  }

  async login(utente: User, remember = false) {
    await super.login(utente, remember)
    this.#ctx.session.put(CHIAVE_IMPRONTA, improntaPassword(utente))
  }

  /** Per `loginAs` nei test: la sessione finta ha l'impronta come quella vera. */
  async authenticateAsClient(utente: User) {
    const { session } = await super.authenticateAsClient(utente)
    return { session: { ...session, [CHIAVE_IMPRONTA]: improntaPassword(utente) } }
  }
}

/** Come `sessionGuard` di @adonisjs/auth, senza token "ricordami", con la guardia qui sopra. */
export function guardiaSessione(config: {
  provider: Provider
}): GuardConfigProvider<(ctx: HttpContext) => GuardiaSessione> {
  return {
    async resolver(name, app) {
      const emitter = await app.container.make('emitter')
      return (ctx) =>
        new GuardiaSessione(name, ctx, { useRememberMeTokens: false }, emitter, config.provider)
    },
  }
}
