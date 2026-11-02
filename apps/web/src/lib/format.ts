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
