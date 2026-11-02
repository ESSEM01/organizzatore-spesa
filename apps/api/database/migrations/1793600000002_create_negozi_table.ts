import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'negozi'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('osm_id', 40).notNullable().unique()
      table
        .integer('catena_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catene')
        .onDelete('SET NULL')
      table.string('nome').notNullable()
      table.string('indirizzo').nullable()
      table.string('comune').notNullable()
      table.string('provincia', 2).notNullable()
      // Posizione del negozio, pubblica su OpenStreetMap. Mai la posizione dell'utente (D5).
      table.decimal('lat', 9, 6).notNullable()
      table.decimal('lon', 9, 6).notNullable()
      table.timestamp('aggiornato_il').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
