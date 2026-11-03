import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/** Server pubblici di Overpass, provati in ordine (gli stessi della PWA, D10). */
const SERVER_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Comune di Roma, identificato dal codice ISTAT per non confonderlo con altri luoghi chiamati "Roma".
 * Stessi tipi di negozio della ricerca nella PWA: supermercati e discount.
 */
const QUERY_ROMA = `[out:json][timeout:120];
area["boundary"="administrative"]["ref:ISTAT"="058091"]->.roma;
nwr(area.roma)[shop~"^(supermarket|discount)$"];
out center tags;`

/**
 * Salva nel database i supermercati di Roma delle catene di cui abbiamo almeno un volantino (D14).
 * Uso: node ace negozi:importa. Dati © OpenStreetMap contributors (ODbL): l'app ne mostra l'attribuzione.
 */
export default class NegoziImporta extends BaseCommand {
  static commandName = 'negozi:importa'
  static description = 'Salva i supermercati di Roma delle catene con volantino, da OpenStreetMap'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { importaNegozi } = await import('#services/negozi/importa')
    const { default: db } = await import('@adonisjs/lucid/services/db')

    const catene: string[] = (
      await db
        .from('catene')
        .whereIn('id', db.from('volantini').select('catena_id').where('stato', 'letto'))
        .select('codice')
    ).map((c: { codice: string }) => c.codice)
    this.logger.info(`Catene con volantino: ${catene.join(', ')}`)

    for (const server of SERVER_OVERPASS) {
      try {
        const r = await fetch(server, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'organizzatore-spesa (importazione negozi, uso personale)',
          },
          body: `data=${encodeURIComponent(QUERY_ROMA)}`,
          signal: AbortSignal.timeout(150_000),
        })
        if (!r.ok) {
          this.logger.warning(`${new URL(server).host}: risposta ${r.status}, provo il successivo`)
          continue
        }
        const json = (await r.json()) as Parameters<typeof importaNegozi>[0]
        if (!Array.isArray(json?.elements)) {
          this.logger.warning(
            `${new URL(server).host}: risposta senza elementi, provo il successivo`
          )
          continue
        }
        const esito = await importaNegozi(json, {
          catene,
          comune: 'Roma',
          provincia: 'RM',
        })
        this.logger.success(
          `${esito.trovati} supermercati a Roma, ${esito.salvati} salvati: ` +
            Object.entries(esito.perCatena)
              .map(([c, n]) => `${c} ${n}`)
              .join(', ')
        )
        return
      } catch (e) {
        this.logger.warning(
          `${new URL(server).host}: ${e instanceof Error ? e.message : String(e)}, provo il successivo`
        )
      }
    }
    this.logger.error('Nessun server Overpass ha risposto')
    this.exitCode = 1
  }
}
