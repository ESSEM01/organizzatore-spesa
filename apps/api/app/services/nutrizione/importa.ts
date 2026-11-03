import { readFile } from 'node:fs/promises'
import db from '@adonisjs/lucid/services/db'
import { leggiCsv } from '#services/nutrizione/csv'

const numero = (v: string) => (v === '' ? null : Number(v))

/**
 * Carica nel database la tabella CIQUAL e gli abbinamenti italiani (D16) dai CSV versionati in
 * `database/data/`. Si può rilanciare: aggiorna le righe esistenti.
 */
export async function importaNutrizione(cartella: string) {
  const ciqual = leggiCsv(await readFile(`${cartella}/ciqual_2020.csv`, 'utf8'))
  const italiani = leggiCsv(await readFile(`${cartella}/alimenti_it.csv`, 'utf8'))

  const codici = new Set(ciqual.map((r) => Number(r.codice)))
  const mancanti = italiani.filter((r) => !codici.has(Number(r.codice_ciqual)))
  if (mancanti.length) {
    throw new Error(`Codici CIQUAL inesistenti: ${mancanti.map((r) => r.nome).join(', ')}`)
  }

  const ora = new Date()
  await db.transaction(async (trx) => {
    // A blocchi: SQLite limita il numero di parametri per istruzione.
    for (let i = 0; i < ciqual.length; i += 50) {
      await trx
        .insertQuery()
        .table('alimenti')
        .multiInsert(
          ciqual.slice(i, i + 50).map((r) => ({
            codice: Number(r.codice),
            nome_en: r.nome_en,
            gruppo_en: r.gruppo_en || null,
            kcal: numero(r.kcal),
            kcal_calcolate: r.kcal_calcolate === '1',
            proteine: numero(r.proteine),
            carboidrati: numero(r.carboidrati),
            zuccheri: numero(r.zuccheri),
            grassi: numero(r.grassi),
            saturi: numero(r.saturi),
            fibre: numero(r.fibre),
            sale: numero(r.sale),
            fonte: 'CIQUAL 2020',
            created_at: ora,
          }))
        )
        .knexQuery.onConflict('codice')
        .merge()
    }
    for (const r of italiani) {
      await trx
        .insertQuery()
        .table('alimenti_it')
        .insert({
          nome: r.nome,
          parole: r.parole,
          alimento_codice: Number(r.codice_ciqual),
          nota: r.nota || null,
          created_at: ora,
        })
        .knexQuery.onConflict('nome')
        .merge()
    }
  })
  return { alimenti: ciqual.length, abbinamenti: italiani.length }
}
