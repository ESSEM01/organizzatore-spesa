import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catene'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('codice', 40).notNullable().unique()
      table.string('nome').notNullable()
      // D7: come arrivano le offerte di questa catena
      table
        .enum('modalita_offerte', ['pdf', 'visualizzatore', 'manuale', 'link', 'esclusa'])
        .notNullable()
      table.string('url_volantini').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
