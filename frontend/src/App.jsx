import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SplashScreen from './components/SplashScreen'
import AnimatedBackground from './components/AnimatedBackground'
import ProtectedRoute from './components/ProtectedRoute'
import SessionTimeout from './components/SessionTimeout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MedicalProfile from './pages/MedicalProfile'
import QRCodePage from './pages/QRCodePage'
import ScanQR from './pages/ScanQR'
import EmergencyView from './pages/EmergencyView'
import Chatbot from './pages/Chatbot'
import Appointments from './pages/Appointments'
import MedicalRecords from './pages/MedicalRecords'
import Prescriptions from './pages/Prescriptions'
import EmergencyPage from './pages/emergency/[token]'
import Fundraising from './pages/Fundraising'
import NearbyHospitals from './pages/NearbyHospitals'
import HospitalConcessions from './pages/HospitalConcessions'
import MedicalIDCard from './pages/MedicalIDCard'
import BiometricPortal from './pages/BiometricPortal'
import BiometricEnroll from './pages/BiometricEnroll'
import DoctorVerification from './pages/DoctorVerification'
import PublicFundraising from './pages/PublicFundraising'
import Settings from './pages/Settings'
import EmergencyContacts from './pages/EmergencyContacts'

import { useEffect } from 'react'
import { API_URL } from './config'

const PlaceholderPage = ({ title }) => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-primary)',
    gap: '16px'
  }}>
    <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This section is coming soon.</p>
  </div>
)

const NotFound = () => (
  <div style={{
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'var(--text-primary)',
    textAlign: 'center',
    padding: '40px'
  }}>
    <div style={{ fontSize: '72px', fontWeight: 700, color: '#E5341A' }}>404</div>
    <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Page Not Found</h1>
    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
      The page you are looking for does not exist or has been moved.
    </p>
    <a href="/" style={{
      background: '#E5341A',
      color: '#ffffff',
      padding: '12px 32px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: 600,
      marginTop: '8px'
    }}>
      Go Home
    </a>
  </div>
)

export default function App() {
  const [showInitialSplash, setShowInitialSplash] = useState(true);
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    // Keep Render server from sleeping
    const keepAlive = setInterval(() => {
      fetch(`${API_URL}/health`)
        .catch(() => {})
    }, 4 * 60 * 1000)
    return () => clearInterval(keepAlive)
  }, [])

  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
        <AnimatedBackground isDark={isDark} />
        {showInitialSplash && <SplashScreen onComplete={() => setShowInitialSplash(false)} />}
        <SessionTimeout />
        <Navbar />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(100,116,139,0.3)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <div className="min-h-screen flex flex-col relative z-20 pt-16 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          <div className="flex-1 pb-16">
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/scan-qr" element={<ScanQR />} />
          <Route path="/emergency/:qr_token" element={<EmergencyView />} />
          <Route path="/emergency/:token" element={<EmergencyPage />} />
          <Route path="/fundraising" element={<PublicFundraising />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><MedicalProfile /></ProtectedRoute>} />
          <Route path="/dashboard/qr-code" element={<ProtectedRoute><QRCodePage /></ProtectedRoute>} />
          <Route path="/dashboard/medical-card" element={<ProtectedRoute><MedicalIDCard /></ProtectedRoute>} />
          <Route path="/dashboard/emergency-contacts" element={<ProtectedRoute><EmergencyContacts /></ProtectedRoute>} />
          <Route path="/dashboard/health-records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
          <Route path="/dashboard/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/dashboard/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Other nested protected routes */}
          <Route path="/dashboard/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/dashboard/fundraising-apply" element={<ProtectedRoute><Fundraising /></ProtectedRoute>} />
          <Route path="/dashboard/nearby-hospitals" element={<ProtectedRoute><NearbyHospitals /></ProtectedRoute>} />
          <Route path="/dashboard/concessions" element={<ProtectedRoute><HospitalConcessions /></ProtectedRoute>} />
          <Route path="/dashboard/biometric-portal" element={<ProtectedRoute><BiometricPortal /></ProtectedRoute>} />
          
          <Route path="/enroll-biometric" element={<ProtectedRoute><BiometricEnroll /></ProtectedRoute>} />
          <Route path="/doctor-verification" element={<ProtectedRoute><DoctorVerification /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
        <Footer />
        </div>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  )
}
