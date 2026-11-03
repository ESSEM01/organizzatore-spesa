import type { Nutrienti } from './nutrizione.js'

/**
 * Lista generata dall'IA (D13, D18). Il modello sceglie cosa comprare e quanto (`VocePiano`);
 * qui, senza modello, si sceglie la confezione, si calcolano prezzi e totali, si rientra nel budget
 * e si sceglie il negozio. Importi in centesimi interi.
 */

/** Un alimento generico della lista, con la quantità totale per il periodo. */
export interface VocePiano {
  /** Codice CIQUAL dell'alimento (tabella `alimenti`). */
  codice: number
  nome: string
  /** Grammi (o ml) per tutte le persone e tutto il periodo. */
  grammi: number
  /** 1 essenziale, 2 importante, 3 utile ma rinunciabile. */
  priorita: 1 | 2 | 3
}

/** Un modo di comprare l'alimento in un negozio: un'offerta del volantino o la stima Osservaprezzi. */
export interface OpzioneAcquisto {
  nome: string
  /** Prezzo della confezione; per la stima, il prezzo medio di `grammiConfezione` (di solito 1 kg). */
  centesimi: number
  grammiConfezione: number
  fonte: 'offerta' | 'stima'
  offertaId: number | null
  /** Condizioni stampate sul volantino (carta fedeltà, 3x2…). */
  condizione?: string | null
}

export interface VocePrezzata extends VocePiano {
  scelta: OpzioneAcquisto
  /** Confezioni intere da comprare; null per la stima, che si paga a peso. */
  confezioni: number | null
  centesimi: number
}

export interface ListaPrezzata {
  voci: VocePrezzata[]
  /** Alimenti senza prezzo in questo negozio: fuori dal totale, l'app lo dice (D3). */
  mancanti: VocePiano[]
  totaleCentesimi: number
}

function costo(voce: VocePiano, o: OpzioneAcquisto): { confezioni: number | null; centesimi: number } {
  if (o.fonte === 'stima') {
    return { confezioni: null, centesimi: Math.round((o.centesimi * voce.grammi) / o.grammiConfezione) }
  }
  const confezioni = Math.max(1, Math.ceil(voce.grammi / o.grammiConfezione))
  return { confezioni, centesimi: confezioni * o.centesimi }
}

/** Per ogni alimento sceglie il modo più economico di comprarne la quantità chiesta. */
export function prezzaPiano(piano: readonly VocePiano[], opzioniDi: (codice: number) => OpzioneAcquisto[]): ListaPrezzata {
  const lista: ListaPrezzata = { voci: [], mancanti: [], totaleCentesimi: 0 }
  for (const voce of piano) {
    let migliore: VocePrezzata | null = null
    for (const o of opzioniDi(voce.codice)) {
      if (o.grammiConfezione <= 0 || o.centesimi < 0) continue
      const c = costo(voce, o)
      if (!migliore || c.centesimi < migliore.centesimi) migliore = { ...voce, scelta: o, ...c }
    }
    if (migliore) {
      lista.voci.push(migliore)
      lista.totaleCentesimi += migliore.centesimi
    } else {
      lista.mancanti.push(voce)
    }
  }
  return lista
}

export interface ListaNelBudget extends ListaPrezzata {
  /** Voci tolte per rientrare nel budget, nell'ordine in cui sono state tolte. */
  tolte: VocePrezzata[]
  /** Quanto si resta sopra il budget dopo aver tolto tutto il rinunciabile; 0 se si rientra. */
  sforamentoCentesimi: number
}

/**
 * Rientra nel budget togliendo prima le voci di priorità 3, poi 2, a partire dalla più cara.
 * Le voci essenziali (priorità 1) non si tolgono: se non basta si dichiara lo sforamento (D13: vince
 * il budget, e l'app lo dice).
 */
export function riduciAlBudget(lista: ListaPrezzata, budgetCentesimi: number): ListaNelBudget {
  const voci = [...lista.voci]
  const tolte: VocePrezzata[] = []
  let totale = lista.totaleCentesimi
  const candidate = voci
    .filter((v) => v.priorita > 1)
    .sort((a, b) => b.priorita - a.priorita || b.centesimi - a.centesimi)
  for (const v of candidate) {
    if (totale <= budgetCentesimi) break
    voci.splice(voci.indexOf(v), 1)
    tolte.push(v)
    totale -= v.centesimi
  }
  return {
    voci,
    mancanti: lista.mancanti,
    totaleCentesimi: totale,
    tolte,
    sforamentoCentesimi: Math.max(0, totale - budgetCentesimi),
  }
}

export interface CandidatoNegozio {
  negozioId: number
  totaleCentesimi: number
  distanzaMetri: number
  /** Alimenti senza prezzo in quel negozio. */
  mancanti: number
}

export interface SceltaNegozio<C extends CandidatoNegozio> {
  scelto: C | null
  nelBudget: boolean
  /** Candidati in ordine: prima quelli nel budget per costo effettivo, poi gli altri per sforamento. */
  classifica: (C & { costoEffettivoCentesimi: number })[]
}

/**
 * Regola di D13: il budget è un vincolo rigido; tra i negozi nel budget vince il costo effettivo più
 * basso (totale + km × costo al km); a parità il più vicino. Se tutti sforano, vince chi sfora di meno.
 */
export function scegliNegozio<C extends CandidatoNegozio>(
  candidati: readonly C[],
  budgetCentesimi: number,
  centesimiPerKm = 150,
): SceltaNegozio<C> {
  const conCosto = candidati.map((c) => ({
    ...c,
    costoEffettivoCentesimi: Math.round(c.totaleCentesimi + (c.distanzaMetri / 1000) * centesimiPerKm),
  }))
  const nel = conCosto
    .filter((c) => c.totaleCentesimi <= budgetCentesimi)
    .sort((a, b) => a.costoEffettivoCentesimi - b.costoEffettivoCentesimi || a.distanzaMetri - b.distanzaMetri)
  const fuori = conCosto
    .filter((c) => c.totaleCentesimi > budgetCentesimi)
    .sort((a, b) => a.totaleCentesimi - b.totaleCentesimi || a.distanzaMetri - b.distanzaMetri)
  const classifica = [...nel, ...fuori]
  return { scelto: classifica[0] ?? null, nelBudget: nel.length > 0, classifica }
}

export interface RiepilogoNutrizionale {
  /** Valori medi a persona e al giorno, dagli alimenti con valori noti. */
  alGiorno: { kcal: number; proteine: number; carboidrati: number; grassi: number; fibre: number }
  /** Quota dell'energia da proteine, carboidrati e grassi (0-1). */
  quoteEnergia: { proteine: number; carboidrati: number; grassi: number }
  /** Quota dei grammi della lista con valori nutrizionali noti (0-1). */
  copertura: number
}

/** Valori nutrizionali della lista a persona e al giorno (D16). Calcolo deterministico, mai dell'LLM (D4). */
export function riepilogoNutrizionale(
  voci: readonly { grammi: number; per100: Nutrienti | null }[],
  persone: number,
  giorni: number,
): RiepilogoNutrizionale {
  const somma = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0 }
  let noti = 0
  let totale = 0
  for (const v of voci) {
    totale += v.grammi
    if (!v.per100 || v.per100.kcal === null) continue
    noti += v.grammi
    const f = v.grammi / 100
    somma.kcal += v.per100.kcal * f
    somma.proteine += (v.per100.proteine ?? 0) * f
    somma.carboidrati += (v.per100.carboidrati ?? 0) * f
    somma.grassi += (v.per100.grassi ?? 0) * f
    somma.fibre += (v.per100.fibre ?? 0) * f
  }
  const quote = Math.max(1, persone * giorni)
  const alGiorno = {
    kcal: Math.round(somma.kcal / quote),
    proteine: Math.round(somma.proteine / quote),
    carboidrati: Math.round(somma.carboidrati / quote),
    grassi: Math.round(somma.grassi / quote),
    fibre: Math.round(somma.fibre / quote),
  }
  const energia = somma.proteine * 4 + somma.carboidrati * 4 + somma.grassi * 9
  const quota = (kcal: number) => (energia > 0 ? Math.round((kcal / energia) * 100) / 100 : 0)
  return {
    alGiorno,
    quoteEnergia: {
      proteine: quota(somma.proteine * 4),
      carboidrati: quota(somma.carboidrati * 4),
      grassi: quota(somma.grassi * 9),
    },
    copertura: totale > 0 ? Math.round((noti / totale) * 100) / 100 : 0,
  }
}
