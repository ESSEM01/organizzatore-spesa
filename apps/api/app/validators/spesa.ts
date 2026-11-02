import vine from '@vinejs/vine'

const dataIso = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const centesimi = () => vine.number().withoutDecimals().min(0).max(100_000_000)

export const creaPeriodoValidator = vine.create({
  dal: dataIso(),
  al: dataIso(),
  budgetCentesimi: centesimi(),
})

export const modificaPeriodoValidator = vine.create({
  budgetCentesimi: centesimi(),
})

export const creaListaValidator = vine.create({
  nome: vine.string().trim().minLength(1).maxLength(80),
  negozioId: vine.number().withoutDecimals().nullable().optional(),
  periodoBudgetId: vine.number().withoutDecimals().nullable().optional(),
})

export const modificaListaValidator = vine.create({
  nome: vine.string().trim().minLength(1).maxLength(80).optional(),
  negozioId: vine.number().withoutDecimals().nullable().optional(),
  stato: vine.enum(['bozza', 'in_corso', 'conclusa'] as const).optional(),
})

export const aggiungiVoceValidator = vine.create({
  nome: vine.string().trim().minLength(1).maxLength(120),
  quantita: vine.number().withoutDecimals().min(1).max(999),
})

export const modificaVoceValidator = vine.create({
  quantita: vine.number().withoutDecimals().min(1).max(999).optional(),
  spuntata: vine.boolean().optional(),
})

export const prezzoValidator = vine.create({
  prodottoId: vine.number().withoutDecimals(),
  centesimi: centesimi(),
  /** Giorno del telefono: il server lavora in UTC, l'utente in Italia. */
  oggi: dataIso().optional(),
})
