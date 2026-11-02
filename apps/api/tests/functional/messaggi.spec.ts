import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

test.group('Messaggi di validazione in italiano', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('il login con dati mancanti o non validi risponde in italiano', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'non-una-email' } as never)

    response.assertStatus(422)
    const { errors } = response.body() as unknown as {
      errors: { field: string; message: string }[]
    }
    const messaggi = Object.fromEntries(errors.map((e) => [e.field, e.message]))
    assert.equal(messaggi.email, 'Inserisci un indirizzo email valido')
    assert.equal(messaggi.password, 'Il campo password è obbligatorio')
  })

  test('la registrazione spiega password corta, conferma diversa ed email già usata', async ({
    client,
    assert,
  }) => {
    await User.create({ email: 'esempio@example.invalid', password: 'password-di-prova' })

    const response = await client.post('/api/v1/auth/signup').json({
      fullName: null,
      email: 'esempio@example.invalid',
      password: 'corta',
      passwordConfirmation: 'abbastanza-lunga-ma-diversa',
    })

    response.assertStatus(422)
    const { errors } = response.body() as unknown as {
      errors: { field: string; message: string }[]
    }
    const messaggi = Object.fromEntries(errors.map((e) => [e.field, e.message]))
    assert.equal(messaggi.email, 'Esiste già un account con questa email')
    assert.equal(messaggi.password, 'Il campo password deve avere almeno 8 caratteri')
    assert.equal(messaggi.passwordConfirmation, 'Le due password non coincidono')
  })
})
