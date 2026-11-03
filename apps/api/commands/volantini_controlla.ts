import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Controlla subito se sono usciti volantini nuovi, li scarica e li legge (D15).
 * È lo stesso controllo che il server fa da solo una volta a settimana con CONTROLLO_VOLANTINI=true.
 * Uso: node ace volantini:controlla. Costo: circa $1 per volantino nuovo.
 */
export default class VolantiniControlla extends BaseCommand {
  static commandName = 'volantini:controlla'
  static description =
    'Cerca volantini nuovi sui siti delle catene, li scarica e li legge con Claude'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: env } = await import('#start/env')
    const chiave = env.get('ANTHROPIC_API_KEY')?.release()
    if (!chiave) {
      this.logger.error('Manca ANTHROPIC_API_KEY: aggiungila in apps/api/.env')
      this.exitCode = 1
      return
    }
    const { eseguiControllo } = await import('#services/volantini/pianificazione')
    const esito = await eseguiControllo(chiave, this.app.makePath('../..'), (m) =>
      this.logger.warning(m)
    )
    this.logger.success(
      `${esito.trovati} volantini pubblicati, ${esito.nuovi} nuovi, ${esito.letti} letti, ${esito.offerte} offerte salvate`
    )
    for (const errore of esito.errori) this.logger.warning(errore)
  }
}
