import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Medi<span className="gradient-text">Link</span></span>
          </Link>

          {/* Help Center Button */}
          <div className="flex-1 max-w-xs mx-4 hidden lg:block">
            <a 
              href="mailto:medilinkorg@yahoo.com" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors text-xs text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Help Center
            </a>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={`btn-ghost ${isActive('/dashboard') ? 'text-blue-400 bg-blue-500/10' : ''}`}>Dashboard</Link>
                <Link to="/profile" className={`btn-ghost ${isActive('/profile') ? 'text-blue-400 bg-blue-500/10' : ''}`}>Profile</Link>
                <Link to="/qr-code" className={`btn-ghost ${isActive('/qr-code') ? 'text-blue-400 bg-blue-500/10' : ''}`}>My QR</Link>
                <Link to="/records" className={`btn-ghost ${isActive('/records') ? 'text-blue-400 bg-blue-500/10' : ''}`}>Records</Link>
                <Link to="/fundraising" className={`btn-ghost ${isActive('/fundraising') ? 'text-blue-400 bg-blue-500/10' : ''}`}>Fundraising</Link>
                <Link to="/chatbot" className={`btn-ghost ${isActive('/chatbot') ? 'text-blue-400 bg-blue-500/10' : ''}`}>AI Assistant</Link>
                {(user?.role === 'doctor' || user?.role === 'hospital') && (
                  <Link to="/biometric-portal" className={`btn-ghost ${isActive('/biometric-portal') ? 'text-emerald-400 bg-emerald-500/10' : ''}`}>Biometric Portal</Link>
                )}
                <div className="mx-2 h-6 w-px bg-slate-700" />
                <span className="text-sm text-slate-400 mr-2">{user?.name}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm px-4 py-2">Logout</button>
              </>
            ) : (
              <>
                <Link to="/scan" className={`btn-ghost ${isActive('/scan') ? 'text-blue-400 bg-blue-500/10' : ''}`}>Scan QR</Link>
                <Link to="/login" className="btn-ghost">Login</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">Register</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">Dashboard</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">Profile</Link>
                <Link to="/qr-code" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">My QR Code</Link>
                <Link to="/records" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">Medical Records</Link>
                <Link to="/chatbot" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">AI Assistant</Link>
                <button onClick={handleLogout} className="w-full text-left py-2 px-3 rounded-lg text-red-400 hover:bg-red-500/10">Logout</button>
              </>
            ) : (
              <>
                <Link to="/scan" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">Scan QR</Link>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2 px-3 rounded-lg bg-blue-600 text-white">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
