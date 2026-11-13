import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'

// Negozi di esempio con la forma dei dati OSM inviati dalla PWA.
const conad = {
  osmId: 'node/521790382',
  nome: 'Conad',
  catena: 'conad',
  indirizzo: 'Via Tito 13/15',
  comune: 'Roma',
  provincia: 'RM',
  lat: 41.8544841,
  lon: 12.4869757,
}
const indipendente = {
  osmId: 'way/99',
  nome: 'Supermercato di esempio',
  catena: null,
  indirizzo: null,
  comune: 'Roma',
  provincia: 'RM',
  lat: 41.85,
  lon: 12.49,
}

const URL = '/api/v1/miei-negozi'

interface NegozioRisposta {
  id: number
  osmId: string
  nome: string
  catena: { codice: string; nome: string } | null
}

/** Corpo della risposta tipizzato per i test (il registro delle rotte unisce oggetto ed elenco). */
const dati = (r: { body(): unknown }) => (r.body() as { data: NegozioRisposta }).data
const elenco = (r: { body(): unknown }) => (r.body() as { data: NegozioRisposta[] }).data

async function utente(email = 'esempio@example.invalid') {
  return User.create({ email, password: 'password-di-prova' })
}

test.group('Catene precaricate (D7)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('le catene della zona esistono con la modalità delle offerte decisa', async ({ assert }) => {
    const catene = await db.from('catene').select('codice', 'modalita_offerte')
    const modalita = Object.fromEntries(catene.map((c) => [c.codice, c.modalita_offerte]))

    assert.include(modalita, {
      conad: 'pdf',
      todis: 'pdf',
      elite: 'pdf',
      naturasi: 'pdf',
      ma: 'pdf',
    })
    assert.include(modalita, {
      penny: 'visualizzatore',
      coop: 'manuale',
      pam: 'manuale',
      carrefour: 'esclusa',
    })
  })
})

test.group('I miei negozi', (group) => {
  group.each.setup(async () => {
    await limiter.clear()
    return testUtils.db().withGlobalTransaction()
  })

  test('senza login la richiesta è rifiutata', async ({ client }) => {
    const response = await client.get(URL)
    response.assertStatus(401)
  })

  test('aggiungere un negozio lo salva e lo collega alla catena', async ({ client, assert }) => {
    const u = await utente()

    const response = await client.post(URL).json(conad).loginAs(u)

    response.assertStatus(201)
    assert.containsSubset(dati(response), {
      osmId: 'node/521790382',
      nome: 'Conad',
      catena: { codice: 'conad', nome: 'Conad' },
      provincia: 'RM',
    })
  })

  test('aggiungerlo di nuovo non crea duplicati', async ({ client, assert }) => {
    const u = await utente()
    await client.post(URL).json(conad).loginAs(u)

    const seconda = await client
      .post(URL)
      .json({ ...conad, nome: 'Conad aggiornato' })
      .loginAs(u)

    seconda.assertStatus(200)
    const [{ n: negozi }] = await db.from('negozi').count('* as n')
    const [{ n: collegamenti }] = await db.from('negozi_utente').count('* as n')
    assert.equal(Number(negozi), 1)
    assert.equal(Number(collegamenti), 1)
    assert.equal(dati(seconda).nome, 'Conad', 'il negozio comune non si modifica dal client')
  })

  test('un altro utente che aggiunge lo stesso negozio non lo può modificare', async ({
    client,
    assert,
  }) => {
    const anna = await utente('anna@example.invalid')
    const bruno = await utente('bruno@example.invalid')
    await client.post(URL).json(conad).loginAs(anna)

    const r = await client
      .post(URL)
      .json({ ...conad, nome: 'Nome cambiato', catena: null, indirizzo: 'Altrove', lat: 45 })
      .loginAs(bruno)

    r.assertStatus(201)
    const negozio = await db.from('negozi').where('osm_id', conad.osmId).firstOrFail()
    assert.equal(negozio.nome, 'Conad')
    assert.equal(negozio.indirizzo, 'Via Tito 13/15')
    assert.equal(negozio.lat, conad.lat)
    assert.isNotNull(negozio.catena_id)
    assert.equal(dati(r).nome, 'Conad')
  })

  test('troppe aggiunte in un’ora sono bloccate', async ({ client, assert }) => {
    const u = await utente()
    for (let i = 0; i < 30; i++) {
      const r = await client
        .post(URL)
        .json({ ...indipendente, osmId: `node/${i + 1}` })
        .loginAs(u)
      r.assertStatus(201)
    }

    const r = await client.post(URL).json(conad).loginAs(u)

    r.assertStatus(429)
    assert.match(
      (r.body() as unknown as { errors: { message: string }[] }).errors[0].message,
      /Riprova tra/
    )
  })

  test('un negozio indipendente non ha catena', async ({ client, assert }) => {
    const response = await client
      .post(URL)
      .json(indipendente)
      .loginAs(await utente())

    response.assertStatus(201)
    assert.isNull(dati(response).catena)
  })

  test('una catena sconosciuta non blocca il salvataggio', async ({ client, assert }) => {
    const response = await client
      .post(URL)
      .json({ ...conad, catena: 'inesistente' })
      .loginAs(await utente())

    response.assertStatus(201)
    assert.isNull(dati(response).catena)
  })

  test('ogni utente vede solo i propri negozi, anche se il negozio è lo stesso', async ({
    client,
    assert,
  }) => {
    const anna = await utente('anna@example.invalid')
    const bruno = await utente('bruno@example.invalid')
    await client.post(URL).json(conad).loginAs(anna)
    await client.post(URL).json(conad).loginAs(bruno)
    await client.post(URL).json(indipendente).loginAs(bruno)

    const elencoAnna = await client.get(URL).loginAs(anna)
    const elencoBruno = await client.get(URL).loginAs(bruno)

    assert.deepEqual(
      elenco(elencoAnna).map((n) => n.osmId),
      ['node/521790382']
    )
    assert.lengthOf(elenco(elencoBruno), 2)
    const [{ n: negozi }] = await db.from('negozi').count('* as n')
    assert.equal(Number(negozi), 2, 'il negozio comune è salvato una sola volta')
  })

  test('rimuovere un negozio lo toglie solo dai miei, il negozio resta', async ({
    client,
    assert,
  }) => {
    const anna = await utente('anna@example.invalid')
    const bruno = await utente('bruno@example.invalid')
    const aggiunto = await client.post(URL).json(conad).loginAs(anna)
    await client.post(URL).json(conad).loginAs(bruno)

    const response = await client.delete(`${URL}/${dati(aggiunto).id}`).loginAs(anna)

    response.assertStatus(204)
    const restantiAnna = await client.get(URL).loginAs(anna)
    const restantiBruno = await client.get(URL).loginAs(bruno)
    assert.lengthOf(elenco(restantiAnna), 0)
    assert.lengthOf(elenco(restantiBruno), 1)
  })

  test('non si può rimuovere un negozio che non è tra i miei', async ({ client }) => {
    const anna = await utente('anna@example.invalid')
    const bruno = await utente('bruno@example.invalid')
    const aggiunto = await client.post(URL).json(conad).loginAs(anna)

    const response = await client.delete(`${URL}/${dati(aggiunto).id}`).loginAs(bruno)

    response.assertStatus(404)
  })

  test('dati non validi sono rifiutati con gli errori per campo', async ({ client, assert }) => {
    const response = await client
      .post(URL)
      .json({ ...conad, osmId: 'negozio-1', provincia: 'Roma', lat: 120 })
      .loginAs(await utente())

    response.assertStatus(422)
    const { errors } = response.body() as unknown as { errors: { field: string }[] }
    const campi = errors.map((e) => e.field)
    assert.includeMembers(campi, ['osmId', 'provincia', 'lat'])
  })
})
