import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'prodotti'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('nome').notNullable()
      table.string('marca').nullable()
      table.string('categoria').nullable()
      table.string('codice_off', 32).nullable().unique()
      table.decimal('quantita_confezione', 10, 3).nullable()
      table.enum('unita', ['g', 'ml', 'pz']).nullable()
      // null = catalogo comune; altrimenti prodotto creato da un utente
      table
        .integer('creato_da_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.check('?? is null or ?? > 0', ['quantita_confezione', 'quantita_confezione'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
