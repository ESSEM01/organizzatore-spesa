import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { creaApi } from '../../lib/api'
import { ContestoAccount, type Account, type StatoAccount as Stato, type Utente } from './usaAccount'

export function ProviderAccount({ children }: { children: ReactNode }) {
  const api = useMemo(() => creaApi(), [])
  const [stato, setStato] = useState<Stato>({ tipo: 'verifica' })

  // All'avvio si chiede il profilo: se il cookie di sessione è valido si è dentro, altrimenti ospiti.
  useEffect(() => {
    if (stato.tipo !== 'verifica') return
    api
      .richiesta<Utente>('GET', '/account/profile')
      .then((utente) => setStato({ tipo: 'utente', utente }))
      .catch(() => setStato({ tipo: 'ospite' }))
  }, [api, stato.tipo])

  // Il vecchio token in localStorage (prima di D16) non serve più: si cancella.
  useEffect(() => {
    try {
      localStorage.removeItem('spesa.token')
    } catch {
      /* archivio non disponibile: niente da cancellare */
    }
  }, [])

  const account = useMemo<Account>(() => {
    async function entra(percorso: string, corpo: object) {
      const { user } = await api.richiesta<{ user: Utente }>('POST', percorso, corpo)
      setStato({ tipo: 'utente', utente: user })
    }
    return {
      api,
      stato,
      accedi: (email, password) => entra('/auth/login', { email, password }),
      registrati: (email, password, passwordConfirmation) =>
        entra('/auth/signup', { fullName: null, email, password, passwordConfirmation }),
      esci: async () => {
        await api.richiesta('POST', '/account/logout').catch(() => undefined)
        setStato({ tipo: 'ospite' })
      },
      reinviaVerifica: async () => {
        await api.richiesta('POST', '/account/verifica-email')
      },
      verificaEmail: async (percorso) => {
        await api.richiesta('POST', percorso)
        // Se si è connessi si aggiorna il profilo, così sparisce l'avviso.
        if (stato.tipo === 'utente') {
          const utente = await api.richiesta<Utente>('GET', '/account/profile')
          setStato({ tipo: 'utente', utente })
        }
      },
      passwordDimenticata: async (email) => {
        await api.richiesta('POST', '/auth/password-dimenticata', { email })
      },
      reimpostaPassword: async (percorso, password, passwordConfirmation) => {
        await api.richiesta('POST', percorso, { password, passwordConfirmation })
      },
      cancellaAccount: async (password) => {
        await api.richiesta('DELETE', '/account', { password })
        setStato({ tipo: 'ospite' })
      },
    }
  }, [api, stato])

  return <ContestoAccount value={account}>{children}</ContestoAccount>
}
