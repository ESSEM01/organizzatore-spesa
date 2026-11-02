import type { PrezzoRisolto, RiepilogoBudget } from '@spesa/domain'
import type { Api } from '../../lib/api'

/** Forme delle risposte di `/api/v1/periodi` e `/api/v1/liste` (D9, D12). */

export interface NegozioLista {
  id: number
  nome: string
  catena: { codice: string; nome: string } | null
}

export interface ListaBreve {
  id: number
  nome: string
  stato: 'bozza' | 'in_corso' | 'conclusa'
  negozio: NegozioLista | null
  totaleCentesimi: number
  senzaPrezzo: number
}

export interface PeriodoCorrente {
  id: number
  dal: string
  al: string
  budgetCentesimi: number
  riepilogo: RiepilogoBudget
  liste: ListaBreve[]
}

export interface Voce {
  id: number
  quantita: number
  spuntata: boolean
  prodotto: { id: number; nome: string }
  prezzo: PrezzoRisolto | null
  totaleRigaCentesimi: number | null
}

export interface DettaglioLista {
  id: number
  nome: string
  stato: ListaBreve['stato']
  negozio: NegozioLista | null
  voci: Voce[]
  totale: { totaleCentesimi: number; senzaPrezzo: string[]; stimati: string[] }
}

export function creaDatiSpesa(api: Api, oggi: () => string) {
  return {
    periodoCorrente: () => api.richiesta<PeriodoCorrente | null>('GET', `/periodi/corrente?oggi=${oggi()}`),
    creaPeriodo: (dal: string, al: string, budgetCentesimi: number) =>
      api.richiesta('POST', '/periodi', { dal, al, budgetCentesimi }),
    modificaBudget: (id: number, budgetCentesimi: number) => api.richiesta('PATCH', `/periodi/${id}`, { budgetCentesimi }),
    creaLista: (nome: string, negozioId: number | null, periodoBudgetId: number) =>
      api.richiesta<{ id: number }>('POST', '/liste', { nome, negozioId, periodoBudgetId }),
    dettaglio: (id: number) => api.richiesta<DettaglioLista>('GET', `/liste/${id}?oggi=${oggi()}`),
    cambiaNegozio: (id: number, negozioId: number | null) => api.richiesta('PATCH', `/liste/${id}`, { negozioId }),
    eliminaLista: (id: number) => api.richiesta('DELETE', `/liste/${id}`),
    aggiungiVoce: (listaId: number, nome: string, quantita: number) =>
      api.richiesta('POST', `/liste/${listaId}/voci`, { nome, quantita }),
    modificaVoce: (id: number, modifiche: { quantita?: number; spuntata?: boolean }) =>
      api.richiesta('PATCH', `/voci/${id}`, modifiche),
    togliVoce: (id: number) => api.richiesta('DELETE', `/voci/${id}`),
    salvaPrezzo: (listaId: number, prodottoId: number, centesimi: number) =>
      api.richiesta('POST', `/liste/${listaId}/prezzi`, { prodottoId, centesimi, oggi: oggi() }),
  }
}

export type DatiSpesa = ReturnType<typeof creaDatiSpesa>
