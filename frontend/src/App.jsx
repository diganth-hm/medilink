import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import Navbar from './components/Navbar'
import SplashScreen from './components/SplashScreen'
import AnimatedBackground from './components/AnimatedBackground'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MedicalProfile from './pages/MedicalProfile'
import QRCodePage from './pages/QRCodePage'
import ScanQR from './pages/ScanQR'
import EmergencyView from './pages/EmergencyView'
import Chatbot from './pages/Chatbot'
import MedicalRecords from './pages/MedicalRecords'
import EmergencyPage from './pages/emergency/[token]'
import Fundraising from './pages/Fundraising'
import NearbyHospitals from './pages/NearbyHospitals'
import HospitalConcessions from './pages/HospitalConcessions'
import MedicalIDCard from './pages/MedicalIDCard'
import BiometricPortal from './pages/BiometricPortal'
import BiometricEnroll from './pages/BiometricEnroll'
import DoctorVerification from './pages/DoctorVerification'
import PublicFundraising from './pages/PublicFundraising'

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
        <AnimatedBackground />
        <SplashScreen />
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
        <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/emergency/:qr_token" element={<EmergencyView />} />
          <Route path="/emergency/:token" element={<EmergencyPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><MedicalProfile /></ProtectedRoute>} />
          <Route path="/qr-code" element={<ProtectedRoute><QRCodePage /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/fundraising" element={<ProtectedRoute><Fundraising /></ProtectedRoute>} />
          <Route path="/nearby-hospitals" element={<ProtectedRoute><NearbyHospitals /></ProtectedRoute>} />
          <Route path="/concessions" element={<ProtectedRoute><HospitalConcessions /></ProtectedRoute>} />
          <Route path="/medical-id" element={<ProtectedRoute><MedicalIDCard /></ProtectedRoute>} />
          <Route path="/biometric-portal" element={<ProtectedRoute><BiometricPortal /></ProtectedRoute>} />
          <Route path="/biometric-enroll" element={<ProtectedRoute><BiometricEnroll /></ProtectedRoute>} />
          <Route path="/doctor-verification" element={<ProtectedRoute><DoctorVerification /></ProtectedRoute>} />
          <Route path="/explore-fundraising" element={<PublicFundraising />} />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center text-center px-4 pt-16">
              <div>
                <div className="text-8xl mb-6">🔍</div>
                <h1 className="text-4xl font-bold text-primary mb-3">Page Not Found</h1>
                <p className="text-secondary mb-6">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn-primary px-8 py-3 inline-block">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
        </div>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  )
}
