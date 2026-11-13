import { test } from '@japa/runner'
import { campiLog } from '#services/account/email'

// Indirizzo e link di esempio: il link firmato vale come una password temporanea.
const A = 'anna@example.test'
const LINK =
  'http://localhost:5173/#reimposta-password?url=%2Fapi%2Fv1%2Fauth%2Freimposta-password%2F1'

test.group('Email dell’account: cosa finisce nel log', () => {
  test('in produzione il link firmato non si scrive nel log', ({ assert }) => {
    assert.deepEqual(campiLog(A, LINK, true), { a: A })
  })

  test('in sviluppo il link resta nel log, per provare senza Resend', ({ assert }) => {
    assert.deepEqual(campiLog(A, LINK, false), { a: A, link: LINK })
  })
})
