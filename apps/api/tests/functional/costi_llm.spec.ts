import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import {
  costoDollari,
  richiediBudgetModello,
  spesaDelMese,
  TettoSuperato,
} from '#services/costi_llm'

// Richieste di esempio: solo token, nessuna chiamata al modello.
async function richiesta(input: number, output: number, quando: DateTime) {
  await db.table('richieste_llm').insert({
    scopo: 'volantino',
    modello: 'claude-opus-5-5',
    token_input: input,
    token_output: output,
    token_cache_lettura: 0,
    esito: 'ok',
    created_at: quando.toSQL({ includeOffset: false }),
  })
}

test.group('Tetto di spesa del modello', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('il costo si calcola dai token con il listino di Opus 5.5', ({ assert }) => {
    // 1 milione in ingresso = 4 $, 1 milione in uscita = 20 $.
    assert.closeTo(costoDollari({ input: 1_000_000, output: 1_000_000, cacheLettura: 0 }), 24, 1e-9)
  })

  test('conta solo le richieste del mese in corso', async ({ assert }) => {
    const ora = DateTime.fromISO('2026-11-20T10:00:00')
    await richiesta(1_000_000, 0, ora.set({ day: 2 }))
    await richiesta(1_000_000, 0, ora.minus({ months: 1 }))

    assert.closeTo(await spesaDelMese(ora), 4, 1e-9)
  })

  test('oltre il limite blocca nuove richieste con un messaggio chiaro', async ({ assert }) => {
    const ora = DateTime.now()
    await richiesta(0, 600_000, ora) // 12 $

    await assert.rejects(() => richiediBudgetModello(10), TettoSuperato)
    await richiediBudgetModello(20)
  })
})

test.group('Tetto di spesa nella lista IA', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('con il tetto superato la proposta non chiama il modello e lo dice', async ({
    client,
    assert,
  }) => {
    const { default: User } = await import('#models/user')
    const { usaPianificatore } = await import('#services/spesa_ia/pianificatore')
    const user = await User.create({ email: 'tetto@example.test', password: 'password-di-prova' })
    const [periodoId] = await db.table('periodi_budget').insert({
      user_id: user.id,
      dal: '2026-11-02',
      al: '2026-11-08',
      budget_centesimi: 5000,
    })
    // Negozio, offerta e alimento di esempio: senza, la proposta si fermerebbe prima del tetto.
    const conad = await db.from('catene').where('codice', 'conad').first()
    const [negozioId] = await db.table('negozi').insert({
      osm_id: 'node/990',
      catena_id: conad.id,
      nome: 'Conad di esempio',
      comune: 'Roma',
      provincia: 'RM',
      lat: 41.85,
      lon: 12.49,
      aggiornato_il: '2026-11-03 10:00:00',
    })
    await db.table('negozi_utente').insert({ user_id: user.id, negozio_id: negozioId })
    await db.table('alimenti').insert({ codice: 9810, nome_en: 'Dried pasta, raw', kcal: 336 })
    await db
      .table('alimenti_it')
      .insert({ nome: 'Pasta di semola', parole: 'pasta', alimento_codice: 9810 })
    await db.table('stime_osservaprezzi').insert({
      voce: 'Pasta di esempio (1000 Gr)',
      tipologia: 'altri_alim',
      quantita: 1000,
      unita: 'g',
      provincia: 'RM',
      anno: 2026,
      mese: 9,
      min_centesimi: 100,
      medio_centesimi: 150,
      max_centesimi: 200,
    })
    await richiesta(0, 1_000_000, DateTime.now()) // 20 $, oltre i 10 $ predefiniti
    let chiamato = false
    usaPianificatore(async () => {
      chiamato = true
      throw new Error('non doveva essere chiamato')
    })

    const r = await client
      .post('/api/v1/liste/proposta')
      .json({ periodoId, oggi: '2026-11-03' })
      .loginAs(user)
    usaPianificatore(null)

    r.assertStatus(422)
    assert.match(
      (r.body() as unknown as { errors: { message: string }[] }).errors[0].message,
      /già costato/
    )
    assert.isFalse(chiamato)
  })
})
