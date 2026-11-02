import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { formatEuro, leggiEuro } from '../../lib/format'
import type { NegozioSalvato } from '../negozi/salvataggio'
import type { DatiSpesa, DettaglioLista as Dettaglio, Voce } from './datiSpesa'

interface Props {
  dati: DatiSpesa
  listaId: number
  mieiNegozi: NegozioSalvato[]
  /** Qualcosa è cambiato: il budget del periodo va ricalcolato. */
  onCambiato: () => void
  onEliminata: () => void
}

export function DettaglioLista({ dati, listaId, mieiNegozi, onCambiato, onEliminata }: Props) {
  const [lista, setLista] = useState<Dettaglio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const id = useId()

  const ricarica = useCallback(async () => {
    try {
      setLista(await dati.dettaglio(listaId))
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non riesco a caricare la lista.')
    }
  }, [dati, listaId])

  useEffect(() => {
    let attivo = true // ignora risposte arrivate dopo lo smontaggio
    dati
      .dettaglio(listaId)
      .then((l) => attivo && setLista(l))
      .catch((e: Error) => attivo && setErrore(e.message))
    return () => {
      attivo = false
    }
  }, [dati, listaId])

  /** Esegue una modifica, poi ricarica lista e budget. Gli errori restano visibili. */
  async function esegui(azione: () => Promise<unknown>) {
    setErrore(null)
    try {
      await azione()
      await ricarica()
      onCambiato()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Operazione non riuscita.')
    }
  }

  if (!lista) return <p className="text-sm text-testo-tenue">{errore ?? 'Carico la lista…'}</p>

  const daFare = lista.voci.filter((v) => !v.spuntata)
  const fatte = lista.voci.filter((v) => v.spuntata)

  return (
    <section aria-labelledby={`${id}-titolo`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-titolo`} className="text-xl font-semibold">
          {lista.nome}
        </h2>
        <p className="text-lg font-semibold tabular-nums">{formatEuro(lista.totale.totaleCentesimi)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-negozio`} className="text-sm font-medium">
          Negozio
        </label>
        <select
          id={`${id}-negozio`}
          value={lista.negozio?.id ?? ''}
          onChange={(e) => esegui(() => dati.cambiaNegozio(lista.id, e.target.value ? Number(e.target.value) : null))}
          className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-base"
        >
          <option value="">Nessun negozio</option>
          {mieiNegozi.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
              {n.indirizzo ? ` · ${n.indirizzo}` : ''}
            </option>
          ))}
        </select>
        {!lista.negozio && (
          <p className="text-sm text-testo-tenue">Scegli il negozio per salvare i prezzi che vedi sugli scaffali.</p>
        )}
      </div>

      <NuovaVoce onAggiungi={(nome, q) => esegui(() => dati.aggiungiVoce(lista.id, nome, q))} />

      {errore && (
        <p role="alert" className="text-sm text-sforamento">
          {errore}
        </p>
      )}

      {lista.voci.length === 0 ? (
        <p className="text-sm text-testo-tenue">La lista è vuota: aggiungi il primo prodotto.</p>
      ) : (
        <ul className="divide-y divide-bordo border-y border-bordo">
          {[...daFare, ...fatte].map((v) => (
            <RigaVoce
              key={v.id}
              voce={v}
              puoiPrezzare={lista.negozio !== null}
              onSpunta={(spuntata) => esegui(() => dati.modificaVoce(v.id, { spuntata }))}
              onPrezzo={(c) => esegui(() => dati.salvaPrezzo(lista.id, v.prodotto.id, c))}
              onTogli={() => esegui(() => dati.togliVoce(v.id))}
            />
          ))}
        </ul>
      )}

      {lista.totale.senzaPrezzo.length > 0 && (
        <p className="text-sm text-testo-tenue text-pretty">
          Fuori dal totale perché senza prezzo: {lista.totale.senzaPrezzo.join(', ')}.
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          esegui(async () => {
            await dati.eliminaLista(lista.id)
            onEliminata()
          })
        }
        className="min-h-11 self-start rounded-lg px-2 text-sm text-testo-tenue underline"
      >
        Elimina la lista
      </button>
    </section>
  )
}

function NuovaVoce({ onAggiungi }: { onAggiungi: (nome: string, quantita: number) => Promise<void> }) {
  const [nome, setNome] = useState('')
  const [quantita, setQuantita] = useState(1)
  const id = useId()

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    await onAggiungi(nome.trim(), quantita)
    setNome('')
    setQuantita(1)
  }

  return (
    <form onSubmit={invia} className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={`${id}-nome`} className="text-sm font-medium">
          Aggiungi un prodotto
        </label>
        <input
          id={`${id}-nome`}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Es. Pasta 500 g"
          autoComplete="off"
          enterKeyHint="done"
          className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-base"
        />
      </div>
      <div className="flex w-16 flex-col gap-1">
        <label htmlFor={`${id}-q`} className="text-sm font-medium">
          Q.tà
        </label>
        <input
          id={`${id}-q`}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={quantita}
          onChange={(e) => setQuantita(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
          className="min-h-11 rounded-lg border border-bordo bg-superficie px-2 text-base tabular-nums"
        />
      </div>
      <button type="submit" disabled={!nome.trim()} className="min-h-11 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60">
        Aggiungi
      </button>
    </form>
  )
}

function RigaVoce({
  voce,
  puoiPrezzare,
  onSpunta,
  onPrezzo,
  onTogli,
}: {
  voce: Voce
  puoiPrezzare: boolean
  onSpunta: (spuntata: boolean) => void
  onPrezzo: (centesimi: number) => Promise<void>
  onTogli: () => void
}) {
  const [inModifica, setInModifica] = useState(false)
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const id = useId()
  const p = voce.prezzo

  async function salva(e: FormEvent) {
    e.preventDefault()
    const c = leggiEuro(testo)
    if (c === null) {
      setErrore('Prezzo non valido')
      return
    }
    await onPrezzo(c)
    setInModifica(false)
    setTesto('')
    setErrore(null)
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center gap-2">
        <input
          id={`${id}-spunta`}
          type="checkbox"
          checked={voce.spuntata}
          onChange={(e) => onSpunta(e.target.checked)}
          className="size-6 shrink-0 accent-marca"
        />
        <label htmlFor={`${id}-spunta`} className={`min-w-0 flex-1 py-2 ${voce.spuntata ? 'text-testo-tenue line-through' : ''}`}>
          <span className="tabular-nums">{voce.quantita} ×</span> {voce.prodotto.nome}
        </label>
        <button
          type="button"
          onClick={() => setInModifica((x) => !x)}
          disabled={!puoiPrezzare && !p}
          aria-expanded={inModifica}
          aria-label={p ? `Prezzo di ${voce.prodotto.nome}: ${formatEuro(p.centesimi)}. Cambia` : `Aggiungi il prezzo di ${voce.prodotto.nome}`}
          className="min-h-11 shrink-0 rounded-lg px-2 text-right text-sm tabular-nums disabled:text-testo-tenue"
        >
          {voce.totaleRigaCentesimi !== null ? formatEuro(voce.totaleRigaCentesimi) : <span className="text-testo-tenue">— prezzo?</span>}
        </button>
        <button
          type="button"
          onClick={onTogli}
          aria-label={`Togli ${voce.prodotto.nome} dalla lista`}
          className="min-h-11 min-w-11 shrink-0 rounded-lg text-testo-tenue"
        >
          ×
        </button>
      </div>
      {p && (
        <p className="pl-8 text-xs text-testo-tenue tabular-nums">
          {formatEuro(p.centesimi)} cad.
          {p.fonte === 'stima' ? ' · stima provinciale' : ''}
          {p.altroNegozio ? ' · prezzo di un altro negozio' : ''}
          {p.vecchio ? ` · rilevato ${p.giorniEta} giorni fa` : ''}
        </p>
      )}
      {inModifica && puoiPrezzare && (
        <form onSubmit={salva} className="flex items-center gap-2 pl-8">
          <label htmlFor={`${id}-prezzo`} className="sr-only">
            Prezzo di una confezione in euro
          </label>
          <input
            id={`${id}-prezzo`}
            inputMode="decimal"
            autoFocus
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Prezzo cad., es. 1,29"
            aria-invalid={errore ? true : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-bordo bg-superficie px-3 text-base tabular-nums"
          />
          <button type="submit" className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-sm font-medium">
            Salva
          </button>
          {errore && <span className="text-sm text-sforamento">{errore}</span>}
        </form>
      )}
    </li>
  )
}
