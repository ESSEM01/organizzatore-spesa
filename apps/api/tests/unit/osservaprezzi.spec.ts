import { test } from '@japa/runner'
import { leggiPaginaOsservaprezzi } from '#services/osservaprezzi/pagina'

// Frammento con la struttura della pagina osservata il 2026-11-03; valori di esempio, non reali.
const pagina = (provincia: string, righe: string) => `
<select id="id-select-anno" name="ANNO"><option value="2025">2025</option><option selected='selected' value="2026">2026</option></select>
<select name="MESE"><option value="8">Agosto</option><option selected='selected' value="9">Settembre</option></select>
<select name="f[PROVINCIA]"><option value="Rieti">Rieti</option><option  selected='selected'  value="${provincia}">${provincia}</option></select>
<table class="table table-striped table-bordered" id="id-table-results">
<thead><tr><th>Descrizione Prodotto</th><th>Quotazione Minima</th><th>Quotazione Massima</th><th>Quotazione Media</th><th>Tipologia di Prodotto</th></tr></thead>
<tbody>${righe}</tbody></table>`

const riga = (voce: string, min: string, max: string, media: string) => `<tr>
  <td data-label="Descrizione Prodotto">${voce}                        </td>
  <td data-label="Quotazione Minima">${min}                        </td>
  <td data-label="Quotazione Massima">${max}                        </td>
  <td data-label="Quotazione Media">${media}                        </td>
  <td data-label="Tipologia di Prodotto">Alimentari                        </td>
</tr>`

test.group('pagina di Osservaprezzi', () => {
  test('legge prodotto, quantità e prezzi in centesimi', ({ assert }) => {
    const p = leggiPaginaOsservaprezzi(
      pagina(
        'Roma',
        riga('Petto Di Pollo (1000 Gr)', '12.39', '24.86', '16.49') +
          riga('Latte Fresco (1000 Ml)', '1.1', '2', '1.5')
      )
    )

    assert.deepEqual(p.selezione, { anno: 2026, mese: 9, provincia: 'Roma' })
    assert.deepEqual(p.righe, [
      {
        voce: 'Petto Di Pollo (1000 Gr)',
        quantita: 1000,
        unita: 'g',
        minCentesimi: 1239,
        maxCentesimi: 2486,
        medioCentesimi: 1649,
      },
      {
        voce: 'Latte Fresco (1000 Ml)',
        quantita: 1000,
        unita: 'ml',
        minCentesimi: 110,
        maxCentesimi: 200,
        medioCentesimi: 150,
      },
    ])
  })

  test('scarta le righe con prezzi non numerici invece di inventarli', ({ assert }) => {
    const p = leggiPaginaOsservaprezzi(
      pagina('Roma', riga('Prodotto di esempio (1000 Gr)', 'n.d.', '2', '1'))
    )

    assert.lengthOf(p.righe, 0)
  })

  test('senza tabella riconoscibile lancia un errore: la pagina è cambiata', ({ assert }) => {
    assert.throws(() => leggiPaginaOsservaprezzi('<html>manutenzione</html>'), /tabella/)
  })
})
