import { totaleLista } from '@spesa/domain'
import { formatEuro } from './lib/format'
import { UpdatePrompt } from './pwa/UpdatePrompt'

export default function App() {
  // Nessun dato inventato: finché l'utente non aggiunge prodotti la lista è vuota.
  const totale = totaleLista([], () => null)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-baseline justify-between py-4">
        <h1 className="text-lg font-semibold">Spesa</h1>
        <p className="text-sm text-testo-tenue">
          Totale <span className="font-medium text-testo tabular-nums">{formatEuro(totale.totaleCentesimi)}</span>
        </p>
      </header>

      <main className="flex flex-1 flex-col items-start justify-center gap-3 pb-24">
        <h2 className="text-2xl font-semibold text-balance">La lista è vuota</h2>
        <p className="text-testo-tenue text-pretty">
          Imposta il budget e scegli i tuoi supermercati: la lista e le offerte arriveranno qui.
        </p>
      </main>

      <UpdatePrompt />
    </div>
  )
}
