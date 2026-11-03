import { DateTime } from 'luxon'

/**
 * Lettura delle pagine ufficiali delle catene per sapere quali volantini sono pubblicati (D7, D15).
 * Funzioni pure sul testo HTML: la rete sta in controlla.ts. Il formato delle pagine può cambiare:
 * se non si trova nulla si restituisce un elenco vuoto e il controllo lo segnala come errore.
 */

const MESI = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
]

function iso(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

/** "Dal 23 Ottobre al 3 Novembre 2026", "Dal 6 all' 11 Novembre 2026". */
export function dateItaliane(testo: string): { dal: string; al: string } | null {
  const mesi = MESI.join('|')
  const m = new RegExp(
    `dal\\s+(\\d{1,2})(?:\\s+(${mesi}))?\\s+al(?:l['’]?)?\\s*(\\d{1,2})\\s+(${mesi})\\s+(\\d{4})`,
    'i'
  ).exec(testo)
  if (!m) return null
  const meseAl = MESI.indexOf(m[4].toLowerCase()) + 1
  const meseDal = m[2] ? MESI.indexOf(m[2].toLowerCase()) + 1 : meseAl
  const annoAl = Number(m[5])
  const annoDal = meseDal > meseAl ? annoAl - 1 : annoAl
  return { dal: iso(annoDal, meseDal, Number(m[1])), al: iso(annoAl, meseAl, Number(m[3])) }
}

function decodifica(testo: string): string {
  return testo
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export interface VolantinoInElenco {
  /** Insegna (GROS) o slug del volantino (Elite). */
  chiave: string
  titolo: string
  pagina: string
  /** Null se la scheda non le riporta: le legge il modello dal PDF. */
  validoDal: string | null
  validoAl: string | null
}

/** "prezzi-tondi-1eur-e-2eur-2" → "Prezzi tondi 1eur e 2eur". */
function titoloDaSlug(slug: string): string {
  const parole = slug.replace(/-\d+$/, '').replace(/-/g, ' ')
  return parole.charAt(0).toUpperCase() + parole.slice(1)
}

/**
 * Elenco delle promozioni dei siti con il componente "myego" (GROS su cedigros.com, Elite su
 * superelite.it). Per GROS i link sono `/promozioni/<insegna>/<slug>` e si tengono solo le insegne
 * indicate; per Elite sono `/promozioni/<slug>` (`insegne` null: tutte).
 */
export function elencoMyego(
  html: string,
  base: string,
  insegne: string[] | null
): VolantinoInElenco[] {
  const link = /href="(\/promozioni\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)"/g
  const posizioni = [...html.matchAll(link)].map((m) => ({ percorso: m[1], inizio: m.index! }))
  const testi = new Map<string, string>()
  posizioni.forEach((p, i) => {
    const fine = posizioni.slice(i + 1).find((q) => q.percorso !== p.percorso)?.inizio
    testi.set(p.percorso, (testi.get(p.percorso) ?? '') + html.slice(p.inizio, fine))
  })

  const trovati: VolantinoInElenco[] = []
  for (const [percorso, testo] of testi) {
    const parti = percorso.split('/').slice(2)
    const chiave = parti[0]
    if (insegne ? parti.length !== 2 || !insegne.includes(chiave) : parti.length !== 1) continue
    const date = dateItaliane(decodifica(testo.replace(/<[^>]+>/g, ' ')))
    const h3 = /<h3[^>]*>([^<]+)<\/h3>/.exec(testo)
    // Una scheda di volantino ha le date o un titolo; gli altri link a /promozioni no.
    if (!date && !h3) continue
    trovati.push({
      chiave,
      titolo: h3 ? decodifica(h3[1]).trim() : insegne ? 'Volantino' : titoloDaSlug(chiave),
      pagina: new URL(percorso, base).toString(),
      validoDal: date?.dal ?? null,
      validoAl: date?.al ?? null,
    })
  }
  return trovati
}

/** Link "Scarica in PDF" della pagina di un volantino myego. */
export function pdfMyego(html: string, base: string): string | null {
  const m = /['"]([^'"]*option=com_myegojwt[^'"]*view=flyer[^'"]*pdf=1[^'"]*)['"]/.exec(html)
  return m ? new URL(decodifica(m[1]), base).toString() : null
}

/** PDF del volantino Todis della regione; la versione accessibile (`_ACC`) è un doppione. */
export function pdfTodis(html: string): string[] {
  const pdf = [
    ...html.matchAll(/href="(https:\/\/www\.todis\.it\/wp-content\/uploads\/[^"]+\.pdf[^"]*)"/g),
  ]
    .map((m) => decodifica(m[1]))
    .filter((u) => !/_ACC\.pdf/i.test(u))
  return [...new Set(pdf)]
}

/**
 * Link ai volantini dalla pagina di un negozio Conad (`/volantini/<slug>?anacanId=<id>`).
 * Nella pagina stanno anche dentro dati JSON codificati, con l'indirizzo completo.
 */
export function linkVolantiniConad(html: string, base: string): string[] {
  const link = [
    ...decodifica(html).matchAll(
      /(?:https:\/\/www\.conad\.it)?(\/volantini\/[A-Za-z0-9-]+\?anacanId=\d+)/g
    ),
  ].map((m) => new URL(m[1], base).toString())
  return [...new Set(link)]
}

/** Titolo, PDF e validità dai dati `data-flyer` della pagina di un volantino Conad. */
export function volantinoConad(
  html: string
): { titolo: string; pdf: string; validoDal: string; validoAl: string } | null {
  const m = /data-flyer="([^"]+)"/.exec(html)
  if (!m) return null
  let dati: {
    title?: string
    pdfUrl?: string
    validFrom?: number
    validTo?: number
    disabledDownload?: boolean
  }
  try {
    dati = JSON.parse(decodifica(m[1]))
  } catch {
    return null
  }
  if (dati.disabledDownload !== false || !dati.pdfUrl || !dati.validFrom || !dati.validTo) {
    return null
  }
  const giorno = (ms: number) => DateTime.fromMillis(ms, { zone: 'Europe/Rome' }).toISODate()!
  return {
    titolo: dati.title ?? 'Volantino',
    pdf: dati.pdfUrl,
    validoDal: giorno(dati.validFrom),
    validoAl: giorno(dati.validTo),
  }
}
