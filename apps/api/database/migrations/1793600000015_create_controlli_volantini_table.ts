import { BaseSchema } from '@adonisjs/lucid/schema'

/** Registro dei controlli settimanali dei volantini (D15): quando, com'è andata, quanto ha trovato. */
export default class extends BaseSchema {
  protected tableName = 'controlli_volantini'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.timestamp('iniziato_il').notNullable()
      table.timestamp('finito_il').nullable()
      table.enum('esito', ['in_corso', 'ok', 'errore']).notNullable()
      table.integer('trovati').notNullable().defaultTo(0)
      table.integer('nuovi').notNullable().defaultTo(0)
      table.integer('letti').notNullable().defaultTo(0)
      table.integer('offerte').notNullable().defaultTo(0)
      // Errori delle singole fonti o dei singoli volantini, uno per riga.
      table.text('errori').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
