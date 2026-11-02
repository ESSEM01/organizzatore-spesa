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
