import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChatWidget from '../components/ChatWidget'

const features = [
  { icon: '🔴', title: 'Blood Group Access', desc: 'Instant blood type info for trauma & transfusion decisions' },
  { icon: '💊', title: 'Medication Profiles', desc: 'Full medication list for drug interaction checks' },
  { icon: '⚡', title: 'Condition Alerts', desc: 'Epilepsy, cardiac, asthma, diabetes flags prominently displayed' },
  { icon: '📞', title: 'Emergency Contacts', desc: 'One-tap calling to family & primary physician' },
  { icon: '🤖', title: 'AI Guidance', desc: 'Groq-powered AI trained on patient context for emergency decisions' },
  { icon: '📲', title: 'QR Code Access', desc: 'Scan QR to instantly access any patient\'s critical data — no login needed' },
]

const scenarios = [
  { icon: '🚗', label: 'Road Accident' },
  { icon: '❤️', label: 'Cardiac Arrest' },
  { icon: '🤧', label: 'Anaphylaxis' },
  { icon: '💉', label: 'Diabetic Emergency' },
  { icon: '⚡', label: 'Seizure' },
  { icon: '💨', label: 'Asthma Attack' },
  { icon: '🧠', label: 'Mental Health Crisis' },
  { icon: '🏥', label: 'Surgical Emergency' },
]

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Emergency Medical Access System</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 leading-tight">
            Critical Medical Info<br />
            <span className="gradient-text">In Seconds</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            MediLink gives first responders instant access to patient medical profiles via QR code — 
            no login required. Save lives when every second counts.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4">Go to Dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-4">
                  🏥 Register as Patient
                </Link>
                <Link to="/scan" className="btn-secondary text-base px-8 py-4">
                  📷 Scan QR Code
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            {[
              { value: '11', label: 'Emergency Scenarios Covered' },
              { value: 'AI', label: 'Powered by Groq/Qwen' },
              { value: 'QR', label: 'Zero-Login Access' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black gradient-text">{stat.value}</div>
                <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Scenarios */}
      <div className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">Every Emergency, Covered</h2>
          <p className="text-slate-400">MediLink stores data for all critical medical scenarios</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scenarios.map((s, i) => (
            <div key={i} className="card-hover text-center p-4">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-sm text-slate-300 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">How MediLink Saves Lives</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="card-hover group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-20 max-w-3xl mx-auto text-center">
        <div className="card bg-gradient-to-br from-blue-900/40 to-violet-900/40 border-blue-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Set Up Your Medical Profile Today</h2>
          <p className="text-slate-400 mb-8">
            In an emergency, you may not be able to speak. Let MediLink speak for you.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-4">
            Create Free Profile →
          </Link>
        </div>
      </div>

      <ChatWidget />
    </div>
  )
}
