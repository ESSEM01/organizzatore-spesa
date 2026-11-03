import { test } from '@japa/runner'
import { libsqlFilename, rendiRigheModificabili, usaFetchDiNode } from '#services/libsql'

/** Riga come la costruisce @libsql/hrana-client: indici non enumerabili, colonne in sola lettura. */
function rigaHrana(colonne: Record<string, unknown>) {
  const riga = {}
  Object.entries(colonne).forEach(([nome, valore], i) => {
    Object.defineProperty(riga, i, { value: valore })
    Object.defineProperty(riga, nome, { value: valore, enumerable: true })
  })
  return riga as Record<string, unknown>
}

/** Statement finto con la stessa firma a callback del driver. */
class StatementFinto {
  constructor(private righe: Record<string, unknown>[]) {}
  all(...args: unknown[]) {
    const callback = args.at(-1) as (err: Error | null, rows: unknown[]) => void
    callback(null, this.righe)
    return this
  }
  get(...args: unknown[]) {
    const callback = args.at(-1) as (err: Error | null, row?: unknown) => void
    callback(null, this.righe[0])
    return this
  }
  each(...args: unknown[]) {
    const callback = args.find((a) => typeof a === 'function') as (
      err: Error | null,
      row: unknown
    ) => void
    this.righe.forEach((r) => callback(null, r))
    return this
  }
}

test.group('rendiRigheModificabili', () => {
  test('le righe restituite da all() diventano oggetti normali e modificabili', ({ assert }) => {
    rendiRigheModificabili(StatementFinto)
    const stmt = new StatementFinto([rigaHrana({ id: 1, last_used_at: null })])

    stmt.all('select 1', [], (_err: Error | null, rows: any[]) => {
      rows[0].last_used_at = 'ora'
      assert.deepEqual(rows, [{ id: 1, last_used_at: 'ora' }])
    })
  })

  test('vale anche per get() ed each(), e lascia passare i risultati vuoti', ({ assert }) => {
    rendiRigheModificabili(StatementFinto)

    new StatementFinto([rigaHrana({ id: 2 })]).get('select 1', (_err: Error | null, row: any) => {
      row.id = 3
      assert.equal(row.id, 3)
    })
    new StatementFinto([rigaHrana({ id: 4 })]).each('select 1', (_err: Error | null, row: any) => {
      row.id = 5
      assert.equal(row.id, 5)
    })
    new StatementFinto([]).get('select 1', (_err: Error | null, row: unknown) =>
      assert.isUndefined(row)
    )
  })

  test('applicata due volte non avvolge di nuovo i metodi', ({ assert }) => {
    rendiRigheModificabili(StatementFinto)
    const dopoPrima = StatementFinto.prototype.all
    rendiRigheModificabili(StatementFinto)

    assert.strictEqual(StatementFinto.prototype.all, dopoPrima)
  })
})

test.group('libsqlFilename', () => {
  test("unisce l'URL del database Turso e il token nel formato letto da @libsql/sqlite3", ({
    assert,
  }) => {
    assert.equal(
      libsqlFilename('libsql://spesa-utente.turso.io', 'token-di-prova'),
      'libsql://spesa-utente.turso.io?authToken=token-di-prova'
    )
  })

  test('codifica i caratteri speciali del token', ({ assert }) => {
    assert.equal(
      libsqlFilename('libsql://db.turso.io', 'a+b/c='),
      'libsql://db.turso.io?authToken=a%2Bb%2Fc%3D'
    )
  })

  test('mantiene gli altri parametri già presenti nell’URL', ({ assert }) => {
    assert.equal(
      libsqlFilename('libsql://localhost:8080?tls=0', 'x'),
      'libsql://localhost:8080?tls=0&authToken=x'
    )
  })

  test('senza token restituisce l’URL invariato (server locale senza autenticazione)', ({
    assert,
  }) => {
    assert.equal(libsqlFilename('libsql://localhost:8080?tls=0'), 'libsql://localhost:8080?tls=0')
  })

  test('rifiuta un URL mancante o con uno schema non supportato', ({ assert }) => {
    assert.throws(() => libsqlFilename(undefined, 'x'), /LIBSQL_URL/)
    assert.throws(() => libsqlFilename('postgres://db.example.com', 'x'), /LIBSQL_URL/)
  })
})

test.group('usaFetchDiNode', () => {
  test('sostituisce fetch, Request e Headers del modulo con quelli di Node', ({ assert }) => {
    const modulo = { fetch: () => 'node-fetch', Request: class {}, Headers: class {} }

    usaFetchDiNode(modulo)

    assert.strictEqual(modulo.fetch, globalThis.fetch)
    assert.strictEqual(modulo.Request, globalThis.Request)
    assert.strictEqual(modulo.Headers, globalThis.Headers)
  })
})
