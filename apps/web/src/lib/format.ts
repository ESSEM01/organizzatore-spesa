// Per l'italiano Intl omette il separatore delle migliaia sotto 10.000 ("1234,56 €"): in colonna i prezzi si leggono meglio sempre separati.
const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' })

const km = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Distanza leggibile: metri arrotondati a 10 sotto il chilometro, poi km con un decimale. */
export function formatDistanza(metri: number): string {
  const arrotondati = Math.round(metri / 10) * 10
  return arrotondati < 1000 ? `${arrotondati} m` : `${km.format(metri / 1000)} km`
}

/** Formatta un importo in centesimi interi come valuta italiana, es. 1234 → "12,34 €". */
export function formatEuro(centesimi: number): string {
  return euro.format(centesimi / 100)
}

/**
 * Importo scritto dall'utente ("1,29", "1.234,50 €", "3.49") in centesimi interi.
 * `null` se non è un importo valido: niente arrotondamenti silenziosi oltre i centesimi.
 */
export function leggiEuro(testo: string): number | null {
  let t = testo.replace(/[\s€]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/** Data di oggi sul telefono, `AAAA-MM-GG`: il server lavora in UTC, l'utente in Italia. */
export function oggiLocale(adesso: Date = new Date()): string {
  const due = (n: number) => String(n).padStart(2, '0')
  return `${adesso.getFullYear()}-${due(adesso.getMonth() + 1)}-${due(adesso.getDate())}`
}
