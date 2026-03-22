import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom Markers
const createRedCrossIcon = () => {
  return L.divIcon({
    html: `<div class="w-8 h-8 bg-red-600 rounded-lg shadow-lg flex items-center justify-center border-2 border-white transform hover:scale-110 transition-transform">
            <span class="text-white font-black text-xl leading-none">+</span>
          </div>`,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const userIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>`,
  className: 'user-location-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Haversine formula
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Map Controller for FlyTo
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

const AMENITIES = [
  { id: 'hospital', label: 'Hospitals', icon: '🏥' },
  { id: 'clinic', label: 'Clinics', icon: '🏨' },
  { id: 'pharmacy', label: 'Pharmacies', icon: '💊' },
  { id: 'blood_bank', label: 'Blood Banks', icon: '🩸' },
];

const RADIUS_OPTIONS = [
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '20km', value: 20000 },
];

export default function NearbyHospitals() {
  const [hospitals, setHospitals] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(5000)
  const [amenity, setAmenity] = useState('hospital')
  const [mapCenter, setMapCenter] = useState(null)
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [searchCity, setSearchCity] = useState('')

  // Fetch Logic
  const fetchNearbyHospitals = async (lat, lng, radiusMeters, amenityType) => {
    setSearching(true);
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="${amenityType}"](around:${radiusMeters},${lat},${lng});
          way["amenity"="${amenityType}"](around:${radiusMeters},${lat},${lng});
          relation["amenity"="${amenityType}"](around:${radiusMeters},${lat},${lng});
        );
        out body center;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      const results = data.elements
        .map(el => {
          const hLat = el.lat || el.center?.lat;
          const hLng = el.lon || el.center?.lon;
          return {
            id: el.id,
            name: el.tags?.name || el.tags?.["name:en"] || "Unnamed Facility",
            lat: hLat,
            lng: hLng,
            phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
            website: el.tags?.website || null,
            opening_hours: el.tags?.opening_hours || null,
            emergency: el.tags?.emergency === "yes" || el.tags?.opening_hours === "24/7",
            type: amenityType,
            distance: haversine(lat, lng, hLat, hLng)
          };
        })
        .filter(h => h.lat && h.lng)
        .sort((a, b) => a.distance - b.distance);

      setHospitals(results);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch healthcare facilities. Try again later.');
    } finally {
      setSearching(false);
    }
  };

  // Initial Geolocation
  useEffect(() => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported. Please use manual search.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        setMapCenter([latitude, longitude]);
        fetchNearbyHospitals(latitude, longitude, radius, amenity);
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation denied', err);
        setError('Location access denied. Please enter your city manually.');
        setLoading(false);
      }
    );
  }, []);

  // Re-fetch on filter change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyHospitals(userLocation.lat, userLocation.lng, radius, amenity);
    }
  }, [radius, amenity]);

  // Manual Geocode
  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchCity)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const loc = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
        fetchNearbyHospitals(loc.lat, loc.lng, radius, amenity);
        setSearchCity('');
      } else {
        setError('City not found. Please try a different location.');
      }
    } catch (err) {
      setError('Geocoding failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleFocusHospital = (h) => {
    setSelectedHospital(h.id);
    setMapCenter([h.lat, h.lng]);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 border-t-red-600 rounded-full animate-spin mb-6"></div>
        <p className="text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">📍 Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row overflow-hidden relative">
      
      {/* LEFT PANEL: FILTERS & LIST */}
      <div className="w-full md:w-[400px] lg:w-[450px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50 flex flex-col h-[50vh] md:h-[calc(100vh-64px)] z-20 shadow-xl">
        
        {/* Filter Bar */}
        <div className="p-6 space-y-4 border-b border-slate-100 dark:border-slate-700/30">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Nearby Help</h1>
          
          {/* Amenity Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {AMENITIES.map(a => (
              <button
                key={a.id}
                onClick={() => setAmenity(a.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 
                  ${amenity === a.id 
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-600/20' 
                    : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                <span className="mr-2">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Radius & Manual Search */}
          <div className="flex gap-3">
            <select
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              {RADIUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} Radius</option>
              ))}
            </select>
            
            <div className="flex-1 text-right">
              {searching && (
                <div className="inline-flex items-center gap-2 text-red-600 font-bold text-xs uppercase animate-pulse">
                  <div className="w-4 h-4 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                  Searching...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Fallback / Error */}
        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
            <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-3">⚠️ {error}</p>
            <form onSubmit={handleCitySearch} className="relative">
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Enter city or area name..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button type="submit" className="absolute right-2 top-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </form>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {hospitals.length === 0 && !searching ? (
            <div className="text-center py-12 px-6">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No {amenity}s found</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Try increasing your search radius or searching in a different area.</p>
              <button 
                onClick={() => setRadius(Math.min(radius * 2, 20000))}
                className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Expand to {radius * 2 / 1000}km
              </button>
            </div>
          ) : (
            hospitals.map(h => (
              <div 
                key={h.id}
                onClick={() => handleFocusHospital(h)}
                className={`p-5 rounded-3xl transition-all cursor-pointer border-2 group
                  ${selectedHospital === h.id 
                    ? 'bg-white dark:bg-slate-800 border-red-600 shadow-2xl scale-[1.02] relative z-10' 
                    : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-md hover:shadow-lg'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight leading-tight flex-1">{h.name}</h3>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-xs uppercase bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                    {h.distance.toFixed(1)} km
                  </span>
                </div>
                
                {h.opening_hours && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 flex items-center gap-1">
                    <span className="text-lg">🕒</span> {h.opening_hours}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {h.emergency && (
                    <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md shadow-red-500/20">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      24hr Emergency
                    </span>
                  )}
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                    {h.type}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleFocusHospital(h); }}
                    className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors border border-transparent"
                  >
                    📍 View on Map
                  </button>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2.5 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 text-center"
                  >
                    🗺 Directions
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: MAP */}
      <div className="flex-1 h-[50vh] md:h-[calc(100vh-64px)] relative">
        <MapContainer
          center={mapCenter || [0, 0]}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={selectedHospital ? 16 : 14} />

          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup className="custom-popup">
                  <div className="font-bold text-center">You are here</div>
                </Popup>
              </Marker>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={radius}
                pathOptions={{ 
                  color: '#DC2626', 
                  fillColor: '#DC2626', 
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: '5, 10'
                }}
              />
            </>
          )}

          {hospitals.map(h => (
            <Marker 
              key={h.id} 
              position={[h.lat, h.lng]} 
              icon={createRedCrossIcon()}
              eventHandlers={{
                click: () => {
                  setSelectedHospital(h.id);
                  setMapCenter([h.lat, h.lng]);
                }
              }}
            >
              <Popup>
                <div className="p-1 space-y-2">
                  <div className="font-black text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-tight text-sm">
                    {h.name}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        📞 {h.phone}
                      </a>
                    )}
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-black text-white bg-red-600 px-3 py-1.5 rounded-lg text-center uppercase tracking-widest"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Search Message */}
        {searching && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-red-500/20 flex items-center gap-4">
              <div className="w-5 h-5 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                🔍 Searching for {amenity}s Nearby...
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 0;
          overflow: hidden;
          background: white;
          border: 2px solid #ef4444;
        }
        .custom-popup .leaflet-popup-tip {
          background: #ef4444;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
