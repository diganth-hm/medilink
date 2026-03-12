import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null)       // { lat, lng }
  const [address, setAddress] = useState(null)     // human-readable
  const [locationError, setLocationError] = useState(null)
  const [locationLoading, setLocationLoading] = useState(true)

  const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  // Reverse geocode lat/lng → human address with Google Maps Geocoding API
  const reverseGeocode = async (lat, lng) => {
    if (!GMAPS_KEY) {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      return
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}`
      )
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address)
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      }
    } catch {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const fetchLocation = () => {
    setLocationLoading(true)
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      setLocationLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        await reverseGeocode(lat, lng)
        setLocationLoading(false)
      },
      (err) => {
        setLocationError(err.message)
        setLocationLoading(false)
        toast.error('Location access denied. Some features may not work properly.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  return (
    <LocationContext.Provider value={{ coords, address, locationError, locationLoading, refetch: fetchLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useUserLocation() {
  const context = useContext(LocationContext)
  if (!context) throw new Error('useUserLocation must be used within LocationProvider')
  return context
}
