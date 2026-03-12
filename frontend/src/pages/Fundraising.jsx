import { useState } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

export default function Fundraising() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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
          <h2 className="text-2xl font-bold text-white mb-4">Application Received</h2>
          <p className="text-slate-400 mb-6">
            Our team member will contact you soon within 12 hours. We will verify all details carefully to ensure there is no fraud or misuse of this system.
          </p>
          <button onClick={() => setSubmitted(false)} className="btn-primary px-8 py-2">Submit Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto glass p-8 rounded-2xl border border-slate-700/50">
        <h1 className="text-3xl font-bold text-white mb-2">Medical Emergency Fundraising</h1>
        <p className="text-slate-400 mb-8">Fill the details to request fundraising support for medical emergencies.</p>

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

          <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-300">
              Note: You may be asked to provide supporting documents (ID Proof, Medical Reports, Cost Estimate) for verification.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-lg">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  )
}
