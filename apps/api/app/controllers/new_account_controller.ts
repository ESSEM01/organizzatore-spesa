import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { spedisciVerifica } from '#services/account/email'

export default class NewAccountController {
  async store({ request, auth, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const user = await User.create({ fullName, email, password })
    await auth.use('web').login(user)
    // Si entra subito; la conferma dell'email arriva con il link (D16).
    const emailSpedita = await spedisciVerifica(user)

    return serialize({ user: UserTransformer.transform(user), emailSpedita })
  }
}
