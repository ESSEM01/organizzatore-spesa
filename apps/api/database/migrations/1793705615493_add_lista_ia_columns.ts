import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Lista generata dall'IA (D18): numero di persone nelle preferenze, e per ogni voce il prezzo previsto
 * con la sua fonte (offerta del volantino o stima Osservaprezzi) e i grammi pianificati.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('preferenze_utente', (table) => {
      table.integer('persone').notNullable().defaultTo(1)
    })
    this.schema.alterTable('voci_lista', (table) => {
      table.integer('prezzo_previsto_centesimi').nullable()
      table.string('fonte_prezzo', 10).nullable()
      table
        .integer('offerta_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('offerte')
        .onDelete('SET NULL')
      table.integer('grammi').nullable()
    })
  }

  async down() {
    this.schema.alterTable('voci_lista', (table) => {
      table.dropForeign(['offerta_id'])
      table.dropColumn('grammi')
      table.dropColumn('offerta_id')
      table.dropColumn('fonte_prezzo')
      table.dropColumn('prezzo_previsto_centesimi')
    })
    this.schema.alterTable('preferenze_utente', (table) => {
      table.dropColumn('persone')
    })
  }
}
