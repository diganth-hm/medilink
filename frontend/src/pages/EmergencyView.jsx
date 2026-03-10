import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ChatWidget from '../components/ChatWidget'

export default function EmergencyView() {
  const { qr_token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    axios.get(`/emergency/${qr_token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Patient not found'))
      .finally(() => setLoading(false))
  }, [qr_token])

  const buildPatientContext = (d) => {
    const parts = [
      `Patient: ${d.patient_name}`,
      d.blood_group && `Blood Group: ${d.blood_group}`,
      d.date_of_birth && `DOB: ${d.date_of_birth}`,
      d.allergies && `Allergies: ${d.allergies}`,
      d.current_medications && `Medications: ${d.current_medications}`,
      d.chronic_conditions && `Conditions: ${d.chronic_conditions}`,
      d.is_diabetic && 'IS DIABETIC',
      d.is_cardiac_patient && 'IS CARDIAC PATIENT',
      d.is_epileptic && 'IS EPILEPTIC',
      d.is_asthmatic && 'IS ASTHMATIC',
      d.has_pacemaker && 'HAS PACEMAKER — AVOID MRI/DEFIBRILLATION',
      d.has_implants && 'HAS MEDICAL IMPLANTS',
      d.psychiatric_medications && `Psychiatric Meds: ${d.psychiatric_medications}`,
      d.surgical_history && `Surgical History: ${d.surgical_history}`,
      d.emergency_contact_name && `Emergency Contact: ${d.emergency_contact_name} (${d.emergency_contact_relation}) ${d.emergency_contact_phone}`,
      d.doctor_name && `Primary Doctor: ${d.doctor_name} ${d.doctor_phone}`,
    ].filter(Boolean)
    return parts.join('. ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Emergency Data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Error</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <Link to="/scan" className="btn-primary">← Back to Scanner</Link>
        </div>
      </div>
    )
  }

  const conditions = []
  if (data.is_diabetic) conditions.push({ label: 'DIABETIC', icon: '💉', color: 'blue' })
  if (data.is_cardiac_patient) conditions.push({ label: 'CARDIAC PATIENT', icon: '❤️', color: 'red' })
  if (data.is_epileptic) conditions.push({ label: 'EPILEPTIC', icon: '⚡', color: 'yellow' })
  if (data.is_asthmatic) conditions.push({ label: 'ASTHMATIC', icon: '💨', color: 'cyan' })
  if (data.has_pacemaker) conditions.push({ label: 'HAS PACEMAKER', icon: '🔋', color: 'purple' })
  if (data.has_implants) conditions.push({ label: 'IMPLANTS PRESENT', icon: '🔩', color: 'orange' })

  const patientContext = buildPatientContext(data)

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 px-4">
      {/* EMERGENCY HEADER */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-red-900/80 to-red-800/60 border border-red-500/50 rounded-2xl p-5 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
            <span className="text-red-300 text-xs font-bold uppercase tracking-[0.3em]">Emergency Medical Access</span>
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white mb-1">{data.patient_name}</h1>
          {data.date_of_birth && (
            <p className="text-slate-400 text-sm">
              DOB: {data.date_of_birth} · Age: {new Date().getFullYear() - parseInt(data.date_of_birth?.split('-')[0])}
            </p>
          )}
        </div>

        {/* BLOOD GROUP — Large Display */}
        <div className="text-center py-10 bg-gradient-to-br from-red-950/50 to-slate-900/50 border-2 border-red-500/40 rounded-2xl mb-6">
          <p className="text-slate-400 uppercase tracking-[0.3em] text-sm mb-3">Blood Group</p>
          <div className="emergency-blood-group">{data.blood_group || '?'}</div>
          {!data.blood_group && <p className="text-slate-500 text-sm mt-2">Not specified</p>}
        </div>

        {/* CRITICAL CONDITIONS */}
        {conditions.length > 0 && (
          <div className="emergency-card mb-6">
            <h2 className="text-red-400 font-black uppercase tracking-wider text-sm mb-4">⚠️ Critical Conditions</h2>
            <div className="grid grid-cols-2 gap-2">
              {conditions.map((c, i) => (
                <div key={i} className="bg-red-500/20 border border-red-500/40 rounded-xl py-3 px-4 text-center">
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="text-sm font-bold text-white">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALLERGIES */}
        {data.allergies && (
          <div className="bg-red-950/50 border-2 border-red-500/60 rounded-2xl p-5 mb-4">
            <h2 className="text-red-400 font-black uppercase tracking-wider text-sm mb-3">⛔ Known Allergies — DO NOT ADMINISTER</h2>
            <p className="text-white font-bold text-lg leading-relaxed">{data.allergies}</p>
          </div>
        )}

        {/* MEDICATIONS */}
        {data.current_medications && (
          <div className="card mb-4">
            <h2 className="text-yellow-400 font-bold uppercase tracking-wider text-sm mb-3">💊 Current Medications</h2>
            <p className="text-slate-200 leading-relaxed">{data.current_medications}</p>
          </div>
        )}

        {/* PSYCHIATRIC MEDICATIONS */}
        {data.psychiatric_medications && (
          <div className="card mb-4 border-purple-500/30">
            <h2 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-3">🧠 Psychiatric Medications</h2>
            <p className="text-slate-200 leading-relaxed">{data.psychiatric_medications}</p>
          </div>
        )}

        {/* CHRONIC CONDITIONS */}
        {data.chronic_conditions && (
          <div className="card mb-4">
            <h2 className="text-orange-400 font-bold uppercase tracking-wider text-sm mb-3">🏥 Chronic Conditions</h2>
            <p className="text-slate-200 leading-relaxed">{data.chronic_conditions}</p>
          </div>
        )}

        {/* SURGICAL HISTORY */}
        {data.surgical_history && (
          <div className="card mb-4">
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-3">🔪 Surgical History</h2>
            <p className="text-slate-200 leading-relaxed">{data.surgical_history}</p>
          </div>
        )}

        {/* IMMUNIZATION */}
        {data.immunization_records && (
          <div className="card mb-4">
            <h2 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-3">💉 Immunization Records</h2>
            <p className="text-slate-200 leading-relaxed">{data.immunization_records}</p>
          </div>
        )}

        {/* EMERGENCY CONTACT */}
        {data.emergency_contact_name && (
          <div className="card border-green-500/30 mb-4">
            <h2 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-4">📞 Emergency Contact</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{data.emergency_contact_name}</p>
                <p className="text-slate-400 text-sm">{data.emergency_contact_relation}</p>
              </div>
              <a
                href={`tel:${data.emergency_contact_phone}`}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                📱 Call Now
              </a>
            </div>
            <p className="text-slate-400 mt-2 font-mono">{data.emergency_contact_phone}</p>
          </div>
        )}

        {/* DOCTOR */}
        {data.doctor_name && (
          <div className="card border-blue-500/30 mb-6">
            <h2 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">🩺 Primary Doctor</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-white">{data.doctor_name}</p>
                <p className="text-slate-400 font-mono text-sm">{data.doctor_phone}</p>
              </div>
              <a
                href={`tel:${data.doctor_phone}`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                📱 Call
              </a>
            </div>
          </div>
        )}

        {/* AI GUIDANCE BUTTON */}
        <button
          id="get-ai-guidance"
          onClick={() => setShowChat(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-black text-lg shadow-xl hover:shadow-red-500/30 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
        >
          🤖 Get AI Emergency Guidance
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          MediLink Emergency Access · No login required · Data is read-only
        </p>
      </div>

      {showChat && <ChatWidget patientContext={patientContext} />}
    </div>
  )
}
