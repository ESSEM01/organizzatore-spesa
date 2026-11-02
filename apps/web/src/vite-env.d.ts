/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Modello URL delle tile della mappa (`{z}/{x}/{y}`); predefinito: OpenStreetMap. */
  readonly VITE_MAPPA_TILE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
