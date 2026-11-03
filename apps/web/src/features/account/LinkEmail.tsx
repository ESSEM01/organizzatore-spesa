import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ErroreApi } from '../../lib/api'
import { Campo, classePulsante } from './campo'
import { useAccount } from './usaAccount'

type Esito = { tipo: 'attesa' } | { tipo: 'fatto'; messaggio: string } | { tipo: 'errore'; messaggio: string }

const messaggioErrore = (e: unknown) =>
  e instanceof Error ? e.message : 'Il link non è valido o è scaduto. Chiedine uno nuovo.'

/** Link "conferma l'email" ricevuto per email: si conferma appena si apre la pagina. */
export function VerificaEmail({ percorso }: { percorso: string | null }) {
  const { verificaEmail } = useAccount()
  const [esito, setEsito] = useState<Esito>(() =>
    percorso ? { tipo: 'attesa' } : { tipo: 'errore', messaggio: 'Il link è incompleto. Aprilo di nuovo dall’email.' },
  )
  const fatto = useRef(false)

  useEffect(() => {
    // Una sola richiesta anche se React esegue l'effetto due volte in sviluppo.
    if (fatto.current || !percorso) return
    fatto.current = true
    verificaEmail(percorso)
      .then(() => setEsito({ tipo: 'fatto', messaggio: 'Email confermata. Grazie!' }))
      .catch((e: unknown) => setEsito({ tipo: 'errore', messaggio: messaggioErrore(e) }))
  }, [percorso, verificaEmail])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Conferma dell’email</h2>
      {esito.tipo === 'attesa' && <p className="text-sm text-testo-tenue">Controllo il link…</p>}
      {esito.tipo !== 'attesa' && (
        <p role={esito.tipo === 'errore' ? 'alert' : 'status'} className={esito.tipo === 'errore' ? 'text-sforamento' : ''}>
          {esito.messaggio}
        </p>
      )}
      <a href="#spesa" className={`${classePulsante} flex items-center justify-center`}>
        Vai alla spesa
      </a>
    </section>
  )
}

/** Link "password dimenticata": si sceglie la nuova password. */
export function ReimpostaPassword({ percorso }: { percorso: string | null }) {
  const { reimpostaPassword } = useAccount()
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [invio, setInvio] = useState(false)
  const [esito, setEsito] = useState<Esito>({ tipo: 'attesa' })
  const [campi, setCampi] = useState<Record<string, string>>({})
  const id = useId()

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!percorso) return
    setInvio(true)
    setCampi({})
    setEsito({ tipo: 'attesa' })
    try {
      await reimpostaPassword(percorso, password, conferma)
      setEsito({ tipo: 'fatto', messaggio: 'Password cambiata. Ora puoi accedere con quella nuova.' })
    } catch (err) {
      if (err instanceof ErroreApi && Object.keys(err.campi).length > 0) setCampi(err.campi)
      else setEsito({ tipo: 'errore', messaggio: messaggioErrore(err) })
    } finally {
      setInvio(false)
    }
  }

  if (esito.tipo === 'fatto') {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Nuova password</h2>
        <p role="status">{esito.messaggio}</p>
        <a href="#spesa" className={`${classePulsante} flex items-center justify-center`}>
          Vai all’accesso
        </a>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Nuova password</h2>
      {!percorso ? (
        <p role="alert" className="text-sforamento">
          Il link è incompleto. Aprilo di nuovo dall’email.
        </p>
      ) : (
        <form onSubmit={invia} className="flex flex-col gap-3 rounded-lg border border-bordo bg-superficie p-4" noValidate>
          <Campo
            id={`${id}-password`}
            etichetta="Nuova password"
            errore={campi.password}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
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
          {esito.tipo === 'errore' && (
            <p role="alert" className="text-sm text-sforamento">
              {esito.messaggio}
            </p>
          )}
          <button type="submit" disabled={invio} className={classePulsante}>
            {invio ? 'Attendi…' : 'Salva la password'}
          </button>
        </form>
      )}
    </section>
  )
}
