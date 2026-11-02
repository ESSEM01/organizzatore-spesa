import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'liste'

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
        .integer('periodo_budget_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('periodi_budget')
        .onDelete('SET NULL')
      table
        .integer('negozio_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('negozi')
        .onDelete('SET NULL')
      table.string('nome').notNullable()
      table.enum('stato', ['bozza', 'in_corso', 'conclusa']).notNullable().defaultTo('bozza')
      table.date('data_spesa').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
