/**
 * Client dell'API AdonisJS (`/api/v1`, in sviluppo dietro il proxy di Vite, in produzione sullo
 * stesso dominio). La sessione sta in un cookie httpOnly che il browser manda da solo: nessun token
 * in JavaScript, quindi uno script iniettato nella pagina non può rubarla (D16, supera D11).
 */
const BASE = '/api/v1'

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

export function creaApi(f: typeof fetch = (...a) => fetch(...a)) {
  /**
   * `percorso` è relativo a /api/v1, oppure un percorso completo dell'API già pronto (i link firmati
   * delle email, che vanno usati così come sono).
   */
  async function richiesta<T = unknown>(metodo: Metodo, percorso: string, corpo?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' })
    if (corpo !== undefined) headers.set('Content-Type', 'application/json')

    let r: Response
    try {
      r = await f(percorso.startsWith('/api/') ? percorso : `${BASE}${percorso}`, {
        method: metodo,
        headers,
        credentials: 'same-origin',
        ...(corpo !== undefined && { body: JSON.stringify(corpo) }),
      })
    } catch {
      throw new ErroreApi(0, 'Non riesco a raggiungere il server. Controlla la connessione.')
    }

    if (r.status === 204) return null as T
    const json = (await r.json().catch(() => null)) as ({ data?: T } & CorpoErrore) | null
    if (!r.ok) throw erroreDa(r.status, json)
    return (json?.data ?? null) as T
  }

  return { richiesta }
}

export type Api = ReturnType<typeof creaApi>
