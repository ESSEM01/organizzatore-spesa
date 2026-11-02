import { Accesso } from '../account/Accesso'
import { useAccount } from '../account/usaAccount'
import { etichettaCatena } from './catene'
import type { NegozioSalvato } from './salvataggio'

interface Props {
  negozi: NegozioSalvato[] | null
  errore: string | null
  onRimuovi: (id: number) => void
}

/** I supermercati scelti dall'utente: servono per prezzi e offerte (D3, D7). */
export function MieiNegozi({ negozi, errore, onRimuovi }: Props) {
  const { stato } = useAccount()

  return (
    <section aria-labelledby="titolo-miei-negozi" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="titolo-miei-negozi" className="text-xl font-semibold">
          I miei negozi
        </h2>
        {stato.tipo === 'ospite' && (
          <p className="text-sm text-testo-tenue text-pretty">
            Accedi per salvare i supermercati dove fai la spesa. Ritroverai prezzi e offerte di quei negozi.
          </p>
        )}
      </div>

      {stato.tipo === 'verifica' && <p className="text-sm text-testo-tenue">Controllo l’accesso…</p>}
      {stato.tipo === 'ospite' && <Accesso />}

      {stato.tipo === 'utente' && (
        <>
          {errore && (
            <p role="alert" className="text-sm text-sforamento">
              {errore}
            </p>
          )}
          {negozi === null && !errore && <p className="text-sm text-testo-tenue">Carico i tuoi negozi…</p>}
          {negozi?.length === 0 && (
            <p className="text-sm text-testo-tenue text-pretty">
              Non hai ancora scelto negozi. Cercali qui sotto e tocca «Aggiungi».
            </p>
          )}
          {negozi && negozi.length > 0 && (
            <ul className="divide-y divide-bordo border-y border-bordo">
              {negozi.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.nome}</p>
                    <p className="truncate text-sm text-testo-tenue">
                      {[etichettaCatena(n.nome, n.catena?.codice ?? null), n.indirizzo].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRimuovi(n.id)}
                    aria-label={`Togli ${n.nome}${n.indirizzo ? `, ${n.indirizzo}` : ''} dai miei negozi`}
                    className="min-h-11 shrink-0 rounded-lg px-3 text-sm text-testo-tenue"
                  >
                    Togli
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
