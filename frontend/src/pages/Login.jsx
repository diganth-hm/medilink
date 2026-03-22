import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import axios from 'axios'
import SplashScreen from '../components/SplashScreen'

// Minimal Custom Countries List for Login
const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' }]

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email') // 'email' | 'phone'
  const [emailValue, setEmailValue] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [flag, setFlag] = useState('🇮🇳')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const [loading, setLoading] = useState(false)
  
  // OTP flow specific
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [boxValues, setBoxValues] = useState(['', '', '', '', '', ''])
  const [boxMasked, setBoxMasked] = useState([false, false, false, false, false, false])
  const [countdown, setCountdown] = useState(60)
  const [isOtpSuccess, setIsOtpSuccess] = useState(false)
  const [isOtpFailed, setIsOtpFailed] = useState(false)
  const [otpArriving, setOtpArriving] = useState(false)
  const [showSplash, setShowSplash] = useState(false)

  const inputRefs = useRef([null, null, null, null, null, null])
  const maskTimers = useRef([null, null, null, null, null, null])

  const { login } = useAuth()
  const navigate = useNavigate()

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
      c.code.includes(countrySearch)
    )
  }, [countrySearch])

  // Countdown timer for OTP
  useEffect(() => {
    let t = null
    if (step === 'otp' && countdown > 0) {
      t = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(t)
  }, [step, countdown])

  // Cleanup all mask timers on unmount
  useEffect(() => {
    return () => {
      maskTimers.current.forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [])

  // Auto-focus first OTP box when OTP screen appears
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 300)
    }
  }, [step])

  // Shake and clear on wrong OTP
  useEffect(() => {
    if (isOtpFailed) {
      setTimeout(() => {
        setBoxValues(['', '', '', '', '', ''])
        setBoxMasked([false, false, false, false, false, false])
        maskTimers.current.forEach(timer => {
          if (timer) clearTimeout(timer)
        })
        maskTimers.current = [null, null, null, null, null, null]
        setIsOtpFailed(false)
        inputRefs.current[0]?.focus()
      }, 600)
    }
  }, [isOtpFailed])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loginMethod === 'email' && !emailValue.trim()) return toast.error('Please enter your email')
    if (loginMethod === 'phone' && !phoneNumber.trim()) return toast.error('Please enter your phone number')

    // Optimistic Transition (ISSUE 1)
    setStep('otp')
    setOtpArriving(true)
    setCountdown(60)
    setBoxValues(['', '', '', '', '', ''])
    setBoxMasked([false, false, false, false, false, false])
    setLoading(true)

    // Clear the arriving message after 10 seconds
    const arriverTimer = setTimeout(() => setOtpArriving(false), 10000)

    try {
      const loginData = {}
      if (loginMethod === 'email') {
        loginData.email = emailValue.trim().toLowerCase()
      } else {
        loginData.phone = countryCode + phoneNumber
      }

      const baseUrl = import.meta.env.VITE_API_URL || API_URL
      const response = await axios.post(
        `${baseUrl}/auth/login/send-otp`,
        loginData
      )

      if (response.status === 200 || response.data?.success) {
        setLoading(false)
      } else {
        throw new Error('Failed to send OTP')
      }
    } catch (err) {
      console.error(err)
      setStep('form')
      setOtpArriving(false)
      clearTimeout(arriverTimer)
      toast.error(err.response?.data?.detail || err.message || 'Failed to send OTP')
      setLoading(false)
    }
  }

  // ---- OTP MASKING LOGIC ----
  const handleOtpInput = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newValues = [...boxValues]
    newValues[index] = value.slice(-1)
    setBoxValues(newValues)

    const newMasked = [...boxMasked]
    newMasked[index] = false
    setBoxMasked(newMasked)

    if (maskTimers.current[index]) {
      clearTimeout(maskTimers.current[index])
    }

    if (value) {
      maskTimers.current[index] = setTimeout(() => {
        setBoxMasked(prev => {
          const updated = [...prev]
          updated[index] = true
          return updated
        })
      }, 3000)

      if (index < 5 && value) {
        inputRefs.current[index + 1]?.focus()
      }
    }

    const allValues = [...newValues]
    if (allValues.join('').length === 6) {
      verifyOtp(allValues.join(''))
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (boxValues[index]) {
        const newValues = [...boxValues]
        newValues[index] = ''
        setBoxValues(newValues)
        const newMasked = [...boxMasked]
        newMasked[index] = false
        setBoxMasked(newMasked)
        if (maskTimers.current[index]) {
          clearTimeout(maskTimers.current[index])
        }
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newValues = [...boxValues]
    const newMasked = [...boxMasked]

    pasted.split('').forEach((digit, i) => {
      newValues[i] = digit
      newMasked[i] = false

      if (maskTimers.current[i]) clearTimeout(maskTimers.current[i])

      maskTimers.current[i] = setTimeout(() => {
        setBoxMasked(prev => {
          const updated = [...prev]
          updated[i] = true
          return updated
        })
      }, 3000)
    })

    setBoxValues(newValues)
    setBoxMasked(newMasked)

    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()

    if (pasted.length === 6) {
      verifyOtp(pasted)
    }
  }

  const verifyOtp = async (otpCode) => {
    if (otpCode.length !== 6) return
    if (loading || isOtpSuccess) return

    setLoading(true)

    try {
      const identifier = loginMethod === 'email' ? emailValue.trim().toLowerCase() : countryCode + phoneNumber
      const baseUrl = import.meta.env.VITE_API_URL || API_URL
      
      const verifyPayload = loginMethod === 'email' ? { email: identifier } : { phone: identifier }
      verifyPayload.otp_code = otpCode

      const res = await axios.post(`${baseUrl}/auth/verify-otp`, verifyPayload)

      setIsOtpSuccess(true)
      setTimeout(() => {
        setShowSplash(true)
      }, 1000)

      // After splash animation (3000ms), login and navigate
      window.__login_data = { 
        token: {
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token
        }, 
        user: res.data.user 
      }

    } catch (err) {
      setIsOtpFailed(true)
      toast.error(err.response?.data?.detail || 'Incorrect OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = () => {
    const enteredOtp = boxValues.join('')
    verifyOtp(enteredOtp)
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const loginData = {}
      if (loginMethod === 'email') {
        loginData.email = emailValue.trim().toLowerCase()
      } else {
        loginData.phone = countryCode + phoneNumber
      }
      const baseUrl = import.meta.env.VITE_API_URL || API_URL
      await axios.post(`${baseUrl}/auth/login/send-otp`, loginData)
      toast.success('OTP resent successfully')
      setOtpArriving(true)
      setTimeout(() => setOtpArriving(false), 10000)
      setCountdown(60)
    } catch (err) {
      toast.error('Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    {showSplash && (
      <SplashScreen 
        onComplete={() => {
          const { token, user } = window.__login_data;
          login(token, user, rememberMe);
          navigate('/dashboard');
          setShowSplash(false);
          delete window.__login_data;
        }} 
      />
    )}
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-10 overflow-hidden relative" onClick={() => setCountryDropdownOpen(false)}>
      <div className="w-full max-w-md relative z-10 p-6 sm:p-0">
        
        {/* LOGIN FORM VIEW */}
        <div className={`transition-all duration-500 transform ${step === 'form' ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : '-translate-y-full opacity-0 scale-95 pointer-events-none absolute inset-0'}`}>
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-2xl shadow-red-500/20">🏥</div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Sign in to your MediLink account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-none relative z-10 w-full mb-8">
            
            {/* FEATURE 1: TWO PILL BUTTONS */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl flex mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                  loginMethod === 'email' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                  loginMethod === 'phone' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Phone Number
              </button>
            </div>

            {loginMethod === 'email' ? (
              <div>
                <input
                  type="email"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all placeholder-slate-400"
                  placeholder="you@example.com"
                  value={emailValue}
                  onChange={e => setEmailValue(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <div className="relative">
                    <button 
                      type="button" 
                      className="w-[110px] h-[50px] bg-[var(--dark)] border border-[var(--border)] rounded-xl flex items-center justify-center gap-2 focus:outline-none focus:border-[#E5341A] transition-colors"
                      onClick={(e) => { e.stopPropagation(); setCountryDropdownOpen(!countryDropdownOpen) }}
                    >
                      <span>{flag}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{countryCode}</span>
                    </button>
                    {countryDropdownOpen && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl z-[100] max-h-[260px] flex flex-col overflow-hidden animate-slideDown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-2 border-b border-[var(--border)]">
                          <input 
                            type="text" 
                            placeholder="Search country..." 
                            className="w-full px-3 py-2 bg-[var(--dark)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {filteredCountries.map((c) => (
                            <div 
                              key={c.name}
                              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--dark)] cursor-pointer transition-colors"
                              onClick={() => { setCountryCode(c.code); setFlag(c.flag); setCountryDropdownOpen(false) }}
                            >
                              <span className="text-lg">{c.flag}</span>
                              <span className="text-sm text-[var(--text-primary)] truncate flex-1">{c.name}</span>
                              <span className="text-sm text-[var(--text-secondary)] font-medium">{c.code}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="flex-1 px-4 py-3 bg-[var(--dark)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                    placeholder="Mobile number"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 transition-all peer-checked:bg-red-600 peer-checked:border-red-600"></div>
                  <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                  Remember Me
                </span>
              </label>
              
              <Link to="/forgot-password" hidden className="text-sm font-bold text-red-600 hover:text-red-700">
                Forgot password?
              </Link>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              OTP will be sent to your registered contact
            </p>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#E5341A] text-white font-bold rounded-xl transition-colors hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : 'Continue'}
            </button>
          </form>

          {/* Quick Demo REMOVED (Feature 3) */}

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="text-red-600 hover:text-red-700 font-black transition-colors underline decoration-2 underline-offset-4">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* OTP Entry View (Reused from Register) */}
        <div className={`transition-all duration-500 transform absolute top-0 left-0 right-0 ${step === 'otp' ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-32 opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl text-center">
             <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">Enter Verification Code</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                We sent a code to {loginMethod === 'email' ? emailValue : `${countryCode} ${phoneNumber.slice(-4)}`}
              </p>

              {otpArriving && (
                <div className="flex items-center justify-center gap-2 mb-6 animate-pulse">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-[13px] text-[var(--text-secondary)]">
                    OTP is on its way — check your inbox in a few seconds
                  </span>
                </div>
              )}

             {/* OTP Boxes (Secure overlay architecture) */}
             <div
               className={`mb-8 relative ${isOtpFailed ? 'animate-otpShake' : ''}`}
               style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
             >
               {isOtpSuccess && (
                 <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-in pointer-events-none">
                   <div className="w-16 h-16 bg-[#1D9E75] rounded-full flex items-center justify-center shadow-lg">
                     <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                     </svg>
                   </div>
                 </div>
               )}
               {[0, 1, 2, 3, 4, 5].map((index) => (
                 <div
                   key={index}
                   style={{ position: 'relative', width: '48px', height: '56px' }}
                 >
                   <input
                     ref={el => inputRefs.current[index] = el}
                     type="text"
                     inputMode="numeric"
                     maxLength={1}
                     value={boxValues[index]}
                     onChange={e => handleOtpInput(index, e.target.value)}
                     onKeyDown={e => handleOtpKeyDown(index, e)}
                     onPaste={index === 0 ? handleOtpPaste : undefined}
                     autoComplete="one-time-code"
                     autoCorrect="off"
                     autoCapitalize="off"
                     spellCheck="false"
                     data-lpignore="true"
                     style={{
                       position: 'absolute',
                       inset: 0,
                       width: '100%',
                       height: '100%',
                       opacity: 0,
                       cursor: 'text',
                       zIndex: 2,
                       fontSize: '22px',
                     }}
                   />
                   <div
                     style={{
                       position: 'absolute',
                       inset: 0,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       fontSize: boxMasked[index] ? '28px' : '22px',
                       fontWeight: 700,
                       color: isOtpSuccess ? '#1D9E75' : isOtpFailed ? '#E5341A' : 'var(--text-primary)',
                       background: isOtpSuccess ? 'rgba(29,158,117,0.1)' : isOtpFailed ? 'rgba(229,52,26,0.1)' : 'var(--bg-card)',
                       border: `1.5px solid ${boxValues[index] ? isOtpSuccess ? '#1D9E75' : isOtpFailed ? '#E5341A' : '#E5341A' : 'var(--border)'}`,
                       borderRadius: '12px',
                       transition: 'all 0.2s ease',
                       userSelect: 'none',
                       pointerEvents: 'none',
                       zIndex: 1,
                     }}
                   >
                     {boxValues[index] ? boxMasked[index] ? '•' : boxValues[index] : ''}
                   </div>
                 </div>
               ))}
             </div>

             <button
                onClick={submitOtp}
                disabled={loading || boxValues.join('').length !== 6}
                className="w-full py-4 bg-[#E5341A] text-white font-bold rounded-[12px] transition-colors hover:bg-red-600 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? 'Verifying...' : 'Verify Secure Login'}
             </button>

             <div className="text-sm">
                {countdown > 0 ? (
                  <span className="text-[var(--text-secondary)]">Resend code in <span className="font-bold text-[var(--text-primary)]">{countdown}s</span></span>
                ) : (
                  <button onClick={handleResend} className="text-[#E5341A] font-semibold hover:underline bg-transparent border-none cursor-pointer">
                    Resend OTP
                  </button>
                )}
             </div>

             <button 
               onClick={() => setStep('form')}
               className="mt-6 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
             >
                ← Back to login
             </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
