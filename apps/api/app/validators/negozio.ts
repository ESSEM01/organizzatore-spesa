import vine from '@vinejs/vine'

/** Negozio scelto dall'utente tra quelli trovati su OpenStreetMap dalla PWA (D10). */
export const aggiungiNegozioValidator = vine.create({
  osmId: vine.string().regex(/^(node|way|relation)\/\d+$/),
  nome: vine.string().trim().minLength(1).maxLength(200),
  // Codice di `catenaDaOsm`; una catena sconosciuta si salva senza catena.
  catena: vine
    .string()
    .regex(/^[a-z]+$/)
    .nullable()
    .optional(),
  indirizzo: vine.string().trim().maxLength(255).nullable().optional(),
  comune: vine.string().trim().minLength(1).maxLength(120),
  provincia: vine.string().regex(/^[A-Z]{2}$/),
  // Posizione del negozio, pubblica su OSM. Mai quella dell'utente (D5).
  lat: vine.number().min(-90).max(90),
  lon: vine.number().min(-180).max(180),
})
