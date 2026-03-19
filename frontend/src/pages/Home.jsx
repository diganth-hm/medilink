import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import ChatWidget from '../components/ChatWidget'
import FingerprintScannerOverlay from '../components/FingerprintScannerOverlay'
import BiometricErrorModal from '../components/BiometricErrorModal'
import { API_URL } from '../config'

const features = [
  { icon: '🔴', title: 'Blood Group Access', desc: 'Instant blood type info for trauma & transfusion decisions' },
  { icon: '💊', title: 'Medication Profiles', desc: 'Full medication list for drug interaction checks' },
  { icon: '⚡', title: 'Condition Alerts', desc: 'Epilepsy, cardiac, asthma, diabetes flags prominently displayed' },
  { icon: '📞', title: 'Emergency Contacts', desc: 'One-tap calling to family & primary physician' },
  { icon: '🤖', title: 'AI Guidance', desc: 'Groq-powered AI trained on patient context for emergency decisions' },
  { icon: '📲', title: 'QR Code Access', desc: 'Scan QR to instantly access any patient\'s critical data — no login needed' },
]

const scenarios = [
  { icon: '🚗', label: 'Road Accident' },
  { icon: '❤️', label: 'Cardiac Arrest' },
  { icon: '🤧', label: 'Anaphylaxis' },
  { icon: '💉', label: 'Diabetic Emergency' },
  { icon: '⚡', label: 'Seizure' },
  { icon: '💨', label: 'Asthma Attack' },
  { icon: '🧠', label: 'Mental Health Crisis' },
  { icon: '🏥', label: 'Surgical Emergency' },
]

export default function Home() {
  const { isAuthenticated, loginWithToken } = useAuth()
  const navigate = useNavigate()
  
  // Fingerprint Scanner State
  const [scannerState, setScannerState] = useState(null) // 'scanning' | 'processing' | 'success' | 'failed' | null
  const [modalType, setModalType] = useState(null) // 'no-enrollment' | 'not-supported' | null

  const handleFingerprintClick = async () => {
    if (!window.PublicKeyCredential) {
      setModalType('not-supported')
      return
    }

    setScannerState('scanning')

    try {
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          userVerification: "required",
          // rpId: window.location.hostname // Omitted for localhost testing consistency, but best practice in prod
        }
      })

      if (credential) {
        setScannerState('processing')
        
        // Convert rawId to Base64 for transmission
        const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)))
        
        // Just send the ID for this simple prototype, in real WebAuthn you send the full attestation response
        const res = await fetch(`${API_URL}/auth/biometric/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential_id: credentialId }),
        })

        if (!res.ok) {
          throw new Error('Backend rejection')
        }

        const data = await res.json()
        
        setScannerState('success')
        
        // Log user in
        if (data.access_token) {
           loginWithToken(data.access_token, data.user)
        }

        setTimeout(() => {
          setScannerState(null)
          navigate('/dashboard')
        }, 1000)
      }
    } catch (error) {
      console.error(error)
      if (error.name === 'NotAllowedError') {
         // User cancelled or explicitly denied
         setScannerState(null)
         toast('Fingerprint scan cancelled. Tap the button again to try.', { icon: 'ℹ️' })
      } else {
         // Could be 404 from backend or no match locally
         setScannerState('failed')
         setTimeout(() => {
           setScannerState(null)
           setModalType('no-enrollment')
         }, 1000)
      }
    }
  }

  return (
    <div className="min-h-screen">
      {scannerState && (
        <FingerprintScannerOverlay 
          state={scannerState} 
          onCancel={() => setScannerState(null)} 
          mode="login" 
        />
      )}
      
      {modalType && (
        <BiometricErrorModal 
          type={modalType} 
          onClose={() => setModalType(null)} 
        />
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Emergency Medical Access System</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-primary mb-6 leading-tight">
            Critical Medical Info<br />
            <span className="gradient-text">In Seconds</span>
          </h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            MediLink gives first responders instant access to patient medical profiles via QR code — 
            no login required. Save lives when every second counts.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4">Go to Dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-4 w-full sm:w-auto text-center flex items-center justify-center gap-2">
                  <span className="text-xl">🏥</span> Register as Patient
                </Link>
                <Link to="/scan" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto text-center flex items-center justify-center gap-2">
                  <span className="text-xl">📷</span> Scan QR Code
                </Link>
                <button 
                  onClick={handleFingerprintClick}
                  className="btn-secondary text-base px-8 py-4 w-full sm:w-auto text-center flex items-center justify-center gap-2"
                  style={{ borderColor: '#E5341A', color: 'var(--text-primary)' }}
                >
                  <svg className="w-6 h-6 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
                  </svg>
                  Fingerprint Access
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            {[
              { value: '11', label: 'Emergency Scenarios Covered' },
              { value: 'AI', label: 'Powered by Groq/Qwen' },
              { value: 'QR', label: 'Zero-Login Access' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black gradient-text">{stat.value}</div>
                <div className="text-secondary text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Scenarios */}
      <div className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-primary mb-3">Every Emergency, Covered</h2>
          <p className="text-secondary">MediLink stores data for all critical medical scenarios</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scenarios.map((s, i) => (
            <div key={i} className="card-hover text-center p-4">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-sm text-secondary font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-primary mb-3">How MediLink Saves Lives</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="card-hover group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <h3 className="text-lg font-bold text-primary mb-2">{f.title}</h3>
              <p className="text-secondary text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-20 max-w-3xl mx-auto text-center">
        <div className="card bg-gradient-to-br from-blue-900/40 to-violet-900/40 border-blue-500/20">
          <h2 className="text-3xl font-bold text-primary mb-4">Set Up Your Medical Profile Today</h2>
          <p className="text-secondary mb-8">
            In an emergency, you may not be able to speak. Let MediLink speak for you.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-4">
            Create Free Profile →
          </Link>
        </div>
      </div>

      <ChatWidget />
    </div>
  )
}
