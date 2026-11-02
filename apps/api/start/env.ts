/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database (D8): SQLite locale in sviluppo e test, Turso in produzione
  DB_CONNECTION: Env.schema.enum.optional(['sqlite', 'libsql'] as const),
  LIBSQL_URL: Env.schema.string.optional(),
  LIBSQL_AUTH_TOKEN: Env.schema.secret.optional(),

  // Claude (D4): lettura dei volantini, poi ricette e scontrini
  ANTHROPIC_API_KEY: Env.schema.secret.optional(),
})
