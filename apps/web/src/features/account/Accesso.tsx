import { useId, useState, type FormEvent } from 'react'
import { ErroreApi } from '../../lib/api'
import { Campo, classePulsante } from './campo'
import { useAccount } from './usaAccount'

type Modo = 'accedi' | 'registrati' | 'dimenticata'

/** Accesso, creazione dell'account e password dimenticata. */
export function Accesso() {
  const { accedi, registrati, passwordDimenticata } = useAccount()
  const [modo, setModo] = useState<Modo>('accedi')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [campi, setCampi] = useState<Record<string, string>>({})
  const id = useId()

  function cambiaModo(m: Modo) {
    setModo(m)
    setCampi({})
    setErrore(null)
    setAvviso(null)
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    setAvviso(null)
    setCampi({})
    try {
      if (modo === 'accedi') await accedi(email, password)
      else if (modo === 'registrati') await registrati(email, password, conferma)
      else {
        const { emailAttive } = await passwordDimenticata(email)
        // Stessa frase che l'indirizzo esista o no: l'app non rivela chi è registrato.
        if (emailAttive) {
          setAvviso('Se l’indirizzo è registrato, ti abbiamo spedito un link per scegliere una nuova password. Vale un’ora.')
        } else {
          setErrore('Le email non sono ancora attive su questo server: per ora non posso spedirti il link. Riprova più tardi.')
        }
      }
    } catch (err) {
      if (err instanceof ErroreApi && Object.keys(err.campi).length > 0) setCampi(err.campi)
      else if (err instanceof ErroreApi && err.status === 400) setErrore('Email o password non corretti.')
      else setErrore(err instanceof Error ? err.message : 'Accesso non riuscito.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-3 rounded-lg border border-bordo bg-superficie p-4" noValidate>
      {modo === 'dimenticata' ? (
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">Password dimenticata</h3>
          <p className="text-sm text-testo-tenue text-pretty">
            Scrivi l’email del tuo account: ti spediamo un link per sceglierne una nuova.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-fondo p-1" role="group" aria-label="Tipo di accesso">
          {(['accedi', 'registrati'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => cambiaModo(m)}
              className="min-h-11 rounded-md text-sm aria-pressed:bg-superficie aria-pressed:font-medium aria-pressed:shadow-sm"
            >
              {m === 'accedi' ? 'Accedi' : 'Crea un account'}
            </button>
          ))}
        </div>
      )}

      <Campo
        id={`${id}-email`}
        etichetta="Email"
        errore={campi.email}
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {modo !== 'dimenticata' && (
        <Campo
          id={`${id}-password`}
          etichetta="Password"
          errore={campi.password}
          type="password"
          autoComplete={modo === 'accedi' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...(modo === 'registrati' && { minLength: 8 })}
        />
      )}
      {modo === 'registrati' && (
        <Campo
          id={`${id}-conferma`}
          etichetta="Ripeti la password"
          errore={campi.passwordConfirmation}
          type="password"
          autoComplete="new-password"
          value={conferma}
          onChange={(e) => setConferma(e.target.value)}
          required
        />
      )}

      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}
      {avviso && (
        <p role="status" className="text-sm text-pretty">
          {avviso}
        </p>
      )}

      <button type="submit" disabled={invio} className={classePulsante}>
        {invio
          ? 'Attendi…'
          : modo === 'accedi'
            ? 'Accedi'
            : modo === 'registrati'
              ? 'Crea l’account'
              : 'Mandami il link'}
      </button>

      {modo === 'accedi' && (
        <button type="button" onClick={() => cambiaModo('dimenticata')} className="min-h-11 text-sm underline">
          Password dimenticata?
        </button>
      )}
      {modo === 'dimenticata' && (
        <button type="button" onClick={() => cambiaModo('accedi')} className="min-h-11 text-sm underline">
          Torna all’accesso
        </button>
      )}
    </form>
  )
}
