import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

export default function PublicFundraising() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApprovedCampaigns()
  }, [])

  const fetchApprovedCampaigns = async () => {
    try {
      const res = await axios.get(`${API_URL}/fundraising/approved`)
      setCampaigns(res.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-[#0a0f18]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Emergency Support</h1>
            <p className="text-slate-400 max-w-2xl mx-auto">Help lives in critical medical situations. Every contribution matters in saving a life.</p>
        </div>

        {loading ? (
          <div className="text-center text-white py-20">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="glass p-20 text-center rounded-3xl border border-white/5">
            <span className="text-5xl block mb-4">🕊️</span>
            <h2 className="text-xl font-bold text-white">No Active Campaigns</h2>
            <p className="text-slate-400 mt-2">Check back later for new fundraising requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((app) => (
              <div key={app.id} className="glass-premium overflow-hidden rounded-3xl border border-white/10 hover:border-blue-500/40 transition-all group flex flex-col">
                <div className="h-48 bg-gradient-to-br from-blue-600/20 to-violet-600/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 group-hover:scale-110 transition-transform duration-500 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')]"></div>
                    <span className="text-6xl group-hover:scale-110 transition-transform duration-300">🩹</span>
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">VERIFIED CASE</div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{app.medical_condition}</h3>
                    <p className="text-slate-400 text-sm mb-4 flex-1 line-clamp-3">{app.description}</p>
                    
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Goal Amount</p>
                                <p className="text-2xl font-black text-white">₹{app.estimated_cost.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Patient</p>
                                <p className="text-sm text-blue-400 font-bold">{app.name}</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full w-[15%] shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                             <span>15% FUNDED</span>
                             <span>₹0 RAISED</span>
                        </div>

                        <button className="w-full btn-primary py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all">
                            Donate Now →
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
