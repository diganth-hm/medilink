import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { useAuth } from '../context/AuthContext'
import { toPng } from 'html-to-image'

export default function MedicalIDCard() {
  const { user } = useAuth()
  const cardRef = useRef(null)

  const downloadCard = () => {
    if (cardRef.current === null) return
    toPng(cardRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = `MediLink-ID-${user?.name}.png`
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.error('Error downloading card:', err)
      })
  }

  // Try to fetch patient data to get blood group, fallback to demo
  const bloodGroup = user?.blood_group || 'O+'
  const patientId = user?.id ? `ML-${user.id}` : 'XXXXXXX'

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
      <div className="max-w-md w-full mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Digital Medical ID</h1>
        <p className="text-secondary text-sm">Your secure digital identity for medical emergencies. Download and keep as your lock screen.</p>
      </div>

      {/* ID Card */}
      <div 
        ref={cardRef} 
        className="w-full max-w-[400px] relative overflow-hidden rounded-2xl shadow-2xl p-6 flex flex-col justify-between"
        style={{ aspectRatio: '1.6/1', backgroundColor: '#0B1120' }}
      >
        {/* Abstract ECG Line SVG Decoration */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" 
          viewBox="0 0 400 250" 
          preserveAspectRatio="none"
        >
          <path 
            d="M 0 125 L 80 125 L 95 90 L 120 180 L 145 70 L 165 140 L 180 125 L 400 125" 
            fill="none" 
            stroke="#E5341A" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>

        {/* Top Bar: Logo & Blood Group */}
        <div className="flex justify-between items-start z-10 relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-white tracking-tight block leading-none">MediLink</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#E5341A] font-bold">Emergency Card</span>
            </div>
          </div>

          <div className="bg-[#E5341A] text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg border border-white/20">
            {bloodGroup}
          </div>
        </div>

        {/* Bottom Area: User Info & QR Code */}
        <div className="flex justify-between items-end z-10 relative mt-auto">
          <div className="flex flex-col">
            <p className="text-white text-lg font-bold uppercase tracking-wide leading-tight">{user?.name || 'Authorized User'}</p>
            <p className="text-white/60 text-xs font-mono tracking-widest uppercase mt-1">ID: {patientId}</p>
            <div className="mt-2 text-[10px] text-white/50 uppercase tracking-widest">
              Scan for emergency medical profile
            </div>
          </div>

          <div className="p-1.5 bg-white rounded-xl shadow-xl flex-shrink-0">
            <QRCode value={qrValue} size={70} level="H" />
          </div>
        </div>
      </div>

      <div className="mt-10 w-full max-w-[400px]">
        <button 
          onClick={downloadCard}
          className="w-full py-4 bg-[#E5341A] hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Card
        </button>
        <p className="text-center text-xs text-secondary mt-4">
          Card verified by MediLink Identity Services
        </p>
      </div>
    </div>
  )
}
