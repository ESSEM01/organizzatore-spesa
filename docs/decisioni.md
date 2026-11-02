# Decisioni

Registro delle decisioni di progetto. Ogni voce ha data, scelta, motivo e conseguenze. Le ricerche di supporto sono in `docs/ricerca-fonti-dati.md`.

## D1 · Fonte dei prezzi: Osservaprezzi (2026-11-02, provvisoria)

**Decisione.** Per il momento l'unica fonte di prezzi dell'app è **Osservaprezzi del MIMIT**, sezione "Beni e servizi di largo consumo". Gli altri strati della strategia (scontrini, volantini, Open Prices) sono rimandati. *Superata in parte*: i prezzi dell'utente sono entrati con D3, le offerte dei volantini con D7.

**Motivo.** È l'unica fonte pubblica, aggiornata ogni mese e interrogabile senza violare termini d'uso. Le altre richiedono lavoro sull'input dell'utente (OCR, LLM vision) o hanno copertura minima in Italia.

**Cosa dà e cosa no.**
- Prezzo minimo, medio e massimo **per provincia e per mese**, con quantità standard (es. "Petto di pollo (1000 gr)").
- Copertura: circa 50 prodotti freschi (ortofrutta di stagione, carne, pesce, pane, salumi, Parmigiano). A Milano, settembre 2026: 7 alimentari, 35 ortofrutta, 7 ittici.
- **Non** dà prezzi per singolo negozio, **non** dà offerte, **non** copre i confezionati (pasta, latte, scatolame, cura casa e persona).

**Conseguenze sul prodotto.**
- Ogni prezzo mostrato è una **stima provinciale**, marcata come tale con fonte e mese di rilevazione. Mai presentarlo come il prezzo di un negozio preciso.
- Il calcolo del budget usa il **prezzo medio**; minimo e massimo servono a mostrare una forbice ("tra 8,90 € e 12,40 €").
- I supermercati vicini (OSM) restano utili per dire *dove* comprare, ma non cambiano il prezzo stimato.
- I prodotti fuori paniere non hanno prezzo: l'app lo dice esplicitamente e non lo inventa. Come gestirli: vedi D3.

**Conseguenze tecniche.**
- Import mensile per la provincia dell'utente: richiesta GET a `https://osservaprezzi.mise.gov.it/prezzi/livelli/beni-e-servizi-di-largo-consumo/archivio-rilevazioni-beni-e-servizi-di-largo-consumo` con `ANNO`, `MESE`, `f[PROVINCIA]` e `f[TIPO_RECORD_MISE]` (`altri_alim`, `orto`, `ittici`, `groc`). Non esiste un'API né un export funzionante: la tabella va letta dall'HTML.
- Cache locale per provincia e mese: i dati di un mese chiuso non cambiano, quindi bastano poche richieste al mese. Rispettare il sito, niente richieste ripetute.
- Il parser va isolato dietro un'interfaccia `FontePrezzi`, così gli strati successivi si aggiungono senza toccare la logica di dominio. Test sul parser con una pagina HTML salvata come fixture.
- Ogni prezzo salvato porta `fonte`, `provincia`, `periodo`, `min`, `medio`, `max`, `unità`.

**Vincoli aperti.**
- **Licenza**: le note legali indicano CC-BY 3.0 IT in via generale. Va confermata con il MIMIT prima di distribuire l'app ad altri. Per sviluppo e uso personale si procede citando la fonte.
- L'ISTAT avverte che i valori non vanno usati per confronti tra città o tra mesi: l'app non mostra classifiche tra province né trend come se fossero prezzi a scaffale.

**Quando rivederla.** Quando si aggiungono scontrini o volantini, oppure se Osservaprezzi cambia formato o licenza.

## D2 · Stack: PWA React + backend AdonisJS (2026-11-02)

**Decisione.**
- **App sul telefono**: PWA con React, Vite e Tailwind 4, installabile dalla home e con la lista disponibile offline (service worker).
- **Backend**: AdonisJS 7 (richiede Node ≥ 24), non la 6.19 dei progetti esistenti.

**Motivo.**
- Serve comunque un server. Osservaprezzi non manda intestazioni CORS e risponde solo in HTML, quindi non si può leggere dal browser (verificato il 2026-11-02). La chiave dell'API dell'LLM non può stare nel client.
- React e AdonisJS sono già nell'esperienza dell'utente e coperti dal vault. Expo non lo è, e richiederebbe store o build native senza un vantaggio necessario per un'app a uso personale.

**Divisione dei compiti.**
| Parte | Fa |
|---|---|
| PWA | UI, budget e lista, posizione (solo su richiesta), ricerca supermercati via Overpass (che accetta CORS), cache offline della lista |
| AdonisJS | import mensile di Osservaprezzi con cache, API dei prezzi stimati, chiamate all'LLM per le ricette, logica di dominio |

**Conseguenze.**
- La logica di dominio (ottimizzazione sul budget, totali, abbinamento ricette-ingredienti) è TypeScript puro, senza dipendenze da framework, e si testa in TDD.
- Tutto passa da HTTPS: la geolocalizzazione del browser funziona solo in contesto sicuro.
- Limiti accettati della PWA: notifiche push ridotte su iPhone, permesso di posizione gestito dal browser. Se diventano un problema si sostituisce solo il client (es. Expo), lasciando invariati backend e dominio.
- Le note PWA del vault (`PWA - Index` e collegate, aggiunte il 2026-11-02) coprono manifest, service worker, offline e posizione.

**Database, repository e hosting**: decisi in D6.

## D3 · Prodotti fuori paniere: inserimento manuale, poi scontrini (2026-11-02)

**Decisione.** I prodotti che Osservaprezzi non copre (confezionati, surgelati, scatolame, latticini, cura casa e persona) hanno un prezzo solo se lo fornisce l'utente.
- **Fase 1, inserimento manuale con memoria**: l'utente inserisce prezzo e negozio una volta; l'app lo ricorda e lo riusa.
- **Fase 2, foto dello scontrino**: un LLM multimodale estrae prodotti, prezzi, negozio e data. Si aggiunge dopo la scelta del modello per le ricette (stesso fornitore).

**Motivo.** Con un budget basso la spesa si regge sui confezionati: senza i loro prezzi l'app non può proporre la dieta economica. L'inserimento manuale dà prezzi reali dei negozi dell'utente, senza costi né problemi legali; lo scontrino toglie la fatica dell'inserimento. Open Prices è scartata per ora: circa 2.000 prezzi in tutta Italia. Escludere i confezionati renderebbe il totale poco credibile.

**Regole di dominio.**
- Ogni prezzo inserito ha `prodotto`, `prezzo`, `quantità` e `unità` (per il prezzo al kg/litro), `negozio` (o catena), `data`, `fonte` (`manuale` o `scontrino`).
- L'ultimo prezzo noto per prodotto e negozio si riusa nelle liste successive, con l'età visibile ("1,29 € al Lidl, 3 settimane fa"). Lo storico non si sovrascrive: serve a capire se un'offerta conviene.
- Priorità quando un prodotto ha più prezzi (aggiornata in D7 con le offerte): prezzo dell'utente nel negozio scelto → prezzo dell'utente in un altro negozio (segnalato) → stima Osservaprezzi (solo freschi) → nessun prezzo.
- I prodotti senza prezzo restano nella lista ma **fuori dal totale**, che lo dice: "Totale 42,30 € + 3 prodotti senza prezzo". L'ottimizzazione sul budget lavora solo sui prodotti con prezzo e segnala gli altri.
- Un prezzo oltre una certa età (proposta: 90 giorni) resta valido ma viene marcato come vecchio.

**Conseguenze tecniche.**
- I nomi dei prodotti si suggeriscono da Open Food Facts (ricerca per nome; codice a barre in seguito), così ogni prezzo è legato a un prodotto preciso con categoria e valori nutrizionali. Attribuzione ODbL.
- I prezzi dell'utente vivono sul backend (fonte di verità) e in IndexedDB per l'uso offline, come da note `PWA - Offline e dati locali`.
- `PrezzoUtente` diventa un'altra implementazione dell'interfaccia `FontePrezzi` prevista in D1.
- Fase 2: la foto viene ridotta nel client, inviata al backend, letta dall'LLM; l'utente **conferma** le righe estratte prima che diventino prezzi. Nessun prezzo letto da una foto entra senza conferma.

**Aperto.** Soglia di età del prezzo; come trattare le offerte riportate sullo scontrino (prezzo pieno o scontato, con data di fine se nota).

## D4 · LLM: Claude Opus 5.5 per ricette e scontrini (2026-11-02)

**Decisione.** Un solo fornitore e un solo modello, **Claude Opus 5.5** (`claude-opus-5-5`), per due compiti:
1. **Ricette** dagli ingredienti acquistati, nel rispetto del budget e delle preferenze.
2. **Lettura degli scontrini** da foto (D3, fase 2).

**Motivo.** Entrambi i compiti chiedono precisione: rispettare vincoli su ingredienti e budget, leggere scontrini rovinati. Ai volumi di un uso personale la differenza di costo con i modelli più piccoli è di pochi dollari al mese.

**Costi stimati** (listino del 2026-11-02: $4 input / $20 output per milione di token; stime da verificare con `usage` sulle prime richieste reali):
| Compito | Token stimati (input / output, ragionamento incluso) | Costo |
|---|---|---|
| Una ricetta | ~2.000 / ~3.500 | ~$0,08 |
| Uno scontrino | ~2.000 / ~1.500 (foto ridotta ≈ 1.500–3.000 token) | ~$0,04 |
| Un mese (30 ricette + 8 scontrini) | — | ~$2,70 |

**Confine tra LLM e dominio.**
- L'LLM **non calcola** prezzi, totali o valori nutrizionali: lo fa la logica di dominio con le fonti di D1 e D3 e con Open Food Facts.
- Ricette: l'LLM riceve i prodotti con il loro id e restituisce ricette che citano quegli id. Il backend rifiuta gli id inesistenti, segnala come mancanti gli ingredienti fuori lista e ne calcola il costo.
- Scontrini: l'output estratto è una proposta; diventa prezzo solo dopo la conferma dell'utente.

**Conseguenze tecniche.**
- SDK ufficiale `@anthropic-ai/sdk` nel backend AdonisJS; chiave solo in variabile d'ambiente (`ANTHROPIC_API_KEY`), mai nel client.
- Output con **structured outputs** (`output_config.format` con JSON Schema) e validazione con VineJS lato backend prima dell'uso.
- `thinking: { type: "adaptive" }`; `effort` impostato esplicitamente (il default di Opus 5.5 è `medium`), da tarare sui casi reali.
- Gestire `stop_reason: "refusal"` e attivare il fallback lato server (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
- Le foto si riducono nel client prima dell'invio (vedi `PWA - Capacità e limiti per piattaforma`).
- Prompt caching e Batch API non servono per ora: prompt corti e richieste interattive.
- Limite di richieste per utente e registro dei costi (`usage` di ogni risposta) nel backend.

**Quando rivederla.** Dopo aver raccolto 10–15 scontrini reali e qualche lista di prova: confrontare Opus 5.5, Sonnet 5.5 e Haiku 5.5 su quei casi. Il passaggio a un modello più economico si decide sui risultati.

## D5 · Privacy: posizione e altri dati personali (2026-11-02)

**Decisione.** La posizione resta sul telefono: il backend non riceve né salva mai coordinate. Conosce solo i negozi scelti dall'utente e la provincia.

**Posizione.**
- Serve a due cose: trovare i supermercati vicini (OSM / Overpass) e conoscere la provincia per Osservaprezzi. La provincia si sceglie una volta da un elenco, senza GPS.
- Il permesso si chiede **solo su azione dell'utente** ("Trova supermercati vicini"), con una riga che spiega perché. Mai all'avvio, mai in background.
- Le coordinate si **arrotondano a 3 decimali** (circa 100 m) prima di inviarle a Overpass. La chiamata parte dal client (D2), quindi le coordinate non passano dal backend.
- **Nessun salvataggio** di coordinate, né in IndexedDB né sul server, né nei log. Si salvano solo i "miei negozi" (id OSM, nome, catena) e la provincia, che l'utente può modificare e cancellare.
- **Alternativa senza GPS**: città o CAP scritti a mano, oppure negozi aggiunti a mano. Tutte le funzioni restano disponibili.
- Niente posizione in background, niente storico degli spostamenti, niente analytics di terze parti.

**Foto degli scontrini.**
- Inviate ad Anthropic solo per l'estrazione (D4), poi **cancellate** dopo la conferma dell'utente. Si salvano solo le righe confermate.
- Dai dati estratti si scartano numero di carta (anche parziale), carta fedeltà e codici di transazione: lo schema di output non li prevede.
- **Da verificare**: tempi di conservazione dei dati nell'API Anthropic secondo i termini correnti, prima dell'implementazione della fase 2.

**Preferenze alimentari.**
- Allergie, intolleranze e diete possono essere dati sulla salute (categoria particolare, art. 9 GDPR).
- Restano nell'account dell'utente; all'LLM arrivano solo come vincoli, senza nome né identificativi.

**Log e backend.** Nessun dato personale nei log (coordinate, foto, preferenze). Il registro dei costi LLM (D4) salva solo token, modello e data.

**Vincolo futuro.** Se l'app diventa pubblica servono: informativa privacy, base giuridica per ogni trattamento, consenso esplicito per i dati sulla salute, accordo sul trattamento dei dati (DPA) con Anthropic, funzioni di esportazione e cancellazione dell'account. Per ora l'uso è personale.

## D6 · Database, repository e hosting (2026-11-02)

**Database: SQLite** con Lucid.
- Motivo: un solo file, nessun container in più, RAM minima sul server, backup = copia del file. Basta per un uso personale.
- I progetti AdonisJS esistenti usano MySQL: scartato qui per il costo operativo (un container in più), non per limiti tecnici.
- Regola: niente funzioni specifiche di SQLite nelle query, così il passaggio a PostgreSQL o MySQL resta un cambio di driver e configurazione se l'app avrà più utenti.

**Repository: una sola, con npm workspaces.**
```
organizzatore-spesa/
├─ apps/web/         PWA React + Vite + Tailwind 4
├─ apps/api/         AdonisJS 7
├─ packages/domain/  logica di dominio in TypeScript puro, con test
└─ docs/
```
- Il dominio è condiviso perché la lista funziona offline: totali e prodotti senza prezzo si calcolano anche nel client.
- `packages/domain` non importa React, AdonisJS né accesso alla rete; si sviluppa in TDD.
- La cartella non è ancora un repository git: `git init` alla creazione dello scheletro.

**Hosting: VPS in un datacenter UE con Docker Compose.**
- Container AdonisJS che serve anche la PWA compilata; **Caddy** come reverse proxy con HTTPS automatico; file SQLite su un volume.
- Import mensile di Osservaprezzi: comando `ace` lanciato da cron.
- Backup giornaliero del file SQLite fuori dal server.
- Sviluppo e prove sul telefono: server locale + tunnel HTTPS (es. `cloudflared`), necessario per geolocalizzazione e installazione della PWA.
- Fornitore e piano da scegliere al momento del primo deploy, verificando il listino.
- Scartate le piattaforme gestite (Railway, Render, Fly.io): job mensile e database su file si gestiscono meglio su un server proprio, e Docker è coperto dal vault.

## D7 · Offerte dai volantini ufficiali delle catene (2026-11-02)

**Decisione.** Le offerte entrano nell'app dai volantini, con tre modalità secondo la catena:
1. **Recupero automatico** dei PDF dal sito ufficiale, solo per le catene che offrono il download e i cui termini non lo vietano. Oggi: **Conad** (cooperativa PAC 2000A, volantini Lazio per punto vendita), **Gruppo GROS** (MA, Pewex, Sacoph, Il Castoro), **Todis** (PDF Lazio in `/wp-content/uploads/`, linkato dalla pagina del volantino) **Elite** (`superelite.it/promozioni`, pulsante PDF; ogni volantino indica per quali negozi vale) e **NaturaSì** (`naturasi.it/offerte`, pulsante "Scarica").
2. **Lettura automatica delle pagine del visualizzatore web** (aggiunta su richiesta dell'utente, 2026-11-02) per le catene senza PDF i cui termini consentono almeno la memorizzazione per uso personale. Oggi: **Penny** (note legali: memorizzazione e stampa consentite "per usi esclusivamente personali"). Todis, inizialmente in questa categoria, pubblica in realtà il PDF e passa al punto 1.
3. **Caricamento manuale** da parte dell'utente (foto, screenshot, PDF) per le catene ancora da verificare, come ripiego quando la lettura automatica fallisce, e per:
   - **Coop** (Unicoop Etruria): il PDF sta su un server CMS il cui robots.txt vieta tutto (`Disallow: /`);
   - **Pam Panorama**: il visualizzatore è di VolantinoPiù, i cui termini vietano scraping, robot e navigazione simulata.
4. **Solo link** alla pagina del volantino quando i termini vietano la riproduzione o il visualizzatore è un sito ShopFully.
- **Carrefour**: ignorato per ora su indicazione dell'utente (2026-11-02); le condizioni generali (art. 8) vietano comunque la riproduzione.
- **Dati JSON dei visualizzatori ShopFully** (DoveConviene, VolantinoFacile, PromoQui): esclusi. Leggere le loro API interne è accesso automatico ai siti ShopFully, vietato dai termini (art. 2.5), e il loro contenuto è comunque il volantino che la catena pubblica sul proprio sito.

**Escluso**: qualsiasi estrazione da DoveConviene, VolantinoFacile, PromoQui e altri aggregatori ShopFully (termini: uso solo personale e non commerciale, divieto di copia e di strumenti automatici). Gli aggregatori si possono usare solo per sapere quali volantini esistono; il PDF si prende dalla catena, che è la fonte originale.

**Motivo.** Le offerte sono il dato più utile per il budget e il più volatile. Conad e GROS coprono la maggior parte dei supermercati entro 2 km dalla zona dell'utente e pubblicano il PDF con un pulsante di download.

**Regole di dominio.**
- Ogni offerta ha `catena`, `ambito` (regione o punto vendita), `prodotto`, `prezzo offerta`, `prezzo pieno` se indicato, `condizioni` (carta fedeltà, 3x2, quantità minima), `valida dal`, `valida al`, `fonte` (URL del volantino) e `data di estrazione`.
- Un'offerta conta solo nel suo periodo; scaduta, sparisce dal calcolo ma resta nello storico.
- Le offerte con condizioni (es. "con carta") si mostrano con la condizione e non si applicano se l'utente non la soddisfa (preferenza da chiedere).
- Priorità dei prezzi aggiornata (sostituisce quella di D3): **offerta valida nel negozio scelto** → prezzo dell'utente nel negozio scelto → prezzo dell'utente in un altro negozio (segnalato) → stima Osservaprezzi (solo freschi) → nessun prezzo.

**Conseguenze tecniche.**
- Job nel backend (comando `ace` da cron): una volta al giorno controlla i volantini dei negozi preferiti dell'utente, scarica solo quelli nuovi, li legge con Claude Opus 5.5 (D4; i PDF si inviano come documento) e salva le offerte come **proposte**. L'utente le vede marcate "da volantino" e può correggerle.
- Conad: id del punto vendita (`anacanId`) dalla pagina del negozio; elenco volantini e URL dei PDF dai metadati della pagina `conad.it/volantini/<slug>?anacanId=<id>`. GROS: pagina `cedigros.com/promozioni/<insegna>/...`, link "Scarica in PDF".
- Richieste minime e identificate (User-Agent con contatto), cache per URL, nessun recupero di volantini già letti. Il formato delle pagine può cambiare: il parser va testato su pagine salvate e deve fallire in modo esplicito.
- I PDF restano sul server solo per il tempo dell'estrazione; si conservano le offerte, non i volantini. In sviluppo stanno in `data/volantini/`, esclusa da git.
- **Visualizzatori web** (punto 2): un browser headless nel backend (Playwright, nello stesso container) apre la pagina ufficiale del volantino, attende il caricamento, salva uno screenshot per pagina e invia le immagini a Claude Opus 5.5 come per le foto degli scontrini. Le immagini si cancellano dopo l'estrazione. Frequenza minima (una volta per volantino nuovo), User-Agent identificato. Il visualizzatore Penny è un componente ShopFully incorporato nel sito Penny: si legge solo dalla pagina penny.it, mai dai domini ShopFully, e solo per uso personale.
- Costo: circa $0,30 per un volantino di 20 pagine (D4); con 4–6 volantini nuovi a settimana, circa $5–8 al mese. Da ridurre leggendo solo le pagine di alimentari e casa.

**Prima dell'implementazione.**
- Rileggere nel testo originale i termini d'uso di conad.it e cedigros.com (finora verificati solo footer e robots.txt).
- Se l'app diventa pubblica, il recupero automatico per più utenti va rivalutato con le catene (o con ShopFully): è un'estrazione sistematica.

## Decisioni ancora aperte
- Fornitore del VPS (al primo deploy).
- Catene da verificare: In's, CRAI.
- Soglia di età dei prezzi e gestione delle offerte sugli scontrini (D3).
- Conservazione dei dati nell'API Anthropic (D5), prima della fase 2 degli scontrini.
