import { StimeOsservaprezziSchema } from '#database/schema'

/** Media mensile di Osservaprezzi per provincia (D1): una stima, mai il prezzo di un negozio. */
export default class StimaOsservaprezzi extends StimeOsservaprezziSchema {
  static table = 'stime_osservaprezzi'
}
