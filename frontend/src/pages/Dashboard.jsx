import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import ChatWidget from '../components/ChatWidget'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [qrInfo, setQrInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const calls = [
          axios.get('/patient/profile'),
          axios.get('/qrcode/my-qr-info')
        ]
        
        if (user?.role === 'doctor') {
          calls.push(axios.get('/doctor/profile'))
        }

        const results = await Promise.allSettled(calls)
        
        if (results[0].status === 'fulfilled') setProfile(results[0].value.data)
        if (results[1].status === 'fulfilled') setQrInfo(results[1].value.data)
        if (user?.role === 'doctor' && results[2]?.status === 'fulfilled') {
          setDoctorProfile(results[2].value.data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post('/doctor/upload-license', formData)
      toast.success('License uploaded! Verification pending.')
      // Refresh doctor profile
      const res = await axios.get('/doctor/profile')
      setDoctorProfile(res.data)
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const profileFields = profile ? [
    'blood_group', 'allergies', 'current_medications', 'chronic_conditions',
    'emergency_contact_name', 'doctor_name',
  ] : []
  const filledFields = profileFields.filter(f => profile?.[f]).length
  const completionPct = profile ? Math.round((filledFields / profileFields.length) * 100) : 0

  const stats = [
    {
      icon: '📊',
      label: 'Profile Completion',
      value: loading ? '...' : `${completionPct}%`,
      sub: profile ? `${filledFields}/${profileFields.length} sections filled` : 'No profile yet',
      color: 'blue',
      link: '/dashboard/profile',
    },
    {
      icon: '📱',
      label: 'QR Code Status',
      value: loading ? '...' : (qrInfo ? 'Active' : 'Not Generated'),
      sub: qrInfo ? 'Shareable & ready' : 'Generate your QR code',
      color: qrInfo ? 'green' : 'yellow',
      link: '/dashboard/qr-code',
    },
    {
      icon: '🩺',
      label: 'Last Updated',
      value: profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never',
      sub: 'Keep your profile current',
      color: 'violet',
      link: '/dashboard/profile',
    },
  ]

  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
  }

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-xl font-bold text-primary shadow-lg">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Welcome, {user?.name}!</h1>
            <span className="badge-blue capitalize">{user?.role}</span>
          </div>
        </div>
        <p className="text-secondary mt-2 ml-15">Manage your emergency medical profile</p>
      </div>

      {user?.role === 'doctor' && (
        <div className={`mb-8 p-6 rounded-3xl border ${
          doctorProfile?.verification_status === 'approved' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : doctorProfile?.verification_status === 'rejected'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <span className="text-3xl">
              {doctorProfile?.verification_status === 'approved' ? '✅' : '⏳'}
            </span>
            <div>
              <h3 className="font-bold text-lg">Verification Status: {doctorProfile?.verification_status?.toUpperCase() || 'NOT STARTED'}</h3>
              <p className="text-sm opacity-80">
                {doctorProfile?.verification_status === 'approved' 
                  ? 'Your medical license is verified. You have full access to patient emergency records.' 
                  : 'Please upload your medical license to access full patient data.'}
              </p>
            </div>
          </div>
          {doctorProfile?.verification_status !== 'approved' && (
            <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-center">
               {uploading ? 'Uploading...' : 'Upload License (PDF/JPG)'}
               <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={uploading} />
            </label>
          )}
        </div>
      )}

      {user?.role === 'hospital' && (
        <div className="mb-8 p-6 rounded-3xl border bg-blue-500/10 border-blue-500/20 text-blue-400 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🏁</span>
            <div>
              <h3 className="font-bold text-lg">Verification Management</h3>
              <p className="text-sm opacity-80">You have administrative rights to verify medical professionals and fundraising applications.</p>
            </div>
          </div>
          <Link to="/doctor-verification" className="bg-blue-600 hover:bg-blue-500 text-primary px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-center">
            Review Applications →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => (
          <Link key={i} to={s.link} className={`card bg-gradient-to-br ${colorMap[s.color]} hover:scale-105 transition-all duration-200`}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{s.icon}</div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-secondary mt-0.5">{s.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-primary mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: '📝',
            title: 'Edit Medical Profile',
            desc: 'Update your health info, medications, and emergency contacts',
            link: '/dashboard/profile',
            btn: 'Update Profile',
            gradient: 'from-blue-600 to-blue-700',
          },
          {
            icon: '📲',
            title: 'View QR Code',
            desc: 'Download & share your emergency QR code',
            link: '/dashboard/qr-code',
            btn: 'View QR',
            gradient: 'from-violet-600 to-purple-700',
          },
          {
            icon: '📄',
            title: 'Medical Records',
            desc: 'Upload and manage your medical documents',
            link: '/dashboard/health-records',
            btn: 'View Records',
            gradient: 'from-fuchsia-600 to-pink-700',
          },
          {
            icon: '🤖',
            title: 'Chat with AI',
            desc: 'Ask MediLink AI any health or emergency question',
            link: '/dashboard/chatbot',
            btn: 'Open Chat',
            gradient: 'from-emerald-600 to-teal-700',
          },
          {
            icon: '💰',
            title: 'Medical Fundraising',
            desc: 'Apply for emergency medical fundraising support',
            link: '/dashboard/fundraising-apply',
            btn: 'Apply Now',
            gradient: 'from-orange-600 to-amber-700',
          },
          {
            icon: '🏥',
            title: 'Nearby Hospitals',
            desc: 'Emergency hospital directory with live availability',
            link: '/dashboard/nearby-hospitals',
            btn: 'Find Hospitals',
            gradient: 'from-red-600 to-rose-700',
          },
          {
            icon: '🎫',
            title: 'Hospital Concessions',
            desc: 'Government schemes and hospital bill concessions',
            link: '/dashboard/concessions',
            btn: 'View Schemes',
            gradient: 'from-blue-600 to-indigo-700',
          },
          {
            icon: '🪪',
            title: 'Medical ID Card',
            desc: 'Generate your digital medical ID with QR code',
            link: '/dashboard/medical-card',
            btn: 'Generate ID',
            gradient: 'from-violet-600 to-purple-700',
          },
          {
            icon: '🔬',
            title: 'Biometric Enrollment',
            desc: 'Register your fingerprint for secure access',
            link: '/dashboard/biometric-portal',
            btn: 'Enroll Now',
            gradient: 'from-cyan-600 to-teal-700',
          },
        ].map((action, i) => (
          <div key={i} className="card-hover flex flex-col">
            <div className="text-4xl mb-3">{action.icon}</div>
            <h3 className="font-bold text-primary mb-2">{action.title}</h3>
            <p className="text-secondary text-sm flex-1 mb-4">{action.desc}</p>
            <Link
              to={action.link}
              className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r ${action.gradient} text-primary font-semibold text-sm hover:opacity-90 transition-opacity`}
            >
              {action.btn} →
            </Link>
          </div>
        ))}
      </div>

      {/* Responder Tools */}
      <div className="card bg-gradient-to-br from-red-900/30 to-orange-900/20 border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🚨</div>
          <div>
            <h3 className="text-lg font-bold text-primary mb-1">Emergency Responder Tools</h3>
            <p className="text-secondary text-sm mb-4">Scan a patient's QR code to instantly access their medical information — no login required</p>
            <Link to="/scan" className="btn-danger text-sm px-5 py-2.5 inline-flex items-center gap-2">
              📷 Scan Patient QR Code
            </Link>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  )
}
