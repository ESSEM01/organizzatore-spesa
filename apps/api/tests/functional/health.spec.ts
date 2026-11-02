import { test } from '@japa/runner'

test.group('Health', () => {
  test('GET /api/v1/health risponde che il servizio è attivo', async ({ client }) => {
    const response = await client.get('/api/v1/health')

    response.assertStatus(200)
    response.assertBody({ status: 'ok' })
  })
})
