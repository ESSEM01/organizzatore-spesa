import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { NegozioVicino } from '@spesa/domain'
import { Accesso } from './features/account/Accesso'
import { ProviderAccount } from './features/account/contestoAccount'
import { useAccount } from './features/account/usaAccount'
import { MieiNegozi } from './features/negozi/MieiNegozi'
import { NegoziVicini } from './features/negozi/NegoziVicini'
import type { Localita } from './features/negozi/osm'
import {
  aggiungiMioNegozio,
  elencoMieiNegozi,
  rimuoviMioNegozio,
  type NegozioSalvato,
} from './features/negozi/salvataggio'
import { Spesa } from './features/spesa/Spesa'
import { UpdatePrompt } from './pwa/UpdatePrompt'

type Scheda = 'spesa' | 'negozi'

// La scheda aperta sta nell'indirizzo (#spesa, #negozi): sopravvive al ricaricamento e al tasto indietro.
function schedaDaIndirizzo(): Scheda {
  return location.hash === '#negozi' ? 'negozi' : 'spesa'
}
function iscrivitiIndirizzo(avvisa: () => void) {
  addEventListener('hashchange', avvisa)
  return () => removeEventListener('hashchange', avvisa)
}

export default function App() {
  return (
    <ProviderAccount>
      <Schermata />
    </ProviderAccount>
  )
}

function Schermata() {
  const { api, stato, esci } = useAccount()
  const scheda = useSyncExternalStore(iscrivitiIndirizzo, schedaDaIndirizzo)
  const [miei, setMiei] = useState<NegozioSalvato[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const connesso = stato.tipo === 'utente'

  useEffect(() => {
    if (!connesso) return
    elencoMieiNegozi(api)
      .then(setMiei)
      .catch((e: Error) => setErrore(e.message))
  }, [api, connesso])

  const aggiungi = useCallback(
    async (n: NegozioVicino, localita: Localita | null) => {
      const salvato = await aggiungiMioNegozio(api, n, localita)
      setMiei((attuali) => [...(attuali ?? []).filter((m) => m.id !== salvato.id), salvato])
    },
    [api],
  )

  async function rimuovi(id: number) {
    setErrore(null)
    try {
      await rimuoviMioNegozio(api, id)
      setMiei((attuali) => attuali?.filter((m) => m.id !== id) ?? null)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito a togliere il negozio.')
    }
  }

  async function esciEDimentica() {
    await esci()
    setMiei(null)
  }

  // Da ospite non si mostra nulla, anche se è rimasto l'elenco di una sessione precedente.
  const mostrati = connesso ? miei : null
  const mieiOsmIds = useMemo(() => new Set((mostrati ?? []).map((m) => m.osmId)), [mostrati])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-4">
        <h1 className="text-lg font-semibold">Spesa</h1>
        {connesso && (
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate text-testo-tenue">{stato.utente.email}</span>
            <button type="button" onClick={esciEDimentica} className="min-h-11 shrink-0 rounded-lg px-2 font-medium">
              Esci
            </button>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-8 pb-28">
        {scheda === 'spesa' &&
          (connesso ? (
            <Spesa api={api} mieiNegozi={mostrati ?? []} />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">La tua spesa</h2>
              <p className="text-sm text-testo-tenue text-pretty">
                Accedi per impostare il budget e preparare le liste della spesa.
              </p>
              {stato.tipo === 'ospite' ? <Accesso /> : <p className="text-sm text-testo-tenue">Controllo l’accesso…</p>}
            </section>
          ))}
        {scheda === 'negozi' && (
          <>
            <MieiNegozi negozi={mostrati} errore={errore} onRimuovi={rimuovi} />
            <NegoziVicini mieiOsmIds={mieiOsmIds} onAggiungi={connesso ? aggiungi : null} />
          </>
        )}
      </main>

      <nav aria-label="Sezioni" className="fixed inset-x-0 bottom-0 z-[1100] border-t border-bordo bg-fondo/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-2 px-4 pb-[env(safe-area-inset-bottom)]">
          {(
            [
              ['spesa', 'Spesa'],
              ['negozi', 'Negozi'],
            ] as const
          ).map(([s, etichetta]) => (
            <a
              key={s}
              href={`#${s}`}
              aria-current={scheda === s ? 'page' : undefined}
              className="flex min-h-14 items-center justify-center text-sm font-medium text-testo-tenue aria-[current=page]:text-testo aria-[current=page]:underline aria-[current=page]:underline-offset-8"
            >
              {etichetta}
            </a>
          ))}
        </div>
      </nav>

      <UpdatePrompt />
    </div>
  )
}
