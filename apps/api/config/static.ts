import { defineConfig } from '@adonisjs/static'

/**
 * Configuration options to tweak the static files middleware.
 * The complete set of options are documented on the
 * official documentation website.
 *
 * https://docs.adonisjs.com/guides/static-assets
 */
/**
 * La PWA compilata sta in `public/` accanto all'API (D20): un solo servizio e un solo indirizzo, così il
 * cookie di sessione resta sullo stesso sito. In sviluppo la cartella non c'è e la PWA la serve Vite.
 */
const staticServerConfig = defineConfig({
  enabled: true,
  etag: true,
  lastModified: true,
  dotFiles: 'ignore',
})

export default staticServerConfig
