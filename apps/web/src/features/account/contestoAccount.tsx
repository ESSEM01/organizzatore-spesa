import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { creaApi } from '../../lib/api'
import { ContestoAccount, type Account, type StatoAccount as Stato, type Utente } from './usaAccount'

export function ProviderAccount({ children }: { children: ReactNode }) {
  const api = useMemo(() => creaApi(), [])
  const [stato, setStato] = useState<Stato>(() => (api.haToken() ? { tipo: 'verifica' } : { tipo: 'ospite' }))

  // All'avvio, un token salvato si verifica con il profilo: se è scaduto l'API lo rifiuta e si torna ospiti.
  useEffect(() => {
    if (stato.tipo !== 'verifica') return
    api
      .richiesta<Utente>('GET', '/account/profile')
      .then((utente) => setStato({ tipo: 'utente', utente }))
      .catch(() => setStato({ tipo: 'ospite' }))
  }, [api, stato.tipo])

  const account = useMemo<Account>(() => {
    async function entra(percorso: string, corpo: object) {
      const { user, token } = await api.richiesta<{ user: Utente; token: string }>('POST', percorso, corpo)
      api.salvaToken(token)
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
        api.dimenticaToken()
        setStato({ tipo: 'ospite' })
      },
    }
  }, [api, stato])

  return <ContestoAccount value={account}>{children}</ContestoAccount>
}
