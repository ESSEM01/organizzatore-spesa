/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { limitaEmail, limitaNegozi, limitaProposta, limitaRegistrazione } from '#start/limiter'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router
  .group(() => {
    router.get('health', () => ({ status: 'ok' })).as('health')

    // Catalogo pubblico dei supermercati con i volantini validi (D14, D16): niente posizione
    router.get('negozi', [controllers.Negozi, 'index']).as('negozi')

    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store']).use(limitaRegistrazione)
        router.post('login', [controllers.Sessione, 'store'])
        // Password dimenticata e link firmati delle email (D16)
        router
          .post('password-dimenticata', [controllers.Email, 'passwordDimenticata'])
          .use(limitaEmail)
        router
          .post('verifica-email/:id', [controllers.Email, 'verifica'])
          .where('id', router.matchers.number())
          .as('verificaEmail')
        router
          .post('reimposta-password/:id', [controllers.Email, 'reimposta'])
          .where('id', router.matchers.number())
          .as('reimpostaPassword')
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.Sessione, 'destroy'])
        router.post('verifica-email', [controllers.Email, 'reinviaVerifica']).use(limitaEmail)
        router.delete('/', [controllers.Profile, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.MieiNegozi, 'index'])
        router.post('/', [controllers.MieiNegozi, 'store']).use(limitaNegozi)
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

        // Lista preparata dall'IA e preferenze (D18)
        router.post('liste/proposta', [controllers.ListaIa, 'proposta']).use(limitaProposta)
        router.post('liste/da-proposta', [controllers.ListaIa, 'salva'])
        router.get('preferenze', [controllers.ListaIa, 'preferenze'])
        router.patch('preferenze', [controllers.ListaIa, 'aggiornaPreferenze'])

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
