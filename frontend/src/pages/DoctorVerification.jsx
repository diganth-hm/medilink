import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function DoctorVerification() {
  const [pendingDoctors, setPendingDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingDoctors()
  }, [])

  const fetchPendingDoctors = async () => {
    try {
      // In a real app, we'd have a specific endpoint for pending docs.
      // For now, we'll fetch all doctors and filter (or use the admin/verify endpoint as a list)
      // Since we don't have a list endpoint yet, I'll mock the fetch or use a generic one if exists.
      const res = await axios.get(`${API_URL}/doctor/admin/pending`)
      setPendingDoctors(res.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load pending verifications')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (doctorId, status) => {
    try {
      await axios.post(`${API_URL}/doctor/admin/verify/${doctorId}?status=${status}`)
      toast.success(`Doctor ${status === 'approved' ? 'verified' : 'rejected'} successfully`)
      setPendingDoctors(prev => prev.filter(d => d.user_id !== doctorId))
    } catch (err) {
      toast.error('Action failed')
    }
  }

  if (loading) return <div className="text-center pt-20 text-white">Loading...</div>

  return (
    <div className="min-h-screen pt-20 px-4 bg-[#0a0f18]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Doctor Verification Portal</h1>
        <p className="text-slate-400 mb-8 text-sm uppercase tracking-wider">Review and authorize medical professional licenses</p>

        {pendingDoctors.length === 0 ? (
          <div className="glass-premium p-12 text-center rounded-3xl border border-white/5">
            <span className="text-5xl block mb-4">✅</span>
            <h2 className="text-xl font-semibold text-white">No Pending Verifications</h2>
            <p className="text-slate-400 mt-2">All doctors are currently up to date.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {pendingDoctors.map((doc) => (
              <div key={doc.id} className="glass-premium p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-2xl font-bold text-blue-400">
                    DR
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">License #{doc.license_number}</h3>
                    <p className="text-blue-400 font-medium">{doc.specialization}</p>
                    <p className="text-slate-400 text-sm">{doc.hospital_name}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                    <a 
                        href={`${API_URL}/uploads/verification/${doc.verification_doc_path?.split('\\').pop()}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-sm font-medium transition-all"
                    >
                        View License
                    </a>
                  <button 
                    onClick={() => handleVerify(doc.user_id, 'approved')}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/20"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleVerify(doc.user_id, 'rejected')}
                    className="px-6 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/30 font-bold text-sm transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
