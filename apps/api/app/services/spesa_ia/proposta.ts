import { DateTime } from 'luxon'
import {
  prezzaPiano,
  riduciAlBudget,
  riepilogoNutrizionale,
  type ListaNelBudget,
  type VocePiano,
} from '@spesa/domain'
import Lista from '#models/lista'
import PeriodoBudget from '#models/periodo_budget'
import PreferenzeUtente from '#models/preferenze_utente'
import RichiestaLlm from '#models/richiesta_llm'
import { riepilogoPeriodo } from '#services/spesa_service'
import { opzioniSpesa, type NegozioCandidato } from '#services/spesa_ia/opzioni'
import type { Pianificatore } from '#services/spesa_ia/pianificatore_claude'

export class ErroreProposta extends Error {
  constructor(
    readonly campo: string,
    messaggio: string
  ) {
    super(messaggio)
  }
}

export interface PropostaNegozio extends NegozioCandidato {
  lista: ListaNelBudget
}

/** Grammi massimi accettati per un alimento: oltre, la risposta del modello è sbagliata. */
const GRAMMI_MASSIMI = 50_000

/**
 * Proposta di lista per il periodo (D13, D18). Il modello sceglie gli alimenti e le quantità; i prezzi,
 * i totali per negozio, la riduzione al budget e i valori nutrizionali li calcola il dominio. La scelta
 * del negozio la fa il telefono, che conosce le distanze (D5).
 */
export async function proponiLista({
  userId,
  periodoId,
  oggi,
  pianifica,
}: {
  userId: number
  periodoId: number
  oggi: string
  pianifica: Pianificatore
}) {
  const periodo = await PeriodoBudget.query()
    .where('user_id', userId)
    .where('id', periodoId)
    .firstOrFail()
  const liste = await Lista.query()
    .where('user_id', userId)
    .where('periodo_budget_id', periodo.id)
    .preload('voci', (q) => q.preload('prodotto'))
    .preload('negozio', (q) => q.preload('catena'))
  const { riepilogo } = await riepilogoPeriodo(periodo, liste, userId, oggi)
  const budget = riepilogo.residuoCentesimi
  if (budget <= 0) {
    throw new ErroreProposta('budget', 'Il budget del periodo è già tutto impegnato nelle liste.')
  }

  const dal = periodo.dal.toISODate()!
  const al = periodo.al.toISODate()!
  const opzioni = await opzioniSpesa(userId, { dal, al, oggi })
  if (opzioni.negozi.length === 0) {
    throw new ErroreProposta(
      'negozi',
      'Aggiungi almeno un negozio tra i tuoi per preparare la lista.'
    )
  }
  if (opzioni.alimenti.length === 0) {
    throw new ErroreProposta('prezzi', 'Non ci sono ancora prezzi per i tuoi negozi.')
  }

  const preferenze = await PreferenzeUtente.findBy('userId', userId)
  const persone = preferenze?.persone ?? 1
  // Si pianificano i giorni che restano del periodo, oggi compreso.
  const inizio = DateTime.fromISO(oggi > dal ? oggi : dal)
  const giorni = Math.max(1, Math.round(DateTime.fromISO(al).diff(inizio, 'days').days) + 1)

  const esito = await pianifica({
    budgetCentesimi: budget,
    persone,
    giorni,
    alimenti: opzioni.alimenti.map((a) => ({
      codice: a.codice,
      nome: a.nome,
      centesimiAlKg: a.centesimiAlKgMinimo,
      kcal: a.per100.kcal,
      proteine: a.per100.proteine,
      carboidrati: a.per100.carboidrati,
      grassi: a.per100.grassi,
      fibre: a.per100.fibre,
    })),
  })
  await RichiestaLlm.create({
    userId,
    scopo: 'lista',
    modello: esito.modello,
    tokenInput: esito.usage.input,
    tokenOutput: esito.usage.output,
    tokenCacheLettura: esito.usage.cacheLettura,
    stopReason: esito.stopReason,
    esito: esito.esito,
  })
  if (esito.esito !== 'ok' || !esito.piano) {
    throw new ErroreProposta('modello', 'Non sono riuscito a preparare la lista. Riprova tra poco.')
  }

  // Solo alimenti dell'elenco, con quantità sensate: il resto si scarta, mai si corregge.
  const perCodice = new Map(opzioni.alimenti.map((a) => [a.codice, a]))
  const piano: VocePiano[] = []
  for (const v of esito.piano.voci) {
    const alimento = perCodice.get(v.codice)
    if (!alimento || v.grammi <= 0 || v.grammi > GRAMMI_MASSIMI) continue
    if (piano.some((p) => p.codice === v.codice)) continue
    const priorita = v.priorita === 1 || v.priorita === 2 ? v.priorita : 3
    piano.push({ codice: v.codice, nome: alimento.nome, grammi: v.grammi, priorita })
  }

  const negozi: PropostaNegozio[] = opzioni.negozi.map((n) => {
    const perAlimento = opzioni.perNegozio.get(n.negozioId)!
    const lista = riduciAlBudget(
      prezzaPiano(piano, (codice) => perAlimento.get(codice) ?? []),
      budget
    )
    return { ...n, lista }
  })

  return {
    periodo: { id: periodo.id, dal, al },
    budgetCentesimi: budget,
    persone,
    giorni,
    nota: esito.piano.nota,
    piano,
    nutrizione: riepilogoNutrizionale(
      piano.map((v) => ({ grammi: v.grammi, per100: perCodice.get(v.codice)?.per100 ?? null })),
      persone,
      giorni
    ),
    negozi,
  }
}
