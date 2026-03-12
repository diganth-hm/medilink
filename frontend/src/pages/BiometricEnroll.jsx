import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

export default function BiometricEnroll() {
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()
  const navigate = useNavigate()

  const handleEnroll = async () => {
    setLoading(true)
    try {
      // Simulation of Biometric Enrollment
      // In a real web app, we'd use WebAuthn API here.
      const template = "demo_fingerprint_template_" + Math.random().toString(36).substring(7)
      
      const res = await fetch(`${API_URL}/auth/biometric/enroll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ biometric_template: template }),
      })

      if (!res.ok) throw new Error('Enrollment failed')
      
      toast.success('Fingerprint enrolled successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-xl border border-slate-700/50 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Fingerprint Enrollment</h1>
        <p className="text-slate-400 mb-8">Secure your account with biometric authentication.</p>
        
        <div className="p-6 bg-slate-800/50 rounded-xl border border-dashed border-slate-600 mb-8">
          <p className="text-sm text-slate-300">
            Please place your finger on the sensor when ready.
          </p>
        </div>

        <button 
          onClick={handleEnroll} 
          disabled={loading}
          className="btn-primary w-full py-4 text-lg"
        >
          {loading ? 'Processing...' : 'Register Fingerprint'}
        </button>
      </div>
    </div>
  )
}
