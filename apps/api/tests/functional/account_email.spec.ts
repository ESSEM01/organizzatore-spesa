import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import { normalizzaEmailUtenti } from '#services/account/normalizza_email'

// Account di esempio (dominio .test): la posta è finta.
const EMAIL = 'anna@example.test'
const PASSWORD = 'password-di-prova-1'

let posta: ReturnType<typeof mail.fake>

test.group('Account: email senza maiuscole né spazi', (group) => {
  group.each.setup(async () => {
    posta = mail.fake()
    await limiter.clear()
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      mail.restore()
      await annulla()
    }
  })

  test('la registrazione salva l’email in minuscolo e senza spazi', async ({ client, assert }) => {
    const r = await client.post('/api/v1/auth/signup').json({
      fullName: 'Anna',
      email: '  Anna@Example.TEST ',
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
    })

    r.assertStatus(200)
    const u = await User.findByOrFail('email', EMAIL)
    assert.equal(u.fullName, 'Anna')
  })

  test('la stessa email con maiuscole diverse non crea un secondo account', async ({
    client,
    assert,
  }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post('/api/v1/auth/signup').json({
      fullName: null,
      email: 'ANNA@example.test',
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
    })

    r.assertStatus(422)
    const [{ n }] = await db.from('users').count('* as n')
    assert.equal(Number(n), 1)
  })

  test('il nome ha al massimo 100 caratteri', async ({ client }) => {
    const r = await client.post('/api/v1/auth/signup').json({
      fullName: 'a'.repeat(101),
      email: EMAIL,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
    })

    r.assertStatus(422)
    r.assertBodyContains({ errors: [{ field: 'fullName' }] })
  })

  test('l’accesso funziona con maiuscole e spazi nell’email', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client
      .post('/api/v1/auth/login')
      .json({ email: ' ANNA@Example.test', password: PASSWORD })

    r.assertStatus(200)
  })

  test('password dimenticata trova l’account anche con le maiuscole', async ({
    assert,
    client,
  }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    await client.post('/api/v1/auth/password-dimenticata').json({ email: 'Anna@Example.TEST ' })

    assert.lengthOf(posta.messages.sent(), 1)
  })

  test('gli account già registrati con le maiuscole passano in minuscolo', async ({ assert }) => {
    const ora = new Date()
    await db.table('users').insert([
      { email: ' Bruno@Example.TEST', password: 'x', created_at: ora },
      { email: 'carla@example.test', password: 'x', created_at: ora },
    ])

    await normalizzaEmailUtenti(db.connection())

    const email = await db.from('users').orderBy('email').select('email')
    assert.deepEqual(
      email.map((r) => r.email),
      ['bruno@example.test', 'carla@example.test']
    )
  })

  test('se due account diventano uguali la normalizzazione si ferma senza toccare nulla', async ({
    assert,
  }) => {
    const ora = new Date()
    await db.table('users').insert([
      { email: 'Dario@example.test', password: 'x', created_at: ora },
      { email: 'dario@example.test', password: 'x', created_at: ora },
      { email: 'Elena@example.test', password: 'x', created_at: ora },
    ])

    await assert.rejects(() => normalizzaEmailUtenti(db.connection()), /dario@example\.test/)

    const email = await db.from('users').orderBy('email').select('email')
    assert.deepEqual(
      email.map((r) => r.email),
      ['Dario@example.test', 'Elena@example.test', 'dario@example.test']
    )
  })
})
