import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function ScanQR() {
  const [manualToken, setManualToken] = useState('')
  const [scannerStarted, setScannerStarted] = useState(false)
  const scannerRef = useRef(null)
  const navigate = useNavigate()

  const handleScanResult = (token) => {
    if (!token) return
    // Extract token from full URL if needed
    const extracted = token.includes('/emergency/')
      ? token.split('/emergency/').pop()
      : token
    navigate(`/emergency/${extracted}`)
  }

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (scannerRef.current) return

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      setScannerStarted(true)

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanResult(decodedText)
          scanner.stop().catch(() => {})
          scannerRef.current = null
          setScannerStarted(false)
        },
        () => {}
      )
    } catch {
      toast.error('Camera access denied or not available. Please use manual entry.')
      setScannerStarted(false)
      scannerRef.current = null
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScannerStarted(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualToken.trim()) {
      toast.error('Please enter a QR token')
      return
    }
    handleScanResult(manualToken.trim())
  }

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-3xl">📷</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Scan QR Code</h1>
        <p className="text-slate-400">Scan a patient's MediLink QR code to access their medical profile</p>
      </div>

      {/* Camera Section */}
      <div className="card mb-6">
        <div id="qr-reader" className={`rounded-xl overflow-hidden ${scannerStarted ? 'block' : 'hidden'}`} style={{ width: '100%' }} />

        {!scannerStarted ? (
          <div className="text-center py-8">
            <div className="w-32 h-32 border-4 border-dashed border-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📷</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">Point your camera at a MediLink QR code</p>
            <button
              id="start-scanner"
              onClick={startScanner}
              className="btn-danger flex items-center gap-2 mx-auto"
            >
              🚨 Start QR Scanner
            </button>
          </div>
        ) : (
          <div className="mt-4 text-center">
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

      {/* Manual Entry */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">📋 Manual Token Entry</h2>
        <p className="text-slate-400 text-sm mb-4">Enter the QR token or emergency URL manually</p>
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
      <div className="card bg-yellow-900/20 border-yellow-500/20 mt-4">
        <p className="text-yellow-300 text-sm">
          ⚠️ <strong>Emergency Access</strong> — No login required. This system is designed for first responders and medical staff to quickly access critical patient information.
        </p>
      </div>
    </div>
  )
}
