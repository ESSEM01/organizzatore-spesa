import { afterEach, describe, expect, it, vi } from 'vitest'
import { chiediPosizione, ErrorePosizione } from './posizione'

const PERMISSION_DENIED = 1
const TIMEOUT = 3

function navigatoreFinto({
  permesso,
  esito,
}: {
  permesso?: PermissionState | 'senza-api'
  esito: { lat: number; lon: number } | { code: number }
}) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, ko?: PositionErrorCallback | null) => {
    if ('lat' in esito) ok({ coords: { latitude: esito.lat, longitude: esito.lon } } as GeolocationPosition)
    else ko?.({ code: esito.code, PERMISSION_DENIED, TIMEOUT, POSITION_UNAVAILABLE: 2 } as GeolocationPositionError)
  })
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition },
    ...(permesso !== 'senza-api' && { permissions: { query: () => Promise.resolve({ state: permesso ?? 'prompt' }) } }),
  })
  return getCurrentPosition
}

async function motivoDi(promessa: Promise<unknown>) {
  try {
    await promessa
  } catch (e) {
    return e instanceof ErrorePosizione ? e.motivo : 'altro errore'
  }
  return 'nessun errore'
}

describe('chiediPosizione', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('restituisce la posizione quando il permesso è concesso', async () => {
    navigatoreFinto({ permesso: 'granted', esito: { lat: 41.85, lon: 12.49 } })

    await expect(chiediPosizione()).resolves.toEqual({ lat: 41.85, lon: 12.49 })
  })

  it('se la posizione è già bloccata per il sito non la chiede e spiega come sbloccarla', async () => {
    const getCurrentPosition = navigatoreFinto({ permesso: 'denied', esito: { code: PERMISSION_DENIED } })

    expect(await motivoDi(chiediPosizione())).toBe('bloccata')
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("distingue il rifiuto dato dall'utente nella richiesta", async () => {
    navigatoreFinto({ permesso: 'prompt', esito: { code: PERMISSION_DENIED } })

    expect(await motivoDi(chiediPosizione())).toBe('negata')
  })

  it('funziona anche nei browser senza Permissions API', async () => {
    navigatoreFinto({ permesso: 'senza-api', esito: { code: TIMEOUT } })

    expect(await motivoDi(chiediPosizione())).toBe('tempo')
  })

  it('il messaggio di posizione bloccata dice dove sbloccarla', () => {
    expect(new ErrorePosizione('bloccata').message).toMatch(/impostazioni/)
  })
})
