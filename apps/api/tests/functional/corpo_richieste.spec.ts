import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'

// Account di esempio (dominio .test). La PWA manda solo JSON: form e multipart non si leggono.
const EMAIL = 'corpo@example.test'
const PASSWORD = 'password-di-prova-1'

/** Le credenziali nella query string: un form di un altro sito le può mettere nell'`action`. */
const LOGIN_CON_QUERY = `/api/v1/auth/login?${new URLSearchParams({ email: EMAIL, password: PASSWORD })}`

test.group('Corpo delle richieste: solo JSON', (group) => {
  group.each.setup(async () => {
    await limiter.clear()
    return testUtils.db().withGlobalTransaction()
  })

  test('il JSON si legge', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: PASSWORD })

    r.assertStatus(200)
  })

  test('un form urlencoded è rifiutato, anche con i dati giusti', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post('/api/v1/auth/login').form({ email: EMAIL, password: PASSWORD })

    r.assertStatus(415)
  })

  test('un corpo multipart è rifiutato, anche con i dati giusti', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client
      .post('/api/v1/auth/login')
      .field('email', EMAIL)
      .field('password', PASSWORD)

    r.assertStatus(415)
  })

  // Login CSRF: <form method=POST action="https://app/api/v1/auth/login?email=…&password=…">
  // da un altro sito non deve far entrare la vittima nell'account dell'attaccante.
  test('un form con le credenziali nella query non crea la sessione', async ({
    client,
    assert,
  }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post(LOGIN_CON_QUERY).form({})

    r.assertStatus(415)
    assert.notProperty(r.headers(), 'set-cookie')
  })

  test('anche signup e password dimenticata rifiutano un form con i dati nella query', async ({
    client,
    assert,
  }) => {
    const dati = new URLSearchParams({
      email: EMAIL,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
    })

    const signup = await client.post(`/api/v1/auth/signup?${dati}`).form({})
    const dimenticata = await client.post(`/api/v1/auth/password-dimenticata?${dati}`).form({})

    signup.assertStatus(415)
    dimenticata.assertStatus(415)
    assert.isNull(await User.findBy('email', EMAIL))
  })

  test('un form text/plain con le credenziali nella query è rifiutato', async ({
    client,
    assert,
  }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post(LOGIN_CON_QUERY).header('Content-Type', 'text/plain')

    r.assertStatus(415)
    assert.notProperty(r.headers(), 'set-cookie')
  })

  test('senza Content-Type e con la query (fetch no-cors) è rifiutato', async ({
    client,
    assert,
  }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post(LOGIN_CON_QUERY)

    r.assertStatus(415)
    assert.notProperty(r.headers(), 'set-cookie')
  })

  test('senza Content-Type ma con un corpo è rifiutato', async ({ assert }) => {
    // Il client di Japa mette sempre un Content-Type: fetch con byte grezzi non ne manda.
    const corpo = new TextEncoder().encode(JSON.stringify({ email: EMAIL, password: PASSWORD }))

    const r = await fetch(`http://${process.env.HOST}:${process.env.PORT}/api/v1/auth/login`, {
      method: 'POST',
      body: corpo,
    })

    assert.equal(r.status, 415)
  })

  test('senza corpo e senza query si accetta anche senza Content-Type', async ({ client }) => {
    const u = await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post('/api/v1/account/logout').loginAs(u)

    r.assertStatus(200)
  })

  test('JSON senza corpo con la query si accetta (link firmati delle email)', async ({
    client,
  }) => {
    const r = await client
      .post('/api/v1/auth/verifica-email/1?signature=non-valida')
      .header('Content-Type', 'application/json')

    r.assertStatus(400)
  })

  test('le GET non sono toccate', async ({ client }) => {
    const r = await client.get('/api/v1/health?x=1')

    r.assertStatus(200)
  })
})
