import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { API_URL } from '../config'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw { response: { data } };
      }
      
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email) => {
    setForm({ email, password: 'demo1234' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Login with OTP for secure access</p>
        </div>

        {step === 'identifier' ? (
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
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep('identifier')}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors"
            >
              Change Email/Mobile
            </button>
          </form>
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
