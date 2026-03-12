import { useState } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

export default function BiometricPortal() {
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [record, setRecord] = useState(null)
  const { token } = useAuth()

  const handleBiometricAuth = async () => {
    if (!patientId) {
      toast.error('Please enter Patient ID')
      return
    }
    setLoading(true)
    try {
      // Simulation of Biometric Verification
      // In a real app, the doctor would trigger a biometric request to the patient's device
      // or use a hospital fingerprint scanner that sends a template to the backend.
      const template = "mockified_template_match" 
      
      const res = await fetch(`${API_URL}/auth/biometric/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: parseInt(patientId), biometric_template: template }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Biometric verification failed')
      
      setRecord(data.record)
      toast.success('Patient record retrieved successfully!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Biometric Access Portal</h1>
          <p className="text-slate-400">Instant access to critical patient medical history using secure biometric authentication.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Auth Panel */}
          <div className="lg:col-span-1">
            <div className="glass p-8 rounded-3xl border border-slate-700/50">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
                </svg>
                Identity Verification
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="label">Patient MediLink ID</label>
                  <input 
                    type="number" 
                    placeholder="Enter ID number" 
                    className="input" 
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  />
                </div>

                <div className="p-6 bg-slate-800/50 rounded-2xl border border-dashed border-slate-600 text-center">
                  <p className="text-xs text-slate-500 mb-4 uppercase tracking-tighter font-bold">Waiting for Fingerprint...</p>
                   <svg className="w-12 h-12 text-slate-700 mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
                  </svg>
                </div>

                <button 
                  onClick={handleBiometricAuth}
                  disabled={loading}
                  className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Authenticate Patient'}
                </button>
              </div>
            </div>
          </div>

          {/* Records Panel */}
          <div className="lg:col-span-2">
            {!record ? (
               <div className="h-full glass rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center text-center p-12 order-dashed border-slate-700">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-500 mb-2">No Record Selected</h3>
                  <p className="text-slate-600 max-w-xs mx-auto">Please enter a Patient ID and complete biometric verification to access data.</p>
               </div>
            ) : (
              <div className="glass p-8 rounded-3xl border border-blue-500/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-700/50">
                   <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{record.user_name}</h2>
                      <p className="text-slate-400 text-sm">Patient Medical Profile</p>
                   </div>
                   <div className="px-4 py-1.5 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
                      Verified Access
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <section>
                         <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Health Status</h4>
                         <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                               <span className="text-slate-500">Chronic Conditions</span>
                               <span className="text-white font-medium">{record.chronic_conditions || 'None'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                               <span className="text-slate-500">Allergies</span>
                               <span className="text-red-400 font-medium">{record.allergies || 'None'}</span>
                            </div>
                         </div>
                      </section>
                   </div>
                   
                   <div className="space-y-6">
                      <section>
                         <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Emergency Contact</h4>
                         <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                            <p className="text-white font-bold mb-1">{record.emergency_contact_name}</p>
                            <p className="text-blue-400 text-sm font-mono">{record.emergency_contact_phone}</p>
                         </div>
                      </section>
                   </div>
                </div>

                <div className="mt-12 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                   <h4 className="text-sm font-bold text-white mb-4">Current Medications</h4>
                   <p className="text-slate-300 text-sm italic">{record.current_medications || 'No current medications recorded.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
