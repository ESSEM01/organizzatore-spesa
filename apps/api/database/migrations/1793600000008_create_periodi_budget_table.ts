import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'periodi_budget'

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
      table.date('dal').notNullable()
      table.date('al').notNullable()
      table.integer('budget_centesimi').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'dal'])
      table.check('?? >= ??', ['al', 'dal'])
      table.check('?? >= 0', ['budget_centesimi'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
