import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [step, setStep] = useState('identifier')
  
  // Password state
  const [passwordForm, setPasswordForm] = useState({ email: '', password: '' })
  
  // OTP state
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }
      
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email) => {
    setPasswordForm({ email, password: 'demo1234' })
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to send OTP')
      }
      toast.success('OTP sent! Check your email or messages.')
      setStep('verify')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim() || otp.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), otp_code: otp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid OTP')
      }
      
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Login with OTP for secure access</p>
        </div>

        {/* Method Toggle */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl mb-8">
          <button
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              loginMethod === 'password' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Password Use
          </button>
          <button
            onClick={() => setLoginMethod('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              loginMethod === 'otp' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            OTP Use
          </button>
        </div>

        {loginMethod === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="e.g. john@example.com"
                value={passwordForm.email}
                onChange={(e) => setPasswordForm({ ...passwordForm, email: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
              </div>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Logging in...' : 'Login with Password'}
            </button>
            
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400 mb-3 text-center uppercase tracking-wider font-bold">Quick Demo Login</p>
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={() => fillDemo('john.doe@demo.com')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">Patient 1</button>
                <button type="button" onClick={() => fillDemo('jane.smith@demo.com')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">Patient 2</button>
              </div>
            </div>
          </form>
        ) : (
          step === 'identifier' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email or Mobile Number</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. john@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Enter 6-digit OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="input-field text-center tracking-[1em] font-mono text-xl"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2 text-center">OTP expires in 2 minutes</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Verifying...' : 'Login with OTP'}
              </button>
              <button 
                type="button" 
                onClick={() => setStep('identifier')}
                className="w-full text-sm text-slate-400 hover:text-white transition-colors"
              >
                Change Email/Mobile
              </button>
            </form>
          )
        )}

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
