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

  // Controllo settimanale dei volantini nel server (D15): legge i nuovi con Claude, circa $1 l'uno
  CONTROLLO_VOLANTINI: Env.schema.boolean.optional(),

  // Tentativi di accesso limitati (D16): contatori nel database, `memory` nei test
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  // Email di verifica e di reset della password (D16) con Resend. Senza chiave i link vanno solo nel log
  MAIL_MAILER: Env.schema.enum(['resend'] as const),
  MAIL_FROM_NAME: Env.schema.string(),
  MAIL_FROM_ADDRESS: Env.schema.string(),
  RESEND_API_KEY: Env.schema.secret.optional(),
  // Indirizzo della PWA, per i link nelle email
  WEB_URL: Env.schema.string.optional({ format: 'url', tld: false }),
})
