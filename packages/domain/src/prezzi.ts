/**
 * Scelta del prezzo di un prodotto per un negozio (docs/decisioni.md, D3 e D7).
 *
 * Priorità:
 * 1. offerta valida oggi nel negozio scelto (della sua catena o di quel punto vendita);
 * 2. prezzo inserito dall'utente nel negozio scelto;
 * 3. prezzo inserito dall'utente in un altro negozio (segnalato con `altroNegozio`);
 * 4. stima provinciale (Osservaprezzi, solo prodotti freschi);
 * 5. nessun prezzo: `null`, mai un valore inventato.
 */

/** Data di calendario in formato ISO `AAAA-MM-GG`. */
export type DataIso = string

export type FontePrezzo = 'offerta' | 'utente' | 'stima'

export interface Negozio {
  id: string
  catena: string
}

export interface Prezzo {
  prodottoId: string
  /** Importo in centesimi di euro, intero. */
  centesimi: number
  fonte: FontePrezzo
  /** Giorno in cui il prezzo è stato rilevato o pubblicato. */
  data: DataIso
  /** Punto vendita a cui si riferisce. Per un'offerta è facoltativo: senza, vale per tutta la catena. */
  negozioId?: string
  catena?: string
  validoDal?: DataIso
  validoAl?: DataIso
  /** Condizione per ottenere l'offerta, es. `carta-fedelta`. */
  condizione?: string
}

export interface PrezzoRisolto {
  centesimi: number
  fonte: FontePrezzo
  data: DataIso
  giorniEta: number
  vecchio: boolean
  altroNegozio: boolean
}

export interface RichiestaPrezzo {
  prodottoId: string
  negozio: Negozio
  prezzi: readonly Prezzo[]
  oggi: DataIso
  condizioniUtente?: readonly string[]
}

/** Oltre questa età un prezzo resta valido ma va mostrato come vecchio (D3). */
export const GIORNI_PREZZO_VECCHIO = 90

const MS_GIORNO = 24 * 60 * 60 * 1000

function giorniTra(da: DataIso, a: DataIso): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / MS_GIORNO)
}

function offertaApplicabile(p: Prezzo, r: RichiestaPrezzo): boolean {
  if (p.validoDal === undefined || p.validoAl === undefined) return false
  if (r.oggi < p.validoDal || r.oggi > p.validoAl) return false
  const stessoNegozio = p.negozioId === undefined ? p.catena === r.negozio.catena : p.negozioId === r.negozio.id
  if (!stessoNegozio) return false
  return p.condizione === undefined || (r.condizioniUtente ?? []).includes(p.condizione)
}

function piuRecente(prezzi: Prezzo[]): Prezzo | undefined {
  return prezzi.reduce<Prezzo | undefined>((migliore, p) => (migliore === undefined || p.data > migliore.data ? p : migliore), undefined)
}

function piuConveniente(prezzi: Prezzo[]): Prezzo | undefined {
  return prezzi.reduce<Prezzo | undefined>((migliore, p) => (migliore === undefined || p.centesimi < migliore.centesimi ? p : migliore), undefined)
}

function risolto(p: Prezzo, oggi: DataIso, altroNegozio: boolean): PrezzoRisolto {
  const giorniEta = giorniTra(p.data, oggi)
  return { centesimi: p.centesimi, fonte: p.fonte, data: p.data, giorniEta, vecchio: giorniEta > GIORNI_PREZZO_VECCHIO, altroNegozio }
}

export function risolviPrezzo(r: RichiestaPrezzo): PrezzoRisolto | null {
  const delProdotto = r.prezzi.filter((p) => p.prodottoId === r.prodottoId)

  const offerta = piuConveniente(delProdotto.filter((p) => p.fonte === 'offerta' && offertaApplicabile(p, r)))
  if (offerta) return risolto(offerta, r.oggi, false)

  const dellUtente = delProdotto.filter((p) => p.fonte === 'utente')
  const nelNegozio = piuRecente(dellUtente.filter((p) => p.negozioId === r.negozio.id))
  if (nelNegozio) return risolto(nelNegozio, r.oggi, false)

  const altrove = piuRecente(dellUtente.filter((p) => p.negozioId !== r.negozio.id))
  if (altrove) return risolto(altrove, r.oggi, true)

  const stima = piuRecente(delProdotto.filter((p) => p.fonte === 'stima'))
  if (stima) return risolto(stima, r.oggi, false)

  return null
}
