import type { PrezzoRisolto } from './prezzi.js'

export interface VoceLista {
  prodottoId: string
  /** Numero di confezioni, intero positivo. */
  quantita: number
}

export interface TotaleLista {
  /** Somma dei prodotti con un prezzo, stime incluse. */
  totaleCentesimi: number
  /** Prodotti fuori dal totale perché senza prezzo: l'app lo deve dire, non inventarlo (D3). */
  senzaPrezzo: string[]
  /** Prodotti nel totale con un prezzo stimato, da mostrare come tali. */
  stimati: string[]
}

export function totaleLista(voci: readonly VoceLista[], prezzoDi: (prodottoId: string) => PrezzoRisolto | null): TotaleLista {
  const esito: TotaleLista = { totaleCentesimi: 0, senzaPrezzo: [], stimati: [] }

  for (const voce of voci) {
    if (!Number.isInteger(voce.quantita) || voce.quantita <= 0) {
      throw new RangeError(`La quantità di "${voce.prodottoId}" deve essere un intero positivo, non ${voce.quantita}`)
    }
    const prezzo = prezzoDi(voce.prodottoId)
    if (prezzo === null) {
      esito.senzaPrezzo.push(voce.prodottoId)
      continue
    }
    esito.totaleCentesimi += prezzo.centesimi * voce.quantita
    if (prezzo.fonte === 'stima') esito.stimati.push(voce.prodottoId)
  }

  return esito
}
