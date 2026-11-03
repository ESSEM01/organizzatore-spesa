import { createContext, use } from 'react'
import type { Api } from '../../lib/api'

export interface Utente {
  id: number
  email: string
  fullName: string | null
  initials: string
  /** Null finché l'utente non conferma l'email con il link ricevuto (D16). */
  emailVerificataIl: string | null
}

export type StatoAccount = { tipo: 'verifica' } | { tipo: 'ospite' } | { tipo: 'utente'; utente: Utente }

export interface Account {
  api: Api
  stato: StatoAccount
  accedi: (email: string, password: string) => Promise<void>
  registrati: (email: string, password: string, passwordConfirmation: string) => Promise<void>
  esci: () => Promise<void>
  /** Rispedisce il link di verifica; `spedita` è falso se il server non può spedire email. */
  reinviaVerifica: () => Promise<{ spedita: boolean; giaConfermata: boolean }>
  /** Conferma l'email con il percorso firmato ricevuto nel link. */
  verificaEmail: (percorso: string) => Promise<void>
  /** `emailAttive` è falso se il server non può spedire email: il link non arriverà. */
  passwordDimenticata: (email: string) => Promise<{ emailAttive: boolean }>
  reimpostaPassword: (percorso: string, password: string, passwordConfirmation: string) => Promise<void>
  /** Cancella l'account e tutti i dati personali (D5, D16). */
  cancellaAccount: (password: string) => Promise<void>
}

export const ContestoAccount = createContext<Account | null>(null)

export function useAccount(): Account {
  const account = use(ContestoAccount)
  if (!account) throw new Error('useAccount va usato dentro ProviderAccount')
  return account
}
