import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroreApi, creaApi } from './api'

function memoria() {
  const dati = new Map<string, string>()
  return {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
    removeItem: (k: string) => void dati.delete(k),
  }
}

function risposta(status: number, corpo?: unknown) {
  return Promise.resolve(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('api', () => {
  let archivio: ReturnType<typeof memoria>
  beforeEach(() => {
    archivio = memoria()
  })

  it('aggiunge il token di accesso salvato e restituisce il campo data', async () => {
    archivio.setItem('spesa.token', 'tok-esempio')
    const f = vi.fn<typeof fetch>(() => risposta(200, { data: [{ id: 1 }] }))

    const dati = await creaApi(f, archivio).richiesta('GET', '/miei-negozi')

    expect(dati).toEqual([{ id: 1 }])
    expect(f.mock.calls[0]?.[0]).toBe('/api/v1/miei-negozi')
    expect(new Headers(f.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer tok-esempio')
  })

  it('senza token non invia Authorization', async () => {
    const f = vi.fn<typeof fetch>(() => risposta(200, { data: null }))

    await creaApi(f, archivio).richiesta('GET', '/health')

    expect(new Headers(f.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false)
  })

  it('invia il corpo come JSON', async () => {
    const f = vi.fn<typeof fetch>(() => risposta(201, { data: { id: 2 } }))

    await creaApi(f, archivio).richiesta('POST', '/miei-negozi', { nome: 'Esempio' })

    expect(f.mock.calls[0]?.[1]?.body).toBe('{"nome":"Esempio"}')
    expect(new Headers(f.mock.calls[0]?.[1]?.headers).get('Content-Type')).toBe('application/json')
  })

  it('una risposta 204 restituisce null', async () => {
    expect(await creaApi(() => risposta(204), archivio).richiesta('DELETE', '/miei-negozi/1')).toBeNull()
  })

  it('gli errori di validazione diventano messaggi per campo', async () => {
    const f = () => risposta(422, { errors: [{ field: 'email', message: 'Email non valida', rule: 'email' }] })

    const errore = await creaApi(f, archivio)
      .richiesta('POST', '/auth/login', {})
      .catch((e: unknown) => e)

    expect(errore).toBeInstanceOf(ErroreApi)
    expect((errore as ErroreApi).campi).toEqual({ email: 'Email non valida' })
  })

  it('con 401 dimentica il token salvato', async () => {
    archivio.setItem('spesa.token', 'scaduto')

    const errore = await creaApi(() => risposta(401, { errors: [{ message: 'Unauthorized access' }] }), archivio)
      .richiesta('GET', '/account/profile')
      .catch((e: unknown) => e)

    expect((errore as ErroreApi).status).toBe(401)
    expect(archivio.getItem('spesa.token')).toBeNull()
  })

  it('senza rete segnala un errore comprensibile', async () => {
    const errore = await creaApi(() => Promise.reject(new TypeError('Failed to fetch')), archivio)
      .richiesta('GET', '/miei-negozi')
      .catch((e: unknown) => e)

    expect((errore as ErroreApi).message).toMatch(/connessione/)
  })
})
