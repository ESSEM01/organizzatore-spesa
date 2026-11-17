import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { cancellaAccountValidator } from '#validators/user'

/** Tabelle con i dati personali, in ordine: le liste prima dei periodi di budget a cui puntano. */
const TABELLE_UTENTE = [
  'liste',
  'periodi_budget',
  'prezzi_utente',
  'negozi_utente',
  'condizioni_utente',
  'preferenze_utente',
] as const

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  /**
   * Cancella l'account e tutti i dati personali (D5, D16): negozi scelti, preferenze, condizioni,
   * prezzi, budget, liste e le loro voci. Restano i dati comuni: negozi, offerte, prodotti creati
   * (senza autore), costi del modello (senza utente). Le righe si cancellano una per una in una
   * transazione, senza contare su ON DELETE CASCADE: con libsql le chiavi esterne possono essere
   * spente e lascerebbero dati personali orfani.
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
      const liste = trx.from('liste').select('id').where('user_id', utente.id)
      await trx.from('voci_lista').whereIn('lista_id', liste).delete()
      for (const tabella of TABELLE_UTENTE) {
        await trx.from(tabella).where('user_id', utente.id).delete()
      }
      await trx
        .from('prodotti')
        .where('creato_da_user_id', utente.id)
        .update({ creato_da_user_id: null })
      await trx.from('richieste_llm').where('user_id', utente.id).update({ user_id: null })
      await User.query({ client: trx }).where('id', utente.id).delete()
    })
    await auth.use('web').logout()
    return response.noContent()
  }
}
