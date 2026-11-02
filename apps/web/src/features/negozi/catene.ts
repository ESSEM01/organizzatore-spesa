/** Nomi da mostrare per i codici di `catenaDaOsm` (@spesa/domain). */
export const NOMI_CATENE: Record<string, string> = {
  conad: 'Conad',
  todis: 'Todis',
  tuodi: 'Tuodì',
  carrefour: 'Carrefour',
  elite: 'Elite',
  pam: 'Pam Panorama',
  ins: 'iN’s Mercato',
  coop: 'Coop',
  naturasi: 'NaturaSì',
  penny: 'Penny',
  tigre: 'Tigre',
  crai: 'CRAI',
  pewex: 'Pewex',
  sacoph: 'Sacoph',
  castoro: 'Il Castoro',
  ma: 'MA',
  lidl: 'Lidl',
  eurospin: 'Eurospin',
  md: 'MD',
  aldi: 'Aldi',
  esselunga: 'Esselunga',
  despar: 'Despar',
  sigma: 'Sigma',
}

export function nomeCatena(codice: string | null): string {
  return codice ? (NOMI_CATENE[codice] ?? codice) : 'Negozio indipendente'
}

function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Etichetta della catena sotto il nome del negozio, oppure `null` se il nome la dice già. */
export function etichettaCatena(nomeNegozio: string, codice: string | null): string | null {
  const etichetta = nomeCatena(codice)
  if (!codice) return etichetta
  const parola = new RegExp(`\\b${normalizza(etichetta)}\\b`)
  return parola.test(normalizza(nomeNegozio)) ? null : etichetta
}
