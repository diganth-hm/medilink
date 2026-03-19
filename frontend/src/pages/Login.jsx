import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import OTPModal from '../components/OTPModal'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  
  // OTP integration
  const [showOTP, setShowOTP] = useState(false)
  const [otpIdentifier, setOtpIdentifier] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      
      // Credentials verified! Now trigger OTP modal.
      setOtpIdentifier(data.identifier || form.email)
      setShowOTP(true)
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerifySuccess = (authData) => {
    // The verify endpoint returns the JWT on success for existing users
    setShowOTP(false)
    login(authData.access_token, authData.user)
    toast.success(`Welcome back, ${authData.user.name}!`)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-xl">🏥</div>
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome Back</h1>
          <p className="text-secondary">Sign in to your MediLink account</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Email Address</label>
            <input
              type="text"
              required
              className="input-field w-full outline-none p-3 rounded-xl bg-dark text-primary border border-border focus:border-primary"
              placeholder="john@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Password</label>
            <input
              type="password"
              required
              className="input-field w-full outline-none p-3 rounded-xl bg-dark text-primary border border-border focus:border-primary"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Checking credentials...' : 'Login Securely'}
          </button>

          <div className="p-4 bg-surface rounded-xl border border-border">
            <p className="text-xs text-muted mb-3 text-center uppercase tracking-wider font-bold">⚡ Quick Demo Login</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setForm({ email: 'john.doe@demo.com', password: 'demo1234' })}
                className="px-3 py-1.5 bg-dark hover:brightness-110 rounded text-xs text-primary transition-colors border border-border">
                Patient 1
              </button>
              <button type="button" onClick={() => setForm({ email: 'jane.smith@demo.com', password: 'demo1234' })}
                className="px-3 py-1.5 bg-dark hover:brightness-110 rounded text-xs text-primary transition-colors border border-border">
                Patient 2
              </button>
            </div>
          </div>
        </form>

        {/* Register link */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary font-medium transition-colors">
              Register
            </Link>
          </p>
        </div>

      </div>

      <OTPModal
        isOpen={showOTP}
        identifier={otpIdentifier}
        isRegistration={false}
        onVerifySuccess={handleOTPVerifySuccess}
        onClose={() => setShowOTP(false)}
      />
    </div>
  )
}
