import { BaseSchema } from '@adonisjs/lucid/schema'

/** Impronta delle immagini di ogni volantino, per riconoscere i doppioni (D15). */
export default class extends BaseSchema {
  protected tableName = 'volantini'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Hash delle immagini separati da virgola (services/volantini/impronta.ts).
      table.text('impronte').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('impronte')
    })
  }
}
