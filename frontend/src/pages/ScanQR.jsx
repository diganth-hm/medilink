import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import FingerprintScannerOverlay from '../components/FingerprintScannerOverlay'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import jsQR from 'jsqr'

export default function ScanQR() {
  const [manualToken, setManualToken] = useState('')
  const [scannerStarted, setScannerStarted] = useState(false)
  const scannerRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // Fingerprint Scanner State
  const [scannerState, setScannerState] = useState(null)
  const { loginWithToken } = useAuth()
  
  const navigate = useNavigate()

  const handleScanResult = (token) => {
    if (!token) return
    const extracted = token.includes('/emergency/')
      ? token.split('/emergency/').pop()
      : token
    navigate(`/emergency/${extracted}`)
  }

  // --- Html5Qrcode Core Logic ---
  const getScannerInstance = async () => {
    if (!scannerRef.current) {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode('qr-reader')
    }
    return scannerRef.current
  }

  const startScanner = async () => {
    try {
      const scanner = await getScannerInstance()
      setScannerStarted(true)

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanResult(decodedText)
          scanner.stop().catch(() => {})
          setScannerStarted(false)
        },
        () => {}
      )
    } catch {
      toast.error('Camera access denied or not available. Please use manual entry.')
      setScannerStarted(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
    }
    setScannerStarted(false)
  }

  const handleFileScan = (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const toastId = toast.loading('Scanning image...')
      
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        
        // Scale down large images to avoid performance issues
        const maxDim = 1000
        let width = img.width
        let height = img.height
        
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = width * ratio
          height = height * ratio
        }
        
        canvas.width = width
        canvas.height = height
        context.drawImage(img, 0, 0, width, height)
        
        const imageData = context.getImageData(0, 0, width, height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        })
        
        toast.dismiss(toastId)
        
        if (code && code.data) {
          toast.success('QR Code found!')
          handleScanResult(code.data)
        } else {
          toast.error('No QR code found in this image. Please try a clearer photo.', { duration: 4000 })
        }
      }
      
      img.onerror = () => {
        toast.dismiss(toastId)
        toast.error('Failed to load image.')
      }
      
      img.src = objectUrl
      
    } catch (err) {
      toast.dismiss()
      console.error('File scan error:', err)
      toast.error('An error occurred while scanning.', { duration: 4000 })
    } finally {
      e.target.value = ''
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualToken.trim()) {
      toast.error('Please enter a QR token')
      return
    }
    handleScanResult(manualToken.trim())
  }

  const handleFingerprintClick = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('Biometric authentication is not supported on this device.')
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
        }
      })

      if (credential) {
        setScannerState('processing')
        
        const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)))
        
        const res = await fetch(`${API_URL}/auth/biometric/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential_id: credentialId }),
        })

        if (!res.ok) throw new Error('Backend rejection')

        const data = await res.json()
        setScannerState('success')
        
        if (data.access_token) loginWithToken(data.access_token, data.user)

        setTimeout(() => {
          setScannerState(null)
          navigate('/dashboard')
        }, 1000)
      }
    } catch (error) {
      console.error(error)
      if (error.name === 'NotAllowedError') {
         setScannerState(null)
         toast('Fingerprint scan cancelled. Tap the button again to try.', { icon: 'ℹ️' })
      } else {
         setScannerState('failed')
         setTimeout(() => {
           setScannerState(null)
         }, 1000)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-lg mx-auto">
      {scannerState && (
        <FingerprintScannerOverlay 
          state={scannerState} 
          onCancel={() => setScannerState(null)} 
          mode="login" 
        />
      )}

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-[#E5341A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Scan QR Code</h1>
        <p className="text-[var(--text-secondary)]">Scan a patient's MediLink QR code to access their medical profile</p>
      </div>

      {/* Camera Section */}
      <div className="card mb-6">
        <div id="qr-reader" className={`rounded-xl overflow-hidden ${scannerStarted ? 'block' : 'hidden'}`} style={{ width: '100%' }} />

        {!scannerStarted ? (
          <div className="text-center py-4">
            
            {/* Primary Action */}
            <button
              onClick={startScanner}
              className="ml-scan-btn"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10V6a3 3 0 013-3h4M21 10V6a3 3 0 00-3-3h-4M3 14v4a3 3 0 003 3h4M21 14v4a3 3 0 01-3 3h-4M12 12v.01" />
              </svg>
              Start QR Scanner
            </button>

            <div className="ml-scan-or">or</div>

            {/* Gallery Action */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileScan} 
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="ml-gallery-btn"
            >
              <svg className="w-5 h-5 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose from Gallery
            </button>

            {/* Other Methods Divider */}
            <div className="ml-divider">
              <span className="ml-divider-line"></span>
              <span className="ml-divider-text">Other Access Methods</span>
              <span className="ml-divider-line"></span>
            </div>

            {/* Fingerprint Action */}
            <button
              onClick={handleFingerprintClick}
              className="ml-fp-btn"
            >
              <svg className="w-5 h-5 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04" />
              </svg>
              Fingerprint Access
            </button>

          </div>
        ) : (
          <div className="mt-4 text-center pb-4">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Scanner Active — Point at QR Code
            </div>
            <button onClick={stopScanner} className="btn-secondary text-sm px-4 py-2">
              ✕ Stop Scanner
            </button>
          </div>
        )}
      </div>

      {/* Manual Entry - Kept identical format */}
      <div className="card">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">📋 Manual Token Entry</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-4">Enter the QR token or emergency URL manually</p>
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            id="manual-token"
            type="text"
            className="input font-mono text-sm"
            placeholder="Paste QR token or emergency URL..."
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
          />
          <button id="manual-submit" type="submit" className="btn-primary w-full">
            Access Patient Profile →
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="card bg-yellow-900/10 border-yellow-500/20 mt-4">
        <p className="text-yellow-600 dark:text-yellow-300 text-sm">
          ⚠️ <strong>Emergency Access</strong> — No login required. This system is designed for first responders and medical staff to quickly access critical patient information.
        </p>
      </div>

      <style>{`
        .ml-scan-btn {
          background: #E5341A;
          color: #FFFFFF;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 16px;
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
        }
        .ml-scan-btn:hover {
          background: #c42d16;
          transform: translateY(-1px);
        }

        .ml-scan-or {
          text-align: center;
          color: var(--text-secondary);
          font-size: 13px;
          margin: 12px 0;
        }

        .ml-gallery-btn {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border);
          font-size: 15px;
          font-weight: 500;
          padding: 13px 32px;
          border-radius: 12px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-gallery-btn:hover {
          background: var(--bg-hover);
        }

        .ml-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0 20px;
        }
        .ml-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .ml-divider-text {
          color: var(--text-secondary);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .ml-fp-btn {
          background: rgba(229, 52, 26, 0.08);
          border: 1px solid rgba(229, 52, 26, 0.3);
          color: #E5341A;
          font-size: 15px;
          font-weight: 600;
          padding: 13px 32px;
          border-radius: 12px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-fp-btn:hover {
          background: rgba(229, 52, 26, 0.12);
        }
      `}</style>
    </div>
  )
}
