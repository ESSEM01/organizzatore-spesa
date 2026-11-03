import { createHash } from 'node:crypto'
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'

/**
 * Impronta di un volantino: gli hash delle immagini che contiene (D15). GROS ed Elite rigenerano il
 * PDF a ogni download, quindi l'hash del file cambia, ma le immagini delle pagine restano identiche;
 * Elite pubblica anche lo stesso volantino sotto due indirizzi con copertina e ultima pagina diverse.
 */
export async function improntaPdf(pdf: Buffer): Promise<string[]> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true })
  const hash = new Set<string>()
  for (const pagina of doc.getPages()) {
    const oggetti = pagina.node.Resources()?.lookup(PDFName.of('XObject'))
    if (!oggetti || !('entries' in oggetti)) continue
    for (const [, rif] of (oggetti as { entries(): [unknown, unknown][] }).entries()) {
      const oggetto = doc.context.lookup(rif as Parameters<typeof doc.context.lookup>[0])
      if (
        oggetto instanceof PDFRawStream &&
        oggetto.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')
      ) {
        hash.add(createHash('sha256').update(oggetto.contents).digest('hex').slice(0, 16))
      }
    }
  }
  return [...hash].sort()
}

/** Quota di immagini in comune rispetto al volantino più grande, da 0 a 1. */
export function somiglianza(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const insieme = new Set(a)
  const comuni = b.filter((h) => insieme.has(h)).length
  return comuni / Math.max(a.length, b.length)
}

/** Da questa quota in su due volantini della stessa catena sono lo stesso volantino. */
export const SOGLIA_DOPPIONE = 0.8

/** Impronta da salvare in `volantini.impronte`; null se il PDF non si apre o non ha immagini. */
export async function improntaDaSalvare(pdf: Buffer): Promise<string | null> {
  try {
    const hash = await improntaPdf(pdf)
    return hash.length ? hash.join(',') : null
  } catch {
    return null
  }
}

/** Impronta salvata → elenco di hash. */
export function leggiImpronta(salvata: string | null): string[] {
  return salvata ? salvata.split(',') : []
}
