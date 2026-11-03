/**
 * Lettura della pagina "Archivio rilevazioni beni e servizi di largo consumo" di Osservaprezzi (D1).
 * La tabella è nell'HTML (verificato il 2026-11-03): prezzi in euro con il punto decimale,
 * quantità tra parentesi alla fine del nome, es. "Petto Di Pollo (1000 Gr)".
 */

export interface RigaOsservaprezzi {
  voce: string
  quantita: number | null
  unita: 'g' | 'ml' | 'pz' | null
  minCentesimi: number
  maxCentesimi: number
  medioCentesimi: number
}

export interface PaginaOsservaprezzi {
  /** Anno, mese e provincia selezionati nei filtri: il sito ripiega su altri valori se non li riconosce. */
  selezione: { anno: number | null; mese: number | null; provincia: string | null }
  righe: RigaOsservaprezzi[]
}

const UNITA: Record<string, 'g' | 'ml' | 'pz'> = { gr: 'g', g: 'g', ml: 'ml', pz: 'pz' }

function testo(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function centesimi(valore: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(valore)) return null
  return Math.round(Number(valore) * 100)
}

function quantita(voce: string): { quantita: number | null; unita: RigaOsservaprezzi['unita'] } {
  const m = /\((\d+(?:[.,]\d+)?)\s*([a-z]+)\)\s*$/i.exec(voce)
  const unita = m ? UNITA[m[2].toLowerCase()] : undefined
  if (!m || !unita) return { quantita: null, unita: null }
  return { quantita: Number(m[1].replace(',', '.')), unita }
}

function selezionato(html: string, nome: string): string | null {
  const select = new RegExp(
    `<select[^>]*name="${nome.replace(/[[\]]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</select>`
  ).exec(html)
  const opzione = select && /<option[^>]*selected[^>]*value="([^"]*)"/.exec(select[1])
  return opzione ? opzione[1] : null
}

export function leggiPaginaOsservaprezzi(html: string): PaginaOsservaprezzi {
  const inizio = html.indexOf('id="id-table-results"')
  if (inizio === -1)
    throw new Error('Osservaprezzi: tabella dei risultati non trovata, la pagina è cambiata')
  const tabella = html.slice(inizio, html.indexOf('</table>', inizio))

  const righe: RigaOsservaprezzi[] = []
  for (const [, tr] of tabella.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const celle = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => testo(c[1]))
    if (celle.length < 4) continue
    const [voce, min, max, medio] = celle
    const prezzi = [centesimi(min), centesimi(max), centesimi(medio)]
    if (!voce || prezzi.some((p) => p === null)) continue
    righe.push({
      voce,
      ...quantita(voce),
      minCentesimi: prezzi[0]!,
      maxCentesimi: prezzi[1]!,
      medioCentesimi: prezzi[2]!,
    })
  }

  const numero = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)
  return {
    selezione: {
      anno: numero(selezionato(html, 'ANNO')),
      mese: numero(selezionato(html, 'MESE')),
      provincia: selezionato(html, 'f[PROVINCIA]'),
    },
    righe,
  }
}
