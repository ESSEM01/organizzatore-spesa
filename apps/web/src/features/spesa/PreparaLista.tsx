import { useEffect, useMemo, useState } from 'react'
import type { Posizione } from '@spesa/domain'
import type { Api } from '../../lib/api'
import { formatDistanza, formatEuro } from '../../lib/format'
import { chiediPosizione } from '../negozi/posizione'
import { creaDatiProposta, scegliDaProposta, type NegozioProposto, type Proposta } from './propostaLista'

const percentuale = (q: number) => `${Math.round(q * 100)}%`

type Stato =
  | { tipo: 'pronto' }
  | { tipo: 'lavoro'; messaggio: string }
  | { tipo: 'errore'; messaggio: string }

interface Props {
  api: Api
  periodoId: number
  /** Chiamata dopo il salvataggio, con l'id della nuova lista. */
  onSalvata: (id: number) => void
}

/** Lista della spesa preparata dall'IA (D13, D18): solo su richiesta, perché ogni proposta costa. */
export function PreparaLista({ api, periodoId, onSalvata }: Props) {
  const dati = useMemo(() => creaDatiProposta(api), [api])
  const [persone, setPersone] = useState<number | null>(null)
  const [stato, setStato] = useState<Stato>({ tipo: 'pronto' })
  const [proposta, setProposta] = useState<Proposta | null>(null)
  const [posizione, setPosizione] = useState<Posizione | null>(null)

  useEffect(() => {
    let attivo = true
    dati
      .preferenze()
      .then((p) => attivo && setPersone(p.persone))
      .catch(() => attivo && setPersone(1))
    return () => {
      attivo = false
    }
  }, [dati])

  async function cambiaPersone(n: number) {
    if (n < 1 || n > 12) return
    setPersone(n)
    await dati.impostaPersone(n).catch(() => undefined)
  }

  async function prepara() {
    setStato({ tipo: 'lavoro', messaggio: 'Preparo la lista: può volerci un minuto…' })
    try {
      const p = await dati.proponi(periodoId)
      // La posizione serve solo a pesare la distanza, qui sul telefono; se manca si sceglie per prezzo.
      const pos = await chiediPosizione().catch(() => null)
      setPosizione(pos)
      setProposta(p)
      setStato({ tipo: 'pronto' })
    } catch (e) {
      setStato({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Non sono riuscito a preparare la lista.' })
    }
  }

  async function salva(n: NegozioProposto) {
    if (!proposta) return
    setStato({ tipo: 'lavoro', messaggio: 'Salvo la lista…' })
    try {
      const { id } = await dati.salva(proposta, n, `Spesa preparata · ${n.nome}`)
      setProposta(null)
      setStato({ tipo: 'pronto' })
      onSalvata(id)
    } catch (e) {
      setStato({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Non sono riuscito a salvare la lista.' })
    }
  }

  const scelta = proposta ? scegliDaProposta(proposta, posizione) : null
  const lavoro = stato.tipo === 'lavoro'

  return (
    <section aria-labelledby="titolo-prepara" className="flex flex-col gap-3 rounded-lg border border-bordo bg-superficie p-4">
      <h2 id="titolo-prepara" className="font-semibold">
        Prepara la lista con l’IA
      </h2>
      <p className="text-sm text-testo-tenue text-pretty">
        Una spesa mediterranea per il budget che resta, con i prezzi dei tuoi negozi.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Persone</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Una persona in meno"
            disabled={!persone || persone <= 1 || lavoro}
            onClick={() => persone && cambiaPersone(persone - 1)}
            className="size-11 rounded-lg border border-bordo text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">
            {persone ?? '…'}
          </span>
          <button
            type="button"
            aria-label="Una persona in più"
            disabled={!persone || persone >= 12 || lavoro}
            onClick={() => persone && cambiaPersone(persone + 1)}
            className="size-11 rounded-lg border border-bordo text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={prepara}
        disabled={lavoro}
        className="min-h-12 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60"
      >
        {proposta ? 'Prepara di nuovo' : 'Prepara la lista'}
      </button>

      <div aria-live="polite">
        {stato.tipo === 'lavoro' && <p className="text-sm text-testo-tenue">{stato.messaggio}</p>}
        {stato.tipo === 'errore' && (
          <p role="alert" className="text-sm text-sforamento">
            {stato.messaggio}
          </p>
        )}
      </div>

      {proposta && scelta?.scelto && (
        <Risultato proposta={proposta} scelta={scelta} conPosizione={posizione !== null} onSalva={salva} occupato={lavoro} />
      )}
    </section>
  )
}

function Risultato({
  proposta,
  scelta,
  conPosizione,
  onSalva,
  occupato,
}: {
  proposta: Proposta
  scelta: ReturnType<typeof scegliDaProposta>
  conPosizione: boolean
  onSalva: (n: NegozioProposto) => void
  occupato: boolean
}) {
  const n = scelta.scelto!
  const { lista } = n
  const { alGiorno, quoteEnergia, copertura } = proposta.nutrizione

  return (
    <div className="flex flex-col gap-4 border-t border-bordo pt-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-testo-tenue">Conviene</p>
        <p className="text-lg font-semibold">{n.nome}</p>
        {n.indirizzo && <p className="text-sm text-testo-tenue">{n.indirizzo}</p>}
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-sm">Totale previsto</span>
          <span
            className={`text-xl font-semibold tabular-nums ${lista.sforamentoCentesimi > 0 ? 'text-sforamento' : 'text-risparmio'}`}
          >
            {formatEuro(lista.totaleCentesimi)}
          </span>
        </p>
        <p className="flex items-baseline justify-between gap-3 text-sm text-testo-tenue">
          <span>Budget che resta</span>
          <span className="tabular-nums">{formatEuro(proposta.budgetCentesimi)}</span>
        </p>
        {!scelta.nelBudget && (
          <p role="alert" className="text-sm text-sforamento text-pretty">
            Con questi prezzi nessun negozio sta nel budget: qui lo superi di {formatEuro(lista.sforamentoCentesimi)}, anche
            togliendo ciò che è rinunciabile.
          </p>
        )}
        {!conPosizione && (
          <p className="text-sm text-testo-tenue">Senza la posizione ho scelto solo per prezzo, non per distanza.</p>
        )}
      </div>

      <p className="text-sm text-pretty">{proposta.nota}</p>

      <ul className="divide-y divide-bordo border-y border-bordo">
        {lista.voci.map((v) => (
          <li key={v.codice} className="flex items-baseline justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-medium">
                {v.nome}
                <span className="ml-1 text-sm font-normal text-testo-tenue tabular-nums">
                  {v.grammi >= 1000 ? `${(v.grammi / 1000).toLocaleString('it-IT')} kg` : `${v.grammi} g`}
                </span>
              </p>
              <p className="text-sm text-testo-tenue text-pretty">
                {v.scelta.fonte === 'offerta'
                  ? `${v.confezioni} × ${v.scelta.nome} · da volantino, non verificato${v.scelta.condizione ? ` · ${v.scelta.condizione}` : ''}`
                  : `Stima: ${v.scelta.nome}`}
              </p>
            </div>
            <span className="shrink-0 tabular-nums">{formatEuro(v.centesimi)}</span>
          </li>
        ))}
      </ul>

      {lista.tolte.length > 0 && (
        <p className="text-sm text-pretty">
          Tolto per stare nel budget: {lista.tolte.map((v) => v.nome).join(', ')}.
        </p>
      )}
      {lista.mancanti.length > 0 && (
        <p className="text-sm text-testo-tenue text-pretty">
          Senza prezzo in questo negozio, fuori dal totale: {lista.mancanti.map((v) => v.nome).join(', ')}.
        </p>
      )}

      <div className="flex flex-col gap-1 rounded-lg bg-fondo p-3 text-sm">
        <p className="font-medium">
          A persona al giorno: <span className="tabular-nums">{alGiorno.kcal} kcal</span>
        </p>
        <p className="text-testo-tenue tabular-nums">
          Carboidrati {percentuale(quoteEnergia.carboidrati)} · proteine {percentuale(quoteEnergia.proteine)} · grassi{' '}
          {percentuale(quoteEnergia.grassi)} · fibre {alGiorno.fibre} g
        </p>
        <p className="text-testo-tenue">
          Riferimento mediterraneo: carboidrati 45–60%, proteine 10–20%, grassi 20–35%, fibre almeno 25 g.
          {copertura < 1 && ` Calcolato sul ${percentuale(copertura)} della spesa con valori noti.`}
        </p>
        <p className="text-xs text-testo-tenue">Valori nutrizionali: tabella CIQUAL 2020 (ANSES).</p>
      </div>

      <button
        type="button"
        onClick={() => onSalva(n)}
        disabled={occupato}
        className="min-h-12 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60"
      >
        Salva come lista
      </button>

      {scelta.classifica.length > 1 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Gli altri tuoi negozi</summary>
          <ul className="flex flex-col gap-1">
            {scelta.classifica.slice(1).map((c) => (
              <li key={c.negozioId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {c.nome}
                  {conPosizione && <span className="text-testo-tenue"> · {formatDistanza(c.distanzaMetri)}</span>}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${c.totaleCentesimi > proposta.budgetCentesimi ? 'text-sforamento' : ''}`}
                >
                  {formatEuro(c.totaleCentesimi)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
