import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 * L'email si salva e si cerca senza spazi e in minuscolo (vedi #services/account/normalizza_email).
 */
const email = () => vine.string().trim().toLowerCase().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().trim().maxLength(100).nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/** Password dimenticata: solo l'email (D16). */
export const passwordDimenticataValidator = vine.create({
  email: email(),
})

/** Nuova password dal link ricevuto per email (D16). */
export const reimpostaPasswordValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/** Cancellare l'account chiede la password attuale (D16). */
export const cancellaAccountValidator = vine.create({
  password: vine.string(),
})
