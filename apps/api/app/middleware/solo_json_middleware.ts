import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const METODI_CON_CORPO = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Le richieste che cambiano qualcosa arrivano solo come JSON (CSRF di shield è spento, D16).
 *
 * Spegnere i parser form e multipart non basta: `request.validateUsing()` legge anche la query
 * string, quindi `<form method=POST action="…/auth/login?email=…&password=…">` da un altro sito
 * farebbe entrare la vittima nell'account dell'attaccante. Un form manda sempre un Content-Type
 * suo (urlencoded, multipart o text/plain); `application/json` da un'altra origine richiede invece
 * il preflight CORS, che fuori dallo sviluppo non passa (config/cors.ts).
 *
 * Senza Content-Type si accetta solo una richiesta vuota: niente corpo e niente query (un fetch
 * `no-cors` può mandarla da un altro sito, ma senza dati non apre sessioni). La PWA manda sempre
 * `application/json` (src/lib/api.ts): così passano anche i link firmati delle email, che hanno la
 * firma nella query; la tolleranza serve alle versioni della PWA ancora in cache.
 */
export default class SoloJsonMiddleware {
  handle({ request, response }: HttpContext, next: NextFn) {
    if (!METODI_CON_CORPO.has(request.method())) return next()

    const tipo = request.header('content-type')
    if (tipo) {
      if (tipo.split(';')[0].trim().toLowerCase() === 'application/json') return next()
    } else if (!haCorpo(request) && !request.url(true).includes('?')) {
      return next()
    }

    return response
      .status(415)
      .send({ errors: [{ message: 'La richiesta deve essere in formato JSON.' }] })
  }
}

/** `request.hasBody()` conta come corpo anche `Content-Length: 0`, che i browser mandano. */
function haCorpo(request: HttpContext['request']): boolean {
  if (request.header('transfer-encoding') !== undefined) return true
  return Number(request.header('content-length') ?? 0) > 0
}
