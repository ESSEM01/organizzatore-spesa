import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { errors } from '@adonisjs/auth'
import { sessioneValida } from '#services/account/sessione'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards)
    // Sessione aperta con una password che non è più quella attuale (reset, cambio): non vale.
    if (!sessioneValida(ctx.session, ctx.auth.getUserOrFail())) {
      await ctx.auth.use('web').logout()
      throw new errors.E_UNAUTHORIZED_ACCESS('Sessione scaduta', { guardDriverName: 'session' })
    }
    return next()
  }
}
