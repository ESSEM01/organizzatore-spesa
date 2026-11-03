import { test } from '@japa/runner'
import { PDFDocument } from 'pdf-lib'
import { aBlocchi } from '#services/volantini/blocchi'
import type { LetturaVolantino, LettoreVolantino } from '#services/volantini/importa'
import type { OffertaLetta } from '#services/volantini/schema'

// PDF e letture di esempio: nessuna chiamata al modello.
async function pdfDiPagine(n: number) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < n; i++) doc.addPage()
  return Buffer.from(await doc.save())
}

const offerta = (pagina: number): OffertaLetta => ({
  nome: `Prodotto di esempio p${pagina}`,
  marca: null,
  formato: null,
  quantita: null,
  unita: null,
  categoria: 'altro',
  prezzo_centesimi: 100,
  prezzo_pieno_centesimi: null,
  condizione: null,
  pagina,
})

/** Lettore finto: un'offerta a pagina 1 di ogni blocco, e registra quante pagine ha ricevuto. */
function lettoreFinto(risposte: Partial<LetturaVolantino>[] = []) {
  const pagine: number[] = []
  const leggi: LettoreVolantino = async (pdf) => {
    const doc = await PDFDocument.load(pdf)
    const n = doc.getPageCount()
    pagine.push(n)
    return {
      esito: 'ok',
      modello: 'claude-opus-5-5',
      stopReason: 'end_turn',
      usage: { input: 100, output: 10, cacheLettura: 0 },
      dati: { valido_dal: null, valido_al: null, offerte: [offerta(1), offerta(n)] },
      ...risposte[pagine.length - 1],
    }
  }
  return { leggi, pagine }
}

test.group('aBlocchi', () => {
  test('divide il PDF in blocchi di pagine e somma i token', async ({ assert }) => {
    const f = lettoreFinto()
    const lettura = await aBlocchi(f.leggi, 8)(await pdfDiPagine(20), {
      catena: 'GROS',
      titolo: 'Esempio',
    })

    assert.deepEqual(f.pagine, [8, 8, 4])
    assert.equal(lettura.esito, 'ok')
    assert.deepEqual(lettura.usage, { input: 300, output: 30, cacheLettura: 0 })
    assert.lengthOf(lettura.dati!.offerte, 6)
  })

  test('riporta le pagine al numero del volantino intero', async ({ assert }) => {
    const lettura = await aBlocchi(lettoreFinto().leggi, 8)(await pdfDiPagine(20), {
      catena: 'GROS',
      titolo: 'Esempio',
    })

    assert.deepEqual(
      lettura.dati!.offerte.map((o) => o.pagina),
      [1, 8, 9, 16, 17, 20]
    )
  })

  test('prende le date dal primo blocco che le riporta', async ({ assert }) => {
    const f = lettoreFinto([
      {},
      { dati: { valido_dal: '2026-10-23', valido_al: '2026-11-03', offerte: [] } },
    ])
    const lettura = await aBlocchi(f.leggi, 8)(await pdfDiPagine(16), {
      catena: 'GROS',
      titolo: 'Esempio',
    })

    assert.equal(lettura.dati!.valido_dal, '2026-10-23')
    assert.equal(lettura.dati!.valido_al, '2026-11-03')
  })

  test('se un blocco fallisce fallisce tutto, con i token spesi fin lì', async ({ assert }) => {
    const f = lettoreFinto([
      {},
      { esito: 'errore', stopReason: 'max_tokens', dati: null, errore: 'Risposta troncata' },
      {},
    ])
    const lettura = await aBlocchi(f.leggi, 8)(await pdfDiPagine(20), {
      catena: 'GROS',
      titolo: 'Esempio',
    })

    assert.equal(lettura.esito, 'errore')
    assert.isNull(lettura.dati)
    assert.include(lettura.errore!, 'pagine 9-16')
    assert.deepEqual(lettura.usage, { input: 200, output: 20, cacheLettura: 0 })
    // Dopo il blocco fallito non si paga per gli altri.
    assert.deepEqual(f.pagine, [8, 8])
  })
})
