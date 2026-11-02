// Per l'italiano Intl omette il separatore delle migliaia sotto 10.000 ("1234,56 €"): in colonna i prezzi si leggono meglio sempre separati.
const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' })

/** Formatta un importo in centesimi interi come valuta italiana, es. 1234 → "12,34 €". */
export function formatEuro(centesimi: number): string {
  return euro.format(centesimi / 100)
}
