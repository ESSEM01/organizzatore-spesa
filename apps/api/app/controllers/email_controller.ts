import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import { emailAttive, spedisciReimpostazione, spedisciVerifica } from '#services/account/email'
import { improntaPassword } from '#services/account/sessione'
import { passwordDimenticataValidator, reimpostaPasswordValidator } from '#validators/user'

const LINK_NON_VALIDO = 'Il link non è valido o è scaduto. Chiedine uno nuovo.'

/** Verifica dell'email e password dimenticata (D16). */
export default class EmailController {
  /** Link della verifica, aperto dalla PWA. */
  async verifica({ request, params, response }: HttpContext) {
    const utente = await User.find(params.id)
    if (!request.hasValidSignature('verifica-email') || !utente) {
      return response.badRequest({ errors: [{ message: LINK_NON_VALIDO }] })
    }
    utente.emailVerificataIl ??= DateTime.now()
    await utente.save()
    return { message: 'Email confermata' }
  }

  /** Nuovo link di verifica per l'utente connesso. */
  async reinviaVerifica({ auth }: HttpContext) {
    const utente = auth.getUserOrFail()
    if (utente.emailVerificataIl) return { data: { spedita: false, giaConfermata: true } }
    return { data: { spedita: await spedisciVerifica(utente), giaConfermata: false } }
  }

  /** Stessa risposta che l'email esista o no: non si rivela chi è registrato. */
  async passwordDimenticata({ request }: HttpContext) {
    const { email } = await request.validateUsing(passwordDimenticataValidator)
    // Se il server non spedisce email lo si dice a tutti allo stesso modo: non rivela chi è registrato.
    if (!emailAttive()) return { data: { emailAttive: false } }
    const utente = await User.findBy('email', email)
    if (utente) await spedisciReimpostazione(utente)
    return { data: { emailAttive: true } }
  }

  /** Link della password dimenticata: vale un'ora e una volta sola (cambia l'impronta). */
  async reimposta({ request, params, response }: HttpContext) {
    const utente = await User.find(params.id)
    if (
      !request.hasValidSignature('reimposta-password') ||
      !utente ||
      request.qs().v !== improntaPassword(utente)
    ) {
      return response.badRequest({ errors: [{ message: LINK_NON_VALIDO }] })
    }
    const { password } = await request.validateUsing(reimpostaPasswordValidator)
    utente.password = password
    // Chi riceve il link dimostra di leggere quella casella.
    utente.emailVerificataIl ??= DateTime.now()
    await utente.save()
    return { message: 'Password cambiata' }
  }
}
