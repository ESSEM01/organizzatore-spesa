import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Legge volantini PDF con Claude e salva le offerte come proposte (D7, D13 fase A).
 * Uso: node ace volantini:leggi ../../data/volantini/2026-11-02/gros-ma-2026-10-23_2026-11-03.pdf
 * Richiede ANTHROPIC_API_KEY nell'ambiente. Ogni volantino costa circa $0,30 ogni 20 pagine.
 */
export default class VolantiniLeggi extends BaseCommand {
  static commandName = 'volantini:leggi'
  static description = 'Legge volantini PDF con Claude e salva le offerte nel database'
  static options: CommandOptions = { startApp: true }

  @args.spread({ description: 'Percorsi dei PDF da leggere' })
  declare file: string[]

  async run() {
    const { default: env } = await import('#start/env')
    const chiave = env.get('ANTHROPIC_API_KEY')?.release()
    if (!chiave) {
      this.logger.error('Manca ANTHROPIC_API_KEY: aggiungila in apps/api/.env')
      this.exitCode = 1
      return
    }
    const { importaVolantino } = await import('#services/volantini/importa')
    const { creaLettoreClaude } = await import('#services/volantini/lettore_claude')
    const { conCache } = await import('#services/volantini/cache')
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const { default: db } = await import('@adonisjs/lucid/services/db')
    // Le letture pagate restano su disco (escluso da git) finché non sono salvate nel database.
    const leggi = conCache(
      creaLettoreClaude(new Anthropic({ apiKey: chiave })),
      this.app.makePath('../../data/volantini/letture')
    )
    const connessioneCaduta = (e: unknown) =>
      e instanceof Error && /ECONNRESET|Stream is closed|socket hang up|ETIMEDOUT/.test(e.message)

    for (const percorso of this.file) {
      const nome = basename(percorso)
      const inizio = Date.now()
      this.logger.info(`Leggo ${nome}…`)
      try {
        const pdf = await readFile(percorso)
        // Turso chiude le connessioni rimaste ferme durante letture lunghe: se ne apre una nuova per ogni
        // volantino, e se cade comunque si riprova una volta (la lettura è in cache, non si ripaga).
        await db.manager.closeAll()
        const esito = await importaVolantino(nome, pdf, leggi).catch(async (e) => {
          if (!connessioneCaduta(e)) throw e
          this.logger.warning(`${nome}: connessione al database caduta, riprovo`)
          await db.manager.closeAll()
          return importaVolantino(nome, pdf, leggi)
        })
        const secondi = Math.round((Date.now() - inizio) / 1000)
        if (esito.stato === 'errore') {
          this.logger.error(`${nome}: ${esito.errore}`)
          this.exitCode = 1
        } else if (esito.stato === 'gia_letto') {
          this.logger.info(`${nome}: già letto, salto`)
        } else {
          this.logger.success(
            `${nome}: ${esito.offerte} offerte salvate, ${esito.scartate} scartate (${secondi} s)`
          )
        }
      } catch (e) {
        this.logger.error(`${nome}: ${e instanceof Error ? e.message : String(e)}`)
        this.exitCode = 1
      }
    }
  }
}
