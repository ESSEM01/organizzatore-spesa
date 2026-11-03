import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { importaNutrizione } from '#services/nutrizione/importa'
import { usaPianificatore } from '#services/spesa_ia/pianificatore'
import type { Pianificatore, RichiestaPiano } from '#services/spesa_ia/pianificatore_claude'

// Negozio, offerte, stime e risposta del modello di esempio: nessuna chiamata al modello.
const OGGI = '2026-11-03'

async function prepara() {
  await importaNutrizione(app.makePath('database/data'))
  const user = await User.create({ email: 'lista@example.test', password: 'password-di-prova' })
  const conad = await db.from('catene').where('codice', 'conad').first()
  const ora = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const [negozioId] = await db.table('negozi').insert({
    osm_id: 'node/77',
    catena_id: conad.id,
    nome: 'Conad di esempio',
    comune: 'Roma',
    provincia: 'RM',
    lat: 41.85,
    lon: 12.49,
    aggiornato_il: ora,
  })
  await db
    .table('negozi_utente')
    .insert({ user_id: user.id, negozio_id: negozioId, created_at: ora })
  const [periodoId] = await db.table('periodi_budget').insert({
    user_id: user.id,
    dal: '2026-11-02',
    al: '2026-11-08',
    budget_centesimi: 5000,
    created_at: ora,
  })
  const [volantinoId] = await db.table('volantini').insert({
    catena_id: conad.id,
    titolo: 'Esempio',
    ambito: 'regione',
    hash_contenuto: 'esempio',
    valido_dal: '2026-11-01',
    valido_al: '2026-11-10',
    stato: 'letto',
    created_at: ora,
  })
  const [offertaId] = await db.table('offerte').insert({
    volantino_id: volantinoId,
    catena_id: conad.id,
    nome: 'Spaghetti di esempio',
    quantita: 500,
    unita: 'g',
    categoria: 'pane_pasta_cereali',
    centesimi: 79,
    valido_dal: '2026-11-01',
    valido_al: '2026-11-10',
    stato: 'proposta',
    created_at: ora,
  })
  await db.table('stime_osservaprezzi').insert({
    voce: 'Petto Di Pollo (1000 Gr)',
    tipologia: 'altri_alim',
    quantita: 1000,
    unita: 'g',
    provincia: 'RM',
    anno: 2026,
    mese: 9,
    min_centesimi: 1200,
    medio_centesimi: 1600,
    max_centesimi: 2400,
    created_at: ora,
  })
  return { user, negozioId, periodoId, offertaId }
}

function pianificatoreFinto() {
  const richieste: RichiestaPiano[] = []
  const p: Pianificatore = async (r) => {
    richieste.push(r)
    return {
      esito: 'ok',
      modello: 'claude-opus-5-5',
      stopReason: 'end_turn',
      usage: { input: 1000, output: 200, cacheLettura: 0 },
      piano: {
        voci: [
          { codice: 9810, grammi: 1200, priorita: 1 },
          { codice: 36017, grammi: 700, priorita: 2 },
          // Codice inesistente: si scarta.
          { codice: 1, grammi: 100, priorita: 1 },
        ],
        nota: 'Nota di esempio.',
      },
    }
  }
  return { p, richieste }
}

test.group('Lista preparata dall’IA', (group) => {
  group.each.setup(async () => {
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      usaPianificatore(null)
      await annulla()
    }
  })

  test('propone alimenti con prezzi per negozio, nel budget, con i valori nutrizionali', async ({
    client,
    assert,
  }) => {
    const { user, periodoId, offertaId } = await prepara()
    const finto = pianificatoreFinto()
    usaPianificatore(finto.p)

    const r = await client
      .post('/api/v1/liste/proposta')
      .json({ periodoId, oggi: OGGI })
      .loginAs(user)

    r.assertStatus(200)
    const proposta = r.body().data
    // Al modello vanno solo alimenti con un prezzo: la pasta (offerta) e il pollo (stima).
    assert.sameMembers(
      finto.richieste[0].alimenti.map((a) => a.codice),
      [9810, 36017]
    )
    assert.equal(finto.richieste[0].giorni, 6)
    assert.deepEqual(
      proposta.piano.map((v: { codice: number }) => v.codice),
      [9810, 36017]
    )
    const lista = proposta.negozi[0].lista
    assert.containsSubset(lista.voci[0], {
      codice: 9810,
      confezioni: 3,
      centesimi: 237,
      scelta: { fonte: 'offerta', offertaId },
    })
    assert.containsSubset(lista.voci[1], {
      codice: 36017,
      centesimi: 1120,
      scelta: { fonte: 'stima' },
    })
    assert.equal(lista.totaleCentesimi, 1357)
    assert.isAbove(proposta.nutrizione.alGiorno.kcal, 0)
    const costo = await db.from('richieste_llm').where('scopo', 'lista').first()
    assert.equal(costo.user_id, user.id)
  })

  test('salva la proposta come lista con i prezzi previsti, riletti dal database', async ({
    client,
    assert,
  }) => {
    const { user, periodoId, negozioId, offertaId } = await prepara()

    const r = await client
      .post('/api/v1/liste/da-proposta')
      .json({
        periodoId,
        negozioId,
        voci: [
          // Il prezzo dichiarato dal client per l'offerta si ignora: vale quello del volantino.
          { nome: 'Spaghetti di esempio', grammi: 1200, confezioni: 3, centesimi: 1, offertaId },
          {
            nome: 'Petto di pollo',
            grammi: 700,
            confezioni: null,
            centesimi: 1120,
            offertaId: null,
          },
        ],
      })
      .loginAs(user)

    r.assertStatus(201)
    const dettaglio = await client
      .get(`/api/v1/liste/${r.body().data.id}`)
      .qs({ oggi: OGGI })
      .loginAs(user)
    assert.equal(dettaglio.body().data.totale.totaleCentesimi, 3 * 79 + 1120)
    assert.deepEqual(dettaglio.body().data.totale.stimati, ['Petto di pollo'])
  })

  test('senza negozi scelti chiede di aggiungerne uno', async ({ client }) => {
    const { user, periodoId } = await prepara()
    await db.from('negozi_utente').where('user_id', user.id).delete()
    usaPianificatore(pianificatoreFinto().p)

    const r = await client
      .post('/api/v1/liste/proposta')
      .json({ periodoId, oggi: OGGI })
      .loginAs(user)

    r.assertStatus(422)
    r.assertBodyContains({ errors: [{ field: 'negozi' }] })
  })

  test('il numero di persone si legge e si cambia', async ({ client, assert }) => {
    const { user } = await prepara()

    const prima = await client.get('/api/v1/preferenze').loginAs(user)
    await client.patch('/api/v1/preferenze').json({ persone: 3 }).loginAs(user)
    const dopo = await client.get('/api/v1/preferenze').loginAs(user)

    assert.equal(prima.body().data.persone, 1)
    assert.equal(dopo.body().data.persone, 3)
  })
})
