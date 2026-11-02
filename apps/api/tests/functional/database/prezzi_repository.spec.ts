import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { risolviPrezzo } from '@spesa/domain'
import User from '#models/user'
import Catena from '#models/catena'
import Negozio from '#models/negozio'
import Prodotto from '#models/prodotto'
import PrezzoUtente from '#models/prezzo_utente'
import Lista from '#models/lista'
import { negozioDominio, prezziUtente } from '#services/prezzi_repository'

// Dati di esempio, non prezzi reali.
async function scenario() {
  const utente = await User.create({
    email: 'esempio@example.invalid',
    password: 'password-di-prova',
  })
  const altro = await User.create({ email: 'altro@example.invalid', password: 'password-di-prova' })
  // Catene precaricate dalla migrazione di seed (D7).
  const conad = await Catena.findByOrFail('codice', 'conad')
  const todis = await Catena.findByOrFail('codice', 'todis')
  const base = {
    comune: 'Roma',
    provincia: 'RM',
    lat: 41.85,
    lon: 12.49,
    aggiornatoIl: DateTime.now(),
  }
  const negozioConad = await Negozio.create({
    ...base,
    osmId: 'node/10',
    nome: 'Conad',
    catenaId: conad.id,
  })
  const negozioTodis = await Negozio.create({
    ...base,
    osmId: 'node/20',
    nome: 'Todis',
    catenaId: todis.id,
  })
  const pasta = await Prodotto.create({ nome: 'Pasta di esempio 500 g' })
  const riso = await Prodotto.create({ nome: 'Riso di esempio 1 kg' })
  return { utente, altro, negozioConad, negozioTodis, pasta, riso }
}

function prezzo(
  userId: number,
  prodottoId: number,
  negozioId: number,
  centesimi: number,
  data: string
) {
  return PrezzoUtente.create({
    userId,
    prodottoId,
    negozioId,
    centesimi,
    data: DateTime.fromISO(data),
    fonte: 'manuale',
  })
}

test.group('prezzi_repository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test("restituisce i prezzi dell'utente nel formato del dominio", async ({ assert }) => {
    const s = await scenario()
    await prezzo(s.utente.id, s.pasta.id, s.negozioConad.id, 129, '2026-10-20')

    const prezzi = await prezziUtente(s.utente.id, [s.pasta.id])

    assert.deepEqual(prezzi, [
      {
        prodottoId: String(s.pasta.id),
        centesimi: 129,
        fonte: 'utente',
        data: '2026-10-20',
        negozioId: String(s.negozioConad.id),
      },
    ])
  })

  test('non restituisce prezzi di altri utenti o di altri prodotti', async ({ assert }) => {
    const s = await scenario()
    await prezzo(s.altro.id, s.pasta.id, s.negozioConad.id, 99, '2026-10-20')
    await prezzo(s.utente.id, s.riso.id, s.negozioConad.id, 199, '2026-10-20')

    assert.deepEqual(await prezziUtente(s.utente.id, [s.pasta.id]), [])
  })

  test('collegato a risolviPrezzo sceglie il prezzo più recente nel negozio scelto', async ({
    assert,
  }) => {
    const s = await scenario()
    await prezzo(s.utente.id, s.pasta.id, s.negozioConad.id, 119, '2026-09-01')
    await prezzo(s.utente.id, s.pasta.id, s.negozioConad.id, 135, '2026-10-20')
    await prezzo(s.utente.id, s.pasta.id, s.negozioTodis.id, 89, '2026-10-25')
    await s.negozioConad.load('catena')

    const risolto = risolviPrezzo({
      prodottoId: String(s.pasta.id),
      negozio: negozioDominio(s.negozioConad),
      prezzi: await prezziUtente(s.utente.id, [s.pasta.id]),
      oggi: '2026-11-02',
    })

    assert.deepInclude(risolto, {
      centesimi: 135,
      fonte: 'utente',
      altroNegozio: false,
      giorniEta: 13,
    })
  })

  test('senza prezzi nel negozio scelto usa quello di un altro negozio, segnalandolo', async ({
    assert,
  }) => {
    const s = await scenario()
    await prezzo(s.utente.id, s.pasta.id, s.negozioTodis.id, 89, '2026-10-25')
    await s.negozioConad.load('catena')

    const risolto = risolviPrezzo({
      prodottoId: String(s.pasta.id),
      negozio: negozioDominio(s.negozioConad),
      prezzi: await prezziUtente(s.utente.id, [s.pasta.id]),
      oggi: '2026-11-02',
    })

    assert.deepInclude(risolto, { centesimi: 89, altroNegozio: true })
  })

  test('le relazioni dei modelli leggono le tabelle giuste', async ({ assert }) => {
    const s = await scenario()
    const lista = await Lista.create({
      userId: s.utente.id,
      nome: 'Spesa di esempio',
      stato: 'bozza',
    })
    await lista.related('voci').create({ prodottoId: s.pasta.id, quantita: 2, spuntata: false })

    await lista.load('voci', (q) => q.preload('prodotto'))
    await s.utente.load('liste')

    assert.equal(lista.voci[0].prodotto.nome, 'Pasta di esempio 500 g')
    assert.lengthOf(s.utente.liste, 1)
  })
})
