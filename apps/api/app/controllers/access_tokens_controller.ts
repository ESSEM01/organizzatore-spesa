import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import UserTransformer from '#transformers/user_transformer'

/** 5 password sbagliate per email e IP bloccano l'accesso per 15 minuti (D16). */
const tentativi = () =>
  limiter.use({ requests: 5, duration: '15 minutes', blockDuration: '15 minutes' })

/** Accesso e uscita: la sessione sta in un cookie httpOnly, nessun token alla PWA (D16). */
export default class AccessTokensController {
  async store({ request, response, auth, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const chiave = `accesso_${email.toLowerCase()}_${request.ip()}`

    const [bloccato, user] = await tentativi().penalize(chiave, () =>
      User.verifyCredentials(email, password)
    )
    if (bloccato) {
      const minuti = Math.max(1, Math.ceil(bloccato.response.availableIn / 60))
      return response.tooManyRequests({
        errors: [{ message: `Troppi tentativi sbagliati. Riprova tra ${minuti} minuti.` }],
      })
    }

    await auth.use('web').login(user)
    return serialize({ user: UserTransformer.transform(user) })
  }

  async destroy({ auth }: HttpContext) {
    await auth.use('web').logout()
    return { message: 'Sei uscito' }
  }
}
