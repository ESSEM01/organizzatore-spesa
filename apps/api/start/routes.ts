/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router.get('health', () => ({ status: 'ok' })).as('health')

    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.MieiNegozi, 'index'])
        router.post('/', [controllers.MieiNegozi, 'store'])
        router
          .delete('/:id', [controllers.MieiNegozi, 'destroy'])
          .where('id', router.matchers.number())
      })
      .prefix('miei-negozi')
      .as('mieiNegozi')
      .use(middleware.auth())

    // Budget del periodo, liste, voci e prezzi (D9, D12)
    router
      .group(() => {
        router.get('periodi/corrente', [controllers.Periodi, 'corrente'])
        router.post('periodi', [controllers.Periodi, 'store'])
        router
          .patch('periodi/:id', [controllers.Periodi, 'update'])
          .where('id', router.matchers.number())

        router.post('liste', [controllers.Liste, 'store'])
        router.get('liste/:id', [controllers.Liste, 'show']).where('id', router.matchers.number())
        router
          .patch('liste/:id', [controllers.Liste, 'update'])
          .where('id', router.matchers.number())
        router
          .delete('liste/:id', [controllers.Liste, 'destroy'])
          .where('id', router.matchers.number())
        router
          .post('liste/:id/voci', [controllers.Liste, 'aggiungiVoce'])
          .where('id', router.matchers.number())
        router
          .post('liste/:id/prezzi', [controllers.Liste, 'aggiungiPrezzo'])
          .where('id', router.matchers.number())

        router.patch('voci/:id', [controllers.Voci, 'update']).where('id', router.matchers.number())
        router
          .delete('voci/:id', [controllers.Voci, 'destroy'])
          .where('id', router.matchers.number())
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
