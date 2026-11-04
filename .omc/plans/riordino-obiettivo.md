# Piano: riordino verso l'obiettivo dell'app

**Stato:** approvato il 2026-11-04; fase 1 fatta (D19); fase 2 preparata (D20), manca il primo deploy con gli account dell'utente.

## Obiettivo e destinatari
L'app deve far spendere bene i soldi della spesa: **budget → negozio → cosa comprare (dieta equilibrata nel budget) → spesa in negozio → cucinare con ciò che si è comprato**, e ogni settimana farlo un po' meglio grazie ai prezzi veri. Decisione dell'utente del 2026-11-04: **uso personale e della famiglia, a Roma**. Niente scala, niente pubblico, fonti verificate per uso personale (D7, D15).

## Stato attuale (verificato sul codice il 2026-11-04)
| Pezzo del ciclo | Stato | Dove |
|---|---|---|
| Budget del periodo | fatto | `apps/web/src/features/spesa/Budget.tsx`, D12 |
| Negozi vicini | fatto, 775 a Roma dall'archivio | `apps/api/app/services/negozi/overpass.ts`, D17 |
| Prezzi: volantini | fatto, controllo settimanale | `apps/api/app/services/volantini/*`, D15 |
| Prezzi: stime | fatto, Osservaprezzi mensile | `apps/api/app/services/osservaprezzi/*`, D16 |
| Valori nutrizionali | fatto, CIQUAL | `packages/domain/src/nutrizione.ts`, D16 |
| Lista con l'IA | fatto | `apps/api/app/services/spesa_ia/*`, `packages/domain/src/spesaIa.ts`, D18 |
| Spesa in negozio | parziale: lista spuntabile, **solo online** | `DettaglioLista.tsx` |
| Prezzi veri dopo la spesa | parziale: prezzo inserito a mano, **ignorato dalla lista IA** | `prezzi_repository.ts`, `opzioni.ts` |
| Carte fedeltà | tabella `condizioni_utente` **mai usata**; la lista IA conta prezzi "con carta" anche senza carta | `opzioni.ts:129,154` |
| **Ricette** | **assenti** (terzo pilastro del prodotto) | – |
| App sul telefono | **solo sul PC** dello sviluppatore; il controllo settimanale gira solo ad API accesa | D6 non attuato |

Numeri: 231 test (63 dominio, 120 API, 48 web), 4.660 offerte su Turso, 62% delle offerte alimentari riconosciute come alimento.

## RALPLAN-DR
**Principi**
1. Ogni funzione deve servire un passo del ciclo settimanale; ciò che non serve a una famiglia di Roma si toglie.
2. Un prezzo mostrato deve essere quello che la famiglia pagherà davvero, o dichiararsi stima.
3. Una sola regola di prezzo in tutta l'app (`risolviPrezzo`), non due percorsi che danno numeri diversi.
4. L'app va usata davvero (sul telefono, in negozio) prima di aggiungere altro: l'uso reale decide le priorità.

**Fattori decisivi**
1. Senza messa online l'app non si usa e non accumula prezzi veri.
2. La fiducia nei totali: oggi la lista IA ignora prezzi pagati e carte fedeltà.
3. Il terzo pilastro (ricette) manca del tutto.

**Opzioni considerate**
- **A. Prima completare le funzioni (ricette), poi la messa online.** Pro: prodotto "completo" subito. Contro: si costruisce senza uso reale; i prezzi restano stime e offerte non verificate per settimane.
- **B. Prima pulizia e messa online, poi verità dei prezzi, uso in negozio, ricette (scelta).** Pro: dalla seconda settimana la famiglia usa l'app e i prezzi pagati migliorano le liste; le ricette arrivano su dati veri (cosa si è comprato davvero). Contro: le ricette arrivano per ultime.
- **C. Riscrivere come app nativa (Expo).** Scartata: la PWA già copre posizione e installazione; il vault non copre Expo; nessun bisogno nativo emerso.

## Decisioni strutturali
1. **Copertura: solo Roma, solo archivio.** Si toglie la ricerca dal vivo su OpenStreetMap nella PWA (Overpass e ripiego Nominatim, unione dei risultati, avvisi "archivio-solo"): i 775 negozi aggiornati ogni settimana bastano. Resta Nominatim solo per trasformare città/CAP in posizione.
2. **Una sola guardia di accesso: la sessione.** Si toglie la guardia a token (`config/auth.ts:17`), la tabella `auth_access_tokens` e il codice relativo; il controller `access_tokens_controller.ts` diventa `sessione_controller.ts`.
3. **Una sola regola di prezzo.** La lista IA (`opzioni.ts`) passa da `risolviPrezzo` del dominio, con le stesse priorità del dettaglio lista: offerta valida *applicabile* → prezzo pagato dall'utente in quel negozio → stima. I prezzi pagati entrano nelle proposte.
4. **Carte fedeltà vere.** In "I miei negozi" si indica per catena se si ha la carta (`condizioni_utente`, già esistente). Le offerte con condizione di carta valgono solo per chi ce l'ha; le altre condizioni (3x2, "il secondo a metà") si mostrano ma non cambiano il prezzo calcolato.
5. **L'alimento lo dice chi legge il volantino.** Nella lettura dei volantini il modello indica anche il codice dell'alimento generico, scelto dall'elenco dei 127 (classificazione, non calcolo: compatibile con D4). Nuova colonna `offerte.alimento_codice`; l'abbinamento per parole (`alimentoDaNome`) resta come ripiego. Le 4.660 offerte esistenti si classificano una volta in blocchi (stima circa $1-2).
6. **Online su un piccolo server UE** (D6): API + PWA con Docker Compose e Caddy, database già su Turso, controllo settimanale sempre attivo, email vere con Resend. Il fornitore lo sceglie l'utente al momento (decisione aperta in D6).
7. **Tetto di spesa per il modello.** Massimo mensile configurabile (es. 10 $), calcolato da `richieste_llm`; oltre, niente letture di volantini né proposte, e l'app lo dice.
8. **La schermata principale è "questa settimana"**: budget che resta, lista attiva spuntabile anche offline, "Prepara la lista". Negozi e account passano in secondo piano; si aggiunge la scheda "Cucina" con le ricette.

## Cosa si toglie
| Cosa | Perché | Dove |
|---|---|---|
| Ricerca dal vivo su OSM nella PWA (Overpass, ripiego Nominatim, unione, `localitaDaPosizione`) | inutile a Roma con l'archivio; lenta | `apps/web/src/features/negozi/osm.ts`, `NegoziVicini.tsx:81-110`, `catalogo.ts` (`unisciRisultati`, `copreArea`) |
| `negoziDaNominatim` e relativi test nel dominio | serviva solo al ripiego | `packages/domain/src/negozi.ts` |
| Guardia a token e tabella `auth_access_tokens` | la PWA usa la sessione (D16) | `config/auth.ts`, modello `user.ts`, migrazione nuova di rimozione |
| Comando `volantini:impronte` | recupero una tantum già fatto su tutti i 15 volantini | `apps/api/commands/volantini_impronte.ts` |
| Rotta `GET /` "hello world" | residuo dello starter kit | `apps/api/start/routes.ts:15` |
| Piani superati | `lista-ia.md` è completato; `database-schema.md` va riallineato | `.omc/plans/` |
| Penny (visualizzatore), caricamento a mano Coop/NaturaSì, scontrini | mai costruiti; il volantino Coop letto non vale per le Coop di Roma; scontrini già scartati (D16) | D7: segnare come abbandonati |

Si **tengono**: lettura dei volantini, controllo settimanale, archivio negozi, Osservaprezzi, CIQUAL, lista IA, liste a mano (servono a correggere la lista IA), prezzi inseriti a mano (diventano "prezzo pagato").

## Cosa si aggiunge, a fasi

### Fase 1 · Pulizia (piccola)
- Togliere quanto in tabella; aggiornare `CLAUDE.md` (sezione Struttura: auth a sessione, negozi dall'archivio) e D7/D10/D17.
- **Criteri:** `npm test` verde; nessun riferimento a `tokensGuard`, `negoziDaNominatim`, `cercaNegoziVicini` nel codice (`grep` vuoto); la ricerca a CAP 00147 dà gli stessi 29 negozi di oggi.

### Fase 2 · Messa online
> Aggiornamento del 2026-11-04 (D20): gratis su Render (un solo servizio che serve anche la PWA, niente Caddy né DuckDNS) e controllo settimanale su GitHub Actions al posto del pianificatore nell'API.

- `Dockerfile` per API (build `node ace build`) e PWA (statica servita da Caddy), `docker-compose.yml`, `Caddyfile` con HTTPS; variabili da `.env` sul server; `WEB_URL` reale.
- Chiave Resend (la crea l'utente) e controllo settimanale attivo (`CONTROLLO_VOLANTINI=true`, `DB_CONNECTION=libsql`).
- Tetto mensile di spesa del modello (decisione 7), con test.
- **Criteri:** la PWA si installa sul telefono dall'indirizzo pubblico; registrazione con email di conferma ricevuta; un controllo settimanale registrato in `controlli_volantini` senza intervento; con il tetto superato `POST /liste/proposta` risponde con un messaggio chiaro e nessuna chiamata al modello (test).

### Fase 3 · Prezzi veri
- Decisione 3: `opzioni.ts` usa i prezzi pagati e la stessa priorità di `risolviPrezzo`.
- Decisione 4: carte fedeltà per catena nella PWA; filtro delle offerte condizionate.
- Decisione 5: `alimento_codice` letto dal modello; classificazione delle offerte esistenti; `alimentoDaNome` come ripiego.
- "Prezzo sbagliato" su una voce di lista: segna l'offerta `scartata` (non entra più nei calcoli).
- **Criteri (test):** un prezzo pagato più basso di un'offerta non applicabile vince nella proposta; un'offerta "con carta" non conta senza la carta e conta con la carta; un'offerta scartata non compare nelle opzioni; offerte alimentari riconosciute ≥ 85% (oggi 62%), misurate con lo stesso conteggio di oggi.

### Fase 4 · In negozio
- Schermata principale "questa settimana" (decisione 8).
- Lista attiva disponibile **offline**: copia nel dispositivo, spunte e prezzi pagati in coda, inviati al ritorno della rete (vedi note PWA del vault: `PWA - Index`).
- Alla spunta, campo rapido "prezzo pagato" (facoltativo) che alimenta i prezzi veri.
- **Criteri:** con la rete staccata (DevTools offline) la lista si apre, si spunta e si inserisce un prezzo; tornata la rete i dati arrivano all'API (test web sulla coda; prova nel browser); la lista è a un tocco dall'apertura dell'app.

### Fase 5 · Ricette
- Scheda "Cucina": ricette dalla lista conclusa o dalle voci spuntate. Il modello propone piatti mediterranei usando **prima** gli ingredienti comprati; per ogni ingrediente mancante il dominio calcola il costo (dalle opzioni del negozio) e l'app lo mostra (regola di prodotto). Nessuna quantità nutrizionale calcolata dal modello (D4).
- Registro in `richieste_llm` (`scopo = 'ricetta'`, già previsto), tetto di spesa incluso.
- **Criteri (test con pianificatore finto):** le ricette usano solo ingredienti comprati o segnati come mancanti con il loro costo; un ingrediente inventato si scarta; le porzioni rispettano le persone delle preferenze.

## Rischi e mitigazioni
| Rischio | Mitigazione |
|---|---|
| La pulizia rompe la ricerca negozi | criterio della fase 1 sul CAP 00147; test web su `catalogo.ts` |
| Rimuovere la tabella dei token perde dati | non contiene nulla di utile (la PWA non crea token dal 2026-11-03); migrazione con `down` che la ricrea |
| Costi del modello fuori controllo una volta online | tetto mensile (decisione 7) prima di attivare il controllo sul server |
| Classificazione dell'alimento sbagliata dal modello | si accetta solo un codice dell'elenco; ripiego per parole; "prezzo sbagliato" scarta l'offerta |
| Offline con dati in conflitto (spunta su due telefoni) | vince l'ultima modifica per voce; caso raro in famiglia, documentato |
| Fornitore del server non ancora scelto | decisione dell'utente all'inizio della fase 2; i file Docker non dipendono dal fornitore |

## Verifica complessiva
- Dopo ogni fase: `npm test`, lint e tipi verdi; voce in `docs/decisioni.md`; commit separato.
- Prova in fondo al piano, sul telefono: impostare il budget, preparare la lista, andare al negozio offline, spuntare con un prezzo pagato, chiudere la lista, ottenere tre ricette con gli ingredienti comprati e il costo di quelli mancanti.

## ADR
- **Decisione:** riordinare il progetto per uso familiare a Roma: togliere ricerca OSM dal vivo e guardia a token, una sola regola di prezzo con prezzi pagati e carte fedeltà, alimento indicato dal modello in lettura, messa online con tetto di spesa, lista offline, ricette per ultime.
- **Fattori:** usare l'app davvero; fiducia nei totali; pilastro ricette mancante.
- **Alternative:** prima le ricette (A); app nativa (C).
- **Perché:** l'uso reale produce i prezzi veri che rendono utili sia le liste sia le ricette; la pulizia riduce il codice da mantenere senza togliere valore a Roma.
- **Conseguenze:** fuori Roma l'app non trova negozi; un piccolo costo mensile di server; le ricette arrivano dopo 4 fasi.
- **Seguiti:** costo al km regolabile; città metropolitana se serve; diete e intolleranze (dati sulla salute, D5).
