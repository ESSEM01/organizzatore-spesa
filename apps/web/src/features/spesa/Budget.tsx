import { periodoDi, type TipoPeriodo } from '@spesa/domain'
import { useId, useState, type FormEvent } from 'react'
import { formatEuro, leggiEuro, oggiLocale } from '../../lib/format'
import type { DatiSpesa, PeriodoCorrente } from './datiSpesa'

const giorno = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const dataLeggibile = (iso: string) => giorno.format(new Date(`${iso}T00:00:00Z`))

interface Props {
  dati: DatiSpesa
  periodo: PeriodoCorrente | null
  onCambiato: () => void
}

/** Budget del periodo: quanto resta in grande; lo sforamento detto chiaramente (regola di dominio). */
export function Budget({ dati, periodo, onCambiato }: Props) {
  const [modifica, setModifica] = useState(false)

  if (!periodo || modifica) {
    return (
      <ModuloBudget
        dati={dati}
        periodo={periodo}
        onFatto={() => {
          setModifica(false)
          onCambiato()
        }}
        onAnnulla={periodo ? () => setModifica(false) : null}
      />
    )
  }

  const { riepilogo } = periodo
  const sforato = riepilogo.sforamentoCentesimi > 0
  return (
    <section aria-labelledby="titolo-budget" className="flex flex-col gap-1">
      <h2 id="titolo-budget" className="text-sm font-medium text-testo-tenue">
        Budget dal {dataLeggibile(periodo.dal)} al {dataLeggibile(periodo.al)}
      </h2>
      {sforato ? (
        <p className="text-3xl font-semibold text-sforamento tabular-nums">
          {formatEuro(riepilogo.sforamentoCentesimi)} oltre il budget
        </p>
      ) : (
        <p className="text-3xl font-semibold tabular-nums">
          <span className="text-risparmio">{formatEuro(riepilogo.residuoCentesimi)}</span>{' '}
          <span className="text-base font-normal text-testo-tenue">restano</span>
        </p>
      )}
      <p className="text-sm text-testo-tenue tabular-nums">
        Budget {formatEuro(riepilogo.budgetCentesimi)} · liste {formatEuro(riepilogo.previstoCentesimi)}
        <button type="button" onClick={() => setModifica(true)} className="ml-2 min-h-11 px-1 font-medium text-testo underline">
          Modifica
        </button>
      </p>
    </section>
  )
}

function ModuloBudget({
  dati,
  periodo,
  onFatto,
  onAnnulla,
}: {
  dati: DatiSpesa
  periodo: PeriodoCorrente | null
  onFatto: () => void
  onAnnulla: (() => void) | null
}) {
  const [importo, setImporto] = useState(periodo ? String(periodo.budgetCentesimi / 100).replace('.', ',') : '')
  const [tipo, setTipo] = useState<TipoPeriodo>('settimana')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const id = useId()

  async function invia(e: FormEvent) {
    e.preventDefault()
    const centesimi = leggiEuro(importo)
    if (centesimi === null) {
      setErrore('Scrivi un importo in euro, per esempio 150 o 85,50.')
      return
    }
    setInvio(true)
    setErrore(null)
    try {
      if (periodo) await dati.modificaBudget(periodo.id, centesimi)
      else {
        const { dal, al } = periodoDi(tipo, oggiLocale())
        await dati.creaPeriodo(dal, al, centesimi)
      }
      onFatto()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Non sono riuscito a salvare il budget.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-3 rounded-lg border border-bordo bg-superficie p-4" noValidate>
      <h2 className="text-xl font-semibold">{periodo ? 'Modifica il budget' : 'Quanto vuoi spendere?'}</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-importo`} className="text-sm font-medium">
          Budget in euro
        </label>
        <input
          id={`${id}-importo`}
          inputMode="decimal"
          autoComplete="off"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          placeholder="Es. 150"
          aria-invalid={errore ? true : undefined}
          className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-base tabular-nums"
        />
      </div>
      {!periodo && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Per</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-bordo p-1">
            {(['settimana', 'mese'] as const).map((t) => (
              <label
                key={t}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm has-checked:bg-testo has-checked:text-fondo has-focus-visible:outline-2 has-focus-visible:outline-marca"
              >
                <input type="radio" name={`${id}-tipo`} value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                {t === 'settimana' ? 'Questa settimana' : 'Questo mese'}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={invio} className="min-h-12 flex-1 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60">
          {invio ? 'Salvo…' : 'Salva budget'}
        </button>
        {onAnnulla && (
          <button type="button" onClick={onAnnulla} className="min-h-12 rounded-lg border border-bordo px-4">
            Annulla
          </button>
        )}
      </div>
    </form>
  )
}
