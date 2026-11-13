/*
|--------------------------------------------------------------------------
| Limiti alle richieste (D16)
|--------------------------------------------------------------------------
|
| Registrazione ed email (verifica, password dimenticata) sono limitate per indirizzo IP: frenano
| chi prova molti indirizzi e chi usa l'app per spedire email a raffica. I tentativi di accesso
| sbagliati si contano nel controller della sessione, per email e IP.
| La lista preparata dall'IA costa a ogni richiesta e l'aggiunta dei negozi scrive dati comuni:
| sono limitate per utente, perché richiedono l'accesso.
|
*/

import limiter from '@adonisjs/limiter/services/main'
import type { errors } from '@adonisjs/limiter'

type ThrottleException = InstanceType<typeof errors.ThrottleException>

/** Attesa leggibile: minuti fino a un'ora e mezza, poi ore. */
function attesa(secondi: number) {
  const minuti = Math.max(1, Math.ceil(secondi / 60))
  if (minuti <= 90) return `${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}`
  const ore = Math.ceil(minuti / 60)
  return `${ore} ore`
}

/** Messaggio in italiano, con l'attesa, al posto di "Too many requests". */
function inItaliano(cosa: string) {
  return (errore: ThrottleException) => {
    errore.setMessage(`${cosa} Riprova tra ${attesa(errore.response.availableIn)}.`)
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

/** Ogni proposta chiama il modello e costa: 10 al giorno per utente bastano a una famiglia. */
export const limitaProposta = limiter.define('proposta', (ctx) => {
  return limiter
    .allowRequests(10)
    .every('1 day')
    .usingKey(`proposta_${ctx.auth.getUserOrFail().id}`)
    .limitExceeded(inItaliano('Hai già chiesto 10 liste oggi.'))
})

/** I negozi si aggiungono uno alla volta dalla mappa: 30 in un'ora sono già tanti. */
export const limitaNegozi = limiter.define('negozi', (ctx) => {
  return limiter
    .allowRequests(30)
    .every('1 hour')
    .usingKey(`negozi_${ctx.auth.getUserOrFail().id}`)
    .limitExceeded(inItaliano('Hai aggiunto troppi negozi in poco tempo.'))
})
