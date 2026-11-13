import { defineConfig } from '@adonisjs/core/bodyparser'

/**
 * Solo JSON: la PWA non manda form né file (src/lib/api.ts) e nessuna route li legge.
 * Form urlencoded, multipart e testo restano spenti (`types: []`): non si accettano upload da
 * 20 MB e nessun corpo che non sia JSON finisce in `request.all()`.
 *
 * Questo da solo NON ferma un form di un altro sito: `request.validateUsing()` legge anche la
 * query string, e un `<form action="…/auth/login?email=…&password=…">` arriverebbe lo stesso ai
 * controller (login CSRF). Lo blocca `#middleware/solo_json_middleware`, che risponde 415 a ogni
 * POST/PUT/PATCH/DELETE non dichiarata `application/json`. Chi aggiunge le foto degli scontrini
 * (D3) riaccende il multipart solo per quella route e la esclude lì, con un controllo dell'Origin.
 */
const bodyParserConfig = defineConfig({
  /**
   * Parse request bodies for these HTTP methods.
   * Keep this aligned with methods that receive payloads in your routes.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * "application/x-www-form-urlencoded": spento.
   */
  form: {
    types: [],
  },

  /**
   * Config for the JSON parser.
   */
  json: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the JSON parser.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  /**
   * "text/*" grezzo: spento.
   */
  raw: {
    types: [],
  },

  /**
   * "multipart/form-data" (upload di file): spento.
   */
  multipart: {
    autoProcess: false,
    types: [],
  },
})

export default bodyParserConfig
