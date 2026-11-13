import { BaseSchema } from '@adonisjs/lucid/schema'
import { normalizzaEmailUtenti } from '#services/account/normalizza_email'

/**
 * Email degli utenti in minuscolo e senza spazi, come le scrivono ora i validator: chi si è
 * registrato con le maiuscole continua ad accedere, e "Anna@x" e "anna@x" non possono più
 * essere due account diversi. Si ferma se trova due account che diventerebbero uguali.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await normalizzaEmailUtenti(db)
    })
  }

  /** Le maiuscole originali non sono state salvate: non si possono rimettere. */
  async down() {}
}
