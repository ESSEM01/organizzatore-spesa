import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Carica i valori nutrizionali (CIQUAL 2020) e gli abbinamenti degli alimenti italiani dai CSV in
 * database/data (D16). Da rilanciare quando cambiano i CSV. Nessun costo, nessuna rete.
 * Uso: node ace nutrizione:importa
 */
export default class NutrizioneImporta extends BaseCommand {
  static commandName = 'nutrizione:importa'
  static description = 'Carica i valori nutrizionali CIQUAL e gli alimenti italiani abbinati'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { importaNutrizione } = await import('#services/nutrizione/importa')
    const esito = await importaNutrizione(this.app.makePath('database/data'))
    this.logger.success(
      `${esito.alimenti} alimenti CIQUAL, ${esito.abbinamenti} alimenti italiani abbinati`
    )
  }
}
