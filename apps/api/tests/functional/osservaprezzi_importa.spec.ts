import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { importaOsservaprezzi } from '#services/osservaprezzi/importa'

// Pagine di esempio con la struttura osservata il 2026-11-03; valori non reali, nessuna rete.
function pagina(provincia: string, anno: number, mese: number, righe: [string, string][]) {
  return `
<select name="ANNO"><option selected='selected' value="${anno}">${anno}</option></select>
<select name="MESE"><option selected='selected' value="${mese}">${mese}</option></select>
<select name="f[PROVINCIA]"><option selected='selected' value="${provincia}">${provincia}</option></select>
<table id="id-table-results"><tbody>${righe
    .map(
      ([voce, media]) =>
        `<tr><td>${voce}</td><td>1</td><td>9</td><td>${media}</td><td>Esempio</td></tr>`
    )
    .join('')}</tbody></table>`
}

function sito(opzioni: { provincia?: string } = {}) {
  const richieste: Record<string, string>[] = []
  const scarica = async (parametri: Record<string, string>) => {
    richieste.push(parametri)
    const t = parametri['f[TIPO_RECORD_MISE]']
    const righe: [string, string][] =
      t === 'orto'
        ? [['Mele di esempio (1000 Gr)', '2.5']]
        : t === 'altri_alim'
          ? [['Pane di esempio (1000 Gr)', '3.54']]
          : []
    return pagina(opzioni.provincia ?? parametri['f[PROVINCIA]'], 2026, 9, righe)
  }
  return { scarica, richieste }
}

test.group('importaOsservaprezzi', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('salva le medie del mese più recente, in centesimi, per la provincia', async ({
    assert,
  }) => {
    const s = sito()

    const esito = await importaOsservaprezzi({ scarica: s.scarica, sigla: 'RM' })

    assert.containsSubset(esito, { anno: 2026, mese: 9, righe: 2, errori: [] })
    const pane = await db
      .from('stime_osservaprezzi')
      .where('voce', 'Pane di esempio (1000 Gr)')
      .first()
    assert.containsSubset(pane, {
      tipologia: 'altri_alim',
      provincia: 'RM',
      anno: 2026,
      mese: 9,
      medio_centesimi: 354,
      unita: 'g',
    })
    assert.equal(Number(pane.quantita), 1000)
  })

  test('un mese già importato non si richiede di nuovo', async ({ assert }) => {
    const s = sito()
    await importaOsservaprezzi({ scarica: s.scarica, sigla: 'RM' })
    const prima = s.richieste.length

    const esito = await importaOsservaprezzi({
      scarica: s.scarica,
      sigla: 'RM',
      anno: 2026,
      mese: 9,
    })

    assert.equal(s.richieste.length, prima)
    assert.equal(esito.righe, 0)
    const [{ n }] = await db.from('stime_osservaprezzi').count('* as n')
    assert.equal(Number(n), 2)
  })

  test('se il sito risponde con un’altra provincia non salva nulla', async ({ assert }) => {
    const esito = await importaOsservaprezzi({
      scarica: sito({ provincia: 'Alessandria' }).scarica,
      sigla: 'RM',
    })

    assert.isNotEmpty(esito.errori)
    assert.match(esito.errori[0], /Alessandria/)
    const [{ n }] = await db.from('stime_osservaprezzi').count('* as n')
    assert.equal(Number(n), 0)
  })
})
