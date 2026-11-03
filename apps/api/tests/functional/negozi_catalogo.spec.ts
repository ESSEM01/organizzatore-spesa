import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

// Negozi, volantini e offerte di esempio: nessun dato reale.
async function prepara() {
  const conad = await db.from('catene').where('codice', 'conad').first()
  const todis = await db.from('catene').where('codice', 'todis').first()
  const ora = new Date()
  await db.table('negozi').multiInsert([
    {
      osm_id: 'node/1',
      catena_id: conad.id,
      nome: 'Conad di esempio',
      indirizzo: 'Via di esempio 1',
      comune: 'Roma',
      provincia: 'RM',
      lat: 41.85,
      lon: 12.49,
      aggiornato_il: ora,
    },
    {
      osm_id: 'node/2',
      catena_id: todis.id,
      nome: 'Todis di esempio',
      indirizzo: null,
      comune: 'Roma',
      provincia: 'RM',
      lat: 41.86,
      lon: 12.5,
      aggiornato_il: ora,
    },
  ])
  const volantino = async (catenaId: number, titolo: string, dal: string, al: string) => {
    const [id] = await db.table('volantini').insert({
      catena_id: catenaId,
      titolo,
      ambito: 'regione',
      hash_contenuto: `${titolo}-${al}`,
      valido_dal: dal,
      valido_al: al,
      stato: 'letto',
      created_at: ora,
    })
    return id
  }
  const offerta = (volantinoId: number, catenaId: number, dal: string, al: string) => ({
    volantino_id: volantinoId,
    catena_id: catenaId,
    nome: 'Prodotto di esempio',
    categoria: 'altro',
    centesimi: 100,
    valido_dal: dal,
    valido_al: al,
    stato: 'proposta',
    created_at: ora,
  })
  const valido = await volantino(conad.id, 'Sottocosto', '2026-11-05', '2026-11-14')
  const scaduto = await volantino(conad.id, 'Vecchio', '2026-10-01', '2026-10-10')
  await db
    .table('offerte')
    .multiInsert([
      offerta(valido, conad.id, '2026-11-05', '2026-11-14'),
      offerta(valido, conad.id, '2026-11-05', '2026-11-14'),
      offerta(scaduto, conad.id, '2026-10-01', '2026-10-10'),
    ])
}

test.group('Catalogo dei negozi', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('elenca i negozi salvati e, per catena, i volantini validi con le offerte', async ({
    client,
    assert,
  }) => {
    await prepara()

    const r = await client.get('/api/v1/negozi').qs({ oggi: '2026-11-06' })

    r.assertStatus(200)
    const { negozi, volantini } = r.body().data
    assert.lengthOf(negozi, 2)
    assert.containsSubset(negozi[0], {
      osmId: 'node/1',
      nome: 'Conad di esempio',
      catena: 'conad',
      indirizzo: 'Via di esempio 1',
    })
    assert.deepEqual(volantini.conad, {
      offerte: 2,
      volantini: [{ titolo: 'Sottocosto', validoDal: '2026-11-05', validoAl: '2026-11-14' }],
    })
    assert.notProperty(volantini, 'todis')
  })

  test('è pubblico e non chiede né riceve la posizione', async ({ client }) => {
    const r = await client.get('/api/v1/negozi')

    r.assertStatus(200)
  })
})
