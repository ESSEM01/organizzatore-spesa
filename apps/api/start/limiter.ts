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
import type { errors } from '@adonisjs/limiter'

type ThrottleException = InstanceType<typeof errors.ThrottleException>

/** Messaggio in italiano, con l'attesa in minuti, al posto di "Too many requests". */
function inItaliano(cosa: string) {
  return (errore: ThrottleException) => {
    const minuti = Math.max(1, Math.ceil(errore.response.availableIn / 60))
    errore.setMessage(`${cosa} Riprova tra ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}.`)
  }
}

export const limitaRegistrazione = limiter.define('registrazione', (ctx) => {
  return limiter
    .allowRequests(5)
    .every('1 hour')
    .usingKey(`registrazione_${ctx.request.ip()}`)
    .limitExceeded(inItaliano('Troppi account creati da questa connessione.'))
})

export const limitaEmail = limiter.define('email', (ctx) => {
  return limiter
    .allowRequests(3)
    .every('15 minutes')
    .usingKey(`email_${ctx.request.ip()}`)
    .limitExceeded(inItaliano('Hai già chiesto 3 email in pochi minuti.'))
})
