/**
 * Metadati di un volantino dal nome del file salvato in `data/volantini/` (D7):
 * `<catena>[-<zona>]-<titolo>-<valido_dal>_<valido_al>.pdf`.
 */
export interface MetadatiVolantino {
  catena: string
  titolo: string
  ambito: 'catena' | 'regione' | 'punto_vendita'
  regione: string | null
  validoDal: string | null
  validoAl: string | null
}

/** Prefisso del nome → catena e zona. I volantini Conad, Todis e Coop scaricati sono quelli del Lazio. */
const PREFISSI: [prefisso: string, catena: string, regione: string | null][] = [
  ['conad-lazio-', 'conad', 'Lazio'],
  ['todis-lazio-', 'todis', 'Lazio'],
  ['coop-etruria-lazio-', 'coop', 'Lazio'],
  ['gros-il-castoro-', 'castoro', null],
  ['gros-ma-', 'ma', null],
  ['gros-pewex-', 'pewex', null],
  ['gros-sacoph-', 'sacoph', null],
  ['elite-', 'elite', null],
  ['naturasi-', 'naturasi', null],
]

export function metadatiDaNomeFile(nomeFile: string): MetadatiVolantino {
  const nome = nomeFile.toLowerCase().replace(/\.pdf$/, '')
  const regola = PREFISSI.find(([prefisso]) => nome.startsWith(prefisso))
  if (!regola) throw new Error(`Non riconosco la catena del volantino "${nomeFile}"`)
  const [prefisso, catena, regione] = regola

  const date = /(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(nome)
  const resto = nome
    .slice(prefisso.length, date ? date.index : undefined)
    .replace(/-+$/, '')
    .replace(/-/g, ' ')
    .trim()

  return {
    catena,
    titolo: resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : 'Volantino',
    ambito: regione ? 'regione' : 'catena',
    regione,
    validoDal: date?.[1] ?? null,
    validoAl: date?.[2] ?? null,
  }
}
