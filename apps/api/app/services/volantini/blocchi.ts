import { PDFDocument } from 'pdf-lib'
import type { LetturaVolantino, LettoreVolantino } from '#services/volantini/importa'
import type { OffertaLetta } from '#services/volantini/schema'

/**
 * Legge il volantino a blocchi di pagine: con centinaia di offerte una sola risposta si tronca
 * (GROS Pewex, 28 pagine, 2026-11-02) o si ferma a metà (GROS MA: 27 offerte su 16 pagine).
 * Le pagine tornano numerate come nel volantino intero. Se un blocco fallisce si ferma e fallisce
 * tutta la lettura: un volantino a metà non si salva.
 */
export function aBlocchi(leggi: LettoreVolantino, paginePerBlocco: number): LettoreVolantino {
  return async (pdf, contesto) => {
    const sorgente = await PDFDocument.load(pdf, { ignoreEncryption: true })
    const totale = sorgente.getPageCount()
    const usage = { input: 0, output: 0, cacheLettura: 0 }
    const offerte: OffertaLetta[] = []
    let validoDal: string | null = null
    let validoAl: string | null = null
    let ultima: LetturaVolantino | null = null

    for (let inizio = 0; inizio < totale; inizio += paginePerBlocco) {
      const fine = Math.min(inizio + paginePerBlocco, totale)
      const blocco = await PDFDocument.create()
      const indici = Array.from({ length: fine - inizio }, (_, i) => inizio + i)
      for (const pagina of await blocco.copyPages(sorgente, indici)) blocco.addPage(pagina)

      const lettura = await leggi(Buffer.from(await blocco.save()), contesto)
      ultima = lettura
      usage.input += lettura.usage.input
      usage.output += lettura.usage.output
      usage.cacheLettura += lettura.usage.cacheLettura

      if (lettura.esito !== 'ok' || !lettura.dati) {
        return {
          ...lettura,
          usage,
          dati: null,
          errore: `pagine ${inizio + 1}-${fine}: ${lettura.errore ?? lettura.esito}`,
        }
      }
      validoDal ??= lettura.dati.valido_dal
      validoAl ??= lettura.dati.valido_al
      offerte.push(...lettura.dati.offerte.map((o) => ({ ...o, pagina: o.pagina + inizio })))
    }

    return {
      esito: 'ok',
      modello: ultima?.modello ?? '',
      stopReason: ultima?.stopReason ?? null,
      usage,
      dati: { valido_dal: validoDal, valido_al: validoAl, offerte },
    }
  }
}
