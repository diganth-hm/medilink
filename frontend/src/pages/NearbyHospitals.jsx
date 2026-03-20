import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const NearbyHospitals = () => {
  const [hospitals, setHospitals] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(3000)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        fetchHospitals(latitude, longitude, radius)
      },
      (err) => {
        setError('Location access denied. Please enable location permission and refresh.')
        setLoading(false)
      }
    )
  }, [])

  const fetchHospitals = async (lat, lng, searchRadius) => {
    setLoading(true)
    setError(null)
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${searchRadius},${lat},${lng});
          node["amenity"="clinic"](around:${searchRadius},${lat},${lng});
          node["amenity"="doctors"](around:${searchRadius},${lat},${lng});
          way["amenity"="hospital"](around:${searchRadius},${lat},${lng});
          way["amenity"="clinic"](around:${searchRadius},${lat},${lng});
        );
        out center;
      `
      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: query,
        }
      )
      const data = await response.json()

      const results = data.elements
        .filter(el => el.lat || el.center)
        .map(el => ({
          id: el.id,
          name: el.tags?.name || 'Unnamed Hospital',
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
          emergency: el.tags?.emergency || null,
          address: [
            el.tags?.['addr:street'],
            el.tags?.['addr:city'],
          ].filter(Boolean).join(', ') || 'Address not available',
          type: el.tags?.amenity || 'hospital',
          distance: getDistance(lat, lng, el.lat || el.center?.lat, el.lon || el.center?.lon)
        }))
        .sort((a, b) => a.distance - b.distance)

      setHospitals(results)
      setLoading(false)
    } catch (err) {
      setError('Failed to fetch nearby hospitals. Please try again.')
      setLoading(false)
    }
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return Math.round(R * c)
  }

  const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius)
    if (userLocation) {
      fetchHospitals(userLocation.lat, userLocation.lng, newRadius)
    }
  }

  if (error) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>📍</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 700 }}>
          Location Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
          {error}
        </p>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '16px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            Emergency Numbers
          </p>
          {[
            { name: 'Ambulance', number: '108' },
            { name: 'Police', number: '100' },
            { name: 'Fire', number: '101' },
            { name: 'Disaster Management', number: '1078' },
          ].map(item => (
            <div key={item.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
              <a href={`tel:${item.number}`} style={{
                color: '#E5341A',
                fontWeight: 700,
                fontSize: '18px',
                textDecoration: 'none'
              }}>{item.number}</a>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Nearby Hospitals
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {loading ? 'Searching...' : `${hospitals.length} facilities found`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1000, 3000, 5000, 10000].map(r => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: radius === r ? '#E5341A' : 'var(--border)',
                background: radius === r ? '#E5341A' : 'transparent',
                color: radius === r ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {r >= 1000 ? `${r/1000}km` : `${r}m`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border)',
              borderTopColor: '#E5341A',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p>Finding nearby hospitals...</p>
          </div>
        </div>
      ) : (
        <div className="hospitals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="hospitals-map" style={{
            height: '500px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            {userLocation && (
              <MapContainer
                center={[userLocation.lat, userLocation.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup>You are here</Popup>
                </Marker>
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={radius}
                  pathOptions={{ color: '#E5341A', fillColor: '#E5341A', fillOpacity: 0.05 }}
                />
                {hospitals.map(hospital => (
                  <Marker
                    key={hospital.id}
                    position={[hospital.lat, hospital.lng]}
                    icon={hospitalIcon}
                  >
                    <Popup>
                      <strong>{hospital.name}</strong><br />
                      {hospital.address}<br />
                      {hospital.phone && <a href={`tel:${hospital.phone}`}>{hospital.phone}</a>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          <div style={{
            height: '500px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {hospitals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'var(--text-secondary)',
                padding: '40px'
              }}>
                No hospitals found in this area. Try increasing the search radius.
              </div>
            ) : (
              hospitals.map(hospital => (
                <div
                  key={hospital.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#E5341A'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, margin: 0, flex: 1 }}>
                      {hospital.name}
                    </h3>
                    <span style={{
                      background: 'rgba(229,52,26,0.1)',
                      color: '#E5341A',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '999px',
                      marginLeft: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatDistance(hospital.distance)}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px' }}>
                    {hospital.address}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {hospital.emergency && (
                      <span style={{
                        background: 'rgba(229,52,26,0.1)',
                        color: '#E5341A',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        EMERGENCY
                      </span>
                    )}
                    <span style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {hospital.type}
                    </span>
                  </div>
                  {hospital.phone && (
                    <a
                      href={`tel:${hospital.phone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                        color: '#E5341A',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      📞 {hospital.phone}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .hospitals-grid {
            grid-template-columns: 1fr !important;
          }
          .hospitals-map {
            height: 300px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default NearbyHospitals
