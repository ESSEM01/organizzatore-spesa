# Piano: lista generata dall'IA (D13)

**Stato:** completato (fase A in D13/D15, fase B in D16, fase C in D18). Superato da `riordino-obiettivo.md`.

## Fase A · Offerte dai volantini (D7, D9 fase 2)
1. Migrazioni `volantini`, `offerte` (schema in `.omc/plans/database-schema.md`, fase 2). Test dei vincoli prima.
2. Dominio: le offerte confermate diventano `Prezzo` con `fonte: 'offerta'` (`prezzi_repository`), già gestite da `risolviPrezzo`.
3. Recupero dei PDF (job `ace`): Conad (pagina punto vendita → metadati), GROS e Elite (`com_myegojwt … pdf=1`), Todis (`/wp-content/uploads/`), NaturaSì (`/photo/leaflets/`). Parser testati su pagine salvate in `data/` (escluse da git). Hash del PDF per non rileggere.
4. Lettura con Claude Opus 5.5 (`@anthropic-ai/sdk`, PDF come documento, structured outputs): prodotto, marca, formato, prezzo, prezzo pieno, condizione, validità. Solo pagine utili per contenere il costo (~$0,30 per 20 pagine). Offerte salvate come `proposta`; la PWA le mostra marcate "da volantino".
5. Registro `richieste_llm` (D4, D9 fase 3) con token e costo, senza contenuti.
6. Prova sui 14 PDF già scaricati in `data/volantini/2026-11-02/`.

Prerequisiti: chiave `ANTHROPIC_API_KEY` in `apps/api/.env` (la crea l'utente); rileggere i termini di conad.it e cedigros.com (D7).

## Fase B · Stime Osservaprezzi (D1)
Import mensile per la provincia dell'utente → `stime_osservaprezzi`, parser testato su HTML salvato.

## Fase C · Lista con l'IA e scelta del negozio
1. Dominio: `scegliNegozio(candidati, budget, euroPerKm)` in TDD (budget rigido → costo effettivo → distanza).
2. API: catalogo con prezzi per catena; generazione con Claude (structured outputs), ricalcolo nel dominio, riduzione se oltre il budget; totali per negozio senza posizione dell'utente.
3. PWA: "Genera la lista", classifica dei negozi calcolata sul telefono, conferma e modifica della lista.
Da chiarire: persone, giorni, preferenze alimentari.
