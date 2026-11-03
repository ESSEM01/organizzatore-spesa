import { describe, expect, it, vi } from 'vitest'
import { ErroreApi, creaApi } from './api'

function risposta(status: number, corpo?: unknown) {
  return Promise.resolve(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('api', () => {
  it('manda il cookie di sessione, nessun token, e restituisce il campo data', async () => {
    const f = vi.fn<typeof fetch>(() => risposta(200, { data: [{ id: 1 }] }))

    const dati = await creaApi(f).richiesta('GET', '/miei-negozi')

    expect(dati).toEqual([{ id: 1 }])
    expect(f.mock.calls[0]?.[0]).toBe('/api/v1/miei-negozi')
    expect(f.mock.calls[0]?.[1]?.credentials).toBe('same-origin')
    expect(new Headers(f.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false)
  })

  it('un percorso firmato dell’API (link delle email) si usa così com’è', async () => {
    const f = vi.fn<typeof fetch>(() => risposta(200, { data: null }))

    await creaApi(f).richiesta('POST', '/api/v1/auth/verifica-email/3?signature=abc')

    expect(f.mock.calls[0]?.[0]).toBe('/api/v1/auth/verifica-email/3?signature=abc')
  })

  it('invia il corpo come JSON', async () => {
    const f = vi.fn<typeof fetch>(() => risposta(201, { data: { id: 2 } }))

    await creaApi(f).richiesta('POST', '/miei-negozi', { nome: 'Esempio' })

    expect(f.mock.calls[0]?.[1]?.body).toBe('{"nome":"Esempio"}')
    expect(new Headers(f.mock.calls[0]?.[1]?.headers).get('Content-Type')).toBe('application/json')
  })

  it('una risposta 204 restituisce null', async () => {
    expect(await creaApi(() => risposta(204)).richiesta('DELETE', '/miei-negozi/1')).toBeNull()
  })

  it('gli errori di validazione diventano messaggi per campo', async () => {
    const f = () => risposta(422, { errors: [{ field: 'email', message: 'Email non valida', rule: 'email' }] })

    const errore = await creaApi(f)
      .richiesta('POST', '/auth/login', {})
      .catch((e: unknown) => e)

    expect(errore).toBeInstanceOf(ErroreApi)
    expect((errore as ErroreApi).campi).toEqual({ email: 'Email non valida' })
  })

  it('con 401 chiede di accedere di nuovo', async () => {
    const errore = await creaApi(() => risposta(401, { errors: [{ message: 'Unauthorized access' }] }))
      .richiesta('GET', '/account/profile')
      .catch((e: unknown) => e)

    expect((errore as ErroreApi).status).toBe(401)
    expect((errore as ErroreApi).message).toMatch(/accedere/)
  })

  it('con 429 mostra il messaggio del server sui troppi tentativi', async () => {
    const f = () => risposta(429, { errors: [{ message: 'Troppi tentativi sbagliati. Riprova tra 15 minuti.' }] })

    const errore = await creaApi(f)
      .richiesta('POST', '/auth/login', {})
      .catch((e: unknown) => e)

    expect((errore as ErroreApi).message).toMatch(/Troppi tentativi/)
  })

  it('senza rete segnala un errore comprensibile', async () => {
    const errore = await creaApi(() => Promise.reject(new TypeError('Failed to fetch')))
      .richiesta('GET', '/miei-negozi')
      .catch((e: unknown) => e)

    expect((errore as ErroreApi).message).toMatch(/connessione/)
  })
})
