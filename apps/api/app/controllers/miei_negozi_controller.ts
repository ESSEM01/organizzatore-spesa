import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Catena from '#models/catena'
import Negozio from '#models/negozio'
import NegozioUtente from '#models/negozio_utente'
import NegozioTransformer from '#transformers/negozio_transformer'
import { aggiungiNegozioValidator } from '#validators/negozio'

/** I negozi scelti dall'utente. Il negozio è un dato comune; il collegamento è personale. */
export default class MieiNegoziController {
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const negozi = await Negozio.query()
      .whereIn('id', NegozioUtente.query().select('negozio_id').where('user_id', user.id))
      .preload('catena')
      .orderBy('nome')
    return serialize(NegozioTransformer.transform(negozi))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { osmId, catena, ...dati } = await request.validateUsing(aggiungiNegozioValidator)
    const catenaTrovata = catena ? await Catena.findBy('codice', catena) : null

    // Il negozio è comune a tutti: si crea se manca, ma un utente non può riscrivere quello che
    // esiste già (nome, posizione, catena arrivano dal client e non sono affidabili).
    const negozio = await Negozio.firstOrCreate(
      { osmId },
      {
        ...dati,
        indirizzo: dati.indirizzo ?? null,
        catenaId: catenaTrovata?.id ?? null,
        aggiornatoIl: DateTime.now(),
      }
    )
    const collegamento = await NegozioUtente.firstOrCreate({
      userId: user.id,
      negozioId: negozio.id,
    })

    await negozio.load('catena')
    response.status(collegamento.$isLocal ? 201 : 200)
    return serialize(NegozioTransformer.transform(negozio))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const collegamento = await NegozioUtente.query()
      .where('user_id', user.id)
      .where('negozio_id', params.id)
      .firstOrFail()
    await collegamento.delete()
    return response.noContent()
  }
}
