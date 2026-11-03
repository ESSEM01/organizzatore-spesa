import { useId, useState, type FormEvent } from 'react'
import { ErroreApi } from '../../lib/api'
import { Campo } from './campo'
import { useAccount, type Utente } from './usaAccount'

/** Il proprio account: conferma dell'email, uscita, cancellazione dei dati (D16). */
export function Account({ utente, onEsci }: { utente: Utente; onEsci: () => Promise<void> }) {
  const { reinviaVerifica, cancellaAccount } = useAccount()
  const [spedito, setSpedito] = useState<string | null>(null)
  const [chiediConferma, setChiediConferma] = useState(false)
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const id = useId()

  async function rispedisci() {
    setSpedito(null)
    try {
      await reinviaVerifica()
      setSpedito(`Ti abbiamo spedito un nuovo link a ${utente.email}.`)
    } catch (e) {
      setSpedito(e instanceof Error ? e.message : 'Non sono riuscito a spedire il link.')
    }
  }

  async function cancella(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      await cancellaAccount(password)
      location.hash = '#spesa'
    } catch (err) {
      setErrore(
        err instanceof ErroreApi && err.campi.password
          ? err.campi.password
          : err instanceof Error
            ? err.message
            : 'Non sono riuscito a cancellare l’account.',
      )
    } finally {
      setInvio(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Il tuo account</h2>

      <div className="flex flex-col gap-2 rounded-lg border border-bordo bg-superficie p-4">
        <p className="break-all font-medium">{utente.email}</p>
        {utente.emailVerificataIl ? (
          <p className="text-sm text-risparmio">Email confermata</p>
        ) : (
          <>
            <p className="text-sm text-testo-tenue text-pretty">
              Email da confermare: ti serve per recuperare la password. Apri il link che ti abbiamo spedito.
            </p>
            <button type="button" onClick={rispedisci} className="min-h-11 self-start text-sm font-medium underline">
              Rispediscimi il link
            </button>
            {spedito && (
              <p role="status" className="text-sm">
                {spedito}
              </p>
            )}
          </>
        )}
      </div>

      <button type="button" onClick={onEsci} className="min-h-12 rounded-lg border border-bordo bg-superficie px-4 font-medium">
        Esci
      </button>

      <div className="flex flex-col gap-3 border-t border-bordo pt-4">
        <h3 className="font-semibold">Cancella l’account</h3>
        <p className="text-sm text-testo-tenue text-pretty">
          Cancelliamo l’account e tutti i tuoi dati: negozi scelti, budget, liste e prezzi. Non si può annullare.
        </p>
        {!chiediConferma ? (
          <button
            type="button"
            onClick={() => setChiediConferma(true)}
            className="min-h-12 rounded-lg border border-sforamento px-4 font-medium text-sforamento"
          >
            Cancella l’account
          </button>
        ) : (
          <form onSubmit={cancella} className="flex flex-col gap-3" noValidate>
            <Campo
              id={`${id}-password`}
              etichetta="Scrivi la password per confermare"
              errore={errore ?? undefined}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setChiediConferma(false)
                  setPassword('')
                  setErrore(null)
                }}
                className="min-h-12 rounded-lg border border-bordo bg-superficie px-4 font-medium"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={invio || password === ''}
                className="min-h-12 rounded-lg bg-sforamento px-4 font-medium text-white disabled:opacity-60"
              >
                {invio ? 'Attendi…' : 'Cancella tutto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
