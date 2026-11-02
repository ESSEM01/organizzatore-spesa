import { describe, expect, it } from 'vitest'
import {
  arrotondaPosizione,
  catenaDaOsm,
  distanzaMetri,
  negoziDaNominatim,
  negoziDaOverpass,
  provinciaDaIso,
} from './negozi.js'

// Coordinate e negozi di esempio, con la forma reale delle risposte OSM.
const origine = { lat: 41.852, lon: 12.492 }

describe('arrotondaPosizione', () => {
  it('tiene 3 decimali (circa 100 m), come previsto da D5', () => {
    expect(arrotondaPosizione({ lat: 41.851915, lon: 12.491902 })).toEqual({ lat: 41.852, lon: 12.492 })
  })

  it('rifiuta coordinate fuori scala', () => {
    expect(() => arrotondaPosizione({ lat: 91, lon: 0 })).toThrow(/coordinate/)
    expect(() => arrotondaPosizione({ lat: 0, lon: Number.NaN })).toThrow(/coordinate/)
  })
})

describe('distanzaMetri', () => {
  it('è zero tra un punto e se stesso', () => {
    expect(distanzaMetri(origine, origine)).toBe(0)
  })

  it('misura circa 111 km per un grado di latitudine', () => {
    expect(distanzaMetri({ lat: 41, lon: 12 }, { lat: 42, lon: 12 })).toBeCloseTo(111_195, -2)
  })

  it('misura la distanza tra due punti vicini a Roma con precisione al metro', () => {
    // Valore atteso calcolato a parte con la formula dell'emisenoverso (raggio 6.371.000 m).
    expect(distanzaMetri(origine, { lat: 41.8544841, lon: 12.4869757 })).toBeCloseTo(499.46, 0)
  })
})

describe('catenaDaOsm', () => {
  it('riconosce la catena dal tag brand', () => {
    expect(catenaDaOsm({ brand: 'Conad', name: 'Conad City' })).toBe('conad')
    expect(catenaDaOsm({ brand: 'Carrefour Market' })).toBe('carrefour')
  })

  it('in assenza di brand usa il nome, ignorando maiuscole e accenti', () => {
    expect(catenaDaOsm({ name: 'NATURASÌ' })).toBe('naturasi')
    expect(catenaDaOsm({ name: "In's Mercato" })).toBe('ins')
    expect(catenaDaOsm({ name: 'Pewex Gros' })).toBe('pewex')
  })

  it('riconosce i nomi attaccati usati su OSM, es. Cityconad', () => {
    expect(catenaDaOsm({ name: 'Cityconad' })).toBe('conad')
  })

  it('non confonde catene con nomi simili', () => {
    expect(catenaDaOsm({ name: 'Todis' })).toBe('todis')
    expect(catenaDaOsm({ name: 'Tuodì' })).toBe('tuodi')
    expect(catenaDaOsm({ name: 'MA Supermercati' })).toBe('ma')
    expect(catenaDaOsm({ name: 'Mercato rionale' })).toBeNull()
  })

  it('restituisce null per un negozio indipendente', () => {
    expect(catenaDaOsm({ name: 'Supermercato Navigatori' })).toBeNull()
    expect(catenaDaOsm({})).toBeNull()
  })
})

describe('provinciaDaIso', () => {
  it('estrae la sigla dal codice ISO 3166-2 di Nominatim', () => {
    expect(provinciaDaIso('IT-RM')).toBe('RM')
  })

  it('restituisce null per codici non italiani o mancanti', () => {
    expect(provinciaDaIso('FR-75')).toBeNull()
    expect(provinciaDaIso(undefined)).toBeNull()
  })
})

describe('negoziDaOverpass', () => {
  const risposta = {
    elements: [
      {
        type: 'node',
        id: 521790382,
        lat: 41.8544841,
        lon: 12.4869757,
        tags: {
          shop: 'supermarket',
          brand: 'Conad',
          name: 'Conad',
          'addr:street': 'Via Tito',
          'addr:housenumber': '13/15',
          'addr:city': 'Roma',
        },
      },
      {
        type: 'way',
        id: 99,
        center: { lat: 41.8521, lon: 12.4921 },
        tags: { shop: 'supermarket', name: 'Todis' },
      },
      { type: 'node', id: 7, tags: { shop: 'supermarket', name: 'Senza coordinate' } },
      { type: 'node', id: 8, lat: 41.853, lon: 12.493, tags: { shop: 'discount' } },
    ],
  }

  it('restituisce i negozi ordinati per distanza, con id OSM, catena e indirizzo', () => {
    const negozi = negoziDaOverpass(risposta, origine)

    expect(negozi.map((n) => n.osmId)).toEqual(['way/99', 'node/8', 'node/521790382'])
    expect(negozi[2]).toMatchObject({
      nome: 'Conad',
      catena: 'conad',
      indirizzo: 'Via Tito 13/15',
      comune: 'Roma',
      lat: 41.8544841,
      lon: 12.4869757,
    })
    expect(negozi[2]?.distanzaMetri).toBeCloseTo(499.46, 0)
  })

  it('usa il centro per le aree e scarta gli elementi senza coordinate', () => {
    const negozi = negoziDaOverpass(risposta, origine)

    expect(negozi.find((n) => n.osmId === 'way/99')).toMatchObject({ lat: 41.8521, lon: 12.4921 })
    expect(negozi.some((n) => n.osmId === 'node/7')).toBe(false)
  })

  it('dà un nome leggibile a un negozio senza nome', () => {
    expect(negoziDaOverpass(risposta, origine).find((n) => n.osmId === 'node/8')?.nome).toBe('Supermercato senza nome')
  })

  it('accetta una risposta vuota o malformata', () => {
    expect(negoziDaOverpass({ elements: [] }, origine)).toEqual([])
    expect(negoziDaOverpass({}, origine)).toEqual([])
  })
})

describe('negoziDaNominatim', () => {
  it('converte i risultati di ripiego nello stesso formato', () => {
    const negozi = negoziDaNominatim(
      [
        {
          osm_type: 'way',
          osm_id: 116587467,
          lat: '41.8448396',
          lon: '12.4792682',
          name: 'Carrefour Market',
          address: { road: 'Via Ostiense', house_number: '200', city: 'Roma' },
        },
      ],
      origine,
    )

    expect(negozi).toEqual([
      expect.objectContaining({
        osmId: 'way/116587467',
        nome: 'Carrefour Market',
        catena: 'carrefour',
        indirizzo: 'Via Ostiense 200',
        comune: 'Roma',
        lat: 41.8448396,
        lon: 12.4792682,
      }),
    ])
  })
})
