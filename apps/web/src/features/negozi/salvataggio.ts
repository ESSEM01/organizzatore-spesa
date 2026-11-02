import type { NegozioVicino } from '@spesa/domain'
import type { Api } from '../../lib/api'
import type { Localita } from './osm'

/** Negozio salvato, come lo restituisce `GET /api/v1/miei-negozi`. */
export interface NegozioSalvato {
  id: number
  osmId: string
  nome: string
  indirizzo: string | null
  comune: string
  provincia: string
  lat: number
  lon: number
  catena: { codice: string; nome: string } | null
}

/**
 * Dati da inviare all'API. Solo dati pubblici del negozio: la distanza, che rivelerebbe
 * dove si trova l'utente, non esce dal telefono (D5).
 */
export function datiPerSalvare(n: NegozioVicino, localita: Localita | null) {
  const provincia = localita?.provincia
  if (!provincia) {
    throw new Error('Non riesco a capire la provincia di questa zona: ripeti la ricerca e riprova.')
  }
  return {
    osmId: n.osmId,
    nome: n.nome,
    catena: n.catena,
    indirizzo: n.indirizzo,
    comune: n.comune ?? localita.comune ?? '',
    provincia,
    lat: n.lat,
    lon: n.lon,
  }
}

export const elencoMieiNegozi = (api: Api) => api.richiesta<NegozioSalvato[]>('GET', '/miei-negozi')

export const aggiungiMioNegozio = (api: Api, n: NegozioVicino, localita: Localita | null) =>
  api.richiesta<NegozioSalvato>('POST', '/miei-negozi', datiPerSalvare(n, localita))

export const rimuoviMioNegozio = (api: Api, id: number) => api.richiesta<null>('DELETE', `/miei-negozi/${id}`)
