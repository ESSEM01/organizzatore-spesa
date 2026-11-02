import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

// Dati di esempio, non reali.
const ora = () => new Date()

async function creaUtente(email = 'esempio@example.invalid') {
  const [id] = await db.table('users').insert({ email, password: 'non-usata', created_at: ora() })
  return Number(id)
}

async function creaBase() {
  const userId = await creaUtente()
  const [catenaId] = await db
    .table('catene')
    .insert({ codice: 'esempio', nome: 'Catena di esempio', modalita_offerte: 'manuale' })
  const [negozioId] = await db.table('negozi').insert({
    osm_id: 'node/1',
    catena_id: catenaId,
    nome: 'Negozio di esempio',
    comune: 'Roma',
    provincia: 'RM',
    lat: 41.9,
    lon: 12.5,
    aggiornato_il: ora(),
  })
  const [prodottoId] = await db.table('prodotti').insert({ nome: 'Pasta di esempio 500 g' })
  return {
    userId,
    catenaId: Number(catenaId),
    negozioId: Number(negozioId),
    prodottoId: Number(prodottoId),
  }
}

async function creaLista(userId: number) {
  const [listaId] = await db
    .table('liste')
    .insert({ user_id: userId, nome: 'Spesa di esempio', stato: 'bozza', created_at: ora() })
  return Number(listaId)
}

test.group('Database fase 1 · vincoli', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('le chiavi esterne sono applicate', async ({ assert }) => {
    const { prodottoId } = await creaBase()

    await assert.rejects(() =>
      db.table('voci_lista').insert({ lista_id: 999_999, prodotto_id: prodottoId, quantita: 1 })
    )
  })

  test('la quantità di una voce deve essere positiva', async ({ assert }) => {
    const { userId, prodottoId } = await creaBase()
    const listaId = await creaLista(userId)

    await assert.rejects(() =>
      db.table('voci_lista').insert({ lista_id: listaId, prodotto_id: prodottoId, quantita: 0 })
    )
  })

  test('un prodotto compare una sola volta nella stessa lista', async ({ assert }) => {
    const { userId, prodottoId } = await creaBase()
    const listaId = await creaLista(userId)
    await db.table('voci_lista').insert({ lista_id: listaId, prodotto_id: prodottoId, quantita: 1 })

    await assert.rejects(() =>
      db.table('voci_lista').insert({ lista_id: listaId, prodotto_id: prodottoId, quantita: 2 })
    )
  })

  test('un prezzo non può essere negativo', async ({ assert }) => {
    const { userId, negozioId, prodottoId } = await creaBase()

    await assert.rejects(() =>
      db.table('prezzi_utente').insert({
        user_id: userId,
        prodotto_id: prodottoId,
        negozio_id: negozioId,
        centesimi: -1,
        data: '2026-11-02',
        fonte: 'manuale',
        created_at: ora(),
      })
    )
  })

  test('la fonte di un prezzo è una di quelle previste', async ({ assert }) => {
    const { userId, negozioId, prodottoId } = await creaBase()

    await assert.rejects(() =>
      db.table('prezzi_utente').insert({
        user_id: userId,
        prodotto_id: prodottoId,
        negozio_id: negozioId,
        centesimi: 99,
        data: '2026-11-02',
        fonte: 'inventata',
        created_at: ora(),
      })
    )
  })

  test('un periodo di budget non può finire prima di iniziare', async ({ assert }) => {
    const userId = await creaUtente()

    await assert.rejects(() =>
      db.table('periodi_budget').insert({
        user_id: userId,
        dal: '2026-11-30',
        al: '2026-11-01',
        budget_centesimi: 20_000,
        created_at: ora(),
      })
    )
  })

  test('un negozio OpenStreetMap è registrato una volta sola', async ({ assert }) => {
    await creaBase()

    await assert.rejects(() =>
      db.table('negozi').insert({
        osm_id: 'node/1',
        nome: 'Duplicato',
        comune: 'Roma',
        provincia: 'RM',
        lat: 41.9,
        lon: 12.5,
        aggiornato_il: ora(),
      })
    )
  })

  test("cancellare l'utente cancella tutti i suoi dati personali", async ({ assert }) => {
    const { userId, catenaId, negozioId, prodottoId } = await creaBase()
    const [periodoId] = await db.table('periodi_budget').insert({
      user_id: userId,
      dal: '2026-11-01',
      al: '2026-11-30',
      budget_centesimi: 20_000,
      created_at: ora(),
    })
    const listaId = await creaLista(userId)
    await db.from('liste').where('id', listaId).update({ periodo_budget_id: periodoId })
    await db.table('voci_lista').insert({ lista_id: listaId, prodotto_id: prodottoId, quantita: 1 })
    await db.table('negozi_utente').insert({ user_id: userId, negozio_id: negozioId })
    await db.table('preferenze_utente').insert({ user_id: userId, provincia: 'RM' })
    await db
      .table('condizioni_utente')
      .insert({ user_id: userId, catena_id: catenaId, condizione: 'carta-fedelta' })
    await db.table('prezzi_utente').insert({
      user_id: userId,
      prodotto_id: prodottoId,
      negozio_id: negozioId,
      centesimi: 99,
      data: '2026-11-02',
      fonte: 'manuale',
      created_at: ora(),
    })

    await db.from('users').where('id', userId).delete()

    for (const tabella of [
      'periodi_budget',
      'liste',
      'voci_lista',
      'negozi_utente',
      'preferenze_utente',
      'condizioni_utente',
      'prezzi_utente',
    ]) {
      const [{ n }] = await db.from(tabella).count('* as n')
      assert.equal(
        Number(n),
        0,
        `${tabella} dovrebbe essere vuota dopo la cancellazione dell'utente`
      )
    }
    const [{ n: negozi }] = await db.from('negozi').count('* as n')
    assert.equal(Number(negozi), 1, 'i negozi sono dati comuni e restano')
  })
})

test.group('Database · privacy (D5)', () => {
  test('nessuna tabella contiene colonne vietate dalla decisione D5', async ({ assert }) => {
    const tabelle: { name: string }[] = await db
      .from('sqlite_master')
      .where('type', 'table')
      .whereNot('name', 'like', 'sqlite_%')
      .select('name')
    const vietate = ['foto', 'immagine', 'numero_carta', 'pan', 'prompt', 'risposta']
    const coordinate = ['lat', 'lon', 'latitudine', 'longitudine']

    for (const { name } of tabelle) {
      const colonne: { name: string }[] = await db.rawQuery(
        `select name from pragma_table_info(?)`,
        [name]
      )
      for (const { name: colonna } of colonne) {
        assert.notInclude(vietate, colonna, `${name}.${colonna} è vietata da D5`)
        if (name !== 'negozi') {
          assert.notInclude(
            coordinate,
            colonna,
            `${name}.${colonna}: coordinate ammesse solo per i negozi`
          )
        }
      }
    }
  })
})
