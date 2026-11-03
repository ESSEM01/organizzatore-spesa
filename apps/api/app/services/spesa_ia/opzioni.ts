import db from '@adonisjs/lucid/services/db'
import {
  alimentoDaNome,
  type Abbinamento,
  type Nutrienti,
  type OpzioneAcquisto,
} from '@spesa/domain'

/** Categorie delle offerte che sono cibo: le altre (casa, animali…) non entrano nella dieta. */
const CATEGORIE_CIBO = [
  'frutta_verdura',
  'carne_pesce',
  'salumi_formaggi',
  'latticini_uova',
  'pane_pasta_cereali',
  'dispensa',
  'surgelati',
  'bevande',
]

/** Peso di un pezzo quando l'offerta è a pezzi: solo dove è standard (uova medie). */
const GRAMMI_PER_PEZZO: Record<number, number> = { 22000: 60 }

export interface AlimentoDisponibile extends Abbinamento {
  per100: Nutrienti
  /** Il prezzo al kg più basso tra le opzioni di tutti i negozi, per orientare il modello. */
  centesimiAlKgMinimo: number
}

export interface NegozioCandidato {
  negozioId: number
  nome: string
  catena: string | null
  indirizzo: string | null
  lat: number
  lon: number
}

export interface OpzioniSpesa {
  alimenti: AlimentoDisponibile[]
  /** Opzioni di acquisto per negozio e per codice di alimento. */
  perNegozio: Map<number, Map<number, OpzioneAcquisto[]>>
  negozi: NegozioCandidato[]
}

const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v))

/**
 * Per i negozi dell'utente, i modi di comprare ogni alimento generico nel periodo (D18): le offerte
 * dei volantini della catena valide in quei giorni, abbinate per nome, e le medie Osservaprezzi
 * dell'ultimo mese per la provincia del negozio. Le offerte sono "proposte" non verificate (scelta
 * dell'utente: si usano, segnate come tali).
 */
export async function opzioniSpesa(
  userId: number,
  periodo: { dal: string; al: string; oggi: string }
): Promise<OpzioniSpesa> {
  const righeNegozi = await db
    .from('negozi_utente')
    .join('negozi', 'negozi.id', 'negozi_utente.negozio_id')
    .leftJoin('catene', 'catene.id', 'negozi.catena_id')
    .where('negozi_utente.user_id', userId)
    .select(
      'negozi.id as negozio_id',
      'negozi.nome',
      'catene.codice as catena',
      'negozi.catena_id',
      'negozi.provincia',
      'negozi.indirizzo',
      'negozi.lat',
      'negozi.lon'
    )
  const negozi = righeNegozi.map((n) => ({
    negozioId: n.negozio_id,
    nome: n.nome,
    catena: n.catena ?? null,
    catenaId: n.catena_id,
    provincia: n.provincia,
    indirizzo: n.indirizzo,
    lat: Number(n.lat),
    lon: Number(n.lon),
  })) as (NegozioCandidato & { catenaId: number | null; provincia: string })[]

  const righeAlimenti = await db
    .from('alimenti_it')
    .join('alimenti', 'alimenti.codice', 'alimenti_it.alimento_codice')
    .select('alimenti_it.nome', 'alimenti_it.parole', 'alimenti.*')
  const abbinamenti: Abbinamento[] = righeAlimenti.map((r) => ({
    nome: r.nome,
    parole: String(r.parole).split('|'),
    codice: Number(r.codice),
  }))
  const nutrienti = new Map<number, Nutrienti>(
    righeAlimenti.map((r) => [
      Number(r.codice),
      {
        kcal: numero(r.kcal),
        proteine: numero(r.proteine),
        carboidrati: numero(r.carboidrati),
        zuccheri: numero(r.zuccheri),
        grassi: numero(r.grassi),
        saturi: numero(r.saturi),
        fibre: numero(r.fibre),
        sale: numero(r.sale),
      },
    ])
  )

  // Offerte valide in almeno un giorno del periodo, da oggi in poi.
  const inizio = periodo.oggi > periodo.dal ? periodo.oggi : periodo.dal
  const catene = [...new Set(negozi.map((n) => n.catenaId).filter((c): c is number => c !== null))]
  const offerte = catene.length
    ? await db
        .from('offerte')
        .whereIn('catena_id', catene)
        .whereIn('categoria', CATEGORIE_CIBO)
        .whereNot('stato', 'scartata')
        .where('valido_al', '>=', inizio)
        .where('valido_dal', '<=', periodo.al)
        .select(
          'id',
          'catena_id',
          'nome',
          'marca',
          'formato',
          'quantita',
          'unita',
          'centesimi',
          'condizione'
        )
    : []
  const offertePerCatena = new Map<number, Map<number, OpzioneAcquisto[]>>()
  for (const o of offerte) {
    const alimento = alimentoDaNome(o.nome, abbinamenti)
    if (!alimento) continue
    const quantita = numero(o.quantita)
    const grammi =
      o.unita === 'g' || o.unita === 'ml'
        ? quantita
        : o.unita === 'pz' && GRAMMI_PER_PEZZO[alimento.codice] && quantita
          ? quantita * GRAMMI_PER_PEZZO[alimento.codice]
          : null
    if (!grammi || grammi <= 0) continue
    const perCatena = offertePerCatena.get(o.catena_id) ?? new Map<number, OpzioneAcquisto[]>()
    offertePerCatena.set(o.catena_id, perCatena)
    const elenco = perCatena.get(alimento.codice) ?? []
    perCatena.set(alimento.codice, elenco)
    elenco.push({
      nome: [o.nome, o.marca, o.formato].filter(Boolean).join(' · '),
      centesimi: o.centesimi,
      grammiConfezione: grammi,
      fonte: 'offerta',
      offertaId: o.id,
      condizione: o.condizione,
    })
  }

  // Medie Osservaprezzi dell'ultimo mese importato, per provincia.
  const stimePerProvincia = new Map<string, Map<number, OpzioneAcquisto[]>>()
  for (const provincia of new Set(negozi.map((n) => n.provincia))) {
    const ultimo = await db
      .from('stime_osservaprezzi')
      .where('provincia', provincia)
      .orderBy([
        { column: 'anno', order: 'desc' },
        { column: 'mese', order: 'desc' },
      ])
      .first()
    const mappa = new Map<number, OpzioneAcquisto[]>()
    stimePerProvincia.set(provincia, mappa)
    if (!ultimo) continue
    const stime = await db
      .from('stime_osservaprezzi')
      .where({ provincia, anno: ultimo.anno, mese: ultimo.mese })
      .whereIn('unita', ['g', 'ml'])
    for (const s of stime) {
      const alimento = alimentoDaNome(s.voce, abbinamenti)
      if (!alimento || !numero(s.quantita)) continue
      const elenco = mappa.get(alimento.codice) ?? []
      mappa.set(alimento.codice, elenco)
      elenco.push({
        nome: `${s.voce}, media di ${provincia} ${String(s.mese).padStart(2, '0')}/${s.anno}`,
        centesimi: s.medio_centesimi,
        grammiConfezione: Number(s.quantita),
        fonte: 'stima',
        offertaId: null,
      })
    }
  }

  const perNegozio = new Map<number, Map<number, OpzioneAcquisto[]>>()
  const minimoAlKg = new Map<number, number>()
  for (const n of negozi) {
    const opzioni = new Map<number, OpzioneAcquisto[]>()
    for (const fonte of [
      n.catenaId ? offertePerCatena.get(n.catenaId) : undefined,
      stimePerProvincia.get(n.provincia),
    ]) {
      for (const [codice, elenco] of fonte ?? []) {
        opzioni.set(codice, [...(opzioni.get(codice) ?? []), ...elenco])
        for (const o of elenco) {
          const alKg = Math.round((o.centesimi * 1000) / o.grammiConfezione)
          minimoAlKg.set(codice, Math.min(minimoAlKg.get(codice) ?? Infinity, alKg))
        }
      }
    }
    perNegozio.set(n.negozioId, opzioni)
  }

  const alimenti: AlimentoDisponibile[] = abbinamenti
    .filter((a) => minimoAlKg.has(a.codice) && nutrienti.get(a.codice)?.kcal !== null)
    .map((a) => ({
      ...a,
      per100: nutrienti.get(a.codice)!,
      centesimiAlKgMinimo: minimoAlKg.get(a.codice)!,
    }))

  return {
    alimenti,
    perNegozio,
    negozi: negozi.map(({ negozioId, nome, catena, indirizzo, lat, lon }) => ({
      negozioId,
      nome,
      catena,
      indirizzo,
      lat,
      lon,
    })),
  }
}
