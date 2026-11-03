# Organizzatore lista della spesa e ricette

## Il prodotto
App per telefono che gestisce i soldi della spesa:
- organizza **cosa comprare in base al budget** e ai **supermercati vicini** alla posizione dell'utente;
- considera **prezzi e prodotti in offerta** di quei supermercati (conta *quali* prodotti hanno, non le quantità in magazzino);
- genera **ricette con gli ingredienti acquistati**;
- obiettivo: una **dieta il più equilibrata possibile compatibilmente con il budget**.

Regole di dominio (vincolanti):
- **Il budget decide tipo e qualità dei prodotti.** L'app non deve privilegiare per forza prodotti freschi o "sani": a budget basso sono legittimi surgelati, scatolame, marche economiche, discount.
- L'equilibrio nutrizionale è un obiettivo da massimizzare *dentro* il budget, non un vincolo che lo sfora. Quando budget ed equilibrio sono in conflitto, vince il budget e l'app lo dice in modo chiaro.
- Le ricette usano prima gli ingredienti già comprati; un ingrediente mancante va segnalato con il suo costo.
- Prezzi e offerte hanno sempre una **fonte e una data**: un prezzo senza data è un'ipotesi e va mostrato come tale.

## Knowledge base: vault "Dev Knowledge"
Percorso: `C:\Users\Stefano Moretti\Vaults\Dev Knowledge`. Entry point: `Index.md`.
Le note hanno nomi univoci: puoi cercarle per nome con Glob (`**/<Nome nota>.md`).

**Prima di progettare, scrivere o rivedere codice o UI, leggi le note indicate qui sotto per il compito in corso.** Non leggere tutto il vault: apri solo ciò che serve. Le istruzioni dell'utente vincono sempre sul vault. Se una nota è datata o contraddetta da documentazione più recente, dillo e proponi di aggiornarla.

### Per ogni compito
| Compito | Note da leggere |
|---|---|
| Qualsiasi implementazione | `TDD`, poi la checklist dello stack scelto |
| Revisione del codice | `Code review` + checklist dello stack |
| Commit e versioni | `Git e versionamento` |
| Schermate e componenti UI | `Processo di design`, `Modalità di superficie`, `App screen e dashboard`, poi i fondamenti necessari (`Layout e spaziatura`, `Tipografia`, `Colore`, `Motion`, `Copy UX`, `Design tokens`) |
| Form (budget, preferenze, filtri) | `Form`, `Accessibilità e interazione` |
| Liste, prezzi, stati vuoti / errore / offline | `Stati e contenuti limite`, `Performance` |
| Prima di consegnare UI | `Checklist pre-consegna`, `Tell di AI slop`, `Divieti assoluti` |

### Per stack
| Se il progetto usa… | Note |
|---|---|
| React (app o PWA) | `React - Index` e collegate, `React - Checklist` |
| PWA (manifest, service worker, offline, posizione, fotocamera) | `PWA - Index` e collegate, `PWA - Checklist` |
| Vue | `Vue - Index` e collegate, `Vue - Checklist` |
| Backend AdonisJS | `AdonisJS - Index` e collegate, `AdonisJS - Checklist` |
| Script di raccolta dati in Python | `Python - Index` e collegate, `Python - Checklist` |
| Container / deploy | `Docker - Index`, `Docker - Checklist` |
| JavaScript / CSS senza framework | `JavaScript moderno`, `CSS moderno`, `HTML semantico` |

### Modalità di design
L'app è una superficie **Operate** (l'utente completa compiti: impostare il budget, scegliere il supermercato, seguire la lista, cucinare). Applica le regole di `App screen e dashboard`:
- il colore va sui dati (prezzo, risparmio, sforamento del budget), non sulla cornice;
- numeri con `tabular-nums` e allineati a destra, valute con `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })`;
- il compito più frequente (vedere o spuntare la lista) è a un tocco dal primo schermo;
- uso in negozio, con una mano: target ≥ 44px, contrasto alto, leggibile anche in piena luce.

## Lacune note del vault
Il vault **non ha ancora note** su:
- **Expo / React Native** (non serve finché lo stack resta PWA);
- mappe (la geolocalizzazione di base è in `PWA - Capacità e limiti per piattaforma`);
- uso di LLM nell'app (generazione delle ricette).

Quando il lavoro arriva su uno di questi temi: usa la documentazione ufficiale corrente, e **proponi all'utente di aggiungere la sezione al vault** con il metodo descritto nella nota `Da fare - altri stack`. Non scrivere nel vault senza conferma.

## Primo compito: decisioni aperte
Prima di scrivere codice, chiarisci con l'utente e documenta in `docs/decisioni.md`:

1. **Stack mobile.** **Deciso (D2 in `docs/decisioni.md`): PWA React + Vite + Tailwind 4, backend AdonisJS 7.** Database SQLite, monorepo `apps/web` + `apps/api` + `packages/domain`, hosting su VPS UE con Docker Compose e Caddy (D6). Opzioni valutate in origine:
   - PWA con React + Vite: coperta dal vault, nessuno store, accesso a GPS limitato al browser;
   - Expo / React Native: app nativa, non coperta dal vault;
   - backend AdonisJS (coperto dal vault) per aggregare prezzi e chiamare l'LLM, oppure nessun backend.
2. **Fonti dei dati.** **Deciso (D1 in `docs/decisioni.md`): per ora i prezzi vengono solo da Osservaprezzi**, come stima provinciale dei prodotti freschi. I prodotti fuori paniere hanno prezzi inseriti dall'utente, poi letti dagli scontrini (D3). Offerte dai PDF ufficiali di Conad, GROS, Todis, Elite e NaturaSì, lettura automatica del visualizzatore web per Penny (solo uso personale), caricamento manuale per le altre catene, mai dagli aggregatori ShopFully (D7). Ricerca già fatta il 2026-11-02: leggi `docs/ricerca-fonti-dati.md` (non esistono API ufficiali dei prezzi; strategia a strati con scontrini e volantini caricati dall'utente). Riverifica solo ciò che è segnato come non confermato. Punti di partenza originali della ricerca:
   - *Supermercati vicini*: valutare OpenStreetMap (Overpass API, `shop=supermarket`) e alternative.
   - *Prodotti e prezzi per punto vendita, incluse le offerte*: verificare se esistono API ufficiali delle catene italiane, aggregatori di volantini, dataset aperti o servizi a pagamento. Per ognuno: copertura in Italia, costo, aggiornamento, **termini d'uso**.
   - *Valori nutrizionali*: valutare Open Food Facts.
   - **Vincolo legale**: niente scraping che violi i termini d'uso dei siti. Se una fonte lo vieta, scartala e dillo. Se non esiste una fonte affidabile, proponi alternative (es. inserimento manuale o foto dello scontrino) invece di inventare dati.
3. **Generazione ricette**: **Deciso (D4 in `docs/decisioni.md`): Claude Opus 5.5 per ricette e scontrini; l'LLM non calcola mai prezzi, totali o valori nutrizionali.** Domande originali: quale modello e quale API usare, quanto costa ogni richiesta, come vincolare l'output agli ingredienti acquistati e al budget. Per i modelli Claude consulta la skill `claude-api` (modelli correnti, costi, caching).
4. **Dati personali**: **Deciso (D5 in `docs/decisioni.md`): le coordinate restano sul telefono, arrotondate e mai salvate; foto degli scontrini cancellate dopo la conferma; preferenze alimentari trattate come dati sulla salute.** Regola originale: la posizione è un dato sensibile. Chiedila solo quando serve, non salvarla se non necessario, spiega all'utente perché la usi.

## Struttura e comandi
Monorepo npm workspaces (D6), Node ≥ 24.

| Cartella | Contenuto | Test |
|---|---|---|
| `packages/domain` (`@spesa/domain`) | logica pura: scelta del prezzo (`risolviPrezzo`, priorità D7), totale della lista (`totaleLista`). Importi in **centesimi interi** | Vitest |
| `apps/web` (`@spesa/web`) | PWA React 19 + Vite 8 + Tailwind 4 + vite-plugin-pwa (`registerType: 'prompt'`). Funzioni in `src/features/`: `negozi/` cerca i supermercati vicini direttamente su OSM e li mostra su una mappa Leaflet con tile OSM, non in cache (D10); `account/` gestisce accesso e token; "I miei negozi" salvati via API (D11); `spesa/` budget del periodo e liste con prezzi (D12). Schede in `#spesa` e `#negozi`. Client API in `src/lib/api.ts` | Vitest |
| `apps/api` (`@spesa/api`) | AdonisJS 7, starter kit API, auth con access token. Database: SQLite locale (`tmp/db.sqlite3`) in sviluppo e test, Turso in produzione con `DB_CONNECTION=libsql` + `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` (D8) | Japa |
| `data/volantini/` | PDF dei volantini per prove e fixture, esclusi da git | – |

Database: schema in `.omc/plans/database-schema.md` (D9), migrazioni in `apps/api/database/migrations/`, a fasi. Fase 1 fatta (negozi, prodotti, prezzi utente, budget per periodo, liste). Modelli in `apps/api/app/models/`: dichiarano sempre `static table` (i nomi sono italiani). I test API usano `tmp/test.sqlite3`.

Comandi dalla radice:
- `npm test`: tutti i test.
- `npm run dev:web` (Vite, proxy `/api` → `localhost:3333`) e `npm run dev:api`.
- `npm run build`: dominio, poi web, poi API.
- Da `apps/api`, con `DB_CONNECTION=libsql` per Turso: `node ace volantini:leggi [--rileggi] <pdf…>` (D13), `node ace volantini:controlla` (controllo dei volantini nuovi, D15; lo fa da solo il server con `CONTROLLO_VOLANTINI=true`), `node ace negozi:importa` (tutti i supermercati di Roma, D14 e D17), `node ace osservaprezzi:importa` (medie mensili, D16), `node ace nutrizione:importa` (CIQUAL e alimenti italiani da `apps/api/database/data/`, D16). Leggere volantini costa circa $1 l'uno.
- Lista preparata dall'IA (D18): `POST /api/v1/liste/proposta`, il modello sceglie alimenti e grammi, il dominio (`spesaIa.ts`) prezzi, budget e nutrizione, il telefono sceglie il negozio. Nei test si usa `usaPianificatore` con un pianificatore finto.
- Account (D16): sessione in cookie `httpOnly` (guardia `web`), niente token nella PWA. Email con Resend (`RESEND_API_KEY`); senza chiave i link finiscono nel log del server.
- Dopo una modifica a `packages/domain`, ricompila (`npm run build -w @spesa/domain`) prima di usarla dall'API: l'API importa `dist/`.

## Regole di lavoro
- TDD per la logica di dominio: ottimizzazione della lista sul budget, calcolo dei totali, abbinamento ricette-ingredienti. È la parte da testare meglio.
- Logica di dominio pura e separata da UI e fonti dati, così le fonti dei prezzi si possono sostituire.
- Nessun dato inventato presentato come reale (prezzi, offerte, valori nutrizionali). I dati di esempio sono marcati come tali.
- Segreti (chiavi API) solo in variabili d'ambiente, mai nel codice o in questo file.
