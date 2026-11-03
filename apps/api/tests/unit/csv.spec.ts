import { test } from '@japa/runner'
import { leggiCsv } from '#services/nutrizione/csv'

test.group('leggiCsv', () => {
  test('legge intestazione e righe, con virgolette e virgole nei campi', ({ assert }) => {
    const testo =
      'codice,nome_en,kcal\r\n25601,"Prepared mixed tuna and vegetable salad, canned",\n9810,Dried pasta,336.0\n'

    assert.deepEqual(leggiCsv(testo), [
      { codice: '25601', nome_en: 'Prepared mixed tuna and vegetable salad, canned', kcal: '' },
      { codice: '9810', nome_en: 'Dried pasta', kcal: '336.0' },
    ])
  })

  test('virgolette raddoppiate dentro un campo', ({ assert }) => {
    assert.deepEqual(leggiCsv('a,b\n"un ""esempio""",2\n'), [{ a: 'un "esempio"', b: '2' }])
  })
})
