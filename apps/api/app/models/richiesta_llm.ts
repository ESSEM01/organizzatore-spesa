import { RichiesteLlmSchema } from '#database/schema'

/** Registro dei costi delle chiamate al modello (D4): solo numeri, mai contenuti (D5). */
export default class RichiestaLlm extends RichiesteLlmSchema {
  static table = 'richieste_llm'
}
