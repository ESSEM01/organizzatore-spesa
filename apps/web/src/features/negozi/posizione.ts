import type { Posizione } from '@spesa/domain'

export type MotivoPosizione = 'bloccata' | 'negata' | 'non-disponibile' | 'tempo' | 'non-supportata'

export class ErrorePosizione extends Error {
  readonly motivo: MotivoPosizione

  constructor(motivo: MotivoPosizione) {
    super(MESSAGGI[motivo])
    this.motivo = motivo
  }
}

const MESSAGGI: Record<MotivoPosizione, string> = {
  // Permesso già negato per il sito (dall'utente in passato o dal browser): il browser non chiede più.
  bloccata:
    'La posizione è bloccata per questo sito. Per usarla, consentila nelle impostazioni del sito nel browser (di solito dall’icona a sinistra dell’indirizzo) e riprova. Intanto puoi scrivere la città o il CAP.',
  negata: 'Non hai consentito la posizione. Puoi riprovare e scegliere «Consenti», oppure scrivere la città o il CAP.',
  'non-disponibile': 'Il telefono non riesce a trovare la posizione. Riprova all’aperto o scrivi la città o il CAP.',
  tempo: 'La posizione ci sta mettendo troppo. Riprova o scrivi la città o il CAP.',
  'non-supportata': 'Questo browser non dà la posizione. Scrivi la città o il CAP.',
}

async function statoPermesso(): Promise<PermissionState | null> {
  try {
    return (await navigator.permissions?.query({ name: 'geolocation' }))?.state ?? null
  } catch {
    return null // Permissions API assente o senza "geolocation" (browser vecchi)
  }
}

/**
 * Chiede la posizione una volta, su azione dell'utente (D5). Precisione bassa: per i negozi
 * vicini bastano poche centinaia di metri, e il telefono risponde prima e consuma meno.
 */
export async function chiediPosizione(): Promise<Posizione> {
  if (!('geolocation' in navigator)) throw new ErrorePosizione('non-supportata')
  if ((await statoPermesso()) === 'denied') throw new ErrorePosizione('bloccata')

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        reject(
          new ErrorePosizione(
            e.code === e.PERMISSION_DENIED ? 'negata' : e.code === e.TIMEOUT ? 'tempo' : 'non-disponibile',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  })
}
