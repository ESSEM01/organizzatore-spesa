import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Lista from '#models/lista'
import NegozioUtente from '#models/negozio_utente'
import PeriodoBudget from '#models/periodo_budget'
import PrezzoUtente from '#models/prezzo_utente'
import Prodotto from '#models/prodotto'
import VoceLista from '#models/voce_lista'
import type User from '#models/user'
import { dettaglioLista, listaJson, oggiDa } from '#services/spesa_service'
import {
  aggiungiVoceValidator,
  creaListaValidator,
  modificaListaValidator,
  prezzoValidator,
} from '#validators/spesa'

function errore(field: string, message: string) {
  return { errors: [{ field, rule: 'exists', message }] }
}

/** Una lista dell'utente, con voci e negozio caricati. 404 se non è sua. */
function listaDi(user: User, id: unknown) {
  return Lista.query()
    .where('user_id', user.id)
    .where('id', Number(id))
    .preload('voci', (q) => q.preload('prodotto').orderBy('id'))
    .preload('negozio', (q) => q.preload('catena'))
    .firstOrFail()
}

async function negozioEMio(user: User, negozioId: number) {
  return Boolean(
    await NegozioUtente.query().where('user_id', user.id).where('negozio_id', negozioId).first()
  )
}

/** Nome ripulito: spazi iniziali, finali e doppi tolti. */
function pulisci(nome: string) {
  return nome.trim().replace(/\s+/g, ' ')
}

export default class ListeController {
  async show({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const lista = await listaDi(user, params.id)
    return { data: await dettaglioLista(lista, user.id, oggiDa(request.input('oggi'))) }
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nome, negozioId, periodoBudgetId } = await request.validateUsing(creaListaValidator)
    if (negozioId && !(await negozioEMio(user, negozioId))) {
      return response.unprocessableEntity(errore('negozioId', 'Scegli uno dei tuoi negozi'))
    }
    if (
      periodoBudgetId &&
      !(await PeriodoBudget.query().where('user_id', user.id).where('id', periodoBudgetId).first())
    ) {
      return response.unprocessableEntity(
        errore('periodoBudgetId', 'Periodo di budget non trovato')
      )
    }

    const lista = await Lista.create({
      userId: user.id,
      nome,
      negozioId: negozioId ?? null,
      periodoBudgetId: periodoBudgetId ?? null,
      stato: 'bozza',
    })
    await lista.load('negozio', (q) => q.preload('catena'))
    response.status(201)
    return { data: listaJson(lista) }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const lista = await listaDi(user, params.id)
    const modifiche = await request.validateUsing(modificaListaValidator)
    if (modifiche.negozioId && !(await negozioEMio(user, modifiche.negozioId))) {
      return response.unprocessableEntity(errore('negozioId', 'Scegli uno dei tuoi negozi'))
    }
    lista.merge({
      ...(modifiche.nome !== undefined && { nome: modifiche.nome }),
      ...(modifiche.negozioId !== undefined && { negozioId: modifiche.negozioId }),
      ...(modifiche.stato !== undefined && { stato: modifiche.stato }),
    })
    await lista.save()
    await lista.load('negozio', (q) => q.preload('catena'))
    return { data: listaJson(lista) }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const lista = await listaDi(user, params.id)
    await lista.delete()
    return response.noContent()
  }

  /** Aggiunge un prodotto per nome; se è già in lista ne aumenta la quantità. */
  async aggiungiVoce({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const lista = await listaDi(user, params.id)
    const { nome, quantita } = await request.validateUsing(aggiungiVoceValidator)
    const nomePulito = pulisci(nome)

    // Stesso prodotto se il nome coincide senza badare a maiuscole (lower di SQLite: solo lettere ASCII).
    const prodotto =
      (await Prodotto.query()
        .where((q) => q.whereNull('creato_da_user_id').orWhere('creato_da_user_id', user.id))
        .where(db.raw('lower(nome)'), nomePulito.toLowerCase())
        .first()) ?? (await Prodotto.create({ nome: nomePulito, creatoDaUserId: user.id }))

    const esistente = lista.voci.find((v) => v.prodottoId === prodotto.id)
    if (esistente) {
      esistente.quantita += quantita
      await esistente.save()
    }
    const voce =
      esistente ??
      (await VoceLista.create({
        listaId: lista.id,
        prodottoId: prodotto.id,
        quantita,
        spuntata: false,
      }))
    response.status(esistente ? 200 : 201)
    return {
      data: {
        id: voce.id,
        quantita: voce.quantita,
        spuntata: Boolean(voce.spuntata),
        prodotto: { id: prodotto.id, nome: prodotto.nome },
      },
    }
  }

  /** Prezzo visto nel negozio della lista: entra nello storico dei prezzi dell'utente (D3). */
  async aggiungiPrezzo({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const lista = await listaDi(user, params.id)
    const { prodottoId, centesimi, oggi } = await request.validateUsing(prezzoValidator)
    if (!lista.negozioId) {
      return response.unprocessableEntity(
        errore('negozioId', 'Scegli il negozio della lista per salvare i prezzi')
      )
    }
    if (!lista.voci.some((v) => v.prodottoId === prodottoId)) {
      return response.unprocessableEntity(errore('prodottoId', 'Il prodotto non è in questa lista'))
    }

    const prezzo = await PrezzoUtente.create({
      userId: user.id,
      prodottoId,
      negozioId: lista.negozioId,
      centesimi,
      data: DateTime.fromISO(oggiDa(oggi)),
      fonte: 'manuale',
    })
    response.status(201)
    return {
      data: {
        id: prezzo.id,
        prodottoId,
        negozioId: prezzo.negozioId,
        centesimi,
        data: prezzo.data.toISODate(),
      },
    }
  }
}
