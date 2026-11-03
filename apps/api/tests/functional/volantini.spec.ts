import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { importaVolantino, type LettoreVolantino } from '#services/volantini/importa'

// PDF e offerte di esempio: nessuna chiamata al modello, nessun costo.
const pdf = Buffer.from('%PDF-1.7 volantino di esempio')
const offerta = {
  nome: 'Pasta di semola',
  marca: 'Marca di esempio',
  formato: '500 g',
  quantita: 500,
  unita: 'g' as const,
  categoria: 'pane_pasta_cereali' as const,
  prezzo_centesimi: 79,
  prezzo_pieno_centesimi: 119,
  condizione: null,
  pagina: 2,
}

function lettore(risposta: Partial<Awaited<ReturnType<LettoreVolantino>>> = {}) {
  let chiamate = 0
  const leggi: LettoreVolantino = async () => {
    chiamate++
    return {
      esito: 'ok',
      modello: 'claude-opus-5-5',
      stopReason: 'end_turn',
      usage: { input: 30_000, output: 2_000, cacheLettura: 0 },
      dati: { valido_dal: '2026-10-01', valido_al: '2026-10-10', offerte: [offerta] },
      ...risposta,
    }
  }
  return { leggi, chiamate: () => chiamate }
}

test.group('importaVolantino', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('salva il volantino e le offerte come proposte, con la catena', async ({ assert }) => {
    const l = lettore()

    const esito = await importaVolantino(
      'conad-lazio-convenienza-piu-2026-10-28_2026-11-04.pdf',
      pdf,
      l.leggi
    )

    assert.equal(esito.stato, 'letto')
    assert.equal(esito.offerte, 1)
    const [salvata] = await db.from('offerte').select('*')
    const conad = await db.from('catene').where('codice', 'conad').first()
    assert.containsSubset(salvata, {
      nome: 'Pasta di semola',
      formato: '500 g',
      unita: 'g',
      centesimi: 79,
      prezzo_pieno_centesimi: 119,
      stato: 'proposta',
      catena_id: conad.id,
    })
  })

  test('la validità scritta nel nome del file prevale su quella letta dal modello', async ({
    assert,
  }) => {
    await importaVolantino(
      'conad-lazio-convenienza-piu-2026-10-28_2026-11-04.pdf',
      pdf,
      lettore().leggi
    )

    const v = await db.from('volantini').first()
    const o = await db.from('offerte').first()
    assert.equal(String(v.valido_dal).slice(0, 10), '2026-10-28')
    assert.equal(String(o.valido_al).slice(0, 10), '2026-11-04')
  })

  test('senza date nel nome usa quelle lette dal modello', async ({ assert }) => {
    await importaVolantino('naturasi-ottobre-247.pdf', pdf, lettore().leggi)

    const v = await db.from('volantini').first()
    assert.equal(String(v.valido_al).slice(0, 10), '2026-10-10')
  })

  test('lo stesso PDF non si rilegge e non si paga due volte', async ({ assert }) => {
    const l = lettore()
    await importaVolantino('gros-ma-2026-10-23_2026-11-03.pdf', pdf, l.leggi)

    const seconda = await importaVolantino('gros-ma-2026-10-23_2026-11-03.pdf', pdf, l.leggi)

    assert.equal(seconda.stato, 'gia_letto')
    assert.equal(l.chiamate(), 1)
    const [{ n }] = await db.from('offerte').count('* as n')
    assert.equal(Number(n), 1)
  })

  test('con rileggi un volantino già letto si rilegge e le offerte si sostituiscono', async ({
    assert,
  }) => {
    const l = lettore()
    await importaVolantino('gros-ma-2026-10-23_2026-11-03.pdf', pdf, l.leggi)

    const seconda = await importaVolantino('gros-ma-2026-10-23_2026-11-03.pdf', pdf, l.leggi, {
      rileggi: true,
    })

    assert.equal(seconda.stato, 'letto')
    assert.equal(l.chiamate(), 2)
    const [{ n }] = await db.from('offerte').count('* as n')
    assert.equal(Number(n), 1)
    const [{ v }] = await db.from('volantini').count('* as v')
    assert.equal(Number(v), 1)
  })

  test('registra token e modello della richiesta, senza contenuti', async ({ assert }) => {
    await importaVolantino('gros-ma-2026-10-23_2026-11-03.pdf', pdf, lettore().leggi)

    const r = await db.from('richieste_llm').first()
    assert.containsSubset(r, {
      scopo: 'volantino',
      modello: 'claude-opus-5-5',
      token_input: 30_000,
      token_output: 2_000,
      esito: 'ok',
    })
  })

  test('un rifiuto o un errore del modello lascia il volantino in errore, senza offerte', async ({
    assert,
  }) => {
    const esito = await importaVolantino(
      'gros-ma-2026-10-23_2026-11-03.pdf',
      pdf,
      lettore({ esito: 'rifiuto', stopReason: 'refusal', dati: null }).leggi
    )

    assert.equal(esito.stato, 'errore')
    const v = await db.from('volantini').first()
    assert.equal(v.stato, 'errore')
    const [{ n }] = await db.from('offerte').count('* as n')
    assert.equal(Number(n), 0)
  })

  test('scarta le offerte con prezzo non valido invece di inventarlo', async ({ assert }) => {
    const esito = await importaVolantino(
      'gros-ma-2026-10-23_2026-11-03.pdf',
      pdf,
      lettore({
        dati: {
          valido_dal: null,
          valido_al: null,
          offerte: [offerta, { ...offerta, nome: 'Senza prezzo', prezzo_centesimi: -1 }],
        },
      }).leggi
    )

    assert.equal(esito.offerte, 1)
    assert.equal(esito.scartate, 1)
  })
})
