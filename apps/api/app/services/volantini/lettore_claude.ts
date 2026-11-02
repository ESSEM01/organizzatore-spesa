import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { LettoreVolantino } from '#services/volantini/importa'
import { VolantinoLetto } from '#services/volantini/schema'

/** D4: un solo modello per ricette, scontrini e volantini. */
export const MODELLO = 'claude-opus-5-5'

const ISTRUZIONI = `Trascrivi le offerte di un volantino di un supermercato italiano.
Regole:
- Una voce per ogni prodotto con un prezzo stampato. Ignora pubblicità, ricette, concorsi e immagini senza prezzo.
- Trascrivi, non calcolare: prezzo_centesimi è il prezzo da pagare per una confezione esattamente come stampato (1,29 € → 129).
- prezzo_pieno_centesimi è il prezzo barrato, se c'è; altrimenti null.
- Se c'è solo un prezzo al kg o al litro (frutta e verdura sfuse, banco): formato "al kg" o "al litro", quantita 1000, unita "g" o "ml".
- quantita e unita descrivono la confezione intera (6 x 1,5 L → 9000 ml; 4 x 125 g → 500 g). Se non sono stampate, null.
- condizione riporta solo ciò che è scritto: carta fedeltà, "3x2", "il secondo a metà prezzo", limiti per cliente, giorni. Altrimenti null.
- Più gusti o varianti allo stesso prezzo: una sola voce con il nome comune.
- pagina è il numero della pagina del PDF, da 1.
- valido_dal e valido_al solo se le date sono stampate, nel formato AAAA-MM-GG.
- Se un dato non è leggibile metti null: non indovinare.`

/** Lettore vero: il PDF va al modello come documento, la risposta torna validata dallo schema Zod. */
export function creaLettoreClaude(client = new Anthropic()): LettoreVolantino {
  return async (pdf, { catena, titolo }) => {
    try {
      // In streaming: le richieste lunghe senza stream restavano ferme e cadevano in timeout (2026-11-02).
      const r = await client.messages
        .stream(
          {
            model: MODELLO,
            max_tokens: 64_000,
            // Trascrizione semplice: effort basso per contenere costo e tempi (default di Opus 5.5: medium).
            output_config: { effort: 'low', format: zodOutputFormat(VolantinoLetto) },
            system: ISTRUZIONI,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: pdf.toString('base64'),
                    },
                  },
                  {
                    type: 'text',
                    text: `Volantino ${catena}, «${titolo}». Trascrivi tutte le offerte.`,
                  },
                ],
              },
            ],
          },
          { timeout: 20 * 60 * 1000 }
        )
        .finalMessage()

      const usage = {
        input: r.usage.input_tokens,
        output: r.usage.output_tokens,
        cacheLettura: r.usage.cache_read_input_tokens ?? 0,
      }
      if (r.stop_reason === 'refusal') {
        return { esito: 'rifiuto', modello: r.model, stopReason: r.stop_reason, usage, dati: null }
      }
      if (r.stop_reason === 'max_tokens' || !r.parsed_output) {
        return {
          esito: 'errore',
          modello: r.model,
          stopReason: r.stop_reason,
          usage,
          dati: null,
          errore:
            r.stop_reason === 'max_tokens'
              ? 'Risposta troncata: troppe offerte per una sola richiesta'
              : 'Risposta non conforme allo schema',
        }
      }
      return {
        esito: 'ok',
        modello: r.model,
        stopReason: r.stop_reason,
        usage,
        dati: r.parsed_output,
      }
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        return {
          esito: 'errore',
          modello: MODELLO,
          stopReason: null,
          usage: { input: 0, output: 0, cacheLettura: 0 },
          dati: null,
          errore: `Errore API ${e.status}: ${e.message}`,
        }
      }
      throw e
    }
  }
}
