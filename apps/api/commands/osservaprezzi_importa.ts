import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Importa le medie mensili di Osservaprezzi per Roma (D1, D16). Senza --anno e --mese prende il mese
 * più recente pubblicato. Lo fa anche il controllo settimanale del server. Nessun costo.
 * Uso: node ace osservaprezzi:importa [--anno=2026 --mese=9]
 */
export default class OsservaprezziImporta extends BaseCommand {
  static commandName = 'osservaprezzi:importa'
  static description = 'Importa le medie mensili dei prezzi di Osservaprezzi per Roma'
  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Anno della rilevazione' })
  declare anno?: number

  @flags.number({ description: 'Mese della rilevazione (1-12)' })
  declare mese?: number

  async run() {
    const { importaOsservaprezzi, scaricaOsservaprezzi } =
      await import('#services/osservaprezzi/importa')
    const esito = await importaOsservaprezzi({
      scarica: scaricaOsservaprezzi,
      sigla: 'RM',
      ...(this.anno && this.mese && { anno: this.anno, mese: this.mese }),
    })
    this.logger.success(
      `Osservaprezzi Roma ${esito.mese}/${esito.anno}: ${esito.righe} medie salvate`
    )
    for (const errore of esito.errori) this.logger.warning(errore)
    if (esito.errori.length) this.exitCode = 1
  }
}
