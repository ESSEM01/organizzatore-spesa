import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'negozi_utente'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('negozio_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('negozi')
        .onDelete('CASCADE')
      // Codice del punto vendita sul sito della catena, es. anacanId Conad (D7)
      table.string('codice_punto_vendita', 40).nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'negozio_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
