# Ricerca: fonti dei dati su supermercati, prodotti e prezzi

Data della ricerca: **2026-11-02**. I numeri marcati "misurato" vengono da interrogazioni dirette alle API fatte in quella data.

## Domanda
È possibile sapere, per i supermercati vicini all'utente, **quali prodotti vendono e a che prezzo, offerte comprese**?

## Risposta breve
**Non esiste in Italia una fonte unica, aperta e completa** di prodotti e prezzi per punto vendita.
- Le catene (Esselunga, Conad, Coop, Carrefour, Lidl…) **non offrono API pubbliche** né dataset aperti dei prezzi.
- I grandi aggregatori di volantini non offrono API agli sviluppatori. DoveConviene, PromoQui, VolantinoFacile e Tiendeo appartengono tutti allo stesso gruppo, ShopFully.
- Le fonti aperte esistenti hanno una copertura italiana troppo bassa per reggere l'app da sole.

Si può però costruire l'app combinando più fonti, con un modello di dati che accetti prezzi parziali, datati e di provenienza diversa. Vedi la raccomandazione in fondo.

---

## 1. Supermercati vicini: risolto

### OpenStreetMap tramite Overpass API (raccomandata)
- Query: `nwr["shop"="supermarket"](around:<metri>,<lat>,<lon>)`; per includere i discount aggiungi anche `shop=convenience`.
- **Misurato**: entro 2 km dal Duomo di Milano trova **60 supermercati**.
  - 47 hanno il tag `brand`: Pam 13, Esselunga 8, NaturaSì 7, Conad/Conad City 4, Carrefour/Carrefour Market 4, Unes 2, Sigma 2…
  - 32 hanno anche gli orari di apertura (`opening_hours`).
- Gratuita, licenza **ODbL**: va citata l'attribuzione "© OpenStreetMap contributors".
- L'istanza pubblica `overpass-api.de` è a uso moderato e ha una policy di fair use. Per un'app con molti utenti conviene mettere le risposte in cache (i negozi cambiano raramente) o usare un'istanza propria o a pagamento.
- Il tag `brand` collega il negozio alla catena, e quindi ai prezzi a livello di catena (vedi sotto).

### Alternative a pagamento
Google Places API, Mapbox, HERE. Hanno più dati (orari, recensioni), ma costano per richiesta e hanno termini restrittivi sulla memorizzazione dei dati. Non servono per l'MVP.

## 2. Prodotti e valori nutrizionali: risolto

### Open Food Facts
- **Misurato**: **272.371 prodotti** venduti in Italia, con codice EAN, ingredienti, valori nutrizionali, Nutri-Score e categorie.
- API gratuita, dati in licenza **ODbL** (le immagini hanno licenza CC-BY-SA).
- Serve per: bilanciare la dieta (macronutrienti per categoria), riconoscere i prodotti da codice a barre o da scontrino, proporre sostituti più economici della stessa categoria.
- Limite: dice cosa **esiste** sul mercato, non cosa vende **un certo negozio** né a quale prezzo.

## 3. Prezzi e offerte per negozio: il problema vero

### Open Prices (Open Food Facts): aperta, ma copertura italiana minima
- Database di prezzi raccolti dagli utenti (*crowdsourced*), con API REST e licenza **ODbL**. Ogni prezzo ha negozio (OSM), data, prodotto (EAN), flag offerta (`price_is_discounted`) e una prova (foto del cartellino o dello scontrino).
- L'API supporta la ricerca geografica (`lat`, `lon`, `radius_km`) e il filtro per offerte.
- **Misurato in Italia**: **257 punti vendita** in tutto e circa **1.500–2.000 prezzi** totali. Solo 4 negozi hanno più di 100 prezzi; i più coperti sono a Torino, Roma, Milano e Mazara del Vallo.
- **Conclusione**: oggi è inutilizzabile come fonte principale. È però un ottimo **sbocco** per i dati: l'app può *contribuire* a Open Prices con i prezzi letti dagli scontrini degli utenti, se gli utenti acconsentono.

### Prisy (prisy.ai): commerciale, non adatta come base
- Confronta prezzi di supermercati e Amazon. Dichiara oltre 430.000 prodotti, oltre 70 catene, oltre 15.000 negozi e prezzi raccolti ogni giorno.
- Accesso: un server MCP pubblico (`https://prisy.ai/mcp`) con gli strumenti `prisy_search` e `prisy_get`.
- **Misurato**:
  - la ricerca restituisce solo prodotti "in evidenza";
  - il dettaglio dà il **prezzo minimo per catena**, non per negozio (per esempio `storeCount: 0`), insieme alla media dei supermercati sugli ultimi 14 giorni.
- **Non dichiara** l'origine dei dati e non ha termini d'uso pubblicati. Il `robots.txt` vieta `/api/`. Il modello di business è l'affiliazione Amazon.
- **Conclusione**: non è adatta come fonte principale. Prima di qualsiasi uso servono un accordo scritto e chiarezza su origine e licenza dei dati.

### Siti e app dei volantini (DoveConviene, PromoQui, Volantini Smart, Confrontavolantini…)
- Nessuna API pubblica trovata. Il loro valore sta proprio nel database dei volantini, che quasi certamente è protetto da termini d'uso e dal **diritto sui generis sulle banche dati**: direttiva 96/9/CE, recepita in Italia negli artt. 102-bis e seguenti della legge sul diritto d'autore.
- **Lo scraping sistematico di questi siti è da escludere**, perché l'estrazione di parti sostanziali è vietata. L'unica strada è una partnership commerciale con ShopFully.

### Siti di spesa online delle catene (Esselunga a casa, Carrefour, Conad…)
- Contengono prezzi reali, ma senza API pubblica. I prezzi online possono essere diversi da quelli in negozio.
- Lo scraping è **sconsigliato**: stesso quadro giuridico, rischio di blocco e fragilità tecnica.

### Volantini ufficiali delle catene, zona Roma 00147 (verificato il 2026-11-02)
Supermercati entro 2 km trovati con Nominatim (Overpass era sovraccarico: l'app deve prevedere ritentativi e cache). Per ogni catena: sito ufficiale, presenza del PDF, termini d'uso e robots.txt. Le verifiche sui termini di Conad, Todis, Tigre, CRAI, Elite, In's, Penny, Coop, NaturaSì vengono da ricerche delegate e citano riassunti automatici: rileggere il testo originale prima di automatizzare.

| Catena (gestore a Roma) | Volantino ufficiale | PDF | Termini / robots | Esito |
|---|---|---|---|---|
| **Conad** (PAC 2000A) | pagina del negozio su conad.it, es. `conad.it/ricerca-negozi/...--006571` → `conad.it/volantini/<slug>?anacanId=<id>` | **sì**, `conad.it/assets/common/volantini/pac/...pdf`; nei metadati della pagina `disabledDownload: false` | nessun termine d'uso trovato su conad.it; robots `Allow: /` | **scaricato** (5 volantini Lazio) |
| **MA, Pewex, Sacoph, Il Castoro** (Gruppo GROS) | `cedigros.com/promozioni/<insegna>/...` | **sì**, pulsante "Scarica in PDF" (`index.php?option=com_myegojwt&view=flyer&id=<id>&pdf=1`) | footer: contenuti "coperti da copyright"; nessun divieto di accesso automatico trovato; robots non blocca | **scaricato** (4 volantini, scadenza 3/11) |
| **Todis** | `todis.it/volantini/lazio/` | **sì**, il PDF sta in `/wp-content/uploads/` ed è linkato dalla pagina (anche una versione accessibile `_ACC`) | nessun termine d'uso; robots non blocca `/volantini/` né `/wp-content/uploads/` | **scaricato** (Lazio, 29/10–11/11) |
| **Carrefour Market** (GS S.p.A.) — *ignorato per ora* | `carrefour.it/volantino`, per punto vendita | no | condizioni generali art. 8: "La riproduzione anche parziale dei contenuti del Sito è vietata" (verificato); robots blocca `/*.pdf$` | **escluso dall'automazione**; solo link |
| **Elite** (Super Elite S.p.A.) | `superelite.it/promozioni` (stesso componente `com_myegojwt` di cedigros) | **sì**, "Scarica in PDF" (`index.php?option=com_myegojwt&view=flyer&id=<id>&pdf=1`); ogni volantino indica i negozi esclusi | nessuna pagina termini; footer "Tutti i diritti riservati"; robots non blocca | **scaricato** (3 volantini). La ricerca delegata aveva indicato solo DoveConviene: errato |
| **Penny** | `penny.it/sfoglia-il-volantino-mobile` | no: visualizzatore ShopFully *white label* (`viewer-whitelabel.shopfully.cloud`) dentro un iframe | note legali (verificate): vietato riprodurre o ripubblicare senza autorizzazione scritta, "fatta salva la possibilità di memorizzare e/o stampare [...] per usi esclusivamente personali" | lettura automatica delle pagine solo per uso personale |
| **In's Mercato** (Gruppo PAM) | `insmercato.it/volantino/` | non confermato | nessuna clausola trovata in `/legal/` | da verificare |
| **Pam Panorama** (Gruppo PAM) | pagina del punto vendita su `pampanorama.it` → visualizzatore `pam.volantinopiu.com` (VolantinoPiù S.r.l.) | il visualizzatore espone un PDF su `resources.volantinopiu.it`, **non scaricato** | termini VolantinoPiù (verificati): vietato "estrarre [...] dati dal sito web", "web scraping", "robot o altro mezzo automatico", simulare la navigazione; "Non è possibile riprodurre i contenuti" | **escluso dall'automazione**: caricamento manuale o link |
| **CRAI** | `crai.it/negozi-e-volantini` (contenuto caricato via JS) | solo PDF vecchi | nessun termine trovato | da verificare |
| **NaturaSì** | `naturasi.it/offerte` | **sì**, pulsante "Scarica" (`naturasi.it/photo/leaflets/<aaaa>/<mm>/<gg>/<id>/<nome>.pdf`); il link `/volantini/<id>` dà 404 | `/legal-info` senza clausole su riproduzione o accesso automatico; robots non blocca `/photo/` | **scaricato** ("Volantino di ottobre", id 247; validità non indicata nella pagina) |
| **Tigre** (Magazzini Gabrielli, ex Coop Roma: da confermare) | nessun volantino su tigre.it | no | nessun termine trovato | solo aggregatori: escluso |
| **Coop** (Unicoop Etruria; es. Roma Euroma2) | `coopetruria.coop.it/negozi/<negozio>/volantino-<negozio>-<id>` | il PDF non è linkato: si ricava dalle immagini, che vengono dal server CMS `publish-p132368-e1284002.adobeaemcloud.com` | nessuna pagina termini; robots di coopetruria blocca `*/volantino-*/[0-9]*`; **robots del server CMS: `Disallow: /`** | scaricato una volta su richiesta (Lazio, 22/10–4/11); **escluso dall'automazione**: caricamento manuale |
| **Tuodì** | insegna chiusa nel 2023 (fonti in conflitto) | – | – | escluso |

Osservazioni:
- I metadati dei volantini Conad contengono campi di sincronizzazione con ShopFully (`shopfullyFlyerCode`, `shopfullySyncFingerprint`): gli aggregatori (DoveConviene, VolantinoFacile, PromoQui) ripubblicano gli stessi volantini che la catena distribuisce sul proprio sito. **Quando la catena offre il PDF, la fonte da usare è il sito della catena.**
- Il volantino Conad è per cooperativa e regione (Lazio), con l'id del punto vendita nell'URL; quelli GROS sono per insegna, senza selezione del negozio.
- I PDF scaricati sono in `data/volantini/<data>/`, esclusi da git (`data/.gitignore`): servono per provare l'estrazione e come fixture dei test, non vanno ridistribuiti.

### Fonti pubbliche (MIMIT, ISTAT, Comuni): verificate il 2026-11-02

#### Osservaprezzi (MIMIT), "Beni e servizi di largo consumo": la più utile
- Indirizzo: `https://osservaprezzi.mise.gov.it/prezzi/livelli/beni-e-servizi-di-largo-consumo/archivio-rilevazioni-beni-e-servizi-di-largo-consumo`.
- **Cosa contiene**:
  - prezzo **minimo, massimo e medio per provincia** e per mese, su un paniere di prodotti con quantità standard (es. "Petto di pollo (1000 gr)");
  - dati elaborati dall'ISTAT a partire dall'indagine sui prezzi al consumo: rilevazione dei Comuni, più gli scanner data di circa 1.800 supermercati e ipermercati.
- **Come si interroga** (misurato): pagina HTML con un form in **GET** e quattro parametri.
  - `ANNO`: 2021–2026;
  - `MESE`: l'ultimo disponibile è settembre 2026;
  - `f[PROVINCIA]`: 64 province;
  - `f[TIPO_RECORD_MISE]`, con valori `altri_alim`, `orto`, `ittici`, `groc`, `energia`, `servizi`.
  - La tabella è tutta nell'HTML (paginata lato client), quindi si legge con un parser.
  - Non ho trovato né un'API né un export CSV/XLS funzionante: il pulsante "xls" restituisce la stessa pagina HTML.
- **Copertura reale** (misurata, Milano, settembre 2026):

  | Categoria | Prodotti | Esempi |
  |---|---|---|
  | alimentari | 7 | pane, carne bovina, carne suina, pollo, prosciutti, Parmigiano |
  | ortofrutta | 35 | solo prodotti di stagione |
  | ittici | 7 | — |
  | cura casa e persona | 0 | nessun dato nel 2026 (11 prodotti per dicembre 2025) |

- **Licenza**: le note legali del sito dicono che l'uso dei dati implica l'accettazione "delle condizioni della licenza con cui sono pubblicati". Salvo diversa indicazione i contenuti sono in **CC-BY 3.0 IT**: libero riuso citando la fonte. Le pagine dei dati non indicano una licenza diversa, ma va confermato prima di distribuire i dati nell'app.
- **Avvertenza dell'ISTAT**, riportata sul sito: i valori riguardano quantità standard e combinazioni diverse di marca e varietà. Possono quindi differire dal prezzo a scaffale e non vanno usati per confronti tra città o tra mesi.
- **Uso nell'app**: **prezzo di riferimento provinciale** per i prodotti freschi (carne, pesce, frutta, verdura), da usare come stima quando manca un prezzo reale. Utile anche per dire se un'offerta è davvero conveniente: un prezzo sotto il minimo provinciale è un affare, sopra il massimo è caro. Non copre i prodotti confezionati (pasta, latte, scatolame).

#### Comuni (open data tramite dati.gov.it)
- Alcuni Comuni pubblicano i prezzi medi che rilevano per l'ISTAT. Esempio: **Genova**, CSV in licenza CC BY 4.0, con 30 prodotti base (pasta, latte, olio, uova, tonno, riso, zucchero, surgelati…), medie mensili cittadine.
- **Misurato**: la serie di Genova si **ferma a dicembre 2016**. Firenze ha una rilevazione di dicembre 2018. Sono serie storiche, non aggiornate: **non utilizzabili** per i prezzi correnti.

#### ISTAT (IstatData)
- Pubblica soprattutto **indici** dei prezzi (NIC/FOI, anche per capoluogo e per "alimentari e bevande"), non prezzi in euro.
- I microdati scanner (prezzo per GTIN e per punto vendita) arrivano all'ISTAT dalle catene tramite accordi e **non sono pubblici**.
- **Uso nell'app**: al massimo per aggiornare con l'inflazione i prezzi stimati vecchi. Non è una fonte di prezzi.

#### Conclusione sulle fonti pubbliche
Nessuna fonte pubblica dà prezzi **per negozio** né **offerte**. Osservaprezzi è un buon **fallback stimato** per i prodotti freschi a livello provinciale, aggiornato ogni mese. Per i prodotti confezionati non esiste una fonte pubblica corrente.

---

## 4. Strategia raccomandata
Un modello "a strati": ogni prezzo ha `fonte`, `data`, `negozio` (o `catena`) e `affidabilità`, e l'app mostra sempre da dove viene il numero.

| Strato | Fonte | Cosa dà | Costo / rischio |
|---|---|---|---|
| 1. Negozi vicini | OSM / Overpass | dove fare la spesa, catena, orari | gratis, attribuzione ODbL |
| 2. Catalogo e nutrizione | Open Food Facts | prodotti, valori nutrizionali, categorie | gratis, attribuzione ODbL |
| 3. **Prezzi personali** | **scontrini dell'utente** (foto → OCR/LLM) | prezzi reali e datati nei *suoi* negozi | nessun problema legale, sono dati dell'utente |
| 4. **Offerte della settimana** | **volantino caricato dall'utente** (foto o PDF → LLM vision) | prodotti in offerta e prezzi | uso personale; vedi nota legale |
| 5. Prezzi della comunità | Open Prices (lettura e contributo) | prezzi di altri utenti vicini | gratis, ODbL; copertura in crescita |
| 6. Stima di fallback | **Osservaprezzi** (freschi, per provincia e mese) + storico interno dell'utente (confezionati) | prezzo stimato se manca il dato; soglie "affare / caro" per le offerte | CC-BY 3.0 (da confermare); sempre marcato come "stima" |

Perché funziona:
- Una persona compra quasi sempre negli **stessi 2–3 negozi**. Dopo poche spese, gli scontrini coprono la maggior parte dei prodotti che le servono davvero.
- Il **volantino** copre le offerte, che sono il dato più volatile e quello che interessa di più per il budget.
- L'ottimizzazione resta possibile anche con dati parziali: dove manca un prezzo usa una stima esplicita, e dice quanto è affidabile il totale.

### Nota legale sui volantini
Leggere con un LLM un volantino che **l'utente stesso** fotografa o scarica dal sito della catena, per il proprio uso personale, è a basso rischio. Diverso è **scaricare automaticamente** i volantini di tutte le catene e ridistribuirne i dati a tutti gli utenti: è un'estrazione sistematica, va valutata con un legale e, se possibile, sostituita da accordi con le catene o con ShopFully.

## 5. Decisioni da prendere (per `docs/decisioni.md`)
1. Accettare la strategia a strati, con scontrini e volantini caricati dall'utente al centro.
2. Scegliere il servizio per OCR e vision: un LLM multimodale (es. Claude, vedi skill `claude-api` per modelli e costi) oppure un OCR dedicato più regole.
3. Decidere se contribuire a Open Prices (serve un account Open Food Facts e il consenso dell'utente).
4. Decidere se contattare ShopFully per una partnership: utile solo se l'app sarà pubblica e con molti utenti.
5. Mettere in cache le risposte di Overpass e rispettarne la policy di utilizzo.
6. Importare ogni mese Osservaprezzi (64 province, poche richieste al mese, con cache) come riferimento per i prodotti freschi. Prima di distribuire i dati nell'app, chiedere conferma della licenza al MIMIT.

## Fonti
- OpenStreetMap / Overpass API: https://overpass-api.de, https://wiki.openstreetmap.org/wiki/Overpass_API
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Open Prices: https://prices.openfoodfacts.org (API: https://prices.openfoodfacts.org/api/docs), wiki: https://wiki.openfoodfacts.org/Project:Open-Prices, annuncio: https://blog.openfoodfacts.org/en/news/introducing-open-prices
- Prisy: https://prisy.ai, card MCP: https://prisy.ai/.well-known/mcp.json
- ShopFully (DoveConviene, PromoQui, VolantinoFacile, Tiendeo): https://en.wikipedia.org/wiki/ShopFully
- Volantini Smart: https://volantinismart.eu, Confrontavolantini: https://confrontavolantini.com
- Diritto sui generis e limiti contrattuali allo scraping (caso Ryanair): https://www.lexgo.be/en/news-and-articles/2656-websites-can-contractually-restrict-third-party-scraping-of-their-data
- MIMIT, Osservatorio prezzi e tariffe: https://www.mimit.gov.it/it/mercato-e-consumatori/prezzi/osservatorio-prezzi-e-tariffe
- Osservaprezzi, rilevazioni mensili dei beni di largo consumo: https://osservaprezzi.mise.gov.it/prezzi/livelli/beni-e-servizi-di-largo-consumo/archivio-rilevazioni-beni-e-servizi-di-largo-consumo
- Osservaprezzi, metodologia: https://osservaprezzi.mise.gov.it/prezzi/livelli/beni-e-servizi-di-largo-consumo
- Osservaprezzi, note legali (licenza): https://osservaprezzi.mise.gov.it/strumenti-per-l-utente/note-legali
- Comune di Genova, prezzi medi al dettaglio degli alimentari (CSV, CC BY 4.0, 2011–2016): https://dati.comune.genova.it/en/dataset/media-prezzi-al-dettaglio-alimentari
- Comune di Firenze, rilevazione dei prezzi al consumo (dicembre 2018): https://dati.toscana.it/it/dataset/rilevazione-dei-prezzi-al-consumo-del-comune-di-firenze-del-2018-dicembre
- ISTAT, specifiche della banca dati scanner (non pubblica): https://www.istat.it/it/files//2021/04/AllegatoA02_Banca_Dati_PrezziAlConsumo_ScannerData.pdf
- MIMIT, monitoraggio dei prezzi alimentari nei capoluoghi: https://www.mimit.gov.it/it/notizie-stampa/protocollo-dintesa-tra-mimit-e-ministero-dellinterno-per-il-monitoraggio-dei-prezzi-dei-prodotti-alimentari-nei-mercati-al-dettaglio-dei-capoluoghi-di-regione
