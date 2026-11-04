/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'health': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/health'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'negozi': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/negozi'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/negozi_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/negozi_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/negozi_controller').default['index']>>>
    }
  }
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.sessione.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.email.password_dimenticata': {
    methods: ["POST"]
    pattern: '/api/v1/auth/password-dimenticata'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').passwordDimenticataValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').passwordDimenticataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_controller').default['passwordDimenticata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_controller').default['passwordDimenticata']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_controller').default['passwordDimenticata']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.verificaEmail': {
    methods: ["POST"]
    pattern: '/api/v1/auth/verifica-email/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_controller').default['verifica']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_controller').default['verifica']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_controller').default['verifica']>>>
    }
  }
  'auth.reimpostaPassword': {
    methods: ["POST"]
    pattern: '/api/v1/auth/reimposta-password/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').reimpostaPasswordValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').reimpostaPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reimposta']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reimposta']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reimposta']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.sessione.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/sessione_controller').default['destroy']>>>
    }
  }
  'profile.email.reinvia_verifica': {
    methods: ["POST"]
    pattern: '/api/v1/account/verifica-email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reinviaVerifica']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reinviaVerifica']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/email_controller').default['reinviaVerifica']>>>
    }
  }
  'profile.profile.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').cancellaAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').cancellaAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'mieiNegozi.miei_negozi.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/miei-negozi'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['index']>>>
    }
  }
  'mieiNegozi.miei_negozi.store': {
    methods: ["POST"]
    pattern: '/api/v1/miei-negozi'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/negozio').aggiungiNegozioValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/negozio').aggiungiNegozioValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'mieiNegozi.miei_negozi.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/miei-negozi/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/miei_negozi_controller').default['destroy']>>>
    }
  }
  'periodi.corrente': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/periodi/corrente'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['corrente']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['corrente']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['corrente']>>>
    }
  }
  'periodi.store': {
    methods: ["POST"]
    pattern: '/api/v1/periodi'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').creaPeriodoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').creaPeriodoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'periodi.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/periodi/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').modificaPeriodoValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').modificaPeriodoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/periodi_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lista_ia.proposta': {
    methods: ["POST"]
    pattern: '/api/v1/liste/proposta'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lista_ia').propostaValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/lista_ia').propostaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['proposta']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['proposta']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['proposta']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lista_ia.salva': {
    methods: ["POST"]
    pattern: '/api/v1/liste/da-proposta'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lista_ia').salvaPropostaValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/lista_ia').salvaPropostaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['salva']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['salva']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['salva']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lista_ia.preferenze': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/preferenze'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['preferenze']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['preferenze']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['preferenze']>>>
    }
  }
  'lista_ia.aggiorna_preferenze': {
    methods: ["PATCH"]
    pattern: '/api/v1/preferenze'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lista_ia').preferenzeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/lista_ia').preferenzeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['aggiornaPreferenze']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['aggiornaPreferenze']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/lista_ia_controller').default['aggiornaPreferenze']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'liste.store': {
    methods: ["POST"]
    pattern: '/api/v1/liste'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').creaListaValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').creaListaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'liste.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/liste/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['show']>>>
    }
  }
  'liste.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/liste/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').modificaListaValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').modificaListaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'liste.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/liste/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['destroy']>>>
    }
  }
  'liste.aggiungi_voce': {
    methods: ["POST"]
    pattern: '/api/v1/liste/:id/voci'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').aggiungiVoceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').aggiungiVoceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiVoce']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiVoce']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiVoce']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'liste.aggiungi_prezzo': {
    methods: ["POST"]
    pattern: '/api/v1/liste/:id/prezzi'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').prezzoValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').prezzoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiPrezzo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiPrezzo']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/liste_controller').default['aggiungiPrezzo']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'voci.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/voci/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spesa').modificaVoceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spesa').modificaVoceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'voci.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/voci/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/voci_controller').default['destroy']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
