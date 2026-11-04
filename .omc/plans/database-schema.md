> **Nota del 2026-11-04:** fasi 1 e 2 realizzate; lo schema reale è nelle migrazioni di `apps/api/database/migrations/` e in `apps/api/database/schema.ts`. Aggiunte rispetto al piano: `controlli_volantini`, `volantini.impronte`, `rate_limits`, `stime_osservaprezzi` con `import_osservaprezzi`, `alimenti` e `alimenti_it`, colonne della lista IA; tolta `auth_access_tokens` (D19). Le ricette (fase 3) restano da fare.

# Piano: struttura del database

**Stato: fase 1 completata (2026-11-02)**, approvata dall'utente. Fasi 2–4 da fare. Deviazione dal piano: niente factory al passo 5, i test creano i dati con i modelli (dati marcati come esempio).
Data: 2026-11-02. Fonti dei requisiti: `docs/decisioni.md` (D1–D8), `CLAUDE.md`, `packages/domain/src/prezzi.ts`, `packages/domain/src/lista.ts`.

## 1. Requisiti

Scelte dell'utente in questa sessione:
- **Ambito**: progettare ora tutto il dominio deciso; creare le migrazioni **a fasi**, quando serve ogni funzione.
- **Budget**: **per periodo** (settimana o mese); le liste del periodo lo consumano.
- **Ricette**: **salvate**, collegate alla spesa, con flag **preferita**.

Vincoli dalle decisioni:
- Importi sempre in **centesimi interi** (`packages/domain/src/prezzi.ts:30`).
- Ogni prezzo ha **fonte e data** (CLAUDE.md, regole di dominio).
- D5: **nessuna coordinata dell'utente**, **nessuna foto** di scontrini, **nessun numero di carta / carta fedeltà / codice transazione**. Le preferenze alimentari sono dati sulla salute.
- D7: i PDF dei volantini non si conservano; si conservano le offerte. Un volantino già letto non si rilegge.
- D4: l'LLM non calcola prezzi né totali; il registro costi contiene solo token, modello, data.
- D6/D8: SQLite in locale e nei test, Turso in produzione. Le migrazioni devono girare identiche su entrambi.

Fatti sul codice esistente:
- Tabelle già presenti: `users`, `auth_access_tokens` (`apps/api/database/migrations/1761885935168_create_users_table.ts`, `1768620764696_create_access_tokens_table.ts`).
- Convenzioni dello starter kit: `table.increments('id')`, `created_at` / `updated_at` come `timestamp`, colonne in snake_case (`create_users_table.ts:8-14`).
- I modelli estendono le classi generate in `apps/api/database/schema.ts` (es. `app/models/user.ts:7`), rigenerate da `node ace migration:run`.
- Tipi di dominio da alimentare: `Prezzo`, `Negozio`, `VoceLista` (`packages/domain/src/prezzi.ts:20-41`, `lista.ts:3-7`).

## 2. Convenzioni

| Tema | Regola |
|---|---|
| Nomi | tabelle e colonne del dominio in italiano, snake_case, plurale (`negozi`, `prezzi_utente`), coerenti con `@spesa/domain`. `users` resta com'è. |
| Chiavi | `increments('id')`; FK `<entità>_id` con `references().inTable()` |
| Importi | `integer` `*_centesimi`, `CHECK >= 0` |
| Giorni di calendario | colonna `date` (in SQLite testo `AAAA-MM-GG`), come `DataIso` del dominio |
| Istanti | `timestamp` `created_at` / `updated_at` come lo starter kit |
| Enum | `table.enum(...)` (in SQLite diventa un `CHECK`) |
| Dati condivisi vs personali | catalogo e dati pubblici **senza** `user_id`; dati dell'utente **con** `user_id` e `onDelete('CASCADE')`, così la cancellazione dell'account (vincolo futuro di D5) cancella tutto |

## 3. Schema per fase

### Fase 1: negozi, prodotti, prezzi manuali, budget e liste (MVP)

**`catene`** (condivisa)
- `codice` string unique (`conad`, `todis`, …), `nome`
- `modalita_offerte` enum `pdf | visualizzatore | manuale | link | esclusa` (D7)
- `url_volantini` nullable

**`negozi`** (condivisa, dati pubblici OSM)
- `osm_id` string unique (es. `node/123456`), `catena_id` FK nullable
- `nome`, `indirizzo` nullable, `comune`, `provincia` (sigla, 2 caratteri)
- `lat`, `lon` decimal: posizione **del negozio**, pubblica su OSM. Non è la posizione dell'utente (D5).
- `aggiornato_il` timestamp

**`negozi_utente`** (i "miei negozi")
- `user_id` FK, `negozio_id` FK, PK composta
- `codice_punto_vendita` nullable (es. `anacanId` Conad, D7)

**`preferenze_utente`** (1:1 con `users`)
- `user_id` PK/FK, `provincia` nullable (per Osservaprezzi, D1)

**`condizioni_utente`**
- `user_id` FK, `catena_id` FK nullable, `condizione` string (es. `carta-fedelta`); unique (`user_id`, `catena_id`, `condizione`)
- Alimenta `condizioniUtente` di `risolviPrezzo` (`prezzi.ts:47`). **Non** contiene il numero della carta.

**`prodotti`**
- `nome`, `marca` nullable, `categoria` nullable
- `codice_off` string unique nullable (codice a barre Open Food Facts)
- `quantita_confezione` decimal nullable, `unita` enum `g | ml | pz` nullable (per il prezzo al kg/l, D3)
- `creato_da_user_id` FK nullable: `null` = catalogo comune, altrimenti prodotto creato da un utente

**`prezzi_utente`** (D3)
- `user_id` FK, `prodotto_id` FK, `negozio_id` FK
- `centesimi` integer ≥ 0, `data` date
- `fonte` enum `manuale | lista | scontrino`; `scontrino_id` FK nullable (aggiunta in fase 4)
- indice (`user_id`, `prodotto_id`, `negozio_id`, `data`). Lo storico non si sovrascrive (D3).

**`periodi_budget`**
- `user_id` FK, `dal` date, `al` date, `budget_centesimi` integer ≥ 0
- unique (`user_id`, `dal`); `CHECK (al >= dal)`. La sovrapposizione tra periodi si controlla nel validatore (non esprimibile come vincolo in SQLite).

**`liste`**
- `user_id` FK, `periodo_budget_id` FK nullable, `negozio_id` FK nullable
- `nome`, `stato` enum `bozza | in_corso | conclusa`, `data_spesa` date nullable

**`voci_lista`**
- `lista_id` FK `CASCADE`, `prodotto_id` FK
- `quantita` integer, `CHECK (quantita > 0)` (come `totaleLista`, `lista.ts:22`)
- `spuntata` boolean default false, `prezzo_pagato_centesimi` nullable
- unique (`lista_id`, `prodotto_id`)
- A lista conclusa, i prezzi pagati diventano righe di `prezzi_utente` con `fonte = lista`.

### Fase 2: offerte, volantini, stime Osservaprezzi

**`volantini`** (condivisa)
- `catena_id` FK, `titolo`, `ambito` enum `catena | regione | punto_vendita`, `regione` nullable, `negozio_id` FK nullable
- `url_fonte`, `hash_contenuto` string unique (SHA-256 del PDF o delle pagine: non rileggere lo stesso volantino, D7)
- `valido_dal` date, `valido_al` date, `CHECK (valido_al >= valido_dal)`
- `stato` enum `da_leggere | letto | errore`, `errore` text nullable, `letto_il` timestamp nullable
- Il PDF **non** si salva (D7).

**`offerte`** (condivisa)
- `volantino_id` FK nullable (null = inserita a mano), `catena_id` FK, `negozio_id` FK nullable
- `prodotto_id` FK nullable (null finché non è abbinata a un prodotto), `descrizione_volantino` text
- `centesimi`, `prezzo_pieno_centesimi` nullable, `condizione` nullable (es. `carta-fedelta`, `3x2`)
- `valido_dal`, `valido_al` date
- `stato` enum `proposta | confermata | scartata`: solo le confermate entrano nei prezzi (D4, D7)
- indice (`prodotto_id`, `catena_id`, `valido_al`)

**`stime_osservaprezzi`** (condivisa, D1)
- `voce` string (nome Osservaprezzi, es. "Petto di pollo (1000 gr)"), `tipologia` enum `altri_alim | orto | ittici | groc`
- `prodotto_id` FK nullable (abbinamento al catalogo)
- `provincia`, `anno`, `mese`, `min_centesimi`, `medio_centesimi`, `max_centesimi`
- unique (`voce`, `provincia`, `anno`, `mese`)

**`import_osservaprezzi`** (registro, per non ripetere le richieste)
- `provincia`, `anno`, `mese`, `tipologia`, `righe` integer, `esito` enum `ok | errore`, `eseguito_il`
- unique (`provincia`, `anno`, `mese`, `tipologia`)

### Fase 3: ricette, dieta, registro LLM

**`richieste_llm`** (D4, D5)
- `user_id` FK nullable (null per i job, es. lettura volantini), `scopo` enum `ricetta | scontrino | volantino`
- `modello`, `token_input`, `token_output`, `token_cache_lettura`, `stop_reason`, `esito` enum `ok | rifiuto | errore`
- **Nessun** contenuto del prompt o della risposta (D5).

**`valori_nutrizionali`** (1:1 con `prodotti`)
- `prodotto_id` PK/FK, per 100 g/ml: `kcal`, `proteine`, `carboidrati`, `zuccheri`, `grassi`, `grassi_saturi`, `fibre`, `sale`
- `fonte` (`open_food_facts`), `aggiornato_il`. Mai dall'LLM (D4).

**`preferenze_alimentari`** (dati sulla salute, D5)
- `user_id` FK `CASCADE`, `tipo` enum `allergia | intolleranza | dieta | esclusione`, `valore` string
- unique (`user_id`, `tipo`, `valore`)

**`ricette`**
- `user_id` FK, `lista_id` FK nullable (`SET NULL`), `richiesta_llm_id` FK nullable
- `titolo`, `porzioni` integer, `tempo_minuti` nullable, `istruzioni` text (passi in JSON)
- `preferita` boolean default false

**`ingredienti_ricetta`**
- `ricetta_id` FK `CASCADE`, `prodotto_id` FK nullable, `descrizione`, `quantita_testo`
- `mancante` boolean; `costo_stimato_centesimi` nullable, **calcolato dal dominio**, non dall'LLM (D4)

### Fase 4: scontrini (D3 fase 2)

**`scontrini`**
- `user_id` FK, `negozio_id` FK nullable, `data` date, `totale_centesimi` nullable
- `stato` enum `da_confermare | confermato | scartato`, `richiesta_llm_id` FK nullable
- **Nessuna** foto, carta o codice transazione (D5).

**`righe_scontrino`**
- `scontrino_id` FK `CASCADE`, `descrizione`, `prodotto_id` FK nullable
- `quantita`, `centesimi`, `sconto_centesimi` nullable, `confermata` boolean
- Alla conferma diventano `prezzi_utente` con `fonte = scontrino` e `scontrino_id` valorizzato.

## 4. Dal database al dominio

Un servizio `apps/api/app/services/prezzi_repository.ts` restituisce `Prezzo[]` (`prezzi.ts:20`) per prodotto e negozio, unendo:
- `prezzi_utente` → `fonte: 'utente'`, `negozioId`, `data`
- `offerte` con `stato = confermata` → `fonte: 'offerta'`, `catena`, `negozioId?`, `validoDal`, `validoAl`, `condizione?`, `data = valido_dal`
- `stime_osservaprezzi` della provincia dell'utente → `fonte: 'stima'`, `centesimi = medio_centesimi`, `data` = primo giorno del mese

La scelta del prezzo resta in `risolviPrezzo`: il database non decide priorità.

## 5. Passi di implementazione (fase 1)

1. `apps/api/eslint.config.js`: escludere `database/schema.ts`, file generato (oggi viene riformattato dal lint).
2. **Test prima** (`apps/api/tests/functional/database/*.spec.ts`, Japa con `testUtils.db().withGlobalTransaction()`):
   - vincoli: `quantita = 0` rifiutata; importo negativo rifiutato; `al < dal` rifiutato; `osm_id` duplicato rifiutato;
   - cascade: cancellare un utente cancella `negozi_utente`, `prezzi_utente`, `periodi_budget`, `liste`, `voci_lista`, `condizioni_utente`;
   - le FK sono **attive** (inserire `voci_lista` con `lista_id` inesistente fallisce).
3. Migrazioni in `apps/api/database/migrations/`, una per tabella, in ordine di dipendenza: `catene`, `negozi`, `prodotti`, `preferenze_utente`, `condizioni_utente`, `negozi_utente`, `prezzi_utente`, `periodi_budget`, `liste`, `voci_lista`.
4. `node ace migration:run` per rigenerare `database/schema.ts`; modelli in `app/models/` (`Catena`, `Negozio`, `Prodotto`, `PrezzoUtente`, `PeriodoBudget`, `Lista`, `VoceLista`, …) con le relazioni.
5. Factory in `database/factories/` per i test, con dati **marcati come esempio** (CLAUDE.md).
6. `prezzi_repository.ts` + test che riprende i casi di `packages/domain/src/prezzi.test.ts` su dati veri del database.
7. Migrazioni su Turso: `DB_CONNECTION=libsql node ace migration:run --force`, poi `migration:status`.
8. Aggiornare `docs/decisioni.md` (nuova D9: schema) e la tabella di CLAUDE.md.

Le fasi 2–4 ripetono i passi 2–4 e 7 quando inizia la funzione relativa.

## 6. Criteri di accettazione

- [ ] `node ace migration:run` e `migration:rollback --batch=0` completano senza errori su SQLite locale **e** su Turso.
- [ ] `database/schema.ts` contiene una classe per ogni tabella della fase.
- [ ] Test Japa verdi per ogni vincolo `CHECK`, `UNIQUE`, FK e cascade elencati al passo 2.
- [ ] Test: le FK sono applicate sia con `better-sqlite3` sia con `libsql` (inserimento orfano rifiutato).
- [ ] `prezzi_repository` restituisce `Prezzo[]` che, passati a `risolviPrezzo`, danno gli stessi risultati dei casi in `prezzi.test.ts`.
- [ ] Test di guardia: nessuna colonna chiamata `lat`/`lon`/`latitudine`/`longitudine` fuori da `negozi`; nessuna colonna `foto`, `immagine`, `numero_carta`, `pan`, `prompt`, `risposta` in nessuna tabella (D5).
- [ ] `npm test`, `npm run typecheck` e `npm run lint` verdi dalla radice.

## 7. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| SQLite non applica le FK senza `PRAGMA foreign_keys = ON`, e con Turso via HTTP il pragma potrebbe non valere per ogni richiesta | Test dedicato su entrambe le connessioni (criterio 4). Se fallisce su Turso: attivare il pragma per connessione con l'hook `afterCreate` del pool, o controllare l'esistenza nei servizi |
| SQLite ha `ALTER TABLE` limitato (cambiare tipo o vincoli richiede ricreare la tabella) | Fasi che **aggiungono** tabelle; colonne previste fin da ora quando note (es. `scontrino_id`, aggiunta in fase 4 come colonna nullable) |
| Il driver `@libsql/sqlite3` (D8) si comporta diversamente da `better-sqlite3` su tipi (date, boolean, decimal) | Test di andata e ritorno dei tipi su Turso; date come testo ISO, boolean come intero |
| Offerte condivise ma confermate da un solo utente | Accettabile finché l'uso è personale; se l'app diventa pubblica, conferme per utente in una tabella separata |
| Crescita di `stime_osservaprezzi` (64 province × 12 mesi × ~50 voci) | Si importa solo la provincia degli utenti (D1); ~600 righe l'anno per provincia |

## 8. Verifica

```bash
npm test
```
```bash
npm run typecheck -w @spesa/api
```
```bash
DB_CONNECTION=libsql node ace migration:status
```
Più la lettura di `database/schema.ts` e un controllo manuale su Turso che le tabelle della fase esistano.
