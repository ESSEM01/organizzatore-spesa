/**
 * Client dell'API AdonisJS (`/api/v1`, in sviluppo dietro il proxy di Vite).
 * Il token di accesso sta in localStorage: semplice e adatto all'uso personale, ma leggibile da
 * uno script iniettato nella pagina (XSS). Se l'app diventa pubblica valutare un cookie httpOnly (D11).
 */
const BASE = '/api/v1'
const CHIAVE_TOKEN = 'spesa.token'

type Archivio = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export class ErroreApi extends Error {
  readonly status: number
  /** Messaggi di validazione per campo (risposte 422). */
  readonly campi: Record<string, string>

  constructor(status: number, messaggio: string, campi: Record<string, string> = {}) {
    super(messaggio)
    this.status = status
    this.campi = campi
  }
}

interface CorpoErrore {
  errors?: { field?: string; message?: string }[]
  message?: string
}

function erroreDa(status: number, corpo: CorpoErrore | null): ErroreApi {
  const campi: Record<string, string> = {}
  for (const e of corpo?.errors ?? []) if (e.field && e.message) campi[e.field] = e.message
  if (status === 422) return new ErroreApi(status, 'Controlla i campi evidenziati.', campi)
  if (status === 401) return new ErroreApi(status, 'Devi accedere di nuovo.')
  const messaggio = corpo?.errors?.[0]?.message ?? corpo?.message ?? `Errore del server (${status}).`
  return new ErroreApi(status, messaggio, campi)
}

function archivioSicuro(a: Archivio): Archivio {
  // localStorage può lanciare eccezioni (navigazione privata, dati del sito bloccati).
  return {
    getItem: (k) => {
      try {
        return a.getItem(k)
      } catch {
        return null
      }
    },
    setItem: (k, v) => {
      try {
        a.setItem(k, v)
      } catch {
        /* resta solo in memoria per questa sessione */
      }
    },
    removeItem: (k) => {
      try {
        a.removeItem(k)
      } catch {
        /* niente da fare */
      }
    },
  }
}

export function creaApi(f: typeof fetch = (...a) => fetch(...a), archivio: Archivio = localStorage) {
  const memoria = archivioSicuro(archivio)

  async function richiesta<T = unknown>(metodo: Metodo, percorso: string, corpo?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' })
    const token = memoria.getItem(CHIAVE_TOKEN)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (corpo !== undefined) headers.set('Content-Type', 'application/json')

    let r: Response
    try {
      r = await f(`${BASE}${percorso}`, {
        method: metodo,
        headers,
        ...(corpo !== undefined && { body: JSON.stringify(corpo) }),
      })
    } catch {
      throw new ErroreApi(0, 'Non riesco a raggiungere il server. Controlla la connessione.')
    }

    if (r.status === 204) return null as T
    const json = (await r.json().catch(() => null)) as ({ data?: T } & CorpoErrore) | null
    if (!r.ok) {
      if (r.status === 401) memoria.removeItem(CHIAVE_TOKEN)
      throw erroreDa(r.status, json)
    }
    return (json?.data ?? null) as T
  }

  return {
    richiesta,
    salvaToken: (token: string) => memoria.setItem(CHIAVE_TOKEN, token),
    dimenticaToken: () => memoria.removeItem(CHIAVE_TOKEN),
    haToken: () => memoria.getItem(CHIAVE_TOKEN) !== null,
  }
}

export type Api = ReturnType<typeof creaApi>
