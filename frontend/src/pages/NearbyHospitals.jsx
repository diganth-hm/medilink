import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useUserLocation } from '../context/LocationContext'
import { API_URL } from '../config'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

async function fetchWithGoogleMaps(lat, lng) {
  // Nearby Search — hospital type, radius 10 km
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=hospital&key=${GMAPS_KEY}`
  // Note: direct browser fetch to Google Maps is blocked by CORS on the places API.
  // We proxy through the backend instead.
  const backendUrl = `${API_URL}/emergency/hospitals-gmaps?lat=${lat}&lng=${lng}`
  const res = await fetch(backendUrl)
  if (!res.ok) throw new Error('Google Maps proxy failed')
  return res.json()
}

async function fetchWithOverpass(lat, lng) {
  const res = await fetch(`${API_URL}/emergency/hospitals?lat=${lat}&lng=${lng}&radius=10000`)
  if (!res.ok) throw new Error('Overpass API failed')
  const data = await res.json()
  return data.hospitals || []
}

export default function NearbyHospitals() {
  const { coords, address, locationLoading, locationError } = useUserLocation()
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState(null)
  const mapRef = useRef(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (locationLoading || fetchedRef.current) return
    if (locationError || !coords) {
      setLoading(false)
      return
    }
    fetchedRef.current = true
    const { lat, lng } = coords

    const loadHospitals = async () => {
      // Try Google Maps backend proxy first, then fall back to Overpass
      if (GMAPS_KEY) {
        try {
          const data = await fetchWithGoogleMaps(lat, lng)
          const mapped = (data.results || []).map((p, i) => ({
            id: p.place_id || i,
            name: p.name,
            phone: p.formatted_phone_number || 'N/A',
            address: p.vicinity || 'Address not available',
            emergency: p.opening_hours?.open_now ? '24/7 Available' : 'Hours Unknown',
            dist: p.geometry?.location
              ? `${haversine(lat, lng, p.geometry.location.lat, p.geometry.location.lng)} km`
              : 'N/A',
            maps_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
          }))
          setHospitals(mapped)
          setDataSource('Google Maps')
          setLoading(false)
          return
        } catch {
          // fall through to Overpass
        }
      }

      try {
        const hosp = await fetchWithOverpass(lat, lng)
        const mapped = hosp.map((h, i) => ({
          ...h,
          dist: h.lat && h.lng ? `${haversine(lat, lng, h.lat, h.lng)} km` : h.dist || 'N/A',
          maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}&query_place_id=`,
        }))
        setHospitals(mapped)
        setDataSource('OpenStreetMap')
        setLoading(false)
      } catch (err) {
        toast.error('Could not load nearby hospitals.')
        setLoading(false)
      }
    }

    loadHospitals()
  }, [coords, locationLoading, locationError])

  // Embed a Google Map iframe when coords are available
  const mapSrc = coords && GMAPS_KEY
    ? `https://www.google.com/maps/embed/v1/search?q=hospitals+near+me&center=${coords.lat},${coords.lng}&zoom=13&key=${GMAPS_KEY}`
    : coords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.05},${coords.lat - 0.05},${coords.lng + 0.05},${coords.lat + 0.05}&layer=mapnik&marker=${coords.lat},${coords.lng}`
      : null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3">Nearby Emergency Hospitals</h1>
            <p className="text-slate-400">Live results based on your GPS position.</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {coords ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-300 font-medium tracking-wider uppercase">
                  📍 {address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                </span>
              </div>
            ) : locationLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">Detecting location...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 rounded-xl border border-red-800">
                <span className="text-xs text-red-400">⚠️ Location unavailable</span>
              </div>
            )}
            {dataSource && (
              <span className="text-xs text-slate-500">Powered by {dataSource}</span>
            )}
          </div>
        </header>

        {/* Map embed */}
        {mapSrc && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl h-64">
            <iframe
              ref={mapRef}
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Hospitals Map"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse h-64 bg-slate-800/50" />
            ))}
          </div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏥</div>
            <p className="text-slate-400 mb-2">No hospitals found nearby.</p>
            <p className="text-slate-500 text-sm">Try enabling location access and refreshing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((h) => (
              <div key={h.id} className="glass group p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-tight pr-2">{h.name}</h3>
                  <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded flex-shrink-0">{h.dist}</span>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex gap-3 items-start text-slate-400">
                    <svg className="w-5 h-5 flex-shrink-0 text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm leading-snug">{h.address}</p>
                  </div>

                  {h.phone && h.phone !== 'N/A' && (
                    <div className="flex gap-3 items-center text-slate-400">
                      <svg className="w-5 h-5 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${h.phone}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">{h.phone}</a>
                    </div>
                  )}

                  <div className="flex gap-3 items-center">
                    <div className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {h.emergency}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  {h.phone && h.phone !== 'N/A' && (
                    <a
                      href={`tel:${h.phone}`}
                      className="btn-ghost border border-slate-700 py-2 px-3 rounded-xl hover:bg-slate-800 flex items-center justify-center gap-1 text-sm text-slate-300 hover:text-white transition-all"
                    >
                      📞 Call
                    </a>
                  )}
                  {h.maps_url && (
                    <a
                      href={h.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost border border-slate-700 py-2 px-3 rounded-xl hover:bg-slate-800 flex items-center justify-center gap-1 text-sm text-slate-300 hover:text-white transition-all"
                    >
                      🗺️ Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center text-slate-500 text-xs">
          In case of extreme emergency, call <strong className="text-red-400">108</strong> immediately.
        </div>
      </div>
    </div>
  )
}
