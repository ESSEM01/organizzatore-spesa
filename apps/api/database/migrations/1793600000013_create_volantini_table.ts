import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'volantini'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('catena_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catene')
        .onDelete('CASCADE')
      table.string('titolo').notNullable()
      table.enum('ambito', ['catena', 'regione', 'punto_vendita']).notNullable()
      table.string('regione', 40).nullable()
      table
        .integer('negozio_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('negozi')
        .onDelete('SET NULL')
      table.string('url_fonte').nullable()
      table.string('file').nullable()
      // SHA-256 del PDF: lo stesso volantino non si rilegge e non si paga due volte (D7).
      table.string('hash_contenuto', 64).notNullable().unique()
      table.date('valido_dal').nullable()
      table.date('valido_al').nullable()
      table.enum('stato', ['da_leggere', 'letto', 'errore']).notNullable().defaultTo('da_leggere')
      table.text('errore').nullable()
      table.timestamp('letto_il').nullable()
      table
        .integer('richiesta_llm_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('richieste_llm')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.check('?? is null or ?? is null or ?? >= ??', [
        'valido_dal',
        'valido_al',
        'valido_al',
        'valido_dal',
      ])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
