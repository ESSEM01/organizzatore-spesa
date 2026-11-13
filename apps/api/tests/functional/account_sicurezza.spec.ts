import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import { DateTime } from 'luxon'

// Account e indirizzi di esempio (dominio .test): nessuna email parte davvero, la posta è finta.
const EMAIL = 'anna@example.test'
const PASSWORD = 'password-di-prova-1'

async function utente(verificata = true) {
  return User.create({
    email: EMAIL,
    password: PASSWORD,
    emailVerificataIl: verificata ? DateTime.now() : null,
  })
}

let posta: ReturnType<typeof mail.fake>

/** Il link della PWA nell'ultima email spedita → percorso firmato dell'API. */
function percorsoDalLink(): string {
  const [ultima] = posta.messages.sent().slice(-1)
  const testo = ultima.toJSON().message.text as string
  const link = /https?:\/\/\S+/.exec(testo)![0]
  const url = new URL(link)
  return new URLSearchParams(url.hash.split('?')[1]).get('url')!
}

test.group('Account: sessione e sicurezza', (group) => {
  group.each.setup(async () => {
    posta = mail.fake()
    await limiter.clear()
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      mail.restore()
      await annulla()
    }
  })

  test('il login apre una sessione in un cookie httpOnly, senza token nella risposta', async ({
    client,
    assert,
  }) => {
    await utente()

    const r = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: PASSWORD })

    r.assertStatus(200)
    assert.notProperty(r.body().data, 'token')
    const cookie = [r.headers()['set-cookie'] ?? []].flat().join(';')
    assert.match(cookie, /adonis-session=[^;]+;[^,]*HttpOnly/i)
  })

  test('dopo 5 password sbagliate l’accesso si blocca, anche con quella giusta', async ({
    client,
    assert,
  }) => {
    await utente()
    for (let i = 0; i < 5; i++) {
      const r = await client
        .post('/api/v1/auth/login')
        .json({ email: EMAIL, password: 'sbagliata' })
      r.assertStatus(400)
    }

    const r = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: PASSWORD })

    r.assertStatus(429)
    assert.match(
      (r.body() as unknown as { errors: { message: string }[] }).errors[0].message,
      /Troppi tentativi/
    )
  })

  test('la registrazione spedisce il link di verifica, che conferma l’email', async ({
    client,
    assert,
  }) => {
    const r = await client
      .post('/api/v1/auth/signup')
      .json({ fullName: null, email: EMAIL, password: PASSWORD, passwordConfirmation: PASSWORD })
    r.assertStatus(200)
    assert.notOk(r.body().data.user.emailVerificataIl)
    assert.lengthOf(posta.messages.sent(), 1)

    // Come la PWA: senza corpo ma dichiarata JSON (con la firma in query, altrimenti 415).
    const conferma = await client.post(percorsoDalLink()).header('Content-Type', 'application/json')

    conferma.assertStatus(200)
    const u = await User.findByOrFail('email', EMAIL)
    assert.isNotNull(u.emailVerificataIl)
  })

  test('rispedire il link dice se l’email è partita davvero', async ({ client, assert }) => {
    const u = await utente(false)

    const r = await client.post('/api/v1/account/verifica-email').loginAs(u)

    assert.deepEqual(r.body().data, { spedita: true, giaConfermata: false })
    assert.lengthOf(posta.messages.sent(), 1)
  })

  test('un link di verifica alterato non vale', async ({ client }) => {
    const u = await utente(false)
    await client.post('/api/v1/account/verifica-email').loginAs(u)
    const alterato = percorsoDalLink().replace(`/${u.id}?`, `/${u.id + 1}?`)

    const r = await client.post(alterato).header('Content-Type', 'application/json')

    r.assertStatus(400)
  })

  test('password dimenticata: stessa risposta per email esistenti e no, link usabile una volta', async ({
    client,
    assert,
  }) => {
    await utente()
    const sconosciuta = await client
      .post('/api/v1/auth/password-dimenticata')
      .json({ email: 'nessuno@example.test' })
    const nota = await client.post('/api/v1/auth/password-dimenticata').json({ email: EMAIL })
    assert.deepEqual(sconosciuta.body(), nota.body())
    assert.lengthOf(posta.messages.sent(), 1)
    const percorso = percorsoDalLink()
    const nuova = 'nuova-password-di-prova'

    const r = await client.post(percorso).json({ password: nuova, passwordConfirmation: nuova })
    const ancora = await client.post(percorso).json({
      password: 'altra-password-di-prova',
      passwordConfirmation: 'altra-password-di-prova',
    })

    r.assertStatus(200)
    ancora.assertStatus(400)
    const login = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: nuova })
    login.assertStatus(200)
  })

  test('dopo il reset della password la vecchia sessione riceve 401', async ({
    client,
    assert,
  }) => {
    await utente()
    // Il client dei test non conserva la sessione tra le richieste: si riusano i suoi dati,
    // come farebbe il telefono con il cookie ricevuto al login.
    const login = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: PASSWORD })
    const sessione = login.session()
    assert.property(sessione, 'auth_web')
    const prima = await client.get('/api/v1/account/profile').withSession(sessione)
    prima.assertStatus(200)

    await client.post('/api/v1/auth/password-dimenticata').json({ email: EMAIL })
    const nuova = 'nuova-password-di-prova'
    const reset = await client
      .post(percorsoDalLink())
      .json({ password: nuova, passwordConfirmation: nuova })
    reset.assertStatus(200)

    const dopo = await client.get('/api/v1/account/profile').withSession(sessione)
    dopo.assertStatus(401)
    // Con la nuova password si rientra.
    const rientro = await client.post('/api/v1/auth/login').json({ email: EMAIL, password: nuova })
    const profilo = await client.get('/api/v1/account/profile').withSession(rientro.session())
    profilo.assertStatus(200)
  })

  test('una sessione senza l’impronta della password non vale', async ({ client }) => {
    const u = await utente()

    // Come una sessione aperta prima di questa regola: c'è l'utente, manca l'impronta.
    const r = await client.get('/api/v1/account/profile').withSession({ auth_web: u.id })

    r.assertStatus(401)
  })

  test('cancellare l’account chiede la password e toglie tutti i dati personali', async ({
    client,
    assert,
  }) => {
    const u = await utente()
    await db.table('periodi_budget').insert({
      user_id: u.id,
      dal: '2026-11-02',
      al: '2026-11-08',
      budget_centesimi: 10000,
      created_at: new Date(),
    })

    const sbagliata = await client
      .delete('/api/v1/account')
      .json({ password: 'sbagliata' })
      .loginAs(u)
    const giusta = await client.delete('/api/v1/account').json({ password: PASSWORD }).loginAs(u)

    sbagliata.assertStatus(400)
    giusta.assertStatus(204)
    assert.isNull(await User.find(u.id))
    const [{ n }] = await db.from('periodi_budget').where('user_id', u.id).count('* as n')
    assert.equal(Number(n), 0)
  })
})

/** Tabelle con i dati personali dell'utente e colonna che lo indica. */
const TABELLE_UTENTE = [
  'preferenze_utente',
  'condizioni_utente',
  'negozi_utente',
  'prezzi_utente',
  'periodi_budget',
  'liste',
] as const

test.group('Account: cancellazione senza chiavi esterne attive', (group) => {
  // Su Turso le chiavi esterne potrebbero essere spente: ON DELETE CASCADE non scatterebbe.
  // Il PRAGMA va dato fuori dalla transazione, che poi lo rispetta.
  group.each.setup(async () => {
    await limiter.clear()
    await db.rawQuery('PRAGMA foreign_keys = OFF')
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      await annulla()
      await db.rawQuery('PRAGMA foreign_keys = ON')
    }
  })

  test('cancellare l’account non lascia righe orfane', async ({ client, assert }) => {
    const [{ foreign_keys: fk }] = await db.rawQuery('PRAGMA foreign_keys')
    assert.equal(fk, 0, 'il test vale solo con le chiavi esterne spente')
    const u = await utente()
    const altro = await User.create({ email: 'altro@example.test', password: PASSWORD })
    const ora = new Date()
    const conad = await db.from('catene').where('codice', 'conad').firstOrFail()
    const [negozioId] = await db.table('negozi').insert({
      osm_id: 'node/1',
      catena_id: conad.id,
      nome: 'Negozio di esempio',
      comune: 'Roma',
      provincia: 'RM',
      lat: 41.85,
      lon: 12.49,
      aggiornato_il: ora,
    })
    const [prodottoId] = await db
      .table('prodotti')
      .insert({ nome: 'Prodotto di esempio', creato_da_user_id: u.id, created_at: ora })
    for (const id of [u.id, altro.id]) {
      await db.table('preferenze_utente').insert({ user_id: id, created_at: ora })
      await db
        .table('condizioni_utente')
        .insert({ user_id: id, catena_id: conad.id, condizione: 'carta-fedelta', created_at: ora })
      await db
        .table('negozi_utente')
        .insert({ user_id: id, negozio_id: negozioId, created_at: ora })
      await db.table('prezzi_utente').insert({
        user_id: id,
        prodotto_id: prodottoId,
        negozio_id: negozioId,
        centesimi: 100,
        data: '2026-11-02',
        fonte: 'manuale',
        created_at: ora,
      })
      const [periodoId] = await db.table('periodi_budget').insert({
        user_id: id,
        dal: '2026-11-02',
        al: '2026-11-08',
        budget_centesimi: 10000,
        created_at: ora,
      })
      const [listaId] = await db
        .table('liste')
        .insert({ user_id: id, periodo_budget_id: periodoId, nome: 'Spesa', created_at: ora })
      await db
        .table('voci_lista')
        .insert({ lista_id: listaId, prodotto_id: prodottoId, quantita: 1, created_at: ora })
      await db.table('richieste_llm').insert({
        user_id: id,
        scopo: 'lista',
        modello: 'claude-opus-5-5',
        esito: 'ok',
        created_at: ora,
      })
    }

    const r = await client.delete('/api/v1/account').json({ password: PASSWORD }).loginAs(u)

    r.assertStatus(204)
    assert.isNull(await User.find(u.id))
    for (const tabella of TABELLE_UTENTE) {
      const [{ n }] = await db.from(tabella).where('user_id', u.id).count('* as n')
      assert.equal(Number(n), 0, `righe rimaste in ${tabella}`)
      const [{ n: altrui }] = await db.from(tabella).where('user_id', altro.id).count('* as n')
      assert.equal(Number(altrui), 1, `${tabella}: i dati dell'altro utente restano`)
    }
    const [{ n: voci }] = await db
      .from('voci_lista')
      .whereNotIn('lista_id', db.from('liste').select('id'))
      .count('* as n')
    assert.equal(Number(voci), 0, 'voci di liste cancellate')
    const [{ n: vociAltrui }] = await db.from('voci_lista').count('* as n')
    assert.equal(Number(vociAltrui), 1)
    // Restano i dati comuni, senza autore: il prodotto creato e il costo della richiesta.
    const prodotto = await db.from('prodotti').where('id', prodottoId).firstOrFail()
    assert.isNull(prodotto.creato_da_user_id)
    const [{ n: richieste }] = await db.from('richieste_llm').where('user_id', u.id).count('* as n')
    assert.equal(Number(richieste), 0)
    const [{ n: tutte }] = await db.from('richieste_llm').count('* as n')
    assert.equal(Number(tutte), 2)
  })
})
