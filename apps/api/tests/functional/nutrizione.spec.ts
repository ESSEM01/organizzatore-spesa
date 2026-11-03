import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { importaNutrizione } from '#services/nutrizione/importa'

// Usa i CSV veri di database/data: sono dati pubblici versionati, nessuna rete.
test.group('importaNutrizione', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('carica CIQUAL e gli abbinamenti italiani, ognuno con un alimento esistente', async ({
    assert,
  }) => {
    const esito = await importaNutrizione(app.makePath('database/data'))

    assert.isAbove(esito.alimenti, 3000)
    assert.isAbove(esito.abbinamenti, 100)
    const pollo = await db
      .from('alimenti_it')
      .join('alimenti', 'alimenti.codice', 'alimenti_it.alimento_codice')
      .where('alimenti_it.nome', 'Petto di pollo')
      .first()
    assert.equal(pollo.alimento_codice, 36017)
    assert.closeTo(Number(pollo.proteine), 23, 3)
  })

  test('si può rilanciare senza duplicare', async ({ assert }) => {
    await importaNutrizione(app.makePath('database/data'))
    await importaNutrizione(app.makePath('database/data'))

    const [{ n }] = await db.from('alimenti_it').count('* as n')
    const righe = await db.from('alimenti_it').select('nome')
    assert.equal(Number(n), righe.length)
    assert.equal(new Set(righe.map((r) => r.nome)).size, righe.length)
  })
})
