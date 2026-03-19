import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function OTPModal({ isOpen, identifier, onVerifySuccess, onClose, isRegistration = false }) {
  const [step, setStep] = useState('channel') // 'channel' | 'verify'
  const [channel, setChannel] = useState(null)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const otpRefs = useRef([])

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('channel')
      setChannel(null)
      setOtpDigits(['', '', '', '', '', ''])
      setCountdown(0)
    }
  }, [isOpen])

  // Timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  if (!isOpen) return null

  const handleSendOtp = async (selectedChannel) => {
    setLoading(true)
    setChannel(selectedChannel)
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, channel: selectedChannel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP')

      setStep('verify')
      setCountdown(60) // strict 60s cooldown for resend per requirements
      
      toast.success(`OTP sent to your ${selectedChannel}!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const otp = otpDigits.join('')
    if (otp.length !== 6) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp_code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP')

      // If it returns access_token, it's a login verification.
      // If it returns status: verified, it's registration.
      toast.success('OTP Verified successfully!')
      onVerifySuccess(data)
    } catch (err) {
      toast.error(err.message)
      setOtpDigits(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Input Handling
  const handleDigitChange = (val, idx) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next = [...otpDigits]
    next[idx] = digit
    setOtpDigits(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleDigitKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    } else if (e.key === 'Enter') {
      if (otpDigits.join('').length === 6) handleVerify()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md bg-dark border-border shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-primary"
        >
          ✕
        </button>

        {step === 'channel' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🛡️
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Two-Step Verification</h2>
            <p className="text-muted mb-8">
              {isRegistration ? "Before creating your account, how would you like to receive your verification code?" : "How would you like to receive your login OTP?"}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSendOtp('email')}
                disabled={loading}
                className="w-full p-4 rounded-xl border border-border bg-surface hover:bg-surface/80 hover:border-primary/50 flex items-center justify-center gap-3 transition-all"
              >
                <span className="text-xl">✉️</span>
                <span className="font-semibold text-primary">Send to Email</span>
              </button>
              <button
                onClick={() => handleSendOtp('sms')}
                disabled={loading}
                className="w-full p-4 rounded-xl border border-border bg-surface hover:bg-surface/80 hover:border-primary/50 flex items-center justify-center gap-3 transition-all"
              >
                <span className="text-xl">📱</span>
                <span className="font-semibold text-primary">Send to Mobile Number</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-primary mb-2">Enter OTP</h2>
            <p className="text-muted mb-6">
              Sent to <span className="text-primary font-medium">{identifier}</span> via {channel === 'email' ? 'Email' : 'SMS'}
            </p>

            <div className="flex justify-center gap-2 mb-8" onPaste={handlePaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(e.target.value, i)}
                  onKeyDown={e => handleDigitKeyDown(e, i)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-dark text-primary focus:outline-none focus:ring-2 transition-all ${
                    d ? 'border-primary ring-primary/30' : 'border-border focus:border-primary'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otpDigits.join('').length !== 6}
              className="btn-primary w-full py-3 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="flex items-center justify-center text-sm">
              {countdown > 0 ? (
                <span className="text-muted">
                  Resend code in <span className="font-mono text-primary font-bold">{formatCountdown(countdown)}</span>
                </span>
              ) : (
                <button
                  onClick={() => handleSendOtp(channel)}
                  disabled={loading}
                  className="text-primary hover:text-primary transition-colors font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setStep('channel')} 
              className="text-xs text-muted hover:text-primary mt-6 block w-full text-center"
            >
              ← Choose another method
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
