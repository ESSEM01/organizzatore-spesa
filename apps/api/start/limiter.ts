/*
|--------------------------------------------------------------------------
| Limiti alle richieste (D16)
|--------------------------------------------------------------------------
|
| Registrazione ed email (verifica, password dimenticata) sono limitate per indirizzo IP: frenano
| chi prova molti indirizzi e chi usa l'app per spedire email a raffica. I tentativi di accesso
| sbagliati si contano nel controller della sessione, per email e IP.
|
*/

import limiter from '@adonisjs/limiter/services/main'

export const limitaRegistrazione = limiter.define('registrazione', (ctx) => {
  return limiter.allowRequests(5).every('1 hour').usingKey(`registrazione_${ctx.request.ip()}`)
})

export const limitaEmail = limiter.define('email', (ctx) => {
  return limiter.allowRequests(3).every('15 minutes').usingKey(`email_${ctx.request.ip()}`)
})
