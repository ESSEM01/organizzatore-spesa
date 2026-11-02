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
  })
  .prefix('/api/v1')
