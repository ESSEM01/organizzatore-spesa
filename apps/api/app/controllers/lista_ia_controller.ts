import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Lista from '#models/lista'
import NegozioUtente from '#models/negozio_utente'
import PeriodoBudget from '#models/periodo_budget'
import PreferenzeUtente from '#models/preferenze_utente'
import Prodotto from '#models/prodotto'
import VoceLista from '#models/voce_lista'
import { oggiDa } from '#services/spesa_service'
import { pianificatore } from '#services/spesa_ia/pianificatore'
import { ErroreProposta, proponiLista } from '#services/spesa_ia/proposta'
import {
  preferenzeValidator,
  propostaValidator,
  salvaPropostaValidator,
} from '#validators/lista_ia'

/** Lista della spesa preparata dall'IA (D13, D18) e preferenze che la guidano. */
export default class ListaIaController {
  /** Prepara una proposta: alimenti dal modello, prezzi e totali per ogni negozio dal dominio. */
  async proposta({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { periodoId, oggi } = await request.validateUsing(propostaValidator)
    const pianifica = pianificatore()
    if (!pianifica) {
      return response.serviceUnavailable({
        errors: [{ message: 'La preparazione automatica non è attiva su questo server.' }],
      })
    }
    try {
      const proposta = await proponiLista({
        userId: user.id,
        periodoId,
        oggi: oggiDa(oggi),
        pianifica,
      })
      return { data: proposta }
    } catch (e) {
      if (e instanceof ErroreProposta) {
        return response.unprocessableEntity({ errors: [{ field: e.campo, message: e.message }] })
      }
      throw e
    }
  }

  /**
   * Salva la proposta come lista per il negozio scelto sul telefono. Il prezzo delle offerte si rilegge
   * dal database (non ci si fida del client); quello stimato è la stima Osservaprezzi mostrata.
   */
  async salva({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const dati = await request.validateUsing(salvaPropostaValidator)
    const periodo = await PeriodoBudget.query()
      .where('user_id', user.id)
      .where('id', dati.periodoId)
      .firstOrFail()
    const mio = await NegozioUtente.query()
      .where('user_id', user.id)
      .where('negozio_id', dati.negozioId)
      .first()
    if (!mio) {
      return response.unprocessableEntity({
        errors: [{ field: 'negozioId', message: 'Il negozio non è tra i tuoi.' }],
      })
    }
    const righeOfferte = await db
      .from('offerte')
      .whereIn(
        'id',
        dati.voci.map((v) => v.offertaId).filter((id): id is number => id !== null)
      )
      .select('id', 'centesimi')
    const offerte = new Map(righeOfferte.map((o) => [o.id, o.centesimi as number]))

    const lista = await db.transaction(async (trx) => {
      const nuova = await Lista.create(
        {
          userId: user.id,
          periodoBudgetId: periodo.id,
          negozioId: dati.negozioId,
          nome: dati.nome ?? 'Spesa preparata',
          stato: 'bozza',
        },
        { client: trx }
      )
      for (const v of dati.voci) {
        const nome = v.nome.trim().replace(/\s+/g, ' ')
        const prodotto =
          (await Prodotto.query({ client: trx })
            .where((q) => q.whereNull('creato_da_user_id').orWhere('creato_da_user_id', user.id))
            .where(db.raw('lower(nome)'), nome.toLowerCase())
            .first()) ?? (await Prodotto.create({ nome, creatoDaUserId: user.id }, { client: trx }))
        const daOfferta = v.offertaId !== null && offerte.has(v.offertaId)
        await VoceLista.updateOrCreate(
          { listaId: nuova.id, prodottoId: prodotto.id },
          {
            quantita: daOfferta ? (v.confezioni ?? 1) : 1,
            spuntata: false,
            grammi: v.grammi,
            fontePrezzo: daOfferta ? 'offerta' : 'stima',
            offertaId: daOfferta ? v.offertaId : null,
            prezzoPrevistoCentesimi: daOfferta ? offerte.get(v.offertaId!)! : v.centesimi,
          },
          { client: trx }
        )
      }
      return nuova
    })
    response.status(201)
    return { data: { id: lista.id } }
  }

  async preferenze({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const p = await PreferenzeUtente.findBy('userId', user.id)
    return { data: { persone: p?.persone ?? 1 } }
  }

  async aggiornaPreferenze({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { persone } = await request.validateUsing(preferenzeValidator)
    const p = await PreferenzeUtente.updateOrCreate({ userId: user.id }, { persone })
    return { data: { persone: p.persone } }
  }
}
