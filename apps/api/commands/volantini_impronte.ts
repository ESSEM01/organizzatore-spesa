import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Calcola l'impronta delle immagini dei volantini già letti che non ce l'hanno, dai PDF salvati in
 * `data/volantini/<data>/` (D15). Serve una volta, per i volantini letti prima delle impronte.
 * Uso: node ace volantini:impronte. Nessun costo: niente chiamate al modello.
 */
export default class VolantiniImpronte extends BaseCommand {
  static commandName = 'volantini:impronte'
  static description = 'Calcola le impronte mancanti dei volantini dai PDF salvati su disco'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: Volantino } = await import('#models/volantino')
    const { improntaDaSalvare } = await import('#services/volantini/impronta')

    const radice = this.app.makePath('../../data/volantini')
    const voci = await readdir(radice, { withFileTypes: true })
    const cartelle = voci
      .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort()
      .reverse()

    const senza = await Volantino.query().whereNull('impronte').whereNotNull('file')
    for (const v of senza) {
      let pdf: Buffer | null = null
      for (const cartella of cartelle) {
        pdf = await readFile(join(radice, cartella, v.file!)).catch(() => null)
        if (pdf) break
      }
      if (!pdf) {
        this.logger.warning(`${v.file}: PDF non trovato su disco`)
        continue
      }
      v.impronte = await improntaDaSalvare(pdf)
      await v.save()
      this.logger.success(`${v.file}: ${v.impronte?.split(',').length ?? 0} immagini`)
    }
  }
}
