import { test } from '@japa/runner'
import { risolviPrezzo } from '@spesa/domain'

test.group('Pacchetto di dominio', () => {
  test("l'API usa la stessa logica dei prezzi della PWA", ({ assert }) => {
    const risolto = risolviPrezzo({
      prodottoId: 'pasta-500g',
      negozio: { id: 'osm:1', catena: 'conad' },
      prezzi: [],
      oggi: '2026-11-02',
    })

    assert.isNull(risolto)
  })
})
