import { lazy, Suspense, useId, useState, type FormEvent } from 'react'
import type { NegozioVicino, Posizione } from '@spesa/domain'
import { formatDistanza } from '../../lib/format'
import { descriviVolantini, negoziEntroRaggio, scaricaCatalogo, type Catalogo } from './catalogo'
import { etichettaCatena } from './catene'
import { posizioneDaTesto, type Localita } from './osm'
import { serveNuovaRicerca } from './vistaMappa'
import type { OrigineRicerca } from './Mappa'
import { chiediPosizione, ErrorePosizione } from './posizione'

// Leaflet pesa: si scarica solo quando c'è una mappa da mostrare.
const Mappa = lazy(() => import('./Mappa'))

const RAGGI = [1000, 2000, 5000] as const

type Stato =
  | { tipo: 'iniziale' }
  | { tipo: 'cerco'; messaggio: string }
  | { tipo: 'errore'; messaggio: string }

interface UltimaRicerca {
  negozi: NegozioVicino[]
  localita: Localita | null
  centro: Posizione
  origine: OrigineRicerca
  catalogo: Catalogo | null
}

interface PropsNegoziVicini {
  /** Negozi già tra i miei, per segnarli come aggiunti. */
  mieiOsmIds: ReadonlySet<string>
  /** `null` se l'utente non ha fatto l'accesso: il bottone Aggiungi non compare. */
  onAggiungi: ((negozio: NegozioVicino, localita: Localita | null) => Promise<void>) | null
}

export function NegoziVicini({ mieiOsmIds, onAggiungi }: PropsNegoziVicini) {
  const [raggio, setRaggio] = useState<number>(2000)
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<Stato>({ tipo: 'iniziale' })
  const [selezionato, setSelezionato] = useState<string | null>(null)
  const [centroMappa, setCentroMappa] = useState<Posizione | null>(null)
  const idTesto = useId()
  const occupato = stato.tipo === 'cerco'
  // Mappa e lista restano visibili durante una nuova ricerca, finché non arrivano i risultati nuovi.
  const [ultimi, setUltimi] = useState<UltimaRicerca | null>(null)

  async function cerca(posizione: Posizione, origine: OrigineRicerca) {
    setStato({ tipo: 'cerco', messaggio: 'Cerco i supermercati…' })
    // Il centro mostrato è arrotondato a circa 100 m, non la posizione precisa (D5).
    const centro = { lat: Math.round(posizione.lat * 1000) / 1000, lon: Math.round(posizione.lon * 1000) / 1000 }
    try {
      // Tutti i supermercati di Roma, aggiornati ogni settimana: la ricerca si fa qui, sul telefono (D17).
      const catalogo = await scaricaCatalogo()
      const negozi = negoziEntroRaggio(catalogo, centro, raggio)
      const vicino = negozi[0]
      const localita = vicino ? { comune: vicino.comune, provincia: vicino.provincia } : null
      setUltimi({ negozi, localita, centro, origine, catalogo })
      setSelezionato(null)
      setCentroMappa(null)
      setStato({ tipo: 'iniziale' })
    } catch {
      setStato({ tipo: 'errore', messaggio: 'Non riesco a caricare i supermercati. Controlla la connessione.' })
    }
  }

  async function usaPosizione() {
    setStato({ tipo: 'cerco', messaggio: 'Aspetto la posizione dal telefono…' })
    try {
      await cerca(await chiediPosizione(), 'gps')
    } catch (e) {
      setStato({ tipo: 'errore', messaggio: e instanceof ErrorePosizione ? e.message : 'Ricerca non riuscita.' })
    }
  }

  async function usaTesto(e: FormEvent) {
    e.preventDefault()
    if (!testo.trim()) return
    setStato({ tipo: 'cerco', messaggio: `Cerco “${testo.trim()}”…` })
    try {
      const posizione = await posizioneDaTesto(testo.trim())
      if (!posizione) {
        setStato({ tipo: 'errore', messaggio: `Non trovo “${testo.trim()}”. Prova con il nome della città o il CAP.` })
        return
      }
      await cerca(posizione, 'testo')
    } catch {
      setStato({ tipo: 'errore', messaggio: 'Non riesco a cercare la località. Controlla la connessione.' })
    }
  }

  return (
    <section aria-labelledby="titolo-negozi" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="titolo-negozi" className="text-xl font-semibold">
          Supermercati vicini
        </h2>
        <p className="text-sm text-testo-tenue text-pretty">
          Uso la posizione una sola volta, arrotondata a circa 100 m. Resta sul telefono e non viene salvata.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Raggio</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-bordo bg-superficie p-1">
          {RAGGI.map((r) => (
            <label
              key={r}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm tabular-nums has-checked:bg-testo has-checked:text-fondo has-focus-visible:outline-2 has-focus-visible:outline-marca"
            >
              <input
                type="radio"
                name="raggio"
                value={r}
                checked={raggio === r}
                onChange={() => setRaggio(r)}
                className="sr-only"
              />
              {r / 1000} km
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={usaPosizione}
        disabled={occupato}
        className="min-h-12 rounded-lg bg-marca px-4 text-base font-medium text-white disabled:opacity-60"
      >
        Trova supermercati vicini
      </button>

      <form onSubmit={usaTesto} className="flex flex-col gap-1">
        <label htmlFor={idTesto} className="text-sm font-medium">
          Oppure scrivi città o CAP
        </label>
        <div className="flex gap-2">
          <input
            id={idTesto}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            autoComplete="postal-code"
            enterKeyHint="search"
            placeholder="Es. 00147 o Roma"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-bordo bg-superficie px-3 text-base"
          />
          <button
            type="submit"
            disabled={occupato || !testo.trim()}
            className="min-h-11 rounded-lg border border-bordo bg-superficie px-4 font-medium disabled:opacity-60"
          >
            Cerca
          </button>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-2">
        {stato.tipo === 'cerco' && <p className="text-sm text-testo-tenue">{stato.messaggio}</p>}
        {stato.tipo === 'errore' && (
          <p role="alert" className="rounded-lg border border-sforamento/30 bg-sforamento/5 p-3 text-sm text-sforamento">
            {stato.messaggio}
          </p>
        )}
        {ultimi && (
          <>
            <div className="relative">
              <Suspense fallback={<div className="h-72 rounded-lg border border-bordo bg-superficie" />}>
                <Mappa
                  centro={ultimi.centro}
                  raggio={raggio}
                  origine={ultimi.origine}
                  negozi={ultimi.negozi}
                  selezionato={selezionato}
                  onSeleziona={setSelezionato}
                  onCentroCambiato={setCentroMappa}
                />
              </Suspense>
              {centroMappa && serveNuovaRicerca(ultimi.centro, centroMappa, raggio) && (
                <button
                  type="button"
                  onClick={() => cerca(centroMappa, 'mappa')}
                  disabled={occupato}
                  className="absolute top-3 left-1/2 z-[1000] min-h-11 -translate-x-1/2 rounded-full border border-bordo bg-superficie px-4 text-sm font-medium shadow-sm disabled:opacity-70"
                >
                  {occupato ? 'Cerco…' : 'Cerca in quest’area'}
                </button>
              )}
            </div>
            <Risultati
              {...ultimi}
              raggio={raggio}
              selezionato={selezionato}
              onSeleziona={setSelezionato}
              mieiOsmIds={mieiOsmIds}
              onAggiungi={onAggiungi}
            />
          </>
        )}
      </div>
    </section>
  )
}

function Risultati({
  negozi,
  localita,
  catalogo,
  raggio,
  selezionato,
  onSeleziona,
  mieiOsmIds,
  onAggiungi,
}: {
  negozi: NegozioVicino[]
  localita: Localita | null
  catalogo: Catalogo | null
  raggio: number
  selezionato: string | null
  onSeleziona: (osmId: string) => void
} & PropsNegoziVicini) {
  const [inCorso, setInCorso] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function aggiungi(n: NegozioVicino) {
    if (!onAggiungi) return
    setInCorso(n.osmId)
    setErrore(null)
    try {
      await onAggiungi(n, localita)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito ad aggiungere il negozio.')
    } finally {
      setInCorso(null)
    }
  }

  const dove = localita?.comune ? ` · ${localita.comune}${localita.provincia ? ` (${localita.provincia})` : ''}` : ''

  if (negozi.length === 0) {
    return (
      <p className="text-sm text-testo-tenue">
        Nessun supermercato entro {raggio / 1000} km{dove}. L’app conosce i supermercati del comune di Roma: prova un
        raggio più ampio.
      </p>
    )
  }

  return (
    <>
      <p className="text-sm text-testo-tenue">
        <span className="tabular-nums">{negozi.length}</span> supermercati entro {raggio / 1000} km{dove}
      </p>
      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}
      <ul className="divide-y divide-bordo border-y border-bordo">
        {negozi.map((n) => (
          <li key={n.osmId} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={n.osmId === selezionato}
              onClick={() => onSeleziona(n.osmId)}
              className="flex min-h-11 min-w-0 flex-1 items-baseline justify-between gap-3 px-2 py-3 text-left aria-pressed:bg-marca/10"
            >
            <div className="min-w-0">
              <p className="truncate font-medium">{n.nome}</p>
              <p className="truncate text-sm text-testo-tenue">
                {[etichettaCatena(n.nome, n.catena), n.indirizzo].filter(Boolean).join(' · ') || '—'}
              </p>
              {catalogo && descriviVolantini(catalogo, n.catena) && (
                <p className="truncate text-sm font-medium text-risparmio">
                  {descriviVolantini(catalogo, n.catena)}
                </p>
              )}
            </div>
            <span className="shrink-0 text-right text-sm tabular-nums">{formatDistanza(n.distanzaMetri)}</span>
            </button>
            {onAggiungi &&
              (mieiOsmIds.has(n.osmId) ? (
                <span className="flex min-h-11 w-24 shrink-0 items-center justify-center text-sm text-risparmio">
                  Tra i miei
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => aggiungi(n)}
                  disabled={inCorso !== null}
                  aria-label={`Aggiungi ${n.nome}${n.indirizzo ? `, ${n.indirizzo}` : ''} ai miei negozi`}
                  className="min-h-11 w-24 shrink-0 rounded-lg border border-bordo bg-superficie text-sm font-medium disabled:opacity-60"
                >
                  {inCorso === n.osmId ? '…' : 'Aggiungi'}
                </button>
              ))}
          </li>
        ))}
      </ul>
      <p className="text-xs text-testo-tenue">
        Dati ©{' '}
        <a href="https://www.openstreetmap.org/copyright" className="underline" target="_blank" rel="noreferrer">
          contributori OpenStreetMap
        </a>
        , licenza ODbL.
      </p>
    </>
  )
}
