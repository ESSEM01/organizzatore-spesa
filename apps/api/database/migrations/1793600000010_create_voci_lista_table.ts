import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'voci_lista'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('lista_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('liste')
        .onDelete('CASCADE')
      table
        .integer('prodotto_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('prodotti')
        .onDelete('CASCADE')
      table.integer('quantita').notNullable()
      table.boolean('spuntata').notNullable().defaultTo(false)
      table.integer('prezzo_pagato_centesimi').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['lista_id', 'prodotto_id'])
      table.check('?? > 0', ['quantita'])
      table.check('?? is null or ?? >= 0', ['prezzo_pagato_centesimi', 'prezzo_pagato_centesimi'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
