import {
  distanzaMetri,
  scegliNegozio,
  type ListaNelBudget,
  type Posizione,
  type RiepilogoNutrizionale,
  type VocePiano,
} from '@spesa/domain'
import type { Api } from '../../lib/api'
import { oggiLocale } from '../../lib/format'

/** Risposta di POST /api/v1/liste/proposta (D18). */
export interface NegozioProposto {
  negozioId: number
  nome: string
  catena: string | null
  indirizzo: string | null
  lat: number
  lon: number
  lista: ListaNelBudget
}

export interface Proposta {
  periodo: { id: number; dal: string; al: string }
  budgetCentesimi: number
  persone: number
  giorni: number
  nota: string
  piano: VocePiano[]
  nutrizione: RiepilogoNutrizionale
  negozi: NegozioProposto[]
}

/** Costo del viaggio usato per la scelta del negozio (D13, regolabile in futuro). */
export const CENTESIMI_PER_KM = 150

/**
 * Sceglie il negozio sul telefono, dove sta la posizione (D5, D13): budget rigido, poi totale + km.
 * Senza posizione la distanza non conta e vince il totale.
 */
export function scegliDaProposta(p: Proposta, posizione: Posizione | null) {
  return scegliNegozio(
    p.negozi.map((n) => ({
      ...n,
      totaleCentesimi: n.lista.totaleCentesimi,
      distanzaMetri: posizione ? Math.round(distanzaMetri(posizione, n)) : 0,
      mancanti: n.lista.mancanti.length,
    })),
    p.budgetCentesimi,
    posizione ? CENTESIMI_PER_KM : 0,
  )
}

/** Voci del negozio scelto nel formato di POST /api/v1/liste/da-proposta. */
export function vociDaSalvare(n: NegozioProposto) {
  return n.lista.voci.map((v) => ({
    nome: v.scelta.fonte === 'offerta' ? v.scelta.nome : v.nome,
    grammi: v.grammi,
    confezioni: v.confezioni,
    centesimi: v.centesimi,
    offertaId: v.scelta.offertaId,
  }))
}

export function creaDatiProposta(api: Api) {
  return {
    preferenze: () => api.richiesta<{ persone: number }>('GET', '/preferenze'),
    impostaPersone: (persone: number) => api.richiesta<{ persone: number }>('PATCH', '/preferenze', { persone }),
    proponi: (periodoId: number) => api.richiesta<Proposta>('POST', '/liste/proposta', { periodoId, oggi: oggiLocale() }),
    salva: (p: Proposta, n: NegozioProposto, nome: string) =>
      api.richiesta<{ id: number }>('POST', '/liste/da-proposta', {
        periodoId: p.periodo.id,
        negozioId: n.negozioId,
        nome,
        voci: vociDaSalvare(n),
      }),
  }
}
