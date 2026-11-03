import { risolviPrezzo, riepilogoBudget, totaleLista, type PrezzoRisolto } from '@spesa/domain'
import type Lista from '#models/lista'
import type Negozio from '#models/negozio'
import type PeriodoBudget from '#models/periodo_budget'
import { negozioDominio, prezziPrevisti, prezziUtente } from '#services/prezzi_repository'

/**
 * Calcoli della spesa: il database fornisce i dati, il dominio decide prezzi e totali (D4, D7).
 * Le liste vanno caricate con `voci.prodotto` e `negozio.catena`.
 */

export const OGGI_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Il giorno arriva dal telefono; in mancanza si usa la data UTC del server. */
export function oggiDa(valore: unknown): string {
  return typeof valore === 'string' && OGGI_REGEX.test(valore)
    ? valore
    : new Date().toISOString().slice(0, 10)
}

function negozioJson(n: Negozio | null) {
  if (!n) return null
  return {
    id: n.id,
    nome: n.nome,
    catena: n.catena ? { codice: n.catena.codice, nome: n.catena.nome } : null,
  }
}

export function listaJson(l: Lista) {
  return {
    id: l.id,
    nome: l.nome,
    stato: l.stato,
    dataSpesa: l.dataSpesa?.toISODate() ?? null,
    periodoBudgetId: l.periodoBudgetId,
    negozio: negozioJson(l.negozio ?? null),
  }
}

export async function dettaglioLista(lista: Lista, userId: number, oggi: string) {
  const voci = lista.voci
  const prezzi = [
    ...(await prezziUtente(
      userId,
      voci.map((v) => v.prodottoId)
    )),
    ...(await prezziPrevisti(voci, lista.negozio ?? null, lista.createdAt.toISODate()!)),
  ]
  // Senza negozio sulla lista si usano i prezzi degli altri negozi, segnalati come tali.
  const negozio = lista.negozio ? negozioDominio(lista.negozio) : { id: '', catena: '' }
  const prezzoDi = new Map<string, PrezzoRisolto | null>(
    voci.map((v) => [
      String(v.prodottoId),
      risolviPrezzo({ prodottoId: String(v.prodottoId), negozio, prezzi, oggi }),
    ])
  )
  const totale = totaleLista(
    voci.map((v) => ({ prodottoId: String(v.prodottoId), quantita: v.quantita })),
    (id) => prezzoDi.get(id) ?? null
  )
  const nome = new Map(voci.map((v) => [String(v.prodottoId), v.prodotto.nome]))

  return {
    ...listaJson(lista),
    voci: voci.map((v) => {
      const prezzo = prezzoDi.get(String(v.prodottoId)) ?? null
      return {
        id: v.id,
        quantita: v.quantita,
        spuntata: Boolean(v.spuntata),
        prodotto: { id: v.prodotto.id, nome: v.prodotto.nome },
        // Liste preparate dall'IA (D18): grammi pianificati; con la stima si paga a peso, non a pezzo.
        grammi: v.grammi,
        aPeso: v.fontePrezzo === 'stima' && v.grammi !== null,
        prezzo,
        totaleRigaCentesimi: prezzo ? prezzo.centesimi * v.quantita : null,
      }
    }),
    totale: {
      totaleCentesimi: totale.totaleCentesimi,
      senzaPrezzo: totale.senzaPrezzo.map((id) => nome.get(id) ?? id),
      stimati: totale.stimati.map((id) => nome.get(id) ?? id),
    },
  }
}

export async function riepilogoPeriodo(
  periodo: PeriodoBudget,
  liste: Lista[],
  userId: number,
  oggi: string
) {
  const dettagli = await Promise.all(liste.map((l) => dettaglioLista(l, userId, oggi)))
  return {
    id: periodo.id,
    dal: periodo.dal.toISODate(),
    al: periodo.al.toISODate(),
    budgetCentesimi: periodo.budgetCentesimi,
    riepilogo: riepilogoBudget(
      periodo.budgetCentesimi,
      dettagli.map((d) => d.totale.totaleCentesimi)
    ),
    liste: dettagli.map((d) => ({
      ...listaJson(liste.find((l) => l.id === d.id)!),
      totaleCentesimi: d.totale.totaleCentesimi,
      senzaPrezzo: d.totale.senzaPrezzo.length,
    })),
  }
}
