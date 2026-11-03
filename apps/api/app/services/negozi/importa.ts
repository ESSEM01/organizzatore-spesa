import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { negoziDaOverpass } from '@spesa/domain'
import Catena from '#models/catena'
import Negozio from '#models/negozio'

export interface OpzioniImportazione {
  /** Codici delle catene da tenere (es. quelle con almeno un volantino). */
  catene: string[]
  /** Comune dell'area interrogata: tutti i negozi trovati ne fanno parte. */
  comune: string
  provincia: string
}

export interface EsitoImportazioneNegozi {
  trovati: number
  salvati: number
  perCatena: Record<string, number>
}

/**
 * Salva i supermercati di un'area da una risposta di Overpass (D14). Si tengono solo le catene
 * indicate; i negozi già presenti si aggiornano per `osm_id`, quelli collegati agli utenti restano.
 */
export async function importaNegozi(
  risposta: Parameters<typeof negoziDaOverpass>[0],
  { catene, comune, provincia }: OpzioniImportazione
): Promise<EsitoImportazioneNegozi> {
  // L'origine serve solo al calcolo della distanza, che qui non si usa.
  const trovati = negoziDaOverpass(risposta, { lat: 0, lon: 0 })
  const idCatene = new Map(
    (await Catena.query().whereIn('codice', catene)).map((c) => [c.codice, c.id])
  )
  const daSalvare = trovati.filter((n) => n.catena !== null && idCatene.has(n.catena))

  const ora = DateTime.now()
  await db.transaction(async (trx) => {
    await Negozio.updateOrCreateMany(
      'osmId',
      daSalvare.map((n) => ({
        osmId: n.osmId,
        catenaId: idCatene.get(n.catena!)!,
        nome: n.nome,
        indirizzo: n.indirizzo,
        comune,
        provincia,
        lat: n.lat,
        lon: n.lon,
        aggiornatoIl: ora,
      })),
      { client: trx }
    )
  })

  const perCatena: Record<string, number> = {}
  for (const n of daSalvare) perCatena[n.catena!] = (perCatena[n.catena!] ?? 0) + 1
  return { trovati: trovati.length, salvati: daSalvare.length, perCatena }
}
