import { BaseSchema } from '@adonisjs/lucid/schema'

/** Quando l'utente ha confermato l'indirizzo email con il link ricevuto (D16). */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('email_verificata_il').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email_verificata_il')
    })
  }
}
