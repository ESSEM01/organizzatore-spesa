import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const DATA = /^\d{4}-\d{2}-\d{2}$/

interface VolantiniCatena {
  offerte: number
  volantini: { titolo: string; validoDal: string | null; validoAl: string | null }[]
}

const giorno = (valore: unknown) => (valore ? String(valore).slice(0, 10) : null)

/**
 * Catalogo pubblico dei supermercati salvati (D14) con i volantini validi di ogni catena (D7, D15).
 * La PWA lo scarica e calcola le distanze sul telefono: la posizione dell'utente non arriva mai qui (D5).
 */
export default class NegoziController {
  async index({ request, response }: HttpContext) {
    const richiesto = String(request.qs().oggi ?? '')
    const oggi = DATA.test(richiesto)
      ? richiesto
      : DateTime.now().setZone('Europe/Rome').toISODate()!

    const negozi = await db
      .from('negozi')
      .leftJoin('catene', 'catene.id', 'negozi.catena_id')
      .select(
        'negozi.osm_id',
        'negozi.nome',
        'catene.codice as catena',
        'negozi.indirizzo',
        'negozi.comune',
        'negozi.lat',
        'negozi.lon'
      )
      .orderBy('negozi.id')

    const validi = await db
      .from('volantini')
      .join('catene', 'catene.id', 'volantini.catena_id')
      .where('volantini.stato', 'letto')
      .where((q) => q.whereNull('volantini.valido_dal').orWhere('volantini.valido_dal', '<=', oggi))
      .where((q) => q.whereNull('volantini.valido_al').orWhere('volantini.valido_al', '>=', oggi))
      .select(
        'volantini.id',
        'catene.codice',
        'volantini.titolo',
        'volantini.valido_dal',
        'volantini.valido_al'
      )
      .orderBy('volantini.valido_al')

    const conteggi = validi.length
      ? await db
          .from('offerte')
          .whereIn(
            'volantino_id',
            validi.map((v) => v.id)
          )
          .groupBy('volantino_id')
          .select('volantino_id')
          .count('* as n')
      : []
    const offertePer = new Map(conteggi.map((c) => [c.volantino_id, Number(c.n)]))

    const volantini: Record<string, VolantiniCatena> = {}
    for (const v of validi) {
      const voce = (volantini[v.codice] ??= { offerte: 0, volantini: [] })
      voce.offerte += offertePer.get(v.id) ?? 0
      voce.volantini.push({
        titolo: v.titolo,
        validoDal: giorno(v.valido_dal),
        validoAl: giorno(v.valido_al),
      })
    }

    // Dati pubblici che cambiano al massimo una volta al giorno.
    response.header('Cache-Control', 'public, max-age=3600')
    return {
      data: {
        negozi: negozi.map((n) => ({
          osmId: n.osm_id,
          nome: n.nome,
          catena: n.catena ?? null,
          indirizzo: n.indirizzo,
          comune: n.comune,
          lat: Number(n.lat),
          lon: Number(n.lon),
        })),
        volantini,
      },
    }
  }
}
