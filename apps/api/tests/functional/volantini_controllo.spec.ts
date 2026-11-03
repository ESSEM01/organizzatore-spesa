import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { controllaVolantini, type Scaricatore } from '#services/volantini/controlla'
import type { LettoreVolantino } from '#services/volantini/importa'

// Pagine e PDF di esempio: nessuna chiamata di rete né al modello.
const PDF_PEWEX = 'https://www.cedigros.com/index.php?option=com_myegojwt&view=flyer&id=1&pdf=1'
const pagine: Record<string, string> = {
  'https://www.cedigros.com/promozioni': `
    <a href="/promozioni/pewex/volantino-pewex-3"></a><div>Dal 23 Ottobre al 3 Novembre 2026</div>
    <a href="/promozioni/ma/volantino-ma"></a><div>Dal 1 Ottobre al 10 Ottobre 2026</div>`,
  'https://www.cedigros.com/promozioni/pewex/volantino-pewex-3': `<a href='${PDF_PEWEX}'>`,
}

function scaricatore(opzioni: { guasti?: string[] } = {}) {
  const pdfScaricati: string[] = []
  const s: Scaricatore = {
    async testo(url) {
      if (opzioni.guasti?.some((g) => url.startsWith(g))) throw new Error('risposta 503')
      return pagine[url] ?? ''
    },
    async pdf(url) {
      pdfScaricati.push(url)
      return Buffer.from(`%PDF di esempio ${url}`)
    },
  }
  return { s, pdfScaricati }
}

function lettore() {
  let chiamate = 0
  const leggi: LettoreVolantino = async () => {
    chiamate++
    return {
      esito: 'ok',
      modello: 'claude-opus-5-5',
      stopReason: 'end_turn',
      usage: { input: 10, output: 5, cacheLettura: 0 },
      dati: {
        valido_dal: null,
        valido_al: null,
        offerte: [
          {
            nome: 'Prodotto di esempio',
            marca: null,
            formato: null,
            quantita: null,
            unita: null,
            categoria: 'altro',
            prezzo_centesimi: 100,
            prezzo_pieno_centesimi: null,
            condizione: null,
            pagina: 1,
          },
        ],
      },
    }
  }
  return { leggi, chiamate: () => chiamate }
}

test.group('controllaVolantini', (group) => {
  let cartella: string
  group.each.setup(async () => {
    cartella = await mkdtemp(join(tmpdir(), 'volantini-controllo-'))
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      await annulla()
      await rm(cartella, { recursive: true, force: true })
    }
  })

  const opzioni = (leggi: LettoreVolantino, s: Scaricatore) => ({
    scarica: s,
    leggi,
    oggi: '2026-10-25',
    cartella,
    fonti: ['gros' as const],
  })

  test('scarica e legge i volantini nuovi, salta quelli scaduti', async ({ assert }) => {
    const { s, pdfScaricati } = scaricatore()
    const l = lettore()

    const esito = await controllaVolantini(opzioni(l.leggi, s))

    assert.deepEqual(pdfScaricati, [PDF_PEWEX])
    assert.containsSubset(esito, { trovati: 2, nuovi: 1, letti: 1, offerte: 1, errori: [] })
    const v = await db.from('volantini').first()
    assert.equal(v.url_fonte, PDF_PEWEX)
    assert.equal(String(v.valido_al).slice(0, 10), '2026-11-03')
    assert.deepEqual(await readdir(cartella), ['gros-pewex-volantino-2026-10-23_2026-11-03.pdf'])
  })

  test('la settimana dopo non riscarica né rilegge lo stesso volantino', async ({ assert }) => {
    const { s, pdfScaricati } = scaricatore()
    const l = lettore()
    await controllaVolantini(opzioni(l.leggi, s))

    const esito = await controllaVolantini(opzioni(l.leggi, s))

    assert.equal(l.chiamate(), 1)
    assert.lengthOf(pdfScaricati, 1)
    assert.containsSubset(esito, { nuovi: 0, letti: 0 })
  })

  test('una fonte irraggiungibile è un errore, non ferma il controllo', async ({ assert }) => {
    const { s } = scaricatore({ guasti: ['https://www.cedigros.com'] })

    const esito = await controllaVolantini({
      ...opzioni(lettore().leggi, s),
      fonti: ['gros', 'todis'],
    })

    assert.lengthOf(esito.errori, 2)
    assert.match(esito.errori[0], /gros/i)
    // Todis non ha restituito volantini: anche una pagina cambiata è un errore da vedere.
    assert.match(esito.errori[1], /todis/i)
  })

  test('non legge più volantini del massimo per controllo', async ({ assert }) => {
    const { s } = scaricatore()
    const l = lettore()

    const esito = await controllaVolantini({ ...opzioni(l.leggi, s), massimo: 0 })

    assert.equal(l.chiamate(), 0)
    assert.containsSubset(esito, { nuovi: 1, letti: 0 })
    assert.match(esito.errori[0], /massimo/)
  })
})

test.group('controllaVolantini, doppioni', (group) => {
  let cartella: string
  group.each.setup(async () => {
    cartella = await mkdtemp(join(tmpdir(), 'volantini-doppioni-'))
    const annulla = await testUtils.db().withGlobalTransaction()
    return async () => {
      await annulla()
      await rm(cartella, { recursive: true, force: true })
    }
  })

  // PNG 1x1 di esempio: due immagini distinte.
  const PNG = [
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ].map((b) => Buffer.from(b, 'base64'))

  async function pdfConImmagini(titolo: string) {
    const doc = await PDFDocument.create()
    doc.setTitle(titolo)
    for (const png of PNG) {
      const img = await doc.embedPng(png)
      doc.addPage([100, 100]).drawImage(img, { x: 0, y: 0, width: 100, height: 100 })
    }
    return Buffer.from(await doc.save())
  }

  test('lo stesso volantino Elite sotto due indirizzi si legge una volta sola', async ({
    assert,
  }) => {
    const base = 'https://superelite.it'
    const pdfA = `${base}/index.php?option=com_myegojwt&view=flyer&id=1&pdf=1`
    const pdfB = `${base}/index.php?option=com_myegojwt&view=flyer&id=2&pdf=1`
    const pagineElite: Record<string, string> = {
      [`${base}/promozioni`]: `
        <a href="/promozioni/prezzi-tondi-2"><h3>Prezzi tondi</h3></a><div>Dal 30 Ottobre al 11 Novembre 2026</div>
        <a href="/promozioni/grandi-marche-2"><h3>PREZZI TONDI 1€ e 2€</h3></a><div>Dal 30 Ottobre al 12 Novembre 2026</div>`,
      [`${base}/promozioni/prezzi-tondi-2`]: `<a href='${pdfA}'>`,
      [`${base}/promozioni/grandi-marche-2`]: `<a href='${pdfB}'>`,
    }
    const s: Scaricatore = {
      testo: async (url) => pagineElite[url] ?? '',
      // Ogni download rigenera il PDF (titolo diverso), le immagini restano le stesse.
      pdf: async (url) => pdfConImmagini(url),
    }
    const l = lettore()

    const esito = await controllaVolantini({
      scarica: s,
      leggi: l.leggi,
      oggi: '2026-11-01',
      cartella,
      fonti: ['elite'],
    })

    assert.equal(l.chiamate(), 1)
    assert.containsSubset(esito, { nuovi: 2, letti: 1, doppioni: 1, errori: [] })
  })
})
