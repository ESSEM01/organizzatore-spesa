import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { cancellaAccountValidator } from '#validators/user'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  /**
   * Cancella l'account e tutti i dati personali (D5, D16): negozi scelti, preferenze, condizioni,
   * prezzi, budget e liste se ne vanno con l'utente (chiavi esterne ON DELETE CASCADE).
   * Restano i dati comuni: negozi, offerte, prodotti creati (senza autore), costi del modello.
   */
  async destroy({ auth, request, response }: HttpContext) {
    const utente = auth.getUserOrFail()
    const { password } = await request.validateUsing(cancellaAccountValidator)
    if (!(await hash.verify(utente.password, password))) {
      return response.badRequest({
        errors: [{ field: 'password', message: 'La password non è corretta' }],
      })
    }
    await db.transaction(async (trx) => {
      await trx.from('auth_access_tokens').where('tokenable_id', utente.id).delete()
      await User.query({ client: trx }).where('id', utente.id).delete()
    })
    await auth.use('web').logout()
    return response.noContent()
  }
}
