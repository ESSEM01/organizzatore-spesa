import { test } from '@japa/runner'
import { metadatiDaNomeFile } from '#services/volantini/metadati'

test.group('metadatiDaNomeFile', () => {
  test('Conad: catena, volantino regionale del Lazio e validità dal nome', ({ assert }) => {
    assert.deepEqual(metadatiDaNomeFile('conad-lazio-convenienza-piu-2026-10-28_2026-11-04.pdf'), {
      catena: 'conad',
      titolo: 'Convenienza piu',
      ambito: 'regione',
      regione: 'Lazio',
      validoDal: '2026-10-28',
      validoAl: '2026-11-04',
    })
  })

  test('Gruppo GROS: la catena è l’insegna dopo "gros-"', ({ assert }) => {
    assert.containsSubset(metadatiDaNomeFile('gros-il-castoro-2026-10-23_2026-11-03.pdf'), {
      catena: 'castoro',
      ambito: 'catena',
      regione: null,
    })
    assert.equal(metadatiDaNomeFile('gros-ma-2026-10-23_2026-11-03.pdf').catena, 'ma')
  })

  test('senza date nel nome la validità resta da leggere nel volantino', ({ assert }) => {
    assert.containsSubset(metadatiDaNomeFile('naturasi-ottobre-247.pdf'), {
      catena: 'naturasi',
      validoDal: null,
      validoAl: null,
    })
  })

  test('Todis e Coop sono volantini del Lazio', ({ assert }) => {
    assert.containsSubset(metadatiDaNomeFile('todis-lazio-2026-10-29_2026-11-11.pdf'), {
      catena: 'todis',
      ambito: 'regione',
      regione: 'Lazio',
    })
    assert.containsSubset(metadatiDaNomeFile('coop-etruria-lazio-2026-10-22_2026-11-04.pdf'), {
      catena: 'coop',
      regione: 'Lazio',
    })
  })

  test('un file di una catena sconosciuta è rifiutato', ({ assert }) => {
    assert.throws(() => metadatiDaNomeFile('volantino-qualsiasi.pdf'), /catena/)
  })
})
