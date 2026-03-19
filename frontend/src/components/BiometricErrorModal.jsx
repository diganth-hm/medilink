import { useNavigate } from 'react-router-dom'

/**
 * BiometricErrorModal
 * Props:
 *   type: 'no-enrollment' | 'not-supported'
 *   onClose: () => void
 */
export default function BiometricErrorModal({ type, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl animate-fade-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="relative w-16 h-16 flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-[#E5341A]">
              <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.2"/>
              <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M11 7v6l4.5 2.5"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-sm rounded-full">
               <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-[#E5341A]">
                  <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
               </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-3">
            {type === 'no-enrollment' ? 'No Data Found' : 'Biometric Not Available'}
          </h2>
          
          <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
            {type === 'no-enrollment' 
              ? 'We could not find any medical records linked to your fingerprint. Please complete biometric enrollment first to link your fingerprint to your patient profile.'
              : 'Your device does not support fingerprint or face recognition. Please use Scan QR or register with your credentials instead.'}
          </p>

          <div className="flex flex-col gap-3 w-full">
            {type === 'no-enrollment' ? (
              <>
                <button 
                  onClick={() => { onClose(); navigate('/biometric-enroll'); }}
                  className="w-full py-3 px-4 bg-[#E5341A] text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                >
                  Enroll Fingerprint Now
                </button>
                <button 
                  onClick={() => { onClose(); navigate('/register'); }}
                  className="w-full py-3 px-4 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-slate-800/50 transition-colors"
                >
                  Register as Patient
                </button>
              </>
            ) : (
              <button 
                onClick={() => { onClose(); navigate('/scan'); }}
                className="w-full py-3 px-4 bg-[#E5341A] text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
              >
                Scan QR Instead
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="w-full mt-2 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
