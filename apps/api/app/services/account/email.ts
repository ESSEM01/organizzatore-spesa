import { createHash } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import mail from '@adonisjs/mail/services/main'
import type User from '#models/user'
import env from '#start/env'

/**
 * Email dell'account (D16): verifica dell'indirizzo e reimpostazione della password.
 * I link portano alla PWA, che chiama l'API con il percorso firmato: la firma scade e non si altera.
 * Senza RESEND_API_KEY (sviluppo) l'email non parte e il link si scrive nel log del server.
 */

const webUrl = () => env.get('WEB_URL') ?? 'http://localhost:5173'

function linkPwa(schermata: 'verifica-email' | 'reimposta-password', percorso: string) {
  return `${webUrl()}/#${schermata}?${new URLSearchParams({ url: percorso })}`
}

async function spedisci(a: string, oggetto: string, testo: string, link: string) {
  if (!env.get('RESEND_API_KEY') && !app.inTest) {
    logger.info({ a, link }, `Email non spedita, manca RESEND_API_KEY: ${oggetto}`)
    return
  }
  await mail.send((m) => {
    m.to(a).subject(oggetto).text(`${testo}\n\n${link}\n`)
  })
}

export async function spedisciVerifica(utente: User) {
  const percorso = signedUrlFor(
    'auth.verificaEmail',
    { id: utente.id },
    { expiresIn: '3 days', purpose: 'verifica-email' }
  )
  await spedisci(
    utente.email,
    'Conferma il tuo indirizzo email',
    'Tocca il link per confermare l’indirizzo email del tuo account. Vale 3 giorni.',
    linkPwa('verifica-email', percorso)
  )
}

/**
 * Impronta della password attuale: il link di reset vale solo finché la password non cambia,
 * quindi si usa una volta sola.
 */
export function improntaPassword(utente: User) {
  return createHash('sha256').update(utente.password).digest('hex').slice(0, 16)
}

export async function spedisciReimpostazione(utente: User) {
  const percorso = signedUrlFor(
    'auth.reimpostaPassword',
    { id: utente.id },
    { expiresIn: '1 hour', purpose: 'reimposta-password', qs: { v: improntaPassword(utente) } }
  )
  await spedisci(
    utente.email,
    'Reimposta la password',
    'Hai chiesto di reimpostare la password. Tocca il link entro un’ora; se non sei stato tu, ignora questa email.',
    linkPwa('reimposta-password', percorso)
  )
}
