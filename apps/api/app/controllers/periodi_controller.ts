import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Lista from '#models/lista'
import PeriodoBudget from '#models/periodo_budget'
import { oggiDa, riepilogoPeriodo } from '#services/spesa_service'
import { creaPeriodoValidator, modificaPeriodoValidator } from '#validators/spesa'

/** Budget per periodo (D9): una settimana, un mese o date a scelta, senza sovrapposizioni. */
export default class PeriodiController {
  async corrente({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const oggi = oggiDa(request.input('oggi'))
    const periodo = await PeriodoBudget.query()
      .where('user_id', user.id)
      .where('dal', '<=', oggi)
      .where('al', '>=', oggi)
      .first()
    if (!periodo) return { data: null }

    const liste = await Lista.query()
      .where('user_id', user.id)
      .where('periodo_budget_id', periodo.id)
      .preload('voci', (q) => q.preload('prodotto').orderBy('id'))
      .preload('negozio', (q) => q.preload('catena'))
      .orderBy('created_at', 'desc')
    return { data: await riepilogoPeriodo(periodo, liste, user.id, oggi) }
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { dal, al, budgetCentesimi } = await request.validateUsing(creaPeriodoValidator)
    if (al < dal) {
      return response.unprocessableEntity({
        errors: [
          { field: 'al', rule: 'after', message: 'La fine del periodo deve venire dopo l’inizio' },
        ],
      })
    }
    const sovrapposto = await PeriodoBudget.query()
      .where('user_id', user.id)
      .where('dal', '<=', al)
      .where('al', '>=', dal)
      .first()
    if (sovrapposto) {
      return response.unprocessableEntity({
        errors: [
          { field: 'dal', rule: 'overlap', message: 'Hai già un budget che copre questi giorni' },
        ],
      })
    }

    const periodo = await PeriodoBudget.create({
      userId: user.id,
      dal: DateTime.fromISO(dal),
      al: DateTime.fromISO(al),
      budgetCentesimi,
    })
    response.status(201)
    return {
      data: {
        id: periodo.id,
        dal,
        al,
        budgetCentesimi: periodo.budgetCentesimi,
      },
    }
  }

  async update({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { budgetCentesimi } = await request.validateUsing(modificaPeriodoValidator)
    const periodo = await PeriodoBudget.query()
      .where('user_id', user.id)
      .where('id', params.id)
      .firstOrFail()
    periodo.budgetCentesimi = budgetCentesimi
    await periodo.save()
    return {
      data: {
        id: periodo.id,
        dal: periodo.dal.toISODate(),
        al: periodo.al.toISODate(),
        budgetCentesimi: periodo.budgetCentesimi,
      },
    }
  }
}
