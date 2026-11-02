import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LettoreVolantino } from '#services/volantini/importa'

/**
 * Salva su disco ogni lettura riuscita, indicizzata dall'hash del PDF, prima che si scriva nel
 * database: se il salvataggio fallisce (es. connessione a Turso caduta, 2026-11-02) il nuovo
 * tentativo riusa la lettura già pagata. Contiene solo offerte pubbliche dei volantini.
 */
export function conCache(leggi: LettoreVolantino, cartella: string): LettoreVolantino {
  return async (pdf, contesto) => {
    const file = join(cartella, `${createHash('sha256').update(pdf).digest('hex')}.json`)
    try {
      const salvata = JSON.parse(await readFile(file, 'utf8'))
      // Già pagata: dalla cache non si registra un nuovo costo.
      return { ...salvata, usage: { input: 0, output: 0, cacheLettura: 0 } }
    } catch {
      // Nessuna lettura salvata: si chiama il modello.
    }
    const lettura = await leggi(pdf, contesto)
    if (lettura.esito === 'ok') {
      await mkdir(cartella, { recursive: true })
      await writeFile(file, JSON.stringify(lettura))
    }
    return lettura
  }
}
