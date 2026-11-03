import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Medie mensili per provincia di Osservaprezzi (D1, D16): stime, non prezzi di un negozio.
 * Il registro delle importazioni evita di richiedere di nuovo un mese già scaricato.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('stime_osservaprezzi', (table) => {
      table.increments('id').notNullable()
      // Nome come pubblicato, es. "Petto Di Pollo (1000 Gr)"
      table.string('voce').notNullable()
      table.enum('tipologia', ['altri_alim', 'orto', 'ittici', 'groc']).notNullable()
      table
        .integer('prodotto_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('prodotti')
        .onDelete('SET NULL')
      table.decimal('quantita', 10, 3).nullable()
      table.enum('unita', ['g', 'ml', 'pz']).nullable()
      table.string('provincia', 2).notNullable()
      table.integer('anno').notNullable()
      table.integer('mese').notNullable()
      table.integer('min_centesimi').notNullable()
      table.integer('medio_centesimi').notNullable()
      table.integer('max_centesimi').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['voce', 'provincia', 'anno', 'mese'])
      table.check('?? between 1 and 12', ['mese'])
      table.check('?? <= ?? and ?? <= ??', [
        'min_centesimi',
        'medio_centesimi',
        'medio_centesimi',
        'max_centesimi',
      ])
    })

    this.schema.createTable('import_osservaprezzi', (table) => {
      table.increments('id').notNullable()
      table.string('provincia', 2).notNullable()
      table.integer('anno').notNullable()
      table.integer('mese').notNullable()
      table.enum('tipologia', ['altri_alim', 'orto', 'ittici', 'groc']).notNullable()
      table.integer('righe').notNullable().defaultTo(0)
      table.enum('esito', ['ok', 'errore']).notNullable()
      table.text('errore').nullable()
      table.timestamp('eseguito_il').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.unique(['provincia', 'anno', 'mese', 'tipologia'])
    })
  }

  async down() {
    this.schema.dropTable('import_osservaprezzi')
    this.schema.dropTable('stime_osservaprezzi')
  }
}
