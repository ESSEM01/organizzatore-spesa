import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import { guardiaSessione } from '#services/account/sessione'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'

/**
 * Una sola guardia: la sessione in un cookie httpOnly, usata dalla PWA (D16). La guardia a token dello
 * starter kit è stata tolta il 2026-11-04 (piano di riordino, fase 1): nessun client la usava.
 */
const authConfig = defineConfig({
  default: 'web',

  guards: {
    // Sessione legata all'impronta della password: un reset chiude le sessioni aperte.
    web: guardiaSessione({
      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
