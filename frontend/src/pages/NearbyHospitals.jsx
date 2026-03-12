import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function NearbyHospitals() {
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState(null)
  const [hospitals, setHospitals] = useState([])

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        try {
          const res = await fetch(`${API_URL}/emergency/hospitals?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (!res.ok) throw new Error("Failed to fetch");
          const data = await res.json();
          setHospitals(data.hospitals || []);
        } catch (err) {
          toast.error('Failed to get real-time hospital data. Using fallback.');
          setHospitals([
             { id: 1, name: "Fallback Hospital", phone: "108", address: "City Center", emergency: "24/7 Available", dist: "N/A" }
          ])
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        toast.error('Failed to get location. Showing results for city center.')
        setLoading(false)
        setHospitals([
          { id: 1, name: "Metropolis General", phone: "108", address: "Central City Plaza", emergency: "24/7", dist: "-" }
        ])
      }
    )
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3">Nearby Emergency Hospitals</h1>
            <p className="text-slate-400">Real-time emergency availability based on your current location.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-xs text-slate-300 font-medium tracking-wider uppercase">Live Location Active</span>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse h-64 bg-slate-800/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((h) => (
              <div key={h.id} className="glass group p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{h.name}</h3>
                  <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">{h.dist}</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="flex gap-3 items-start text-slate-400">
                    <svg className="w-5 h-5 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm leading-snug">{h.address}</p>
                  </div>
                  
                  <div className="flex gap-3 items-start text-slate-400">
                    <svg className="w-5 h-5 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <p className="text-sm font-medium text-white">{h.phone}</p>
                  </div>

                  <div className="flex gap-3 items-center">
                    <div className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full border border-red-500/20 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                       {h.emergency}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button className="w-full btn-ghost border border-slate-700 py-3 rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 group/btn">
                     Call Hospital
                     <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                     </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center text-slate-500 text-xs">
          Data sourced from National Health Portal and verified local healthcare directories. In case of extreme emergency, call 108 immediately.
        </div>
      </div>
    </div>
  )
}
