import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { importaNegozi } from '#services/negozi/importa'

type RispostaOverpass = Parameters<typeof importaNegozi>[0]

// Risposta di esempio con la forma di Overpass (`out center tags`): nessuna chiamata di rete.
const risposta: RispostaOverpass = {
  elements: [
    {
      type: 'node',
      id: 521790382,
      lat: 41.8544841,
      lon: 12.4869757,
      tags: {
        'name': 'Conad',
        'shop': 'supermarket',
        'addr:street': 'Via Tito',
        'addr:housenumber': '13/15',
      },
    },
    {
      type: 'way',
      id: 11,
      center: { lat: 41.86, lon: 12.5 },
      tags: { name: 'Pewex', shop: 'supermarket' },
    },
    // Catena senza volantino nel database: non si importa.
    { type: 'node', id: 12, lat: 41.87, lon: 12.51, tags: { name: 'Lidl', shop: 'discount' } },
    // Negozio indipendente: non si importa.
    { type: 'node', id: 13, lat: 41.88, lon: 12.52, tags: { name: 'Alimentari di esempio' } },
  ],
}

test.group('importaNegozi', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('salva i negozi delle catene indicate, con catena, comune e provincia', async ({
    assert,
  }) => {
    const esito = await importaNegozi(risposta, {
      catene: ['conad', 'pewex'],
      comune: 'Roma',
      provincia: 'RM',
    })

    assert.deepEqual(esito, { trovati: 4, salvati: 2, perCatena: { conad: 1, pewex: 1 } })
    const conad = await db.from('catene').where('codice', 'conad').first()
    const salvato = await db.from('negozi').where('osm_id', 'node/521790382').first()
    assert.containsSubset(salvato, {
      nome: 'Conad',
      catena_id: conad.id,
      indirizzo: 'Via Tito 13/15',
      comune: 'Roma',
      provincia: 'RM',
    })
    const way = await db.from('negozi').where('osm_id', 'way/11').first()
    assert.closeTo(Number(way.lat), 41.86, 1e-6)
  })

  test('una seconda importazione aggiorna i negozi invece di duplicarli', async ({ assert }) => {
    const opzioni = { catene: ['conad', 'pewex'], comune: 'Roma', provincia: 'RM' }
    await importaNegozi(risposta, opzioni)
    const rinominato = structuredClone(risposta)
    rinominato.elements![0].tags!.name = 'Conad City'

    await importaNegozi(rinominato, opzioni)

    const [{ n }] = await db.from('negozi').count('* as n')
    assert.equal(Number(n), 2)
    const salvato = await db.from('negozi').where('osm_id', 'node/521790382').first()
    assert.equal(salvato.nome, 'Conad City')
  })
})
