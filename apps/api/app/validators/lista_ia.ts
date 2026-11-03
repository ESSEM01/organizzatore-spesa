import vine from '@vinejs/vine'

const data = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Richiesta di una proposta di lista per un periodo di budget (D18). */
export const propostaValidator = vine.create({
  periodoId: vine.number().withoutDecimals().positive(),
  oggi: data().optional(),
})

/** Proposta salvata come lista, per il negozio scelto sul telefono (D18). */
export const salvaPropostaValidator = vine.create({
  periodoId: vine.number().withoutDecimals().positive(),
  negozioId: vine.number().withoutDecimals().positive(),
  nome: vine.string().trim().minLength(1).maxLength(80).optional(),
  voci: vine
    .array(
      vine.object({
        nome: vine.string().trim().minLength(1).maxLength(200),
        grammi: vine.number().withoutDecimals().positive().max(50_000),
        confezioni: vine.number().withoutDecimals().positive().max(100).nullable(),
        centesimi: vine.number().withoutDecimals().min(0).max(1_000_000),
        offertaId: vine.number().withoutDecimals().positive().nullable(),
      })
    )
    .minLength(1)
    .maxLength(80),
})

/** Preferenze che guidano la lista: per ora il numero di persone (D16). */
export const preferenzeValidator = vine.create({
  persone: vine.number().withoutDecimals().min(1).max(12),
})
