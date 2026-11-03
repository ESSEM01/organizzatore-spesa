/**
 * Il driver libsql di Lucid usa `@libsql/sqlite3`, che riceve URL e token di Turso
 * come un unico `filename`: `libsql://<db>.turso.io?authToken=<token>` (docs/decisioni.md, D8).
 */
const SCHEMI_SUPPORTATI = new Set(['libsql:', 'https:', 'http:', 'wss:', 'ws:'])

type Callback = (err: Error | null, ...risultati: unknown[]) => void
type ConMetodi = { prototype: Record<PropertyKey, any> }

const MARCATO = Symbol.for('spesa.libsql.righeModificabili')

function copia(riga: unknown): unknown {
  return riga !== null && typeof riga === 'object' ? { ...riga } : riga
}

/**
 * `@libsql/sqlite3` restituisce righe con colonne in sola lettura, mentre `@adonisjs/auth`
 * modifica la riga del token (`last_used_at`) e va in TypeError (verificato su Turso il 2026-11-02).
 * Avvolge `get`, `all` ed `each` di `Statement` perché passino copie normali delle righe.
 * Le query di knex passano tutte da qui (`Database.all/get/each` creano uno `Statement`).
 */
export function rendiRigheModificabili(Statement: ConMetodi): void {
  const proto = Statement.prototype
  if (proto[MARCATO]) return
  for (const metodo of ['get', 'all', 'each'] as const) {
    const originale = proto[metodo]
    proto[metodo] = function (this: unknown, ...args: unknown[]) {
      const i = args.findIndex((a) => typeof a === 'function')
      if (i !== -1) {
        const callback = args[i] as Callback
        args[i] = (err: Error | null, risultato: unknown, ...resto: unknown[]) =>
          callback(
            err,
            Array.isArray(risultato) ? risultato.map(copia) : copia(risultato),
            ...resto
          )
      }
      return originale.apply(this, args)
    }
  }
  proto[MARCATO] = true
}

type ModuloFetch = { fetch: unknown; Request: unknown; Headers: unknown }

/**
 * `@libsql/hrana-client` scarica le risposte con `@libsql/isomorphic-fetch`, che in Node usa
 * node-fetch con connessioni keep-alive: con Node 24 una risposta oltre circa 300 righe non arriva
 * mai, senza errore (verificato su Turso il 2026-11-03: 250 righe sì, 500 no). Il fetch di Node
 * non ha il problema: si sostituisce nel modulo prima che il client lo legga.
 */
export function usaFetchDiNode(modulo: ModuloFetch): void {
  modulo.fetch = globalThis.fetch
  modulo.Request = globalThis.Request
  modulo.Headers = globalThis.Headers
}

export function libsqlFilename(url: string | undefined, authToken?: string): string {
  let parsed: URL
  try {
    parsed = new URL(url ?? '')
  } catch {
    throw new Error(
      'LIBSQL_URL mancante o non valido: serve l’URL del database Turso, es. libsql://<db>.turso.io'
    )
  }
  if (!SCHEMI_SUPPORTATI.has(parsed.protocol)) {
    throw new Error(`LIBSQL_URL usa lo schema "${parsed.protocol}", non supportato da libsql`)
  }
  if (authToken) parsed.searchParams.set('authToken', authToken)
  return parsed.toString()
}
