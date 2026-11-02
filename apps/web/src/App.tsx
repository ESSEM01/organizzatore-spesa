import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NegozioVicino } from '@spesa/domain'
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
import { UpdatePrompt } from './pwa/UpdatePrompt'

export default function App() {
  return (
    <ProviderAccount>
      <Schermata />
    </ProviderAccount>
  )
}

function Schermata() {
  const { api, stato, esci } = useAccount()
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

      <main className="flex flex-1 flex-col gap-8 pb-24">
        <MieiNegozi negozi={mostrati} errore={errore} onRimuovi={rimuovi} />
        <NegoziVicini mieiOsmIds={mieiOsmIds} onAggiungi={connesso ? aggiungi : null} />
      </main>

      <UpdatePrompt />
    </div>
  )
}
