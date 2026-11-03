import { ImportOsservaprezziSchema } from '#database/schema'

/** Registro delle pagine di Osservaprezzi già scaricate (D1): non si richiedono due volte. */
export default class ImportOsservaprezzi extends ImportOsservaprezziSchema {
  static table = 'import_osservaprezzi'
}
