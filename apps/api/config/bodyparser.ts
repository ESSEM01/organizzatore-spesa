import { defineConfig } from '@adonisjs/core/bodyparser'

/**
 * Solo JSON: la PWA non manda form né file (src/lib/api.ts) e nessuna route li legge.
 * Form urlencoded, multipart e testo restano spenti (`types: []`): un form di un altro sito non
 * arriva ai controller e non si accettano upload da 20 MB. Chi aggiunge le foto degli scontrini
 * (D3) riaccende il multipart solo per quella route.
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
