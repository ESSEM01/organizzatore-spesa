import { describe, expect, it, vi } from 'vitest'
import { posizioneDaTesto } from './osm'

// Risposte di esempio con la forma reale di Nominatim.
function risposta(corpo: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('posizioneDaTesto', () => {
  it('trova la posizione di una città o di un CAP in Italia, arrotondata', async () => {
    const fetchFinto = vi.fn<typeof fetch>(() => risposta([{ lat: '41.8719', lon: '12.5674' }]))

    expect(await posizioneDaTesto('00147', fetchFinto)).toEqual({ lat: 41.872, lon: 12.567 })
    expect(String(fetchFinto.mock.calls[0]?.[0])).toContain('countrycodes=it')
  })

  it('restituisce null se non trova nulla', async () => {
    expect(await posizioneDaTesto('zzzz', () => risposta([]))).toBeNull()
  })
})
