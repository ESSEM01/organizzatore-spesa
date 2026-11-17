# Mappa del progetto

Stato al 17 novembre 2026, ricavato da `docs/decisioni.md` (D1–D20), `CLAUDE.md`, `.omc/plans/riordino-obiettivo.md` e dal codice.
Legenda dei colori: verde = fatto e verificato, giallo = parziale o da rivedere, rosa tratteggiato = pianificato, non iniziato.

## 1. Flusso dell'utente

```mermaid
flowchart TD
  A(["Apri la PWA"]) --> B{"Hai un account?"}
  B -->|no| C["Registrazione<br/>verifica email con Resend"]
  B -->|sì| D["Accesso<br/>cookie httpOnly, 5 tentativi"]
  C --> D
  D --> E["Cerca supermercati vicini<br/>posizione del telefono, oppure CAP o città<br/>tradotti in posizione da Nominatim"]
  E --> F{"Posizione dentro<br/>l'archivio di Roma?"}
  F -->|sì| G["Ricerca locale sul catalogo<br/>GET /negozi, distanze calcolate dal telefono"]
  F -->|no| H["Nessun negozio:<br/>l'app conosce solo il comune di Roma (D19)"]
  G --> I["Salva 'I miei negozi'"]
  I --> J["Imposta il budget del periodo<br/>settimana o mese"]
  J --> K["Preferenze: persone 1–12<br/>dieta mediterranea"]
  K --> L[["Bottone 'Prepara la lista'<br/>POST /liste/proposta, ~$0,05"]]
  L --> LIM{"Tetto mensile del modello<br/>superato? (D20)"}
  LIM -->|sì| LIMX["Messaggio chiaro,<br/>nessuna chiamata a Claude"]
  LIM -->|no| M["Opzioni d'acquisto<br/>offerte dei miei negozi + medie Osservaprezzi"]
  M --> N["Claude sceglie alimenti,<br/>grammi e priorità 1-2-3"]
  N --> O["Dominio: prezzaPiano<br/>confezioni intere o a peso"]
  O --> P{"Totale entro<br/>il budget residuo?"}
  P -->|no| Q["riduciAlBudget<br/>toglie priorità 3, poi 2"]
  Q --> R{"Ancora oltre?<br/>restano solo essenziali"}
  R -->|sì| S["Sforamento dichiarato<br/>all'utente"]
  R -->|no| T
  S --> T
  P -->|sì| T["riepilogoNutrizionale<br/>kcal e nutrienti a persona al giorno"]
  T --> U["Telefono: scegliNegozio<br/>budget rigido → totale + km × 1,50 €"]
  U --> V["Salva la lista<br/>POST /liste/da-proposta"]
  V --> W["In negozio: spunta le voci<br/>e inserisci il prezzo visto<br/>solo online"]
  W --> X[("prezzi_utente<br/>fonte manuale")]
  X --> DL["Dettaglio lista: risolviPrezzo<br/>offerta › prezzo utente › stima"]
  X -.->|"la lista IA ancora lo ignora<br/>(fase 3 del riordino)"| M
  W -.-> OFF["Lista offline<br/>(fase 4)"]
  W -.-> Y["Lista conclusa → prezzi pagati<br/>salvati in automatico"]
  V -.-> Z["Ricette dagli ingredienti comprati<br/>(fase 5)"]
  Z -.-> ZZ["Ingredienti mancanti<br/>con il loro costo"]

  classDef ok fill:#dcefe2,stroke:#2f7a4f,color:#12301f
  classDef part fill:#fbefc6,stroke:#9a7400,color:#3a2c00
  classDef todo fill:#f5e1e8,stroke:#a23b5a,color:#3d1020,stroke-dasharray:5 4
  class A,B,C,D,E,F,G,H,I,J,K,L,LIM,LIMX,N,O,P,Q,R,S,T,U,V,X,DL ok
  class M,W part
  class OFF,Y,Z,ZZ todo
```

`M` è giallo perché le opzioni d'acquisto non usano i prezzi pagati e contano le offerte "con carta" anche senza carta (`opzioni.ts`); `W` perché la lista funziona solo con la rete.

## 2. Flusso dei dati

```mermaid
flowchart LR
  T{{"GitHub Actions<br/>ogni lunedì alle 5:00 UTC<br/>node ace volantini:controlla"}} --> FO["Pagine ufficiali<br/>GROS · Elite · Todis · Conad"]
  MAN["node ace volantini:leggi<br/>PDF scaricati a mano"] --> PDF
  FO --> SK{"Scaduto o URL<br/>già letto?"}
  SK -->|sì| SALTA["Salta"]
  SK -->|no| PDF["Scarica il PDF"]
  PDF --> IMP{"Immagini uguali ≥ 80%<br/>a un volantino valido?"}
  IMP -->|sì| DUP["Doppione: non si legge"]
  IMP -->|no| TET{"Tetto mensile<br/>del modello superato?"}
  TET -->|sì| STOP["Non legge, errore<br/>nel registro del controllo"]
  TET -->|no| BLK["Blocchi di 8 pagine<br/>cache su disco"]
  BLK --> CL["Claude legge le offerte<br/>streaming, output strutturato<br/>max 15 volantini, ~$1 l'uno"]
  CL --> OFF[("offerte<br/>stato: proposta")]
  CL --> LLM[("richieste_llm<br/>solo token e costo")]
  T --> NEG["negozi:importa<br/>una query Overpass su Roma"]
  NEG --> NDB[("negozi<br/>775 a Roma")]
  T --> OSS["osservaprezzi:importa<br/>tabella HTML del MIMIT"]
  OSS --> SDB[("stime_osservaprezzi<br/>min · medio · max")]
  CSV["CIQUAL 2020 + alimenti_it<br/>import una tantum"] --> ADB[("alimenti<br/>valori per 100 g")]
  OFF --> MATCH["alimentoDaNome<br/>abbina l'offerta a un alimento"]
  ADB --> MATCH
  MATCH --> OPZ["Opzioni d'acquisto<br/>per la lista IA"]
  SDB --> OPZ
  LLM -.->|"somma del mese"| TET

  classDef ok fill:#dcefe2,stroke:#2f7a4f,color:#12301f
  classDef part fill:#fbefc6,stroke:#9a7400,color:#3a2c00
  class T,FO,MAN,SK,SALTA,PDF,IMP,DUP,TET,STOP,BLK,CL,OFF,LLM,NEG,NDB,OSS,SDB,CSV,ADB,OPZ ok
  class MATCH part
```

`MATCH` è giallo: riconosce il 62% delle offerte alimentari; la fase 3 prevede che il codice dell'alimento lo indichi Claude in lettura. NaturaSì, Coop e Penny sono stati abbandonati (D19).

## 3. Architettura e confine della privacy

```mermaid
flowchart LR
  subgraph TEL["Telefono · apps/web · PWA React 19 + Vite + Tailwind 4"]
    POS["Posizione arrotondata"]
    UI["Schede: #spesa · #negozi · #account"]
    SN["scegliNegozio<br/>e calcolo distanze"]
    MAP["Mappa Leaflet"]
  end
  subgraph DOM["packages/domain · logica pura, centesimi interi"]
    D1["risolviPrezzo<br/>offerta › utente › stima"]
    D2["totaleLista · budget"]
    D3["prezzaPiano · riduciAlBudget<br/>riepilogoNutrizionale"]
    D4["alimentoDaNome<br/>valoriPerQuantita"]
  end
  subgraph API["apps/api · AdonisJS 7 su Render, serve anche la PWA"]
    CTRL["Controller /api/v1<br/>sessione web, rate limit"]
    SRV["Servizi: volantini · spesa_ia<br/>negozi · osservaprezzi · nutrizione<br/>costi_llm (tetto 10 $)"]
  end
  JOB["GitHub Actions<br/>controllo settimanale"]
  DB[("SQLite in locale e nei test<br/>Turso in produzione")]
  subgraph EXT["Servizi esterni"]
    CLA["Claude Opus 5.5"]
    OSM["OpenStreetMap<br/>Overpass · Nominatim · riquadri"]
    MIM["Osservaprezzi MIMIT"]
    CAT["Siti delle catene"]
    RES["Resend"]
  end

  POS --> SN
  UI --> SN
  SN --> D3
  UI -->|"JSON + cookie httpOnly"| CTRL
  CTRL --> SRV
  SRV --> DOM
  SRV --> DB
  JOB --> SRV
  SRV --> CLA
  SRV --> CAT
  SRV --> MIM
  SRV --> OSM
  SRV --> RES
  MAP -.->|"riquadri della mappa,<br/>CAP o città → posizione"| OSM
  POS -.-x|"mai inviata al server"| CTRL

  classDef ok fill:#dcefe2,stroke:#2f7a4f,color:#12301f
  classDef priv fill:#f5e1e8,stroke:#a23b5a,color:#3d1020
  class UI,SN,MAP,D1,D2,D3,D4,CTRL,SRV,JOB,DB,CLA,OSM,MIM,CAT,RES ok
  class POS priv
  linkStyle 14 stroke:#a23b5a,stroke-width:2px,stroke-dasharray:6 4
```

## 4. Punti aperti

| Tema | Stato | Nota |
|---|---|---|
| Primo deploy su Render | da fare | Tutto pronto e provato in locale (D20); mancano account e segreti dell'utente. |
| Prezzi pagati e carte fedeltà nella lista IA | non iniziato | Fase 3 del riordino: `opzioni.ts` non usa `risolviPrezzo`, ignora i prezzi dell'utente e conta le offerte "con carta". |
| Lista offline e prezzo pagato alla spunta | non iniziato | Fase 4 del riordino. |
| Prezzi pagati salvati a lista conclusa | non iniziato | Nessun codice con `fonte = lista`; c'è solo l'inserimento manuale. |
| Ricette dagli ingredienti comprati | non iniziato | Fase 5 del riordino; nessuna migrazione né servizio. |
| Costo al km regolabile | fisso a 1,50 € | `CENTESIMI_PER_KM` in `propostaLista.ts`; D13 lo vuole regolabile, D18 lo rimanda. |
| Offerte non verificate | accettato | Marcate "da volantino"; un formato letto male falsa prezzo al kg e budget. |
| Diete diverse e intolleranze | rimandato | Solo mediterranea (D16); `preferenze_alimentari` in fase 3 dello schema (D5). |
| Scontrini | scartati | D16; la fase 4 dello schema resta sulla carta. |
