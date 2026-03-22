import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ChatWidget from '../components/ChatWidget'
import { PhoneIcon, StarIcon } from '@heroicons/react/24/solid'

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
    return {
      name: d.patient_name,
      blood_type: d.blood_group,
      age: d.date_of_birth ? (new Date().getFullYear() - parseInt(d.date_of_birth.split('-')[0])) : null,
      conditions: [
        d.chronic_conditions,
        d.is_diabetic && 'Diabetic',
        d.is_cardiac_patient && 'Cardiac Patient',
        d.is_epileptic && 'Epileptic',
        d.is_asthmatic && 'Asthmatic',
        d.has_pacemaker && 'Has Pacemaker',
      ].filter(Boolean).flatMap(c => typeof c === 'string' ? c.split(',').map(s => s.trim()) : [c]),
      medications: [
        d.current_medications,
        ...(d.prescriptions || []).map(p => p.drug_name)
      ].filter(Boolean).flatMap(m => typeof m === 'string' ? m.split(',').map(s => s.trim()) : [m]),
      allergies: d.allergies ? d.allergies.split(',').map(a => a.trim()) : []
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary">Loading Emergency Data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-primary mb-3">Access Error</h1>
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
          <h1 className="text-4xl font-black text-primary mb-1">{data.patient_name}</h1>
          {data.medilink_id && (
            <div className="mb-2">
              <span className="text-xs uppercase tracking-widest text-red-300 font-bold opacity-80">MediLink ID</span>
              <p className="text-xl font-mono font-semibold text-white tracking-widest">{data.medilink_id}</p>
            </div>
          )}
          {data.date_of_birth && (
            <p className="text-secondary text-sm">
              DOB: {data.date_of_birth} · Age: {new Date().getFullYear() - parseInt(data.date_of_birth?.split('-')[0])}
            </p>
          )}
        </div>

        {/* BLOOD GROUP — Large Display */}
        <div className="text-center py-10 bg-gradient-to-br from-red-950/50 to-slate-900/50 border-2 border-red-500/40 rounded-2xl mb-6">
          <p className="text-secondary uppercase tracking-[0.3em] text-sm mb-3">Blood Group</p>
          <div className="emergency-blood-group">{data.blood_group || '?'}</div>
          {!data.blood_group && <p className="text-secondary text-sm mt-2">Not specified</p>}
        </div>

        {/* CRITICAL CONDITIONS */}
        {conditions.length > 0 && (
          <div className="emergency-card mb-6">
            <h2 className="text-red-400 font-black uppercase tracking-wider text-sm mb-4">⚠️ Critical Conditions</h2>
            <div className="grid grid-cols-2 gap-2">
              {conditions.map((c, i) => (
                <div key={i} className="bg-red-500/20 border border-red-500/40 rounded-xl py-3 px-4 text-center">
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="text-sm font-bold text-primary">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALLERGIES */}
        {data.allergies && (
          <div className="bg-red-950/50 border-2 border-red-500/60 rounded-2xl p-5 mb-4">
            <h2 className="text-red-400 font-black uppercase tracking-wider text-sm mb-3">⛔ Known Allergies — DO NOT ADMINISTER</h2>
            <p className="text-primary font-bold text-lg leading-relaxed">{data.allergies}</p>
          </div>
        )}

        {/* MEDICATIONS */}
        {(data.current_medications || data.prescriptions?.length > 0) && (
          <div className="card mb-4 bg-slate-900 border-yellow-500/20 shadow-lg shadow-yellow-950/20">
            <h2 className="text-yellow-400 font-black uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
              <span className="text-xl">💊</span> Active Medications
            </h2>
            <div className="space-y-4">
              {data.prescriptions?.map((p, idx) => (
                <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xl font-black text-white uppercase tracking-tight">{p.drug_name}</p>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">{p.dosage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400/80 text-xs font-bold uppercase tracking-widest">
                    <span>{p.frequency?.replace('_', ' ')}</span>
                    {p.instructions && <span className="text-slate-500 italic lowercase tracking-tight border-l border-slate-700 pl-2">"{p.instructions}"</span>}
                  </div>
                </div>
              ))}
              {data.current_medications && (
                <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 text-slate-300 text-sm italic">
                  Additional Notes: {data.current_medications}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PSYCHIATRIC MEDICATIONS */}
        {data.psychiatric_medications && (
          <div className="card mb-4 border-purple-500/30">
            <h2 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-3">🧠 Psychiatric Medications</h2>
            <p className="text-primary leading-relaxed">{data.psychiatric_medications}</p>
          </div>
        )}

        {/* CHRONIC CONDITIONS */}
        {data.chronic_conditions && (
          <div className="card mb-4">
            <h2 className="text-orange-400 font-bold uppercase tracking-wider text-sm mb-3">🏥 Chronic Conditions</h2>
            <p className="text-primary leading-relaxed">{data.chronic_conditions}</p>
          </div>
        )}

        {/* SURGICAL HISTORY */}
        {data.surgical_history && (
          <div className="card mb-4">
            <h2 className="text-secondary font-bold uppercase tracking-wider text-sm mb-3">🔪 Surgical History</h2>
            <p className="text-primary leading-relaxed">{data.surgical_history}</p>
          </div>
        )}

        {/* IMMUNIZATION */}
        {data.immunization_records && (
          <div className="card mb-4">
            <h2 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-3">💉 Immunization Records</h2>
            <p className="text-primary leading-relaxed">{data.immunization_records}</p>
          </div>
        )}

        {/* EMERGENCY CONTACTS */}
        {(data.emergency_contacts?.length > 0 || data.emergency_contact_name) && (
          <div className="card border-green-500/30 mb-4">
            <h2 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-4">📞 Emergency Contacts</h2>
            <div className="space-y-4">
              {data.emergency_contacts?.length > 0 ? (
                data.emergency_contacts.sort((a,b) => b.is_primary - a.is_primary).map((contact, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${contact.is_primary ? 'bg-green-600/20 border-green-400' : 'bg-slate-900 border-slate-800'}`}>
                    <div>
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-xl font-semibold">{contact.name}</span>
                        {contact.is_primary && <StarIcon className="w-5 h-5 text-amber-400" />}
                      </div>
                      <span className="text-xs uppercase font-extrabold text-secondary tracking-widest">{contact.relationship}</span>
                      <p className="font-mono text-green-400 mt-1 font-bold">{contact.phone}</p>
                    </div>
                    <a href={`tel:${contact.phone}`} className="bg-green-600 hover:bg-green-500 p-4 rounded-full transition-all shadow-xl shadow-green-950">
                      <PhoneIcon className="w-6 h-6 text-white" />
                    </a>
                  </div>
                ))
              ) : (
                /* Fallback to legacy single contact if no list available */
                <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <div>
                    <p className="text-xl font-bold text-white">{data.emergency_contact_name}</p>
                    <p className="text-secondary text-xs font-bold uppercase tracking-widest">{data.emergency_contact_relation}</p>
                    <p className="font-mono text-green-400 mt-1 font-bold">{data.emergency_contact_phone}</p>
                  </div>
                  <a href={`tel:${data.emergency_contact_phone}`} className="bg-green-600 p-4 rounded-full shadow-lg">
                    <PhoneIcon className="w-6 h-6 text-white" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCTOR */}
        {data.doctor_name && (
          <div className="card border-blue-500/30 mb-6">
            <h2 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">🩺 Primary Doctor</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-primary">{data.doctor_name}</p>
                <p className="text-secondary font-mono text-sm">{data.doctor_phone}</p>
              </div>
              <a
                href={`tel:${data.doctor_phone}`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-primary font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
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
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-primary font-black text-lg shadow-xl hover:shadow-red-500/30 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
        >
          🤖 Get AI Emergency Guidance
        </button>

        <p className="text-center text-secondary text-xs mt-4">
          MediLink Emergency Access · No login required · Data is read-only
        </p>
      </div>

      {showChat && <ChatWidget patientContext={patientContext} />}
    </div>
  )
}
