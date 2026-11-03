import { test } from '@japa/runner'
import {
  dateItaliane,
  elencoMyego,
  linkVolantiniConad,
  pdfMyego,
  pdfTodis,
  volantinoConad,
} from '#services/volantini/fonti'

// Frammenti di pagina di esempio con la struttura osservata il 2026-11-03: nessuna chiamata di rete.
const ELENCO_GROS = `
<div class="gbox-item"><a href="/promozioni/pewex/volantino-pewex-3" target="_self"><img src="/images/covers/cover-flyer_10034-x.jpg" /></a>
<div class="text-col2">Dal 23 Ottobre al 3 Novembre 2026</div></div>
<div class="gbox-item"><a href="/promozioni/top/volantino-top-2" target="_self"><img src="/images/covers/cover-flyer_10040-x.jpg" /></a>
<div class="text-col2">Dal 23 Ottobre al 3 Novembre 2026</div></div>`

const ELENCO_ELITE = `
<a href="/promozioni/novembre-conveniente-2"><h3 class="text-center">Novembre Conveniente</h3></a>
<div class="text-center text-small text-evidence">Dal 6 all' 11 Novembre 2026</div>
<a href="/promozioni/spesa-difesa-selex-2"><h3 class="text-center">Spesa Difesa Selex</h3></a>
<div class="text-center text-small">Prezzi bloccati</div>
<a href="/promozioni/prezzi-tondi-1eur-e-2eur-2"><div class="bkg-grow"></div></a>
<div class="text-center text-small text-evidence">dal 30 Ottobre all' 11 Novembre 2026</div>
<a href="/negozi/roma">Negozi</a>`

const PAGINA_MYEGO = `<a href='/index.php?option=com_myegojwt&view=flyer&id=10034&pdf=1&Itemid=0' alt='Scarica in PDF'>`

const PAGINA_TODIS = `
<a href="https://www.todis.it/wp-content/uploads/2026/10/OS_23_2026_BASE_RM_LZpdf.pdf?x28079">Scarica il volantino in PDF</a>
<a href="https://www.todis.it/wp-content/uploads/2026/03/OS_23_2026_BASE_RM_LZ_ACC.pdf">Scarica il volantino accessibile</a>`

const NEGOZIO_CONAD = `
<a href="/volantini/Offerte23-Conad-Lazio?anacanId=006571">Sottocosto</a>
<a href="/volantini/Offerte23-Conad-Lazio?anacanId=006571">Sottocosto</a>
<div data-links="{&#34;href&#34;:&#34;https://www.conad.it/volantini/Lazio-conad-piuofferte?anacanId=006571&#34;}">`

const dati = (extra: object) =>
  JSON.stringify({
    title: 'Sottocosto',
    slug: 'Offerte23-Conad-Lazio',
    validFrom: 1793833200000,
    validTo: 1794610800000,
    disabledDownload: false,
    pdfUrl:
      'https://www.conad.it/assets/common/volantini/pac/v2025-/2025-23-conad-lazio.pdf?_u=abc',
    ...extra,
  }).replace(/"/g, '&#34;')
const VOLANTINO_CONAD = (extra = {}) =>
  `<div id="rc163-store-flyers" class="rt163-store-flyers" data-flyer="${dati(extra)}" data-x="1">`

test.group('dateItaliane', () => {
  test('legge "Dal 23 Ottobre al 3 Novembre 2026"', ({ assert }) => {
    assert.deepEqual(dateItaliane('Dal 23 Ottobre al 3 Novembre 2026'), {
      dal: '2026-10-23',
      al: '2026-11-03',
    })
  })

  test('legge "Dal 6 all\' 11 Novembre 2026", con il mese solo alla fine', ({ assert }) => {
    assert.deepEqual(dateItaliane("Dal 6 all' 11 Novembre 2026"), {
      dal: '2026-11-06',
      al: '2026-11-11',
    })
  })

  test("a cavallo d'anno l'inizio è nell'anno precedente", ({ assert }) => {
    assert.deepEqual(dateItaliane('Dal 28 Dicembre al 6 Gennaio 2027'), {
      dal: '2026-12-28',
      al: '2027-01-06',
    })
  })

  test('senza date riconoscibili restituisce null', ({ assert }) => {
    assert.isNull(dateItaliane('Volantino di ottobre'))
  })
})

test.group('fonti dei volantini', () => {
  test('GROS: elenca solo le insegne indicate, con pagina e date', ({ assert }) => {
    assert.deepEqual(elencoMyego(ELENCO_GROS, 'https://www.cedigros.com', ['pewex']), [
      {
        chiave: 'pewex',
        titolo: 'Volantino',
        pagina: 'https://www.cedigros.com/promozioni/pewex/volantino-pewex-3',
        validoDal: '2026-10-23',
        validoAl: '2026-11-03',
      },
    ])
  })

  test('Elite: titolo dalla scheda o dallo slug, date null se non stampate', ({ assert }) => {
    assert.deepEqual(elencoMyego(ELENCO_ELITE, 'https://superelite.it', null), [
      {
        chiave: 'novembre-conveniente-2',
        titolo: 'Novembre Conveniente',
        pagina: 'https://superelite.it/promozioni/novembre-conveniente-2',
        validoDal: '2026-11-06',
        validoAl: '2026-11-11',
      },
      {
        chiave: 'spesa-difesa-selex-2',
        titolo: 'Spesa Difesa Selex',
        pagina: 'https://superelite.it/promozioni/spesa-difesa-selex-2',
        validoDal: null,
        validoAl: null,
      },
      {
        chiave: 'prezzi-tondi-1eur-e-2eur-2',
        titolo: 'Prezzi tondi 1eur e 2eur',
        pagina: 'https://superelite.it/promozioni/prezzi-tondi-1eur-e-2eur-2',
        validoDal: '2026-10-30',
        validoAl: '2026-11-11',
      },
    ])
  })

  test('myego: il PDF è il link "Scarica in PDF" della pagina del volantino', ({ assert }) => {
    assert.equal(
      pdfMyego(PAGINA_MYEGO, 'https://www.cedigros.com'),
      'https://www.cedigros.com/index.php?option=com_myegojwt&view=flyer&id=10034&pdf=1&Itemid=0'
    )
    assert.isNull(pdfMyego('<p>niente</p>', 'https://www.cedigros.com'))
  })

  test('Todis: il PDF normale, non la versione accessibile', ({ assert }) => {
    assert.deepEqual(pdfTodis(PAGINA_TODIS), [
      'https://www.todis.it/wp-content/uploads/2026/10/OS_23_2026_BASE_RM_LZpdf.pdf?x28079',
    ])
  })

  test('Conad: i link ai volantini del negozio, senza doppioni', ({ assert }) => {
    assert.deepEqual(linkVolantiniConad(NEGOZIO_CONAD, 'https://www.conad.it'), [
      'https://www.conad.it/volantini/Offerte23-Conad-Lazio?anacanId=006571',
      'https://www.conad.it/volantini/Lazio-conad-piuofferte?anacanId=006571',
    ])
  })

  test('Conad: titolo, PDF e validità (ora di Roma) dai dati della pagina', ({ assert }) => {
    assert.deepEqual(volantinoConad(VOLANTINO_CONAD()), {
      titolo: 'Sottocosto',
      pdf: 'https://www.conad.it/assets/common/volantini/pac/v2025-/2025-23-conad-lazio.pdf?_u=abc',
      validoDal: '2026-11-05',
      validoAl: '2026-11-14',
    })
  })

  test('Conad: un volantino con il download disattivato non si scarica', ({ assert }) => {
    assert.isNull(volantinoConad(VOLANTINO_CONAD({ disabledDownload: true })))
  })
})
