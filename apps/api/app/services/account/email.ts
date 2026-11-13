import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import mail from '@adonisjs/mail/services/main'
import type User from '#models/user'
import env from '#start/env'
import { improntaPassword } from '#services/account/sessione'

/**
 * Email dell'account (D16): verifica dell'indirizzo e reimpostazione della password.
 * I link portano alla PWA, che chiama l'API con il percorso firmato: la firma scade e non si altera.
 * Senza RESEND_API_KEY (sviluppo) l'email non parte e il link si scrive nel log del server;
 * in produzione mai, perché chi legge i log potrebbe usarlo.
 */

const webUrl = () => env.get('WEB_URL') ?? 'http://localhost:5173'

function linkPwa(schermata: 'verifica-email' | 'reimposta-password', percorso: string) {
  return `${webUrl()}/#${schermata}?${new URLSearchParams({ url: percorso })}`
}

/** Vero se il server può spedire email (chiave Resend presente; nei test la posta è finta). */
export function emailAttive(): boolean {
  return Boolean(env.get('RESEND_API_KEY')) || app.inTest
}

/**
 * Campi del log per un'email non spedita. Il link firmato vale come una password temporanea
 * (reimposta la password o conferma l'indirizzo): in produzione non si scrive.
 */
export function campiLog(a: string, link: string, inProduzione = app.inProduction) {
  return inProduzione ? { a } : { a, link }
}

/**
 * Spedisce l'email e dice se è partita davvero. Senza chiave, o se Resend la rifiuta, la funzione
 * restituisce false (in sviluppo il link resta nel log): l'app non deve dire "ti abbiamo spedito"
 * quando non è vero (problema segnalato dall'utente il 2026-11-03).
 */
async function spedisci(a: string, oggetto: string, testo: string, link: string) {
  if (!emailAttive()) {
    logger.info(campiLog(a, link), `Email non spedita, manca RESEND_API_KEY: ${oggetto}`)
    return false
  }
  try {
    await mail.send((m) => {
      m.to(a).subject(oggetto).text(`${testo}\n\n${link}\n`)
    })
    return true
  } catch (e) {
    logger.error(
      { ...campiLog(a, link), err: e },
      `Email non spedita, errore di Resend: ${oggetto}`
    )
    return false
  }
}

export async function spedisciVerifica(utente: User) {
  const percorso = signedUrlFor(
    'auth.verificaEmail',
    { id: utente.id },
    { expiresIn: '3 days', purpose: 'verifica-email' }
  )
  return spedisci(
    utente.email,
    'Conferma il tuo indirizzo email',
    'Tocca il link per confermare l’indirizzo email del tuo account. Vale 3 giorni.',
    linkPwa('verifica-email', percorso)
  )
}

export async function spedisciReimpostazione(utente: User) {
  const percorso = signedUrlFor(
    'auth.reimpostaPassword',
    { id: utente.id },
    { expiresIn: '1 hour', purpose: 'reimposta-password', qs: { v: improntaPassword(utente) } }
  )
  return spedisci(
    utente.email,
    'Reimposta la password',
    'Hai chiesto di reimpostare la password. Tocca il link entro un’ora; se non sei stato tu, ignora questa email.',
    linkPwa('reimposta-password', percorso)
  )
}
