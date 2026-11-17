import type { QueryClientContract } from '@adonisjs/lucid/types/database'

/**
 * Email degli account in forma unica: senza spazi ai lati e in minuscolo. I validator la
 * applicano a registrazione, accesso e password dimenticata; questa funzione porta nella
 * stessa forma gli account registrati prima (migrazione 1793705615495).
 */
export function normalizzaEmail(email: string) {
  return email.trim().toLowerCase()
}

/**
 * Riscrive in minuscolo le email degli utenti. Se due account diventerebbero uguali si ferma
 * prima di cambiare qualsiasi riga: non si sceglie in automatico quale tenere.
 */
export async function normalizzaEmailUtenti(client: QueryClientContract) {
  const utenti: { id: number; email: string }[] = await client.from('users').select('id', 'email')
  const perEmail = new Map<string, number[]>()
  for (const u of utenti) {
    const email = normalizzaEmail(u.email)
    perEmail.set(email, [...(perEmail.get(email) ?? []), u.id])
  }
  const doppie = [...perEmail].filter(([, ids]) => ids.length > 1)
  if (doppie.length > 0) {
    const elenco = doppie.map(([email, ids]) => `${email} (utenti ${ids.join(', ')})`).join('; ')
    throw new Error(
      `Account con la stessa email a meno delle maiuscole: ${elenco}. Unirli a mano, poi rilanciare la migrazione.`
    )
  }
  for (const u of utenti) {
    const email = normalizzaEmail(u.email)
    if (email !== u.email) await client.from('users').where('id', u.id).update({ email })
  }
}
