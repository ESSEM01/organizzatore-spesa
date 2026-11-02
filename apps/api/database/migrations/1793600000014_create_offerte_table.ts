import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'offerte'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('volantino_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('volantini')
        .onDelete('CASCADE')
      table
        .integer('catena_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catene')
        .onDelete('CASCADE')
      table
        .integer('negozio_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('negozi')
        .onDelete('SET NULL')
      // Abbinamento al catalogo: null finché il prodotto non è riconosciuto.
      table
        .integer('prodotto_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('prodotti')
        .onDelete('SET NULL')
      table.string('nome').notNullable()
      table.string('marca').nullable()
      table.string('formato', 80).nullable()
      table.decimal('quantita', 10, 3).nullable()
      table.enum('unita', ['g', 'ml', 'pz']).nullable()
      table
        .enum('categoria', [
          'frutta_verdura',
          'carne_pesce',
          'salumi_formaggi',
          'latticini_uova',
          'pane_pasta_cereali',
          'dispensa',
          'surgelati',
          'bevande',
          'dolci_snack',
          'casa_persona',
          'animali',
          'altro',
        ])
        .notNullable()
      table.integer('centesimi').notNullable()
      table.integer('prezzo_pieno_centesimi').nullable()
      table.string('condizione').nullable()
      table.integer('pagina').nullable()
      table.date('valido_dal').notNullable()
      table.date('valido_al').notNullable()
      // Le offerte lette dal modello sono proposte finché non vengono confermate (D4, D7).
      table
        .enum('stato', ['proposta', 'confermata', 'scartata'])
        .notNullable()
        .defaultTo('proposta')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.check('?? >= 0', ['centesimi'])
      table.check('?? is null or ?? >= 0', ['prezzo_pieno_centesimi', 'prezzo_pieno_centesimi'])
      table.check('?? >= ??', ['valido_al', 'valido_dal'])
      table.index(['catena_id', 'valido_al'])
      table.index(['prodotto_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
