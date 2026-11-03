import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatEuro, oggiLocale } from '../../lib/format'
import type { Api } from '../../lib/api'
import type { NegozioSalvato } from '../negozi/salvataggio'
import { Budget } from './Budget'
import { creaDatiSpesa, type PeriodoCorrente } from './datiSpesa'
import { DettaglioLista } from './DettaglioLista'
import { PreparaLista } from './PreparaLista'

const breve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

interface Props {
  api: Api
  mieiNegozi: NegozioSalvato[]
}

/** Budget del periodo e liste: il compito più frequente, a un tocco dal primo schermo. */
export function Spesa({ api, mieiNegozi }: Props) {
  const dati = useMemo(() => creaDatiSpesa(api, oggiLocale), [api])
  const [periodo, setPeriodo] = useState<PeriodoCorrente | null | undefined>(undefined)
  const [aperta, setAperta] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const ricarica = useCallback(async () => {
    try {
      setPeriodo(await dati.periodoCorrente())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non riesco a caricare il budget.')
    }
  }, [dati])

  useEffect(() => {
    let attivo = true // ignora risposte arrivate dopo lo smontaggio
    dati
      .periodoCorrente()
      .then((p) => attivo && setPeriodo(p))
      .catch((e: Error) => attivo && setErrore(e.message))
    return () => {
      attivo = false
    }
  }, [dati])

  // Senza una scelta esplicita si apre la lista più recente non conclusa.
  const listaAperta = aperta ?? periodo?.liste.find((l) => l.stato !== 'conclusa')?.id ?? null

  async function nuovaLista() {
    if (!periodo) return
    setErrore(null)
    try {
      const negozio = mieiNegozi.length === 1 ? mieiNegozi[0]!.id : null
      const { id } = await dati.creaLista(`Spesa del ${breve.format(new Date())}`, negozio, periodo.id)
      setAperta(id)
      await ricarica()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito a creare la lista.')
    }
  }

  if (periodo === undefined) return <p className="text-sm text-testo-tenue">{errore ?? 'Carico il budget…'}</p>

  return (
    <div className="flex flex-col gap-6">
      <Budget dati={dati} periodo={periodo} onCambiato={ricarica} />

      {periodo &&
        (mieiNegozi.length > 0 ? (
          <PreparaLista
            api={api}
            periodoId={periodo.id}
            onSalvata={(id) => {
              setAperta(id)
              void ricarica()
            }}
          />
        ) : (
          <p className="text-sm text-testo-tenue text-pretty">
            Per preparare la lista con l’IA aggiungi i negozi dove fai la spesa nella scheda{' '}
            <a href="#negozi" className="underline">
              Negozi
            </a>
            .
          </p>
        ))}

      {periodo && (
        <section aria-labelledby="titolo-liste" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 id="titolo-liste" className="text-sm font-medium text-testo-tenue">
              Liste del periodo
            </h2>
            <button type="button" onClick={nuovaLista} className="min-h-11 rounded-lg px-2 text-sm font-medium underline">
              Nuova lista
            </button>
          </div>
          {periodo.liste.length > 0 && (
            <ul className="flex flex-col gap-1">
              {periodo.liste.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-pressed={l.id === listaAperta}
                    onClick={() => setAperta(l.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-bordo bg-superficie px-3 py-2 text-left aria-pressed:border-marca"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.nome}</span>
                      <span className="block truncate text-sm text-testo-tenue">
                        {l.negozio?.nome ?? 'Nessun negozio'}
                        {l.senzaPrezzo > 0 ? ` · ${l.senzaPrezzo} senza prezzo` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatEuro(l.totaleCentesimi)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {periodo.liste.length === 0 && (
            <p className="text-sm text-testo-tenue text-pretty">
              Nessuna lista in questo periodo. Tocca «Nuova lista» per iniziare.
            </p>
          )}
        </section>
      )}

      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}

      {listaAperta !== null && (
        <DettaglioLista
          key={listaAperta}
          dati={dati}
          listaId={listaAperta}
          mieiNegozi={mieiNegozi}
          onCambiato={ricarica}
          onEliminata={() => {
            setAperta(null)
            void ricarica()
          }}
        />
      )}
    </div>
  )
}
