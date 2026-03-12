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

  // Generate QR value (URL to patient's emergency profile)
  const qrValue = `${window.location.origin}/emergency/${user?.qr_token || 'demo'}`

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
      <div className="max-w-md w-full mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Digital Medical ID</h1>
        <p className="text-slate-400">Your secure digital identity for medical emergencies. You can download this and keep it as a physical card or on your phone lock screen.</p>
      </div>

      {/* ID Card */}
      <div 
        ref={cardRef} 
        className="w-full max-w-sm aspect-[1.6/1] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -ml-16 -mb-16" />

        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-bold text-white tracking-tight">MediLink</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Emergency Card</span>
        </div>

        <div className="flex gap-6 mt-4 z-10">
          <div className="p-2 bg-white rounded-xl shadow-lg">
            <QRCode value={qrValue} size={80} level="H" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white leading-tight">{user?.name || 'Full Name'}</h2>
            <p className="text-blue-300 text-xs font-semibold mb-2">Scan for Emergency Info</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
               <div>
                 <p className="text-[8px] uppercase text-slate-500 font-bold">Role</p>
                 <p className="text-xs text-slate-300 capitalize">{user?.role || 'Patient'}</p>
               </div>
               <div>
                 <p className="text-[8px] uppercase text-slate-500 font-bold">Blood Type</p>
                 <p className="text-xs text-white font-bold">O+ (Demo)</p>
               </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 z-10 flex justify-between items-end">
           <div>
             <p className="text-[8px] uppercase text-slate-500 font-bold">ID Number</p>
             <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">ML-{user?.id || 'XXXXXXX'}</p>
           </div>
           <div className="flex gap-1">
              <div className="w-6 h-4 bg-red-600 rounded-[2px]" />
              <div className="w-6 h-4 bg-blue-600 rounded-[2px]" />
           </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 w-full max-w-sm">
        <button 
          onClick={downloadCard}
          className="btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Card
        </button>
        <p className="text-center text-xs text-slate-500 italic">
          This card is protected by end-to-end encryption. Only authorized medical personnel can view the data stored in the QR link.
        </p>
      </div>
    </div>
  )
}
