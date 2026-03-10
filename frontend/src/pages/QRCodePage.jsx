import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ChatWidget from '../components/ChatWidget'

export default function QRCodePage() {
  const [qrInfo, setQrInfo] = useState(null)
  const [qrImageUrl, setQrImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchQRInfo()
  }, [])

  const fetchQRInfo = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/qrcode/my-qr-info')
      setQrInfo(res.data)
      // Load QR image
      const imgRes = await axios.get('/qrcode/my-qr', { responseType: 'blob' })
      const url = URL.createObjectURL(imgRes.data)
      setQrImageUrl(url)
    } catch {
      setQrInfo(null)
      setQrImageUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await axios.post('/qrcode/generate')
      toast.success('QR Code generated! ✅')
      await fetchQRInfo()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate QR code')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!qrImageUrl) return
    const a = document.createElement('a')
    a.href = qrImageUrl
    a.download = 'medilink-emergency-qr.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('QR Code downloaded!')
  }

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">My Emergency QR Code</h1>
        <p className="text-slate-400">Share this code with first responders for instant access to your medical profile</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : qrInfo && qrImageUrl ? (
        <>
          {/* QR Code Display */}
          <div className="card text-center mb-6">
            <div className="bg-white rounded-2xl p-6 inline-block shadow-2xl mb-6">
              <img src={qrImageUrl} alt="Emergency QR Code" className="w-64 h-64 mx-auto" />
            </div>

            <p className="text-sm text-slate-400 mb-1">Token: <span className="font-mono text-blue-400">{qrInfo.qr_token?.slice(0, 18)}...</span></p>
            <p className="text-xs text-slate-500 mb-6">Emergency URL: {qrInfo.emergency_url}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="download-qr"
                onClick={handleDownload}
                className="btn-primary flex items-center justify-center gap-2"
              >
                📥 Download QR Code
              </button>
              <button
                id="regenerate-qr"
                onClick={handleGenerate}
                disabled={generating}
                className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Regenerating...</>
                ) : '🔄 Regenerate QR'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card bg-blue-900/20 border-blue-500/20">
            <h3 className="font-bold text-blue-300 mb-4 flex items-center gap-2">💡 How to Use Your QR Code</h3>
            <ul className="space-y-3">
              {[
                { icon: '🖨️', text: 'Print and laminate it to carry in your wallet' },
                { icon: '📱', text: 'Set it as your phone lock screen wallpaper' },
                { icon: '💳', text: 'Stick it on the back of your ID card' },
                { icon: '🚑', text: 'In any emergency, responders can scan it instantly — no app needed' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Warning */}
          <div className="card bg-yellow-900/20 border-yellow-500/20 mt-4">
            <p className="text-yellow-300 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>Regenerating creates a new QR code and invalidates the old one. Update any physical copies.</span>
            </p>
          </div>
        </>
      ) : (
        <div className="card text-center py-16">
          <div className="text-7xl mb-6">📲</div>
          <h2 className="text-2xl font-bold text-white mb-3">No QR Code Yet</h2>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">
            Generate your emergency QR code so responders can instantly access your medical profile.
          </p>
          <button
            id="generate-qr"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : '✨ Generate QR Code'}
          </button>
        </div>
      )}

      <ChatWidget />
    </div>
  )
}
