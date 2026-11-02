import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import Catena from '#models/catena'
import Negozio from '#models/negozio'
import NegozioUtente from '#models/negozio_utente'

// Dati di esempio, non prezzi reali.
const OGGI = '2026-11-05'
type Corpo = Record<string, any>
const dati = (r: { body(): unknown }) => (r.body() as { data: Corpo }).data
const errori = (r: { body(): unknown }) =>
  Object.fromEntries(
    (r.body() as { errors: { field: string; message: string }[] }).errors.map((e) => [
      e.field,
      e.message,
    ])
  )

async function utente(email = 'esempio@example.invalid') {
  return User.create({ email, password: 'password-di-prova' })
}

async function negozio(osmId: string, codiceCatena: string) {
  const catena = await Catena.findByOrFail('codice', codiceCatena)
  return Negozio.create({
    osmId,
    nome: `Negozio di esempio ${osmId}`,
    catenaId: catena.id,
    comune: 'Roma',
    provincia: 'RM',
    lat: 41.85,
    lon: 12.49,
    aggiornatoIl: DateTime.now(),
  })
}

async function mioNegozio(u: User, osmId: string, codiceCatena = 'conad') {
  const n = await negozio(osmId, codiceCatena)
  await NegozioUtente.create({ userId: u.id, negozioId: n.id })
  return n
}

test.group('Budget del periodo', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('senza login è rifiutato', async ({ client }) => {
    const response = await client.get(`/api/v1/periodi/corrente?oggi=${OGGI}`)
    response.assertStatus(401)
  })

  test('senza budget impostato il periodo corrente è vuoto', async ({ client, assert }) => {
    const response = await client
      .get(`/api/v1/periodi/corrente?oggi=${OGGI}`)
      .loginAs(await utente())

    response.assertStatus(200)
    assert.isNull(dati(response))
  })

  test('impostato il budget, il periodo corrente mostra quanto resta', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    const creato = await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-11-01', al: '2026-11-30', budgetCentesimi: 20_000 })
      .loginAs(u)
    creato.assertStatus(201)

    const corrente = await client.get(`/api/v1/periodi/corrente?oggi=${OGGI}`).loginAs(u)

    assert.containsSubset(dati(corrente), {
      dal: '2026-11-01',
      al: '2026-11-30',
      riepilogo: {
        budgetCentesimi: 20_000,
        previstoCentesimi: 0,
        residuoCentesimi: 20_000,
        sforamentoCentesimi: 0,
      },
      liste: [],
    })
  })

  test('periodi sovrapposti o con date invertite sono rifiutati', async ({ client, assert }) => {
    const u = await utente()
    await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-11-01', al: '2026-11-30', budgetCentesimi: 1 })
      .loginAs(u)

    const sovrapposto = await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-11-15', al: '2026-12-15', budgetCentesimi: 1 })
      .loginAs(u)
    const invertito = await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-12-31', al: '2026-12-01', budgetCentesimi: 1 })
      .loginAs(u)

    sovrapposto.assertStatus(422)
    assert.equal(errori(sovrapposto).dal, 'Hai già un budget che copre questi giorni')
    invertito.assertStatus(422)
    assert.property(errori(invertito), 'al')
  })

  test('il budget di un altro utente non conta come sovrapposizione', async ({ client }) => {
    await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-11-01', al: '2026-11-30', budgetCentesimi: 1 })
      .loginAs(await utente('anna@example.invalid'))

    const response = await client
      .post('/api/v1/periodi')
      .json({ dal: '2026-11-01', al: '2026-11-30', budgetCentesimi: 1 })
      .loginAs(await utente('bruno@example.invalid'))

    response.assertStatus(201)
  })
})

test.group('Liste, voci e prezzi', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('una lista si crea solo con un negozio tra i miei', async ({ client, assert }) => {
    const u = await utente()
    const altrui = await negozio('node/2', 'todis')
    const mio = await mioNegozio(u, 'node/1')

    const rifiutata = await client
      .post('/api/v1/liste')
      .json({ nome: 'Spesa', negozioId: altrui.id })
      .loginAs(u)
    const creata = await client
      .post('/api/v1/liste')
      .json({ nome: 'Spesa', negozioId: mio.id })
      .loginAs(u)

    rifiutata.assertStatus(422)
    assert.property(errori(rifiutata), 'negozioId')
    creata.assertStatus(201)
    assert.containsSubset(dati(creata), { nome: 'Spesa', stato: 'bozza', negozio: { id: mio.id } })
  })

  test('la lista di un altro utente non si vede', async ({ client }) => {
    const anna = await utente('anna@example.invalid')
    const creata = await client.post('/api/v1/liste').json({ nome: 'Spesa di Anna' }).loginAs(anna)

    const response = await client
      .get(`/api/v1/liste/${dati(creata).id}?oggi=${OGGI}`)
      .loginAs(await utente('bruno@example.invalid'))

    response.assertStatus(404)
  })

  test('aggiungere lo stesso prodotto aumenta la quantità invece di duplicarlo', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    const lista = dati(await client.post('/api/v1/liste').json({ nome: 'Spesa' }).loginAs(u))

    const prima = await client
      .post(`/api/v1/liste/${lista.id}/voci`)
      .json({ nome: 'Pasta 500 g', quantita: 2 })
      .loginAs(u)
    const seconda = await client
      .post(`/api/v1/liste/${lista.id}/voci`)
      .json({ nome: ' pasta 500 G ', quantita: 1 })
      .loginAs(u)

    prima.assertStatus(201)
    seconda.assertStatus(200)
    assert.equal(dati(seconda).quantita, 3)
    const [{ n }] = await db.from('prodotti').count('* as n')
    assert.equal(Number(n), 1)
  })

  test('la quantità deve essere un intero positivo', async ({ client }) => {
    const u = await utente()
    const lista = dati(await client.post('/api/v1/liste').json({ nome: 'Spesa' }).loginAs(u))

    const response = await client
      .post(`/api/v1/liste/${lista.id}/voci`)
      .json({ nome: 'Latte', quantita: 0 })
      .loginAs(u)

    response.assertStatus(422)
  })

  test('senza negozio sulla lista il prezzo non si può salvare', async ({ client, assert }) => {
    const u = await utente()
    const lista = dati(await client.post('/api/v1/liste').json({ nome: 'Spesa' }).loginAs(u))
    const voce = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Latte', quantita: 1 })
        .loginAs(u)
    )

    const response = await client
      .post(`/api/v1/liste/${lista.id}/prezzi`)
      .json({ prodottoId: voce.prodotto.id, centesimi: 145, oggi: OGGI })
      .loginAs(u)

    response.assertStatus(422)
    assert.property(errori(response), 'negozioId')
  })

  test('il dettaglio calcola il totale con i prezzi del negozio e segnala quelli mancanti', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    const mio = await mioNegozio(u, 'node/1')
    const lista = dati(
      await client.post('/api/v1/liste').json({ nome: 'Spesa', negozioId: mio.id }).loginAs(u)
    )
    const pasta = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Pasta', quantita: 3 })
        .loginAs(u)
    )
    await client
      .post(`/api/v1/liste/${lista.id}/voci`)
      .json({ nome: 'Detersivo', quantita: 1 })
      .loginAs(u)

    const prezzo = await client
      .post(`/api/v1/liste/${lista.id}/prezzi`)
      .json({ prodottoId: pasta.prodotto.id, centesimi: 89, oggi: OGGI })
      .loginAs(u)
    const dettaglio = await client.get(`/api/v1/liste/${lista.id}?oggi=${OGGI}`).loginAs(u)

    prezzo.assertStatus(201)
    const d = dati(dettaglio)
    assert.equal(d.totale.totaleCentesimi, 267)
    assert.deepEqual(d.totale.senzaPrezzo, ['Detersivo'])
    const vocePasta = d.voci.find((v: Corpo) => v.prodotto.nome === 'Pasta')
    assert.containsSubset(vocePasta, {
      quantita: 3,
      prezzo: { centesimi: 89, fonte: 'utente', data: OGGI, altroNegozio: false },
      totaleRigaCentesimi: 267,
    })
  })

  test('se il negozio della lista non ha il prezzo usa quello di un altro mio negozio, segnalandolo', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    const conad = await mioNegozio(u, 'node/1', 'conad')
    const todis = await mioNegozio(u, 'node/2', 'todis')
    const listaTodis = dati(
      await client.post('/api/v1/liste').json({ nome: 'Todis', negozioId: todis.id }).loginAs(u)
    )
    const voce = dati(
      await client
        .post(`/api/v1/liste/${listaTodis.id}/voci`)
        .json({ nome: 'Riso', quantita: 1 })
        .loginAs(u)
    )
    await client
      .post(`/api/v1/liste/${listaTodis.id}/prezzi`)
      .json({ prodottoId: voce.prodotto.id, centesimi: 199, oggi: OGGI })
      .loginAs(u)
    const listaConad = dati(
      await client.post('/api/v1/liste').json({ nome: 'Conad', negozioId: conad.id }).loginAs(u)
    )
    await client
      .post(`/api/v1/liste/${listaConad.id}/voci`)
      .json({ nome: 'riso', quantita: 2 })
      .loginAs(u)

    const dettaglio = dati(
      await client.get(`/api/v1/liste/${listaConad.id}?oggi=${OGGI}`).loginAs(u)
    )

    assert.containsSubset(dettaglio.voci[0], {
      prezzo: { centesimi: 199, altroNegozio: true },
      totaleRigaCentesimi: 398,
    })
  })

  test('le liste del periodo consumano il budget e lo sforamento è dichiarato', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    const mio = await mioNegozio(u, 'node/1')
    const periodo = dati(
      await client
        .post('/api/v1/periodi')
        .json({ dal: '2026-11-01', al: '2026-11-30', budgetCentesimi: 500 })
        .loginAs(u)
    )
    const lista = dati(
      await client
        .post('/api/v1/liste')
        .json({ nome: 'Spesa', negozioId: mio.id, periodoBudgetId: periodo.id })
        .loginAs(u)
    )
    const voce = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Olio', quantita: 1 })
        .loginAs(u)
    )
    await client
      .post(`/api/v1/liste/${lista.id}/prezzi`)
      .json({ prodottoId: voce.prodotto.id, centesimi: 799, oggi: OGGI })
      .loginAs(u)

    const corrente = dati(await client.get(`/api/v1/periodi/corrente?oggi=${OGGI}`).loginAs(u))

    assert.containsSubset(corrente.riepilogo, {
      previstoCentesimi: 799,
      residuoCentesimi: 0,
      sforamentoCentesimi: 299,
    })
    assert.containsSubset(corrente.liste, [{ id: lista.id, totaleCentesimi: 799, senzaPrezzo: 0 }])
  })

  test('spuntare, togliere una voce e cancellare la lista', async ({ client, assert }) => {
    const u = await utente()
    const lista = dati(await client.post('/api/v1/liste').json({ nome: 'Spesa' }).loginAs(u))
    const latte = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Latte', quantita: 1 })
        .loginAs(u)
    )
    const pane = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Pane', quantita: 1 })
        .loginAs(u)
    )

    const spuntata = await client
      .patch(`/api/v1/voci/${latte.id}`)
      .json({ spuntata: true })
      .loginAs(u)
    const tolta = await client.delete(`/api/v1/voci/${pane.id}`).loginAs(u)
    const dettaglio = dati(await client.get(`/api/v1/liste/${lista.id}?oggi=${OGGI}`).loginAs(u))
    const cancellata = await client.delete(`/api/v1/liste/${lista.id}`).loginAs(u)

    assert.isTrue(dati(spuntata).spuntata)
    tolta.assertStatus(204)
    assert.deepEqual(
      dettaglio.voci.map((v: Corpo) => v.prodotto.nome),
      ['Latte']
    )
    cancellata.assertStatus(204)
    const [{ n }] = await db.from('voci_lista').count('* as n')
    assert.equal(Number(n), 0)
  })

  test('la voce di un altro utente non si modifica', async ({ client }) => {
    const anna = await utente('anna@example.invalid')
    const lista = dati(await client.post('/api/v1/liste').json({ nome: 'Spesa' }).loginAs(anna))
    const voce = dati(
      await client
        .post(`/api/v1/liste/${lista.id}/voci`)
        .json({ nome: 'Latte', quantita: 1 })
        .loginAs(anna)
    )

    const response = await client
      .patch(`/api/v1/voci/${voce.id}`)
      .json({ spuntata: true })
      .loginAs(await utente('bruno@example.invalid'))

    response.assertStatus(404)
  })
})
