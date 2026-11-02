import { z } from 'zod'

/** Categorie delle offerte, le stesse della colonna `offerte.categoria`. */
export const CATEGORIE = [
  'frutta_verdura',
  'carne_pesce',
  'salumi_formaggi',
  'latticini_uova',
  'pane_pasta_cereali',
  'dispensa',
  'surgelati',
  'bevande',
  'dolci_snack',
  'casa_persona',
  'animali',
  'altro',
] as const

/**
 * Forma della risposta del modello (structured outputs). Il modello trascrive ciò che è stampato:
 * non calcola nulla (D4). Prezzi in centesimi come scritti sul volantino.
 */
export const OffertaLetta = z.object({
  nome: z.string().describe('Nome del prodotto come scritto sul volantino, senza marca'),
  marca: z.string().nullable(),
  formato: z.string().nullable().describe('Formato come stampato, es. "500 g", "6 x 1,5 L"'),
  quantita: z.number().nullable().describe('Quantità totale della confezione nell’unità indicata'),
  unita: z.enum(['g', 'ml', 'pz']).nullable(),
  categoria: z.enum(CATEGORIE),
  prezzo_centesimi: z.number().int().describe('Prezzo di vendita in offerta, in centesimi'),
  prezzo_pieno_centesimi: z.number().int().nullable().describe('Prezzo barrato, se stampato'),
  condizione: z
    .string()
    .nullable()
    .describe('Condizioni stampate: carta fedeltà, "3x2", limiti, giorni. Null se nessuna'),
  pagina: z.number().int(),
})

export const VolantinoLetto = z.object({
  valido_dal: z.string().nullable().describe('Inizio validità AAAA-MM-GG se stampato'),
  valido_al: z.string().nullable().describe('Fine validità AAAA-MM-GG se stampata'),
  offerte: z.array(OffertaLetta),
})

export type OffertaLetta = z.infer<typeof OffertaLetta>
export type VolantinoLetto = z.infer<typeof VolantinoLetto>
