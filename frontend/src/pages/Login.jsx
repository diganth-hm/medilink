import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('password') // 'password' | 'otp'

  // Password login
  const [passwordForm, setPasswordForm] = useState({ email: '', password: '' })

  // OTP flow
  const [identifier, setIdentifier] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState('identifier')     // 'identifier' | 'verify'
  const [countdown, setCountdown] = useState(0)       // seconds remaining
  const [devOtp, setDevOtp] = useState(null)          // shown in dev mode

  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const otpRefs = useRef([])

  // Auto-advance countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const otp = otpDigits.join('')

  // ── OTP input handling ────────────────────────────────────────────────
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

  // ── Password login ────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP: send ─────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    setDevOtp(null)
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP')

      setOtpDigits(['', '', '', '', '', ''])
      setStep('verify')
      setCountdown(data.expires_in_seconds || 300)

      if (data.dev_otp) {
        // Dev mode — autofill OTP and show hint
        setDevOtp(data.dev_otp)
        setOtpDigits(data.dev_otp.split(''))
        toast.success('OTP generated. ⚡ Dev mode — OTP autofilled below.')
      } else if (data.dev_note) {
        toast('Check server logs for your OTP code.', { icon: '📋', duration: 6000 })
      } else {
        toast.success('OTP sent! Check your email / messages.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── OTP: verify ───────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otp_code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP')
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
      setOtpDigits(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-xl">🏥</div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your MediLink account</p>
        </div>

        {/* Method Toggle */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button
            onClick={() => { setLoginMethod('password'); setStep('identifier') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              loginMethod === 'password' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 Password
          </button>
          <button
            onClick={() => { setLoginMethod('otp'); setStep('identifier') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              loginMethod === 'otp' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 OTP Login
          </button>
        </div>

        {/* ── Password login ─────────────────────────────────────── */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="john@example.com"
                value={passwordForm.email}
                onChange={e => setPasswordForm({ ...passwordForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={passwordForm.password}
                onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Logging in...' : 'Login with Password'}
            </button>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400 mb-3 text-center uppercase tracking-wider font-bold">⚡ Quick Demo Login</p>
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={() => setPasswordForm({ email: 'john.doe@demo.com', password: 'demo1234' })}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">
                  Patient 1
                </button>
                <button type="button" onClick={() => setPasswordForm({ email: 'jane.smith@demo.com', password: 'demo1234' })}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">
                  Patient 2
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── OTP: step 1 — enter identifier ────────────────────── */}
        {loginMethod === 'otp' && step === 'identifier' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email or Mobile Number</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="john@example.com  or  9876543210"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1.5">We'll send a 6-digit OTP to this address</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending OTP...
                </span>
              ) : 'Send OTP →'}
            </button>
          </form>
        )}

        {/* ── OTP: step 2 — enter OTP ───────────────────────────── */}
        {loginMethod === 'otp' && step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">

            <div className="text-center">
              <p className="text-slate-400 text-sm">OTP sent to</p>
              <p className="text-white font-semibold">{identifier}</p>
            </div>

            {/* Dev mode hint */}
            {devOtp && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-amber-400 text-lg">⚡</span>
                <div>
                  <p className="text-xs font-bold text-amber-400">Dev Mode — OTP autofilled</p>
                  <p className="text-xs text-amber-300/70">Configure SMTP or SMS to send real codes</p>
                </div>
              </div>
            )}

            {/* 6 digit boxes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Enter 6-digit OTP</label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-slate-800 text-white focus:outline-none focus:ring-2 transition-all ${
                      d ? 'border-blue-500 ring-blue-500/30' : 'border-slate-700 focus:border-blue-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-slate-500">
                  OTP expires in{' '}
                  <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-400' : 'text-blue-400'}`}>
                    {formatCountdown(countdown)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-red-400">OTP expired.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : 'Verify & Login'}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('identifier')}
                className="flex-1 text-sm text-slate-400 hover:text-white transition-colors py-2"
              >
                ← Change Email
              </button>
              {countdown === 0 && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="flex-1 text-sm text-blue-400 hover:text-blue-300 transition-colors py-2"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Register link */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Register
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
