import { describe, expect, it, vi } from 'vitest'
import { cercaNegoziVicini, localitaDaPosizione, posizioneDaTesto, SERVER_OVERPASS } from './osm'

// Risposte di esempio con la forma reale delle API OSM.
const overpassOk = {
  elements: [{ type: 'node', id: 1, lat: 41.8525, lon: 12.4925, tags: { shop: 'supermarket', brand: 'Conad', name: 'Conad' } }],
}
const nominatimOk = [{ osm_type: 'node', osm_id: 2, lat: '41.853', lon: '12.493', name: 'Todis' }]

function risposta(corpo: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('cercaNegoziVicini', () => {
  it('invia a Overpass solo la posizione arrotondata a 3 decimali (D5)', async () => {
    const fetchFinto = vi.fn<typeof fetch>(() => risposta(overpassOk))

    await cercaNegoziVicini({ lat: 41.851915, lon: 12.491902 }, 1500, fetchFinto)

    const corpo = String(fetchFinto.mock.calls[0]?.[1]?.body)
    expect(decodeURIComponent(corpo)).toContain('around:1500,41.852,12.492')
    expect(corpo).not.toContain('41.8519')
  })

  it('restituisce i negozi di Overpass con la fonte', async () => {
    const esito = await cercaNegoziVicini({ lat: 41.852, lon: 12.492 }, 2000, () => risposta(overpassOk))

    expect(esito.fonte).toBe('overpass')
    expect(esito.negozi.map((n) => n.catena)).toEqual(['conad'])
  })

  it('se un server Overpass è sovraccarico prova il successivo', async () => {
    const fetchFinto = vi
      .fn<typeof fetch>(() => risposta({ errore: 'carico' }, 504))
      .mockImplementationOnce(() => risposta({}, 502))
      .mockImplementationOnce(() => risposta(overpassOk))

    const esito = await cercaNegoziVicini({ lat: 41.852, lon: 12.492 }, 2000, fetchFinto)

    expect(fetchFinto.mock.calls[1]?.[0]).toBe(SERVER_OVERPASS[1])
    expect(esito.fonte).toBe('overpass')
  })

  it('se tutti i server Overpass falliscono ripiega su Nominatim, entro il raggio', async () => {
    const fetchFinto = vi.fn((url: Parameters<typeof fetch>[0]) =>
      String(url).includes('nominatim')
        ? risposta([...nominatimOk, { osm_type: 'node', osm_id: 3, lat: '41.95', lon: '12.6', name: 'Lontano' }])
        : Promise.reject(new TypeError('rete')),
    )

    const esito = await cercaNegoziVicini({ lat: 41.852, lon: 12.492 }, 2000, fetchFinto)

    expect(esito.fonte).toBe('nominatim')
    expect(esito.negozi.map((n) => n.nome)).toEqual(['Todis'])
  })

  it('se anche Nominatim fallisce segnala un errore comprensibile', async () => {
    await expect(
      cercaNegoziVicini({ lat: 41.852, lon: 12.492 }, 2000, () => Promise.reject(new TypeError('rete'))),
    ).rejects.toThrow(/supermercati/)
  })
})

describe('localitaDaPosizione', () => {
  it('ricava comune e provincia dalla posizione arrotondata', async () => {
    const fetchFinto = vi.fn<typeof fetch>(() =>
      risposta({ address: { city: 'Roma', 'ISO3166-2-lvl6': 'IT-RM' } }),
    )

    expect(await localitaDaPosizione({ lat: 41.851915, lon: 12.491902 }, fetchFinto)).toEqual({
      comune: 'Roma',
      provincia: 'RM',
    })
    expect(String(fetchFinto.mock.calls[0]?.[0])).toContain('lat=41.852&lon=12.492')
  })
})

describe('posizioneDaTesto', () => {
  it('trova la posizione di una città o di un CAP in Italia', async () => {
    const fetchFinto = vi.fn<typeof fetch>(() => risposta([{ lat: '41.8719', lon: '12.5674' }]))

    expect(await posizioneDaTesto('00147', fetchFinto)).toEqual({ lat: 41.872, lon: 12.567 })
    expect(String(fetchFinto.mock.calls[0]?.[0])).toContain('countrycodes=it')
  })

  it('restituisce null se non trova nulla', async () => {
    expect(await posizioneDaTesto('zzzz', () => risposta([]))).toBeNull()
  })
})
