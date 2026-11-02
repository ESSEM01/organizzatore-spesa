import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health': { paramsTuple?: []; params?: {} }
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.index': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.store': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periodi.corrente': { paramsTuple?: []; params?: {} }
    'periodi.store': { paramsTuple?: []; params?: {} }
    'periodi.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.store': { paramsTuple?: []; params?: {} }
    'liste.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.aggiungi_voce': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.aggiungi_prezzo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'voci.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'voci.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'health': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.index': { paramsTuple?: []; params?: {} }
    'periodi.corrente': { paramsTuple?: []; params?: {} }
    'liste.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.index': { paramsTuple?: []; params?: {} }
    'periodi.corrente': { paramsTuple?: []; params?: {} }
    'liste.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'mieiNegozi.miei_negozi.store': { paramsTuple?: []; params?: {} }
    'periodi.store': { paramsTuple?: []; params?: {} }
    'liste.store': { paramsTuple?: []; params?: {} }
    'liste.aggiungi_voce': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.aggiungi_prezzo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'mieiNegozi.miei_negozi.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'voci.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'periodi.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'liste.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'voci.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}