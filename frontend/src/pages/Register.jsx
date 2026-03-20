import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

// Custom Countries List
const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
]

const ROLES = [
  { value: 'patient', icon: '😷', label: 'Patient', desc: 'Manage your medical profile & QR' },
  { value: 'doctor', icon: '👨‍⚕️', label: 'Doctor', desc: 'Access patient records with token' },
  { value: 'responder', icon: '🚑', label: 'Responder', desc: 'Scan QR codes in the field' },
  { value: 'hospital', icon: '🏥', label: 'Hospital', desc: 'Manage patient records' },
]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // ---- FORM STATE ----
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dialCode, setDialCode] = useState('+91')
  const [flag, setFlag] = useState('🇮🇳')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  
  // Custom Phone Dropdown specific
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // Validations & UI states
  const [loading, setLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [checklistExpanded, setChecklistExpanded] = useState(true)

  // Carousel specific
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState('right')
  
  // OTP flow specific
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [boxValues, setBoxValues] = useState(['', '', '', '', '', ''])
  const [boxMasked, setBoxMasked] = useState([false, false, false, false, false, false])
  const [countdown, setCountdown] = useState(60)
  const [isOtpSuccess, setIsOtpSuccess] = useState(false)
  const [isOtpFailed, setIsOtpFailed] = useState(false)
  const [otpArriving, setOtpArriving] = useState(false)

  const inputRefs = useRef([null, null, null, null, null, null])
  const maskTimers = useRef([null, null, null, null, null, null])

  // Computed variables
  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
      c.code.includes(countrySearch)
    )
  }, [countrySearch])

  const fullPhone = phone ? `${dialCode}${phone}` : ''

  // Password Requirements Logic
  const reqLength = password.length >= 8
  const reqCase = /[a-z]/.test(password) && /[A-Z]/.test(password)
  const reqNumber = /[0-9]/.test(password)
  const reqSpecial = /[!@#$%^&*()]/.test(password)
  const allReqsMet = reqLength && reqCase && reqNumber && reqSpecial

  let failingReqMsg = ''
  if (!reqLength) failingReqMsg = 'Password must be at least 8 characters'
  else if (!reqCase) failingReqMsg = 'Add both uppercase and lowercase letters'
  else if (!reqNumber) failingReqMsg = 'Add at least one number'
  else if (!reqSpecial) failingReqMsg = 'Add at least one special character'

  useEffect(() => {
    if (password) setPasswordTouched(true)
  }, [password])

  useEffect(() => {
    if (allReqsMet) setChecklistExpanded(false)
    else setChecklistExpanded(true)
  }, [allReqsMet, reqLength, reqCase, reqNumber, reqSpecial])

  // Countdown timer for OTP
  useEffect(() => {
    let t = null
    if (step === 'otp' && countdown > 0) {
      t = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(t)
  }, [step, countdown])

  // Cleanup all mask timers on unmount (FIX 4)
  useEffect(() => {
    return () => {
      maskTimers.current.forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [])

  // Auto-focus first OTP box when OTP screen appears (FIX 6)
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 300)
    }
  }, [step])

  // Shake and clear on wrong OTP (FIX 7)
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

  // ---- FORM HANDLER ----
  const handleContinue = async (e) => {
    if (e) e.preventDefault()
    
    // Validations
    if (!email.trim() && !phone.trim()) {
      toast.error('Please enter at least one contact method (Email or Phone).')
      return
    }
    if (!allReqsMet) {
      toast.error('Please ensure all password requirements are met.')
      setChecklistExpanded(true)
      return
    }

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
      // Send ONE request with both identifiers (ISSUE 2)
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: fullPhone || null
      }

      const response = await axios.post(`${API_URL}/auth/send-otp`, payload)
      
      if (response.status === 200 || response.data?.success) {
        // Success - stay on OTP screen
        setLoading(false)
      } else {
        throw new Error('Failed to send OTP')
      }

    } catch (err) {
      console.error(err)
      // Transition back on failure
      setStep('form')
      setOtpArriving(false)
      clearTimeout(arriverTimer)
      toast.error(err.response?.data?.detail || err.message || 'Failed to send OTP. Please try again.')
      setLoading(false)
    }
  }

  // ---- OTP MASKING LOGIC (FIX 1) ----
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

  // Verify OTP — always uses real boxValues, never display values (FIX 3)
  const verifyOtp = async (otpCode) => {
    if (otpCode.length !== 6) return
    if (loading || isOtpSuccess) return

    setLoading(true)

    try {
      // 1. Verify OTP using unified identifiers
      await axios.post(`${API_URL}/auth/verify-otp`, { 
        email: email.trim() || null, 
        phone: fullPhone || null,
        otp_code: otpCode 
      })

      // 2. Complete Registration
      const selectedRole = ROLES[currentRoleIndex].value
      const registerPayload = {
        name: name.trim(),
        email: email.trim() || undefined,
        password: password,
        role: selectedRole
      }
      if (!registerPayload.email && fullPhone) registerPayload.email = `${phone}@phoneuser.com`

      const res = await axios.post(`${API_URL}/auth/register`, registerPayload)

      setIsOtpSuccess(true)
      setTimeout(() => {
        toast.success('🎉 Welcome to MediLink!')
        login(res.data.access_token, res.data.user)
        navigate('/dashboard')
      }, 1000)

    } catch (err) {
      setIsOtpFailed(true)
      toast.error(err.response?.data?.detail || 'Incorrect OTP. Please try again.')
      // Clearing is handled by the isOtpFailed useEffect (FIX 7)
    } finally {
      setLoading(false)
    }
  }

  // Kept for the manual "Verify & Create Account" button
  const submitOtp = () => {
    const enteredOtp = boxValues.join('')
    verifyOtp(enteredOtp)
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: fullPhone || null
      }
      await axios.post(`${API_URL}/auth/send-otp`, payload)
      
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

  const maskEmailPhoneText = () => {
    const methods = []
    if (email) {
      const [u, d] = email.split('@')
      methods.push(`${u[0]}***@${d}`)
    }
    if (phone) {
      const last4 = phone.slice(-4)
      methods.push(`${dialCode} ******${last4}`)
    }
    if (methods.length === 2) return `We sent a code to ${methods[0]} and ${methods[1]}`
    return `We sent a code to ${methods[0]}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-10 overflow-hidden relative" onClick={() => setCountryDropdownOpen(false)}>
      <div className="w-full max-w-md relative z-10 p-6 sm:p-0">
        
        {/* Registration Form View */}
        <div className={`transition-all duration-500 transform ${step === 'form' ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : '-translate-y-full opacity-0 scale-95 pointer-events-none absolute inset-0'}`}>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Create Account</h1>
            <p className="text-[var(--text-secondary)] mt-2">Join MediLink and protect your health information</p>
          </div>

          <form onSubmit={handleContinue} className="space-y-5 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-xl relative z-10 w-full mb-8">
            {/* 1. Full Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* 2. Separate Email & Phone */}
            <div className="space-y-3 pb-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button 
                      type="button" 
                      className="w-[110px] h-[50px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-center gap-2 focus:outline-none focus:border-[#E5341A] transition-colors"
                      onClick={(e) => { e.stopPropagation(); setCountryDropdownOpen(!countryDropdownOpen) }}
                    >
                      <span>{flag}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{dialCode}</span>
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
                            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {filteredCountries.length > 0 ? filteredCountries.map((c) => (
                            <div 
                              key={c.name}
                              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                              onClick={() => { setDialCode(c.code); setFlag(c.flag); setCountryDropdownOpen(false) }}
                            >
                              <span className="text-lg">{c.flag}</span>
                              <span className="text-sm text-[var(--text-primary)] truncate flex-1">{c.name}</span>
                              <span className="text-sm text-[var(--text-secondary)] font-medium">{c.code}</span>
                            </div>
                          )) : (
                            <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No countries found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <p className={`text-xs mt-2 transition-colors ${!email && !phone ? 'text-[#E5341A] font-medium' : 'text-[var(--text-secondary)]'}`}>
                  {!email && !phone ? 'Please enter at least one contact method.' : 'At least one is required. OTP will be sent to whichever you provide.'}
                </p>
              </div>
            </div>

            {/* 3. Password Field & Checklist */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[#E5341A]"
                placeholder="Secure password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordTouched(true)}
              />
              
              <div className="mt-3 overflow-hidden transition-all duration-300">
                {passwordTouched && !allReqsMet && failingReqMsg && (
                  <div className="flex items-center gap-2 mb-2 animate-fade-in pl-1">
                    <svg className="w-4 h-4 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-[13px] text-[#E5341A] font-medium">{failingReqMsg}</span>
                  </div>
                )}
                
                {checklistExpanded && passwordTouched && (
                  <div className="flex flex-col gap-2">
                     {[
                       { met: reqLength, label: 'At least 8 characters', delay: '0s' },
                       { met: reqCase, label: 'One uppercase and one lowercase letter', delay: '0.05s' },
                       { met: reqNumber, label: 'One number (0–9)', delay: '0.1s' },
                       { met: reqSpecial, label: 'One special character (!@#$%^&*)', delay: '0.15s' }
                     ].map((req, i) => (
                       <div 
                         key={i} 
                         className="flex items-center gap-2.5 animate-slide-down-req" 
                         style={{ animationDelay: req.delay, opacity: 0, animationFillMode: 'forwards' }}
                       >
                         <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 ${
                           req.met ? 'bg-[#1D9E75] border-[#1D9E75] animate-checkBounce' : 
                           (password.length > 0 ? 'bg-red-500/10 border-[#E5341A]' : 'bg-transparent border-[var(--border)]')
                         }`}>
                           {req.met && (
                             <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                             </svg>
                           )}
                           {!req.met && password.length > 0 && (
                             <svg className="w-2.5 h-2.5 text-[#E5341A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                             </svg>
                           )}
                         </div>
                         <span className={`text-[13px] transition-colors duration-300 ${req.met ? 'text-[#1D9E75]' : (password.length > 0 ? 'text-[#E5341A]' : 'text-[var(--text-secondary)]')}`}>
                           {req.label}
                         </span>
                       </div>
                     ))}
                  </div>
                )}

                {allReqsMet && !checklistExpanded && (
                  <div 
                    className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-green-500/5 rounded transition-colors animate-fade-in"
                    onClick={() => setChecklistExpanded(true)}
                  >
                    <div className="w-5 h-5 bg-[#1D9E75] rounded-full flex items-center justify-center">
                       <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                       </svg>
                    </div>
                    <span className="text-[14px] text-[#1D9E75] font-medium">Password looks great!</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Account Type Carousel */}
            <div className="pt-2 pb-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3 text-center">Account Type</label>
              
              <div className="flex items-center justify-center gap-4 w-full">
                <button
                  type="button"
                  onClick={() => { setSlideDirection('right'); setCurrentRoleIndex(prev => prev > 0 ? prev - 1 : prev) }}
                  disabled={currentRoleIndex === 0}
                  className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 text-[#E5341A] text-xl flex flex-shrink-0 items-center justify-center cursor-pointer transition-colors hover:bg-[#E5341A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 disabled:hover:text-[#E5341A]"
                >
                  ‹
                </button>
                
                <div className="w-full max-w-[260px] overflow-hidden relative" style={{ minHeight: '130px' }}>
                  {ROLES.map((r, i) => {
                    const isActive = i === currentRoleIndex;
                    if (!isActive) return null;
                    return (
                      <div 
                        key={r.value} 
                        className={`w-full bg-[var(--bg-card)] border-2 border-[#E5341A] rounded-2xl p-6 text-center shadow-lg absolute inset-0 flex flex-col items-center justify-center gap-2 ${slideDirection === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft'}`}
                      >
                         <span className="text-[36px] leading-[1]">{r.icon}</span>
                         <h3 className="text-[18px] font-bold text-[var(--text-primary)] m-0">{r.label}</h3>
                         <p className="text-[13px] text-[var(--text-secondary)] m-0 leading-tight">{r.desc}</p>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => { setSlideDirection('left'); setCurrentRoleIndex(prev => prev < ROLES.length - 1 ? prev + 1 : prev) }}
                  disabled={currentRoleIndex === ROLES.length - 1}
                  className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 text-[#E5341A] text-xl flex flex-shrink-0 items-center justify-center cursor-pointer transition-colors hover:bg-[#E5341A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 disabled:hover:text-[#E5341A]"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4">
                {ROLES.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-[8px] rounded-[4px] transition-all duration-300 ${i === currentRoleIndex ? 'w-[18px] bg-[#E5341A]' : 'w-[8px] bg-[var(--border)]'}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#E5341A] text-white font-bold rounded-xl transition-colors hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : 'Continue'}
            </button>
          </form>

          <p className="text-center text-[var(--text-secondary)] text-sm mb-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[#E5341A] hover:underline font-medium">Sign in</Link>
          </p>
        </div>

        {/* OTP Entry View */}
        <div className={`transition-all duration-500 transform absolute top-0 left-0 right-0 ${step === 'otp' ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-32 opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl text-center">
             <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">Enter Verification Code</h2>
             <p className="text-[13px] text-[var(--text-secondary)] mb-4">
               {maskEmailPhoneText()}
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

             {/* OTP Boxes — FIX 2: overlay architecture for secure masking */}
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
                   {/* Real input — invisible, handles all keyboard events (FIX 2 & 5) */}
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
                   {/* Visual display div — shows digit for 3s then bullet (FIX 2) */}
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
                       background: isOtpSuccess
                         ? 'rgba(29,158,117,0.1)'
                         : isOtpFailed
                         ? 'rgba(229,52,26,0.1)'
                         : 'var(--bg-card)',
                       border: `1.5px solid ${
                         boxValues[index]
                           ? isOtpSuccess
                             ? '#1D9E75'
                             : isOtpFailed
                             ? '#E5341A'
                             : '#E5341A'
                           : 'var(--border)'
                       }`,
                       borderRadius: '12px',
                       transition: 'all 0.2s ease',
                       userSelect: 'none',
                       pointerEvents: 'none',
                       zIndex: 1,
                     }}
                   >
                     {boxValues[index]
                       ? boxMasked[index]
                         ? '•'
                         : boxValues[index]
                       : ''}
                   </div>
                 </div>
               ))}
             </div>

             <button
                onClick={submitOtp}
                disabled={loading || boxValues.join('').length !== 6}
                className="w-full py-4 bg-[#E5341A] text-white font-bold rounded-[12px] transition-colors hover:bg-red-600 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
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
                ← Back to registration
             </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-down-req {
          0%   { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down-req {
          animation: slide-down-req 0.3s ease forwards;
        }

        @keyframes checkBounce {
          0%  { transform: scale(0.8); }
          60% { transform: scale(1.15); }
          100%{ transform: scale(1); }
        }
        .animate-checkBounce {
          animation: checkBounce 0.3s ease;
        }

        @keyframes slideInRight {
          0%   { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          0%   { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInRight { animation: slideInRight 0.25s ease forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.25s ease forwards; }

        @keyframes slideDown {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.2s ease forwards; }

        @keyframes otpShake {
          0%,100%{ transform: translateX(0); }
          20%    { transform: translateX(-8px); }
          40%    { transform: translateX(8px); }
          60%    { transform: translateX(-6px); }
          80%    { transform: translateX(6px); }
        }
        .animate-otpShake { animation: otpShake 0.5s ease; }
      `}</style>
    </div>
  )
}
