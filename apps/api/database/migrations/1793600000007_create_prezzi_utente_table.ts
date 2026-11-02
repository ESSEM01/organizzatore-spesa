import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'prezzi_utente'

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
        .integer('prodotto_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('prodotti')
        .onDelete('CASCADE')
      table
        .integer('negozio_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('negozi')
        .onDelete('CASCADE')
      table.integer('centesimi').notNullable()
      table.date('data').notNullable()
      table.enum('fonte', ['manuale', 'lista', 'scontrino']).notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.check('?? >= 0', ['centesimi'])
      // Storico dei prezzi per prodotto e negozio: non si sovrascrive (D3)
      table.index(['user_id', 'prodotto_id', 'negozio_id', 'data'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
