/**
 * Valori nutrizionali (D16): abbinamento del nome di un prodotto a un alimento della tabella CIQUAL
 * e calcolo per la quantità acquistata. Funzioni pure; i dati stanno nel database (tabelle `alimenti`
 * e `alimenti_it`). L'LLM non calcola mai valori nutrizionali (D4).
 */

export interface Abbinamento {
  /** Nome italiano dell'alimento generico, es. "Petto di pollo". */
  nome: string
  /** Espressioni che lo riconoscono nel nome di un prodotto, es. ["petto di pollo", "fesa di pollo"]. */
  parole: string[]
  /** Codice dell'alimento nella tabella CIQUAL. */
  codice: number
}

/** Nutrienti per 100 g (o 100 ml). `null` se la tabella non dà il valore. */
export interface Nutrienti {
  kcal: number | null
  proteine: number | null
  carboidrati: number | null
  zuccheri: number | null
  grassi: number | null
  saturi: number | null
  fibre: number | null
  sale: number | null
}

function parole(testo: string): string[] {
  return testo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** Posizione in cui le parole di `frase` compaiono di seguito tra quelle del nome, -1 se mancano. */
function posizione(nome: string[], frase: string[]): number {
  if (frase.length === 0) return -1
  for (let i = 0; i + frase.length <= nome.length; i++) {
    if (frase.every((p, j) => nome[i + j] === p)) return i
  }
  return -1
}

/**
 * L'alimento generico del nome di un prodotto: vince l'espressione più lunga trovata
 * ("pasta integrale" batte "pasta"); a parità, quella che compare prima nel nome, perché in italiano
 * il nome del prodotto viene per primo ("Pesche pasta gialla" sono pesche); poi l'ordine dell'elenco.
 */
export function alimentoDaNome(nome: string, abbinamenti: Abbinamento[]): Abbinamento | null {
  const nomeParole = parole(nome)
  let migliore: Abbinamento | null = null
  let lunghezza = 0
  let inizio = Infinity
  for (const a of abbinamenti) {
    for (const espressione of a.parole) {
      const frase = parole(espressione)
      const i = posizione(nomeParole, frase)
      if (i === -1) continue
      if (frase.length > lunghezza || (frase.length === lunghezza && i < inizio)) {
        migliore = a
        lunghezza = frase.length
        inizio = i
      }
    }
  }
  return migliore
}

const arrotonda = (n: number) => Math.round(n * 100) / 100

/** Valori per la quantità indicata in grammi (o ml), dai valori per 100. */
export function valoriPerQuantita(per100: Nutrienti, grammi: number): Nutrienti {
  const f = grammi / 100
  const per = (v: number | null) => (v === null ? null : arrotonda(v * f))
  return {
    kcal: per(per100.kcal),
    proteine: per(per100.proteine),
    carboidrati: per(per100.carboidrati),
    zuccheri: per(per100.zuccheri),
    grassi: per(per100.grassi),
    saturi: per(per100.saturi),
    fibre: per(per100.fibre),
    sale: per(per100.sale),
  }
}
