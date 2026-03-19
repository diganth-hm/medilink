import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

export default function Fundraising() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState('apply') // apply | my-apps
  const [myApplications, setMyApplications] = useState([])
  const { token } = useAuth()
  const [form, setForm] = useState({
    name: '',
    medical_condition: '',
    hospital_name: '',
    estimated_cost: '',
    phone_number: '',
    email: '',
    description: ''
  })

  useEffect(() => {
    if (activeTab === 'my-apps') {
      fetchMyApplications()
    }
  }, [activeTab])

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get(`${API_URL}/fundraising/my-applications`)
      setMyApplications(res.data)
    } catch (err) {
      toast.error('Failed to load applications')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/fundraising/apply`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, estimated_cost: parseFloat(form.estimated_cost) }),
      })

      if (!res.ok) throw new Error('Failed to submit application')
      
      setSubmitted(true)
      toast.success('Application submitted successfully!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <div className="max-w-md w-full glass p-8 rounded-2xl text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-4">Application Received</h2>
          <p className="text-secondary mb-6">
            Our team member will contact you soon within 12 hours. We will verify all details carefully to ensure there is no fraud or misuse of this system.
          </p>
          <button onClick={() => setSubmitted(false)} className="btn-primary px-8 py-2">Submit Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-primary mb-2">Medical Fundraising</h1>
                <p className="text-secondary">Support for life-critical medical emergencies.</p>
            </div>
            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700">
                <button 
                    onClick={() => setActiveTab('apply')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'apply' ? 'bg-blue-600 text-primary shadow-lg' : 'text-secondary hover:text-primary'}`}
                >
                    Apply Now
                </button>
                <button 
                    onClick={() => setActiveTab('my-apps')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'my-apps' ? 'bg-blue-600 text-primary shadow-lg' : 'text-secondary hover:text-primary'}`}
                >
                    My Applications
                </button>
            </div>
        </div>

        {activeTab === 'apply' ? (
          <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-primary mb-6">New Application</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" required className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Medical Condition</label>
                  <input type="text" required className="input" value={form.medical_condition} onChange={e => setForm({...form, medical_condition: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label className="label">Hospital Name</label>
                  <input type="text" required className="input" value={form.hospital_name} onChange={e => setForm({...form, hospital_name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Estimated Treatment Cost (₹)</label>
                  <input type="number" required className="input" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" required className="input" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" required className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="label">Description / Case Details</label>
                <textarea required rows={4} className="input resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex gap-3 items-start">
                <span className="text-xl">ℹ️</span>
                <p className="text-xs text-blue-300 leading-relaxed">
                  Note: To prevent fraud, all cases are verified manually. You may be asked for ID proof, medical reports, and hospital cost estimates.
                </p>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-blue-900/40">
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {myApplications.length === 0 ? (
                <div className="glass p-12 text-center rounded-3xl border border-slate-800">
                    <span className="text-4xl block mb-4">📄</span>
                    <h3 className="text-primary font-bold">No applications found</h3>
                    <p className="text-secondary text-sm mt-1">You haven't submitted any fundraising requests yet.</p>
                </div>
            ) : (
                myApplications.map((app) => (
                    <div key={app.id} className="glass p-6 rounded-3xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all">
                                🏥
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-primary group-hover:text-blue-400 transition-colors">{app.medical_condition}</h3>
                                <p className="text-secondary text-sm">{app.hospital_name} · ₹{Number(app.estimated_cost).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                app.status === 'verified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                app.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                                {app.status}
                            </div>
                            <p className="text-[10px] text-secondary font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
