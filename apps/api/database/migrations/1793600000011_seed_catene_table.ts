import { BaseSchema } from '@adonisjs/lucid/schema'

type Modalita = 'pdf' | 'visualizzatore' | 'manuale' | 'link' | 'esclusa'

/**
 * Catene riconosciute da `catenaDaOsm` (@spesa/domain) con la modalità delle offerte decisa in D7
 * (docs/ricerca-fonti-dati.md, verifiche del 2026-11-02). Le catene non ancora verificate sono "manuale".
 */
const CATENE: [codice: string, nome: string, modalita: Modalita, url: string | null][] = [
  ['conad', 'Conad', 'pdf', 'https://www.conad.it/ricerca-negozi'],
  ['ma', 'MA', 'pdf', 'https://www.cedigros.com/promozioni/ma/volantino-ma'],
  ['pewex', 'Pewex', 'pdf', 'https://www.cedigros.com/promozioni'],
  ['sacoph', 'Sacoph', 'pdf', 'https://www.cedigros.com/promozioni'],
  ['castoro', 'Il Castoro', 'pdf', 'https://www.cedigros.com/promozioni'],
  ['todis', 'Todis', 'pdf', 'https://www.todis.it/volantini/lazio/'],
  ['elite', 'Elite', 'pdf', 'https://superelite.it/promozioni'],
  ['naturasi', 'NaturaSì', 'pdf', 'https://www.naturasi.it/offerte'],
  ['penny', 'Penny', 'visualizzatore', 'https://www.penny.it/sfoglia-il-volantino-mobile'],
  ['coop', 'Coop', 'manuale', 'https://coopetruria.coop.it'],
  ['pam', 'Pam Panorama', 'manuale', 'https://www.pampanorama.it'],
  ['ins', 'iN’s Mercato', 'manuale', 'https://www.insmercato.it/volantino/'],
  ['crai', 'CRAI', 'manuale', 'https://crai.it/negozi-e-volantini'],
  ['tigre', 'Tigre', 'manuale', null],
  ['carrefour', 'Carrefour', 'esclusa', 'https://www.carrefour.it/volantino'],
  ['tuodi', 'Tuodì', 'esclusa', null],
  ['lidl', 'Lidl', 'manuale', null],
  ['eurospin', 'Eurospin', 'manuale', null],
  ['md', 'MD', 'manuale', null],
  ['aldi', 'Aldi', 'manuale', null],
  ['esselunga', 'Esselunga', 'manuale', null],
  ['despar', 'Despar', 'manuale', null],
  ['sigma', 'Sigma', 'manuale', null],
]

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.table('catene').multiInsert(
        CATENE.map(([codice, nome, modalita, url]) => ({
          codice,
          nome,
          modalita_offerte: modalita,
          url_volantini: url,
        }))
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db
        .from('catene')
        .whereIn(
          'codice',
          CATENE.map(([codice]) => codice)
        )
        .delete()
    })
  }
}
