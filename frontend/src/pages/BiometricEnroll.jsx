import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import FingerprintScannerOverlay from '../components/FingerprintScannerOverlay'

export default function BiometricEnroll() {
  const [step, setStep] = useState(1) // 1: Verify, 2: Scan, 3: Success
  const [loading, setLoading] = useState(false)
  const [scannerState, setScannerState] = useState(null)
  
  // Verification form state
  const [identifier, setIdentifier] = useState('')
  const [dob, setDob] = useState('')
  const [patientData, setPatientData] = useState(null)

  const { token, loginWithToken } = useAuth()
  const navigate = useNavigate()

  // --- STEP 1: Verify Identity ---
  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/patient/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_identifier: identifier, date_of_birth: dob })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Verification failed')
      }

      const data = await res.json()
      setPatientData(data)
      setStep(2)
      toast.success('Identity verified')
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- STEP 2: Register Fingerprint ---
  const handleEnroll = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('Biometric authentication is not supported on this device or browser.')
      return
    }

    setScannerState('scanning')

    try {
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)
      
      const publicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "MediLink",
          // id: window.location.hostname
        },
        user: {
          id: Uint8Array.from(String(patientData.patientId), c => c.charCodeAt(0)),
          name: patientData.mobile || patientData.email || String(patientData.patientId),
          displayName: patientData.patientName || "MediLink Patient"
        },
        pubKeyCredParams: [{alg: -7, type: "public-key"}, {alg: -257, type: "public-key"}],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      if (!credential) {
        throw new Error('cancelled');
      }

      setScannerState('processing')
      const template = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
      
      const enrollRes = await fetch(`${API_URL}/auth/biometric/enroll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // We might not have a token if user is not logged in during enrollment
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        // We pass patientId to link it since they just verified it,
        // although in reality, the endpoint needs to create a token for them or update securely
        body: JSON.stringify({ biometric_template: template, patient_id: patientData.patientId }),
      })

      if (!enrollRes.ok) throw new Error('backend_fail')
      
      setScannerState('success')
      
      setTimeout(() => {
        setScannerState(null)
        setStep(3)
      }, 1500)
      
    } catch (err) {
      console.error(err)
      if (err.name === 'NotAllowedError' || err.message === 'cancelled') {
        setScannerState(null)
        toast('Enrollment cancelled.', { icon: 'ℹ️' })
      } else {
        setScannerState('failed')
        setTimeout(() => {
          setScannerState(null)
          toast.error('Enrollment failed.')
        }, 1500)
      }
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center px-4 relative z-10">
      {scannerState && (
        <FingerprintScannerOverlay 
          state={scannerState} 
          onCancel={() => setScannerState(null)} 
          mode="enroll" 
        />
      )}
      
      <div className="w-full max-w-md bg-[var(--bg-card)] p-8 rounded-2xl shadow-xl border border-[var(--border)] relative z-10 transition-all">
        
        {step === 1 && (
          <div className="animate-fade-in text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Verify Identity</h1>
            <p className="text-[var(--text-secondary)] mb-6 text-sm">
              Please verify your patient identity to begin fingerprint enrollment.
            </p>
            
            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Patient ID or Mobile Number</label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date of Birth</label>
                <input 
                  type="date" 
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 mt-2 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Enroll Your Fingerprint</h1>
            <p className="text-[var(--text-secondary)] mb-6 text-sm">
              Hello, {patientData.patientName}. This fingerprint will be securely linked to your patient profile.
            </p>
            
            <div className="p-6 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border)] mb-8">
              <p className="text-sm text-[var(--text-secondary)]">
                You will be prompted to scan your fingerprint. Please ensure your finger is clean and dry.
              </p>
            </div>

            <button 
              onClick={handleEnroll} 
              className="w-full py-4 text-lg font-bold bg-[#E5341A] text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              Begin Enrollment Scan
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Fingerprint Enrolled Successfully</h1>
            <p className="text-[var(--text-secondary)] mb-8">
              Your fingerprint is now linked to your MediLink profile. You can access your records instantly.
            </p>
            <button 
              onClick={() => navigate('/')} 
              className="w-full py-4 text-lg font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              Access My Records Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
