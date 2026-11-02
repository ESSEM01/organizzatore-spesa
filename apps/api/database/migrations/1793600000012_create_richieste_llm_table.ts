import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'richieste_llm'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.enum('scopo', ['ricetta', 'scontrino', 'volantino', 'lista']).notNullable()
      table.string('modello', 60).notNullable()
      table.integer('token_input').notNullable().defaultTo(0)
      table.integer('token_output').notNullable().defaultTo(0)
      table.integer('token_cache_lettura').notNullable().defaultTo(0)
      table.string('stop_reason', 40).nullable()
      table.enum('esito', ['ok', 'rifiuto', 'errore']).notNullable()
      // Mai il testo inviato o ricevuto (D5): solo i numeri per il registro dei costi (D4).
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
