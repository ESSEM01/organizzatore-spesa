import { useId, useState, type FormEvent } from 'react'
import { ErroreApi } from '../../lib/api'
import { useAccount } from './usaAccount'

type Modo = 'accedi' | 'registrati'

/** Accesso o creazione dell'account: serve per salvare i propri negozi. */
export function Accesso() {
  const { accedi, registrati } = useAccount()
  const [modo, setModo] = useState<Modo>('accedi')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [campi, setCampi] = useState<Record<string, string>>({})
  const id = useId()

  async function invia(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    setCampi({})
    try {
      if (modo === 'accedi') await accedi(email, password)
      else await registrati(email, password, conferma)
    } catch (err) {
      if (err instanceof ErroreApi && Object.keys(err.campi).length > 0) setCampi(err.campi)
      else if (err instanceof ErroreApi && err.status === 400) setErrore('Email o password non corretti.')
      else setErrore(err instanceof Error ? err.message : 'Accesso non riuscito.')
    } finally {
      setInvio(false)
    }
  }

  function campo(nome: string, etichetta: string, props: React.InputHTMLAttributes<HTMLInputElement>) {
    const errCampo = campi[nome]
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-${nome}`} className="text-sm font-medium">
          {etichetta}
        </label>
        <input
          id={`${id}-${nome}`}
          aria-invalid={errCampo ? true : undefined}
          aria-describedby={errCampo ? `${id}-${nome}-errore` : undefined}
          className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-base aria-invalid:border-sforamento"
          {...props}
        />
        {errCampo && (
          <p id={`${id}-${nome}-errore`} className="text-sm text-sforamento">
            {errCampo}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-3 rounded-lg border border-bordo bg-superficie p-4" noValidate>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-fondo p-1" role="group" aria-label="Tipo di accesso">
        {(['accedi', 'registrati'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modo === m}
            onClick={() => {
              setModo(m)
              setCampi({})
              setErrore(null)
            }}
            className="min-h-11 rounded-md text-sm aria-pressed:bg-superficie aria-pressed:font-medium aria-pressed:shadow-sm"
          >
            {m === 'accedi' ? 'Accedi' : 'Crea un account'}
          </button>
        ))}
      </div>

      {campo('email', 'Email', {
        type: 'email',
        autoComplete: 'email',
        inputMode: 'email',
        value: email,
        onChange: (e) => setEmail(e.target.value),
        required: true,
      })}
      {campo('password', 'Password', {
        type: 'password',
        autoComplete: modo === 'accedi' ? 'current-password' : 'new-password',
        value: password,
        onChange: (e) => setPassword(e.target.value),
        required: true,
        ...(modo === 'registrati' && { minLength: 8 }),
      })}
      {modo === 'registrati' &&
        campo('passwordConfirmation', 'Ripeti la password', {
          type: 'password',
          autoComplete: 'new-password',
          value: conferma,
          onChange: (e) => setConferma(e.target.value),
          required: true,
        })}

      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}

      <button
        type="submit"
        disabled={invio}
        className="min-h-12 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60"
      >
        {invio ? 'Attendi…' : modo === 'accedi' ? 'Accedi' : 'Crea l’account'}
      </button>
    </form>
  )
}
