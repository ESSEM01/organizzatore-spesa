import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import { createRequire } from 'node:module'
import env from '#start/env'
import { libsqlFilename, rendiRigheModificabili, usaFetchDiNode } from '#services/libsql'

if (env.get('DB_CONNECTION') === 'libsql') {
  // Stessi moduli che carica il client libsql di Lucid: vedi rendiRigheModificabili e usaFetchDiNode.
  const richiedi = createRequire(import.meta.url)
  rendiRigheModificabili(richiedi('@libsql/sqlite3').Statement)
  const hrana = richiedi.resolve('@libsql/hrana-client')
  usaFetchDiNode(createRequire(hrana)('@libsql/isomorphic-fetch'))
}

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   * Sviluppo e test: file SQLite locale. Produzione: Turso (DB_CONNECTION=libsql), vedi D8.
   */
  connection: env.get('DB_CONNECTION', 'sqlite'),

  connections: {
    /**
     * SQLite connection (default).
     */
    sqlite: {
      client: 'better-sqlite3',

      connection: {
        // I test usano un file separato, ricreato a ogni esecuzione: non toccano i dati di sviluppo.
        filename: app.tmpPath(app.inTest ? 'test.sqlite3' : 'db.sqlite3'),
      },

      /**
       * Required by Knex for SQLite defaults.
       */
      useNullAsDefault: true,

      migrations: {
        /**
         * Sort migration files naturally by filename.
         */
        naturalSort: true,

        /**
         * Paths containing migration files.
         */
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        /**
         * Enable schema generation from Lucid models.
         */
        enabled: true,

        /**
         * Custom schema rules file paths.
         */
        rulesPaths: ['./database/schema_rules.js'],
      },
    },

    /**
     * PostgreSQL connection.
     * Install package to switch: npm install pg
     */
    // pg: {
    //   client: 'pg',
    //   connection: {
    //     host: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   schemaGeneration: {
    //     enabled: true,
    //     rulesPaths: ['./database/schema_rules.js'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * MySQL / MariaDB connection.
     * Install package to switch: npm install mysql2
     */
    // mysql: {
    //   client: 'mysql2',
    //   connection: {
    //     host: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   schemaGeneration: {
    //     enabled: true,
    //     rulesPaths: ['./database/schema_rules.js'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * Microsoft SQL Server connection.
     * Install package to switch: npm install tedious
     */
    // mssql: {
    //   client: 'mssql',
    //   connection: {
    //     server: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   schemaGeneration: {
    //     enabled: true,
    //     rulesPaths: ['./database/schema_rules.js'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * libSQL (Turso). Lucid usa il driver `@libsql/sqlite3`, che vuole URL e token
     * in un unico `filename`. L'URL si costruisce solo quando questa connessione è attiva,
     * così in sviluppo non servono le variabili di Turso.
     */
    libsql: {
      client: 'libsql',
      connection: {
        get filename() {
          return libsqlFilename(env.get('LIBSQL_URL'), env.get('LIBSQL_AUTH_TOKEN')?.release())
        },
      },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
    },
  },
})

export default dbConfig
