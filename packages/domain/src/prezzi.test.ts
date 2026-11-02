import { describe, expect, it } from 'vitest'
import { risolviPrezzo, type Negozio, type Prezzo } from './prezzi.js'

// I dati qui sotto sono di esempio, non prezzi reali.
const conadAmbrosini: Negozio = { id: 'osm:conad-ambrosini', catena: 'conad' }
const todisVicino: Negozio = { id: 'osm:todis-1', catena: 'todis' }
const oggi = '2026-11-02'

function prezzo(p: Partial<Prezzo> & Pick<Prezzo, 'fonte' | 'centesimi'>): Prezzo {
  return { prodottoId: 'pasta-500g', data: '2026-10-30', ...p }
}

describe('risolviPrezzo', () => {
  it('restituisce null quando il prodotto non ha nessun prezzo', () => {
    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi: [], oggi })).toBeNull()
  })

  it("preferisce l'offerta valida della catena del negozio scelto al prezzo dell'utente", () => {
    const prezzi = [
      prezzo({ fonte: 'utente', centesimi: 129, negozioId: conadAmbrosini.id }),
      prezzo({ fonte: 'offerta', centesimi: 89, catena: 'conad', validoDal: '2026-10-28', validoAl: '2026-11-04' }),
    ]

    const risolto = risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })

    expect(risolto).toMatchObject({ centesimi: 89, fonte: 'offerta', altroNegozio: false })
  })

  it("ignora l'offerta scaduta o non ancora iniziata e usa il prezzo dell'utente", () => {
    const prezzi = [
      prezzo({ fonte: 'offerta', centesimi: 79, catena: 'conad', validoDal: '2026-10-01', validoAl: '2026-11-01' }),
      prezzo({ fonte: 'offerta', centesimi: 69, catena: 'conad', validoDal: '2026-11-05', validoAl: '2026-11-14' }),
      prezzo({ fonte: 'utente', centesimi: 129, negozioId: conadAmbrosini.id }),
    ]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toMatchObject({
      centesimi: 129,
      fonte: 'utente',
    })
  })

  it("considera valida l'offerta nel primo e nell'ultimo giorno", () => {
    const offerta = prezzo({ fonte: 'offerta', centesimi: 89, catena: 'conad', validoDal: '2026-11-02', validoAl: '2026-11-02' })

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi: [offerta], oggi })?.centesimi).toBe(89)
  })

  it("non applica l'offerta di un'altra catena", () => {
    const prezzi = [prezzo({ fonte: 'offerta', centesimi: 59, catena: 'todis', validoDal: '2026-10-29', validoAl: '2026-11-11' })]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toBeNull()
  })

  it("applica l'offerta legata a un punto vendita solo a quel punto vendita", () => {
    const offertaAltroConad = prezzo({
      fonte: 'offerta',
      centesimi: 59,
      catena: 'conad',
      negozioId: 'osm:conad-ostiense',
      validoDal: '2026-10-28',
      validoAl: '2026-11-04',
    })

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi: [offertaAltroConad], oggi })).toBeNull()
  })

  it("scarta l'offerta con una condizione che l'utente non soddisfa, e la usa se la soddisfa", () => {
    const conCarta = prezzo({
      fonte: 'offerta',
      centesimi: 79,
      catena: 'conad',
      validoDal: '2026-10-28',
      validoAl: '2026-11-04',
      condizione: 'carta-fedelta',
    })
    const utente = prezzo({ fonte: 'utente', centesimi: 129, negozioId: conadAmbrosini.id })

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi: [conCarta, utente], oggi })?.centesimi).toBe(129)
    expect(
      risolviPrezzo({
        prodottoId: 'pasta-500g',
        negozio: conadAmbrosini,
        prezzi: [conCarta, utente],
        oggi,
        condizioniUtente: ['carta-fedelta'],
      })?.centesimi,
    ).toBe(79)
  })

  it("tra più offerte valide sceglie la più conveniente", () => {
    const prezzi = [
      prezzo({ fonte: 'offerta', centesimi: 99, catena: 'conad', validoDal: '2026-10-28', validoAl: '2026-11-04' }),
      prezzo({ fonte: 'offerta', centesimi: 85, catena: 'conad', validoDal: '2026-10-28', validoAl: '2026-11-08' }),
    ]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })?.centesimi).toBe(85)
  })

  it("usa il prezzo dell'utente più recente nel negozio scelto", () => {
    const prezzi = [
      prezzo({ fonte: 'utente', centesimi: 119, negozioId: conadAmbrosini.id, data: '2026-09-01' }),
      prezzo({ fonte: 'utente', centesimi: 135, negozioId: conadAmbrosini.id, data: '2026-10-20' }),
    ]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toMatchObject({
      centesimi: 135,
      giorniEta: 13,
    })
  })

  it("se manca nel negozio scelto usa il prezzo dell'utente in un altro negozio, segnalandolo", () => {
    const prezzi = [prezzo({ fonte: 'utente', centesimi: 99, negozioId: todisVicino.id })]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toMatchObject({
      centesimi: 99,
      fonte: 'utente',
      altroNegozio: true,
    })
  })

  it("preferisce il prezzo dell'utente in un altro negozio alla stima provinciale", () => {
    const prezzi = [
      prezzo({ fonte: 'stima', centesimi: 150 }),
      prezzo({ fonte: 'utente', centesimi: 99, negozioId: todisVicino.id }),
    ]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })?.fonte).toBe('utente')
  })

  it('usa la stima provinciale come ultima risorsa', () => {
    const prezzi = [prezzo({ fonte: 'stima', centesimi: 150, data: '2026-09-30' })]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toMatchObject({
      centesimi: 150,
      fonte: 'stima',
      altroNegozio: false,
    })
  })

  it('segna come vecchio un prezzo di oltre 90 giorni', () => {
    const prezzi = [prezzo({ fonte: 'utente', centesimi: 99, negozioId: conadAmbrosini.id, data: '2026-08-01' })]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toMatchObject({
      giorniEta: 93,
      vecchio: true,
    })
  })

  it('ignora i prezzi di altri prodotti', () => {
    const prezzi = [prezzo({ fonte: 'utente', centesimi: 99, negozioId: conadAmbrosini.id, prodottoId: 'riso-1kg' })]

    expect(risolviPrezzo({ prodottoId: 'pasta-500g', negozio: conadAmbrosini, prezzi, oggi })).toBeNull()
  })
})
