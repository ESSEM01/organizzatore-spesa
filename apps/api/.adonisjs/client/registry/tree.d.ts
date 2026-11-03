/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  health: typeof routes['health']
  negozi: typeof routes['negozi']
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
    email: {
      passwordDimenticata: typeof routes['auth.email.password_dimenticata']
    }
    verificaEmail: typeof routes['auth.verificaEmail']
    reimpostaPassword: typeof routes['auth.reimpostaPassword']
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
      destroy: typeof routes['profile.profile.destroy']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
    email: {
      reinviaVerifica: typeof routes['profile.email.reinvia_verifica']
    }
  }
  mieiNegozi: {
    mieiNegozi: {
      index: typeof routes['mieiNegozi.miei_negozi.index']
      store: typeof routes['mieiNegozi.miei_negozi.store']
      destroy: typeof routes['mieiNegozi.miei_negozi.destroy']
    }
  }
  periodi: {
    corrente: typeof routes['periodi.corrente']
    store: typeof routes['periodi.store']
    update: typeof routes['periodi.update']
  }
  listaIa: {
    proposta: typeof routes['lista_ia.proposta']
    salva: typeof routes['lista_ia.salva']
    preferenze: typeof routes['lista_ia.preferenze']
    aggiornaPreferenze: typeof routes['lista_ia.aggiorna_preferenze']
  }
  liste: {
    store: typeof routes['liste.store']
    show: typeof routes['liste.show']
    update: typeof routes['liste.update']
    destroy: typeof routes['liste.destroy']
    aggiungiVoce: typeof routes['liste.aggiungi_voce']
    aggiungiPrezzo: typeof routes['liste.aggiungi_prezzo']
  }
  voci: {
    update: typeof routes['voci.update']
    destroy: typeof routes['voci.destroy']
  }
}
