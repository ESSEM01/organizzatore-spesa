/** CSV con intestazione (RFC 4180: virgolette, virgole e virgolette raddoppiate nei campi). */
export function leggiCsv(testo: string): Record<string, string>[] {
  const righe: string[][] = []
  let riga: string[] = []
  let campo = ''
  let tra = false
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]
    if (tra) {
      if (c === '"' && testo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') tra = false
      else campo += c
    } else if (c === '"') tra = true
    else if (c === ',') {
      riga.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++
      riga.push(campo)
      righe.push(riga)
      riga = []
      campo = ''
    } else campo += c
  }
  if (campo !== '' || riga.length > 0) {
    riga.push(campo)
    righe.push(riga)
  }
  const [intestazione, ...dati] = righe.filter((r) => r.length > 1 || r[0] !== '')
  return dati.map((r) => Object.fromEntries(intestazione.map((k, j) => [k, r[j] ?? ''])))
}
