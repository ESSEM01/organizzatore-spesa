import type { Negozio as NegozioDominio, Prezzo } from '@spesa/domain'
import type Negozio from '#models/negozio'
import db from '@adonisjs/lucid/services/db'
import PrezzoUtente from '#models/prezzo_utente'
import type VoceLista from '#models/voce_lista'

/**
 * Ponte tra database e dominio: legge i prezzi e li restituisce come `Prezzo[]`.
 * La scelta del prezzo resta in `risolviPrezzo` (@spesa/domain): qui non si decidono priorità.
 * Prezzi dell'utente e prezzi previsti delle liste preparate dall'IA (offerte e stime, D18).
 */
export async function prezziUtente(userId: number, prodottoIds: number[]): Promise<Prezzo[]> {
  if (prodottoIds.length === 0) return []

  const righe = await PrezzoUtente.query()
    .where('user_id', userId)
    .whereIn('prodotto_id', prodottoIds)
    .orderBy('data', 'asc')

  return righe.map((p) => ({
    prodottoId: String(p.prodottoId),
    centesimi: p.centesimi,
    fonte: 'utente' as const,
    data: p.data.toISODate()!,
    negozioId: String(p.negozioId),
  }))
}

/** Negozio nel formato del dominio. Richiede la relazione `catena` già caricata. */
export function negozioDominio(negozio: Negozio): NegozioDominio {
  return { id: String(negozio.id), catena: negozio.catena?.codice ?? '' }
}

/**
 * Prezzi previsti delle voci di una lista preparata dall'IA (D18): l'offerta del volantino con la sua
 * validità, oppure la stima Osservaprezzi. Entrano in `risolviPrezzo` come gli altri, quindi un prezzo
 * inserito dall'utente nel negozio vale più di una stima.
 */
export async function prezziPrevisti(
  voci: VoceLista[],
  negozio: Negozio | null,
  giorno: string
): Promise<Prezzo[]> {
  const conPrezzo = voci.filter((v) => v.prezzoPrevistoCentesimi !== null)
  const idOfferte = conPrezzo.map((v) => v.offertaId).filter((id): id is number => id !== null)
  const righe = idOfferte.length
    ? await db.from('offerte').whereIn('id', idOfferte).select('id', 'valido_dal', 'valido_al')
    : []
  const validita = new Map(
    righe.map((o) => [
      o.id as number,
      { dal: String(o.valido_dal).slice(0, 10), al: String(o.valido_al).slice(0, 10) },
    ])
  )
  return conPrezzo.map((v): Prezzo => {
    const offerta = v.fontePrezzo === 'offerta' && v.offertaId ? validita.get(v.offertaId) : null
    if (offerta && negozio) {
      return {
        prodottoId: String(v.prodottoId),
        centesimi: v.prezzoPrevistoCentesimi!,
        fonte: 'offerta',
        data: offerta.dal,
        validoDal: offerta.dal,
        validoAl: offerta.al,
        negozioId: String(negozio.id),
      }
    }
    return {
      prodottoId: String(v.prodottoId),
      centesimi: v.prezzoPrevistoCentesimi!,
      fonte: 'stima',
      data: giorno,
    }
  })
}
