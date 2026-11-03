import Anthropic from '@anthropic-ai/sdk'
import env from '#start/env'
import {
  creaPianificatoreClaude,
  type Pianificatore,
} from '#services/spesa_ia/pianificatore_claude'

let sostituto: Pianificatore | null = null

/** Nei test si usa un pianificatore finto: nessuna chiamata al modello, nessun costo. */
export function usaPianificatore(p: Pianificatore | null) {
  sostituto = p
}

/** Il pianificatore attivo; null se manca ANTHROPIC_API_KEY. */
export function pianificatore(): Pianificatore | null {
  if (sostituto) return sostituto
  const chiave = env.get('ANTHROPIC_API_KEY')?.release()
  return chiave ? creaPianificatoreClaude(new Anthropic({ apiKey: chiave })) : null
}
