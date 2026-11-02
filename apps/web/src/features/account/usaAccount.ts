import { createContext, use } from 'react'
import type { Api } from '../../lib/api'

export interface Utente {
  id: number
  email: string
  fullName: string | null
  initials: string
}

export type StatoAccount = { tipo: 'verifica' } | { tipo: 'ospite' } | { tipo: 'utente'; utente: Utente }

export interface Account {
  api: Api
  stato: StatoAccount
  accedi: (email: string, password: string) => Promise<void>
  registrati: (email: string, password: string, passwordConfirmation: string) => Promise<void>
  esci: () => Promise<void>
}

export const ContestoAccount = createContext<Account | null>(null)

export function useAccount(): Account {
  const account = use(ContestoAccount)
  if (!account) throw new Error('useAccount va usato dentro ProviderAccount')
  return account
}
