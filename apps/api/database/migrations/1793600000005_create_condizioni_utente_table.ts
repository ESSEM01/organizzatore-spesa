import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'condizioni_utente'

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
        .integer('catena_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catene')
        .onDelete('CASCADE')
      // Es. 'carta-fedelta'. Mai il numero della carta (D5).
      table.string('condizione', 40).notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'catena_id', 'condizione'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
