import { test } from '@japa/runner'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conCache } from '#services/volantini/cache'
import type { LetturaVolantino, LettoreVolantino } from '#services/volantini/importa'

// Letture di esempio: nessuna chiamata al modello.
const lettura = (esito: LetturaVolantino['esito']): LetturaVolantino => ({
  esito,
  modello: 'claude-opus-5-5',
  stopReason: esito === 'ok' ? 'end_turn' : null,
  usage: { input: 10, output: 5, cacheLettura: 0 },
  dati: esito === 'ok' ? { valido_dal: null, valido_al: null, offerte: [] } : null,
})

function contatore(esito: LetturaVolantino['esito']) {
  let n = 0
  const leggi: LettoreVolantino = async () => {
    n++
    return lettura(esito)
  }
  return { leggi, chiamate: () => n }
}

test.group('conCache', (group) => {
  let cartella: string
  group.each.setup(async () => {
    cartella = await mkdtemp(join(tmpdir(), 'volantini-cache-'))
    return () => rm(cartella, { recursive: true, force: true })
  })

  test('una lettura riuscita si salva e la seconda volta non richiama il modello', async ({
    assert,
  }) => {
    const c = contatore('ok')
    const leggi = conCache(c.leggi, cartella)
    const pdf = Buffer.from('%PDF di esempio')

    const prima = await leggi(pdf, { catena: 'Conad', titolo: 'Esempio' })
    const seconda = await leggi(pdf, { catena: 'Conad', titolo: 'Esempio' })

    assert.equal(c.chiamate(), 1)
    assert.deepEqual(seconda.dati, prima.dati)
    // Dalla cache non si conta di nuovo il costo: niente token.
    assert.deepEqual(seconda.usage, { input: 0, output: 0, cacheLettura: 0 })
    assert.lengthOf(await readdir(cartella), 1)
  })

  test('una lettura fallita non si salva e si riprova', async ({ assert }) => {
    const c = contatore('errore')
    const leggi = conCache(c.leggi, cartella)
    const pdf = Buffer.from('%PDF di esempio')

    await leggi(pdf, { catena: 'Conad', titolo: 'Esempio' })
    await leggi(pdf, { catena: 'Conad', titolo: 'Esempio' })

    assert.equal(c.chiamate(), 2)
    assert.lengthOf(await readdir(cartella), 0)
  })
})
