import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'

// Account di esempio (dominio .test). La PWA manda solo JSON: form e multipart non si leggono.
const EMAIL = 'corpo@example.test'
const PASSWORD = 'password-di-prova-1'

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

  test('un form urlencoded non si legge, anche con i dati giusti', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client.post('/api/v1/auth/login').form({ email: EMAIL, password: PASSWORD })

    r.assertStatus(422)
  })

  test('un corpo multipart non si legge, anche con i dati giusti', async ({ client }) => {
    await User.create({ email: EMAIL, password: PASSWORD })

    const r = await client
      .post('/api/v1/auth/login')
      .field('email', EMAIL)
      .field('password', PASSWORD)

    r.assertStatus(422)
  })
})
