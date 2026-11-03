import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Salva nel database tutti i supermercati di Roma da OpenStreetMap (D14, D17).
 * Lo fa anche il controllo settimanale del server. Uso: node ace negozi:importa
 * Dati © OpenStreetMap contributors (ODbL): l'app ne mostra l'attribuzione.
 */
export default class NegoziImporta extends BaseCommand {
  static commandName = 'negozi:importa'
  static description = 'Salva tutti i supermercati di Roma da OpenStreetMap'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { aggiornaNegoziRoma } = await import('#services/negozi/overpass')
    try {
      const esito = await aggiornaNegoziRoma((m) => this.logger.warning(m))
      this.logger.success(
        `${esito.trovati} supermercati a Roma, ${esito.salvati} salvati: ` +
          Object.entries(esito.perCatena)
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => `${c} ${n}`)
            .join(', ')
      )
    } catch (e) {
      this.logger.error(e instanceof Error ? e.message : String(e))
      this.exitCode = 1
    }
  }
}
