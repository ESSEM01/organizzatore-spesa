import { useRegisterSW } from 'virtual:pwa-register/react'

/** Avvisa quando c'è una nuova versione o l'app è pronta offline, senza bloccare l'uso in negozio. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-bordo bg-superficie p-3 shadow-sm"
    >
      <p className="flex-1 text-sm">{needRefresh ? 'È disponibile una nuova versione.' : 'Pronta anche senza rete.'}</p>
      {needRefresh && (
        <button
          type="button"
          className="min-h-11 rounded-md bg-marca px-4 text-sm font-medium text-white"
          onClick={() => updateServiceWorker(true)}
        >
          Aggiorna
        </button>
      )}
      <button
        type="button"
        className="min-h-11 rounded-md px-3 text-sm text-testo-tenue"
        onClick={() => {
          setNeedRefresh(false)
          setOfflineReady(false)
        }}
      >
        Chiudi
      </button>
    </div>
  )
}
