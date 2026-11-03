import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Valori nutrizionali (D16): la tabella CIQUAL 2020 (ANSES, CC-BY 4.0) per 100 g e l'elenco degli
 * alimenti generici italiani abbinati a un alimento CIQUAL. Dati comuni, nessun dato personale.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('alimenti', (table) => {
      // Codice CIQUAL dell'alimento
      table.integer('codice').primary()
      table.string('nome_en').notNullable()
      table.string('gruppo_en').nullable()
      table.decimal('kcal', 8, 2).nullable()
      // Vero se CIQUAL non dà l'energia e l'abbiamo calcolata con i fattori del Reg. UE 1169/2011
      table.boolean('kcal_calcolate').notNullable().defaultTo(false)
      table.decimal('proteine', 8, 2).nullable()
      table.decimal('carboidrati', 8, 2).nullable()
      table.decimal('zuccheri', 8, 2).nullable()
      table.decimal('grassi', 8, 2).nullable()
      table.decimal('saturi', 8, 2).nullable()
      table.decimal('fibre', 8, 2).nullable()
      table.decimal('sale', 8, 2).nullable()
      table.string('fonte').notNullable().defaultTo('CIQUAL 2020')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('alimenti_it', (table) => {
      table.increments('id').notNullable()
      table.string('nome').notNullable().unique()
      // Espressioni separate da "|" che riconoscono l'alimento nel nome di un prodotto
      table.text('parole').notNullable()
      table
        .integer('alimento_codice')
        .notNullable()
        .references('codice')
        .inTable('alimenti')
        .onDelete('CASCADE')
      table.string('nota').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('alimenti_it')
    this.schema.dropTable('alimenti')
  }
}
