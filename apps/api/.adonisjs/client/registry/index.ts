/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'health': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/health',
    tokens: [[0,"api"],[0,"v1"],[0,"health"]],
    types: placeholder as Registry['health']['types'],
  },
  'negozi': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/negozi',
    tokens: [[0,"api"],[0,"v1"],[0,"negozi"]],
    types: placeholder as Registry['negozi']['types'],
  },
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"signup"]],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'auth.email.password_dimenticata': {
    methods: ["POST"],
    pattern: '/api/v1/auth/password-dimenticata',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"password-dimenticata"]],
    types: placeholder as Registry['auth.email.password_dimenticata']['types'],
  },
  'auth.verificaEmail': {
    methods: ["POST"],
    pattern: '/api/v1/auth/verifica-email/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"verifica-email"],[1,"id"]],
    types: placeholder as Registry['auth.verificaEmail']['types'],
  },
  'auth.reimpostaPassword': {
    methods: ["POST"],
    pattern: '/api/v1/auth/reimposta-password/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"reimposta-password"],[1,"id"]],
    types: placeholder as Registry['auth.reimpostaPassword']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout"]],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'profile.email.reinvia_verifica': {
    methods: ["POST"],
    pattern: '/api/v1/account/verifica-email',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"verifica-email"]],
    types: placeholder as Registry['profile.email.reinvia_verifica']['types'],
  },
  'profile.profile.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/account',
    tokens: [[0,"api"],[0,"v1"],[0,"account"]],
    types: placeholder as Registry['profile.profile.destroy']['types'],
  },
  'mieiNegozi.miei_negozi.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/miei-negozi',
    tokens: [[0,"api"],[0,"v1"],[0,"miei-negozi"]],
    types: placeholder as Registry['mieiNegozi.miei_negozi.index']['types'],
  },
  'mieiNegozi.miei_negozi.store': {
    methods: ["POST"],
    pattern: '/api/v1/miei-negozi',
    tokens: [[0,"api"],[0,"v1"],[0,"miei-negozi"]],
    types: placeholder as Registry['mieiNegozi.miei_negozi.store']['types'],
  },
  'mieiNegozi.miei_negozi.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/miei-negozi/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"miei-negozi"],[1,"id"]],
    types: placeholder as Registry['mieiNegozi.miei_negozi.destroy']['types'],
  },
  'periodi.corrente': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/periodi/corrente',
    tokens: [[0,"api"],[0,"v1"],[0,"periodi"],[0,"corrente"]],
    types: placeholder as Registry['periodi.corrente']['types'],
  },
  'periodi.store': {
    methods: ["POST"],
    pattern: '/api/v1/periodi',
    tokens: [[0,"api"],[0,"v1"],[0,"periodi"]],
    types: placeholder as Registry['periodi.store']['types'],
  },
  'periodi.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/periodi/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"periodi"],[1,"id"]],
    types: placeholder as Registry['periodi.update']['types'],
  },
  'lista_ia.proposta': {
    methods: ["POST"],
    pattern: '/api/v1/liste/proposta',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[0,"proposta"]],
    types: placeholder as Registry['lista_ia.proposta']['types'],
  },
  'lista_ia.salva': {
    methods: ["POST"],
    pattern: '/api/v1/liste/da-proposta',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[0,"da-proposta"]],
    types: placeholder as Registry['lista_ia.salva']['types'],
  },
  'lista_ia.preferenze': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/preferenze',
    tokens: [[0,"api"],[0,"v1"],[0,"preferenze"]],
    types: placeholder as Registry['lista_ia.preferenze']['types'],
  },
  'lista_ia.aggiorna_preferenze': {
    methods: ["PATCH"],
    pattern: '/api/v1/preferenze',
    tokens: [[0,"api"],[0,"v1"],[0,"preferenze"]],
    types: placeholder as Registry['lista_ia.aggiorna_preferenze']['types'],
  },
  'liste.store': {
    methods: ["POST"],
    pattern: '/api/v1/liste',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"]],
    types: placeholder as Registry['liste.store']['types'],
  },
  'liste.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/liste/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[1,"id"]],
    types: placeholder as Registry['liste.show']['types'],
  },
  'liste.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/liste/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[1,"id"]],
    types: placeholder as Registry['liste.update']['types'],
  },
  'liste.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/liste/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[1,"id"]],
    types: placeholder as Registry['liste.destroy']['types'],
  },
  'liste.aggiungi_voce': {
    methods: ["POST"],
    pattern: '/api/v1/liste/:id/voci',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[1,"id"],[0,"voci"]],
    types: placeholder as Registry['liste.aggiungi_voce']['types'],
  },
  'liste.aggiungi_prezzo': {
    methods: ["POST"],
    pattern: '/api/v1/liste/:id/prezzi',
    tokens: [[0,"api"],[0,"v1"],[0,"liste"],[1,"id"],[0,"prezzi"]],
    types: placeholder as Registry['liste.aggiungi_prezzo']['types'],
  },
  'voci.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/voci/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"voci"],[1,"id"]],
    types: placeholder as Registry['voci.update']['types'],
  },
  'voci.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/voci/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"voci"],[1,"id"]],
    types: placeholder as Registry['voci.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
