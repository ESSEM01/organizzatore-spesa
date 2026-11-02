import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { NegozioVicino, Posizione } from '@spesa/domain'
import { formatDistanza } from '../../lib/format'
import { ATTRIBUZIONE, TILE_URL, limitiMappa } from './vistaMappa'

export type OrigineRicerca = 'gps' | 'testo' | 'mappa'

interface Props {
  centro: Posizione
  raggio: number
  origine: OrigineRicerca
  negozi: NegozioVicino[]
  selezionato: string | null
  onSeleziona: (osmId: string) => void
  onCentroCambiato: (centro: Posizione) => void
}

// Colori dai token di index.css: il colore va sui dati (il negozio scelto), non sulla cornice.
const MARCA = '#1f5f4a'
const TENUE = '#5c635f'

/** Mappa interattiva dei supermercati trovati. Caricata solo quando ci sono risultati (React.lazy). */
export default function Mappa({ centro, raggio, origine, negozi, selezionato, onSeleziona, onCentroCambiato }: Props) {
  return (
    <div className="h-72 overflow-hidden rounded-lg border border-bordo" role="region" aria-label="Mappa dei supermercati trovati">
      <MapContainer center={[centro.lat, centro.lon]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url={TILE_URL} attribution={ATTRIBUZIONE} maxZoom={19} />
        <AdattaVista centro={centro} negozi={negozi} />
        <SeguiSelezione negozi={negozi} selezionato={selezionato} />
        <EventiMappa onCentroCambiato={onCentroCambiato} />

        {/* Area della ricerca */}
        <Circle
          center={[centro.lat, centro.lon]}
          radius={raggio}
          pathOptions={{ color: TENUE, weight: 1, dashArray: '4 6', fill: false }}
          interactive={false}
        />
        {/* Con il GPS la posizione è arrotondata a circa 100 m (D5): si mostra un'area, non un punto. */}
        <Circle
          center={[centro.lat, centro.lon]}
          radius={origine === 'gps' ? 100 : 30}
          pathOptions={{ color: TENUE, weight: 1, fillColor: TENUE, fillOpacity: 0.2 }}
          interactive={false}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {origine === 'gps' ? 'Sei qui (circa)' : 'Centro della ricerca'}
          </Tooltip>
        </Circle>

        {negozi.map((n) => {
          const scelto = n.osmId === selezionato
          return (
            <CircleMarker
              key={n.osmId}
              center={[n.lat, n.lon]}
              radius={scelto ? 11 : 7}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: scelto ? MARCA : TENUE,
                fillOpacity: scelto ? 1 : 0.85,
              }}
              eventHandlers={{ click: () => onSeleziona(n.osmId) }}
            >
              {/* `permanent` si legge solo alla creazione: la chiave ricrea il fumetto quando cambia la selezione. */}
              <Tooltip key={scelto ? 'aperto' : 'chiuso'} direction="top" offset={[0, -8]} permanent={scelto}>
                {n.nome} · {formatDistanza(n.distanzaMetri)}
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

function AdattaVista({ centro, negozi }: { centro: Posizione; negozi: NegozioVicino[] }) {
  const map = useMap()
  useEffect(() => {
    const limiti = limitiMappa(centro, negozi)
    if (limiti) map.fitBounds(limiti, { padding: [24, 24], maxZoom: 16 })
    else map.setView([centro.lat, centro.lon], 15)
  }, [map, centro, negozi])
  return null
}

function SeguiSelezione({ negozi, selezionato }: { negozi: NegozioVicino[]; selezionato: string | null }) {
  const map = useMap()
  useEffect(() => {
    const n = negozi.find((x) => x.osmId === selezionato)
    if (n) map.panTo([n.lat, n.lon])
  }, [map, negozi, selezionato])
  return null
}

/** Solo gli spostamenti fatti dall'utente: quelli automatici (adatta vista, selezione) non contano. */
function EventiMappa({ onCentroCambiato }: { onCentroCambiato: (centro: Posizione) => void }) {
  const map = useMapEvents({
    dragend: () => {
      const c = map.getCenter()
      onCentroCambiato({ lat: c.lat, lon: c.lng })
    },
  })
  return null
}
