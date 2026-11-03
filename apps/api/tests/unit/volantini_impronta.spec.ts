import { test } from '@japa/runner'
import { PDFDocument } from 'pdf-lib'
import { improntaPdf, somiglianza } from '#services/volantini/impronta'

// PNG 1x1 di esempio, di colori diversi: ognuno è un'immagine distinta.
const PNG = [
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
].map((b) => Buffer.from(b, 'base64'))

/** Un volantino di esempio con un'immagine per pagina; `titolo` cambia i metadati del PDF. */
async function volantino(immagini: Buffer[], titolo: string) {
  const doc = await PDFDocument.create()
  doc.setTitle(titolo)
  for (const png of immagini) {
    const img = await doc.embedPng(png)
    doc.addPage([100, 100]).drawImage(img, { x: 0, y: 0, width: 100, height: 100 })
  }
  return Buffer.from(await doc.save())
}

test.group('impronta dei volantini', () => {
  test('lo stesso volantino rigenerato ha la stessa impronta anche se il file cambia', async ({
    assert,
  }) => {
    const a = await volantino(PNG, 'scaricato lunedì')
    const b = await volantino(PNG, 'scaricato martedì')

    assert.notDeepEqual(a, b)
    assert.deepEqual(await improntaPdf(a), await improntaPdf(b))
  })

  test('la somiglianza è la quota di immagini in comune', async ({ assert }) => {
    const tutte = await improntaPdf(await volantino(PNG, 'a'))
    const dueSuTre = await improntaPdf(await volantino([PNG[0], PNG[1]], 'b'))
    const diversa = await improntaPdf(await volantino([PNG[2]], 'c'))

    assert.equal(somiglianza(tutte, tutte), 1)
    assert.closeTo(somiglianza(tutte, dueSuTre), 2 / 3, 1e-9)
    assert.equal(somiglianza(dueSuTre, diversa), 0)
  })

  test('senza immagini la somiglianza è zero, mai un falso doppione', ({ assert }) => {
    assert.equal(somiglianza([], []), 0)
  })
})
