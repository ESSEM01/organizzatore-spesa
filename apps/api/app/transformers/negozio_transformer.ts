import type Negozio from '#models/negozio'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Richiede la relazione `catena` già caricata. */
export default class NegozioTransformer extends BaseTransformer<Negozio> {
  toObject() {
    const n = this.resource
    return {
      ...this.pick(n, ['id', 'osmId', 'nome', 'indirizzo', 'comune', 'provincia']),
      // Con Turso i decimali possono arrivare come stringhe.
      lat: Number(n.lat),
      lon: Number(n.lon),
      catena: n.catena ? { codice: n.catena.codice, nome: n.catena.nome } : null,
    }
  }
}
