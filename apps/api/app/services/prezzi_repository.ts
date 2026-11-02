import type { Negozio as NegozioDominio, Prezzo } from '@spesa/domain'
import type Negozio from '#models/negozio'
import PrezzoUtente from '#models/prezzo_utente'

/**
 * Ponte tra database e dominio: legge i prezzi e li restituisce come `Prezzo[]`.
 * La scelta del prezzo resta in `risolviPrezzo` (@spesa/domain): qui non si decidono priorità.
 * Fase 1: solo prezzi dell'utente. Offerte e stime arrivano con la fase 2 (piano database).
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
