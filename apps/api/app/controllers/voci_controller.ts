import type { HttpContext } from '@adonisjs/core/http'
import VoceLista from '#models/voce_lista'
import type User from '#models/user'
import { modificaVoceValidator } from '#validators/spesa'

/** Una voce di una lista dell'utente. 404 se la lista non è sua. */
function voceDi(user: User, id: unknown) {
  return VoceLista.query()
    .where('id', Number(id))
    .whereHas('lista', (q) => q.where('user_id', user.id))
    .preload('prodotto')
    .firstOrFail()
}

export default class VociController {
  async update({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const voce = await voceDi(user, params.id)
    const { quantita, spuntata } = await request.validateUsing(modificaVoceValidator)
    if (quantita !== undefined) voce.quantita = quantita
    if (spuntata !== undefined) voce.spuntata = spuntata
    await voce.save()
    return {
      data: {
        id: voce.id,
        quantita: voce.quantita,
        spuntata: Boolean(voce.spuntata),
        prodotto: { id: voce.prodotto.id, nome: voce.prodotto.nome },
      },
    }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const voce = await voceDi(user, params.id)
    await voce.delete()
    return response.noContent()
  }
}
