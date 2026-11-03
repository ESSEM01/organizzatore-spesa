import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { MODELLO } from '#services/volantini/lettore_claude'

/** Risposta del modello: solo alimenti dell'elenco, in grammi, con una priorità (D18). */
export const PianoLetto = z.object({
  voci: z.array(
    z.object({
      codice: z.number().int().describe('Codice dell’alimento, preso dall’elenco'),
      grammi: z
        .number()
        .int()
        .describe('Grammi (o ml) totali per tutte le persone e tutto il periodo'),
      priorita: z
        .number()
        .int()
        .describe('1 essenziale, 2 importante, 3 utile ma rinunciabile se il budget non basta'),
    })
  ),
  nota: z.string().describe('Due o tre frasi per l’utente: come è pensata la spesa'),
})
export type PianoLetto = z.infer<typeof PianoLetto>

export interface RichiestaPiano {
  budgetCentesimi: number
  persone: number
  giorni: number
  alimenti: {
    codice: number
    nome: string
    centesimiAlKg: number
    kcal: number | null
    proteine: number | null
    carboidrati: number | null
    grassi: number | null
    fibre: number | null
  }[]
}

export interface EsitoPiano {
  esito: 'ok' | 'rifiuto' | 'errore'
  modello: string
  stopReason: string | null
  usage: { input: number; output: number; cacheLettura: number }
  piano: PianoLetto | null
  errore?: string
}

export type Pianificatore = (r: RichiestaPiano) => Promise<EsitoPiano>

const ISTRUZIONI = `Sei un dietista italiano che prepara la lista della spesa di una famiglia con un budget fisso.
Regole:
- Dieta mediterranea: cereali (meglio anche integrali), legumi più volte a settimana, verdura e frutta ogni giorno, olio extravergine, pesce 2-3 volte a settimana, carne bianca più della rossa, latticini con moderazione, pochi dolci e salumi.
- Usa SOLO alimenti dell'elenco, indicando il loro codice. Non inventare alimenti.
- Il budget comanda: la spesa stimata (grammi × prezzo al kg) deve stare sotto il budget, con circa il 10% di margine. A budget basso scegli alimenti economici (legumi, pasta, uova, verdura di stagione, surgelati), non quelli "più sani" ma cari.
- Quantità realistiche per le persone e i giorni indicati, circa 2000 kcal a persona al giorno se il budget lo permette.
- Priorità 1 per la base (pasta o riso, legumi, olio, verdura, frutta), 2 per proteine animali e latticini, 3 per ciò che si può togliere.
- Non calcolare prezzi o totali da mostrare: li calcola l'app. La nota spiega le scelte, senza cifre di prezzo.`

/** Pianificatore vero: Claude con output strutturato, effort basso (scelta semplice, risposta breve). */
export function creaPianificatoreClaude(client: Anthropic): Pianificatore {
  return async (r) => {
    const elenco = r.alimenti
      .map(
        (a) =>
          `${a.codice} | ${a.nome} | ${(a.centesimiAlKg / 100).toFixed(2)} €/kg | ${a.kcal ?? '?'} kcal, P ${a.proteine ?? '?'}, C ${a.carboidrati ?? '?'}, G ${a.grassi ?? '?'}, fibre ${a.fibre ?? '?'} per 100 g`
      )
      .join('\n')
    try {
      const risposta = await client.messages
        .stream(
          {
            model: MODELLO,
            max_tokens: 8000,
            output_config: { effort: 'low', format: zodOutputFormat(PianoLetto) },
            system: ISTRUZIONI,
            messages: [
              {
                role: 'user',
                content: `Budget: ${(r.budgetCentesimi / 100).toFixed(2)} €. Persone: ${r.persone}. Giorni: ${r.giorni}.\nAlimenti disponibili (codice | nome | prezzo più basso | valori per 100 g):\n${elenco}`,
              },
            ],
          },
          { timeout: 5 * 60 * 1000 }
        )
        .finalMessage()
      const usage = {
        input: risposta.usage.input_tokens,
        output: risposta.usage.output_tokens,
        cacheLettura: risposta.usage.cache_read_input_tokens ?? 0,
      }
      if (risposta.stop_reason === 'refusal') {
        return {
          esito: 'rifiuto',
          modello: risposta.model,
          stopReason: 'refusal',
          usage,
          piano: null,
        }
      }
      if (!risposta.parsed_output) {
        return {
          esito: 'errore',
          modello: risposta.model,
          stopReason: risposta.stop_reason,
          usage,
          piano: null,
          errore: 'Risposta del modello non conforme',
        }
      }
      return {
        esito: 'ok',
        modello: risposta.model,
        stopReason: risposta.stop_reason,
        usage,
        piano: risposta.parsed_output,
      }
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        return {
          esito: 'errore',
          modello: MODELLO,
          stopReason: null,
          usage: { input: 0, output: 0, cacheLettura: 0 },
          piano: null,
          errore: `Errore API ${e.status ?? ''}: ${e.message}`,
        }
      }
      throw e
    }
  }
}
