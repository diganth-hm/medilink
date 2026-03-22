import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import ChatWidget from '../components/ChatWidget'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const defaultForm = {
  blood_group: '', date_of_birth: '',
  allergies: '', current_medications: '', chronic_conditions: '',
  surgical_history: '', immunization_records: '', psychiatric_medications: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  doctor_name: '', doctor_phone: '',
  has_pacemaker: false, has_implants: false, is_diabetic: false,
  is_cardiac_patient: false, is_epileptic: false, is_asthmatic: false,
  // Doctor Verification Fields
  doctor_id: '', hospital_name: '', specialization: '', license_number: '', contact_details: ''
}

// ── Defined OUTSIDE MedicalProfile so React doesn't recreate them each render ──

const Section = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 mb-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
    <h2 className="text-lg font-black text-slate-900 dark:text-white mb-5 flex items-center gap-3">
      <span className="text-xl p-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl">{icon}</span> {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
)

const Field = ({ label, id, onSet, textarea, ...props }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
    {textarea ? (
      <textarea id={id} className="input w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400" rows={3} {...props} onChange={e => onSet(id, e.target.value)} />
    ) : (
      <input id={id} className="input w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400" {...props} onChange={e => onSet(id, e.target.value)} />
    )}
  </div>
)

const CheckField = ({ label, field, icon, checked, onSet }) => (
  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
    checked 
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.02]' 
      : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50'
  }`}>
    <input type="checkbox" className="hidden" checked={checked} onChange={e => onSet(field, e.target.checked)} />
    <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
      {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
    </div>
    <span className="text-xl">{icon}</span>
    <span className={`text-sm font-bold ${checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
  </label>
)

// ──────────────────────────────────────────────────────────────────────────────

export default function MedicalProfile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditMode = searchParams.get('edit') === 'true'

  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const { user, token } = useAuth()

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/patient/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setForm({ ...defaultForm, ...res.data })
        setIsNew(false)
      })
      .catch(() => setIsNew(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isNew) {
        await axios.post(`${API_URL}/patient/profile`, form, config)
        setIsNew(false)
      } else {
        await axios.put(`${API_URL}/patient/profile`, form, config)
      }
      toast.success('Medical profile saved successfully! ✅')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isEditable = isNew || isEditMode

  const handleCopyId = () => {
    if (form.medilink_id) {
      navigator.clipboard.writeText(form.medilink_id)
      toast.success('MediLink ID copied to clipboard!')
    }
  }


  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Medical Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Keep your emergency info up-to-date and accessible.</p>
      </header>

      {/* MediLink ID Card */}
      {form.medilink_id && (
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-700 shadow-xl gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">MediLink ID</div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold tracking-widest text-white">
                {form.medilink_id}
              </span>
              <button 
                type="button" 
                onClick={handleCopyId}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="Copy to clipboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/dashboard/biometric-portal')}
            className="flex items-center gap-2 border border-blue-500 text-blue-400 hover:bg-blue-500/10 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap"
          >
            <span className="text-xl">🫆</span> Enroll Fingerprint
          </button>
        </div>
      )}

      {/* Read-Only Banner */}
      {!isEditable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl p-5 mb-6 text-sm flex items-start gap-4 border border-blue-200 dark:border-blue-800/50 shadow-sm shadow-blue-500/5">
          <InformationCircleIcon className="w-6 h-6 flex-shrink-0 text-blue-500" />
          <p className="font-bold leading-relaxed">Your profile is view-only. To make changes, go to <Link to="/dashboard/settings" className="underline decoration-2 underline-offset-4 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">Settings</Link> and select "Edit Profile".</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <fieldset disabled={!isEditable} className={!isEditable ? "opacity-90 grayscale-[10%]" : ""}>
        {/* Section 1: Basic Info */}
        <Section title="Basic Info" icon="👤">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1.5">Blood Group</label>
              <select id="blood_group" className="input w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <Field label="Date of Birth" id="date_of_birth" type="date" value={form.date_of_birth || ''} onSet={set} />
          </div>
        </Section>

        {/* Section 2: Allergies & Medications */}
        <Section title="Allergies & Medications" icon="💊">
          <Field label="Known Allergies" id="allergies" textarea placeholder="e.g. Penicillin (severe), shellfish, latex..." value={form.allergies || ''} onSet={set} />
          <Field label="Current Medications" id="current_medications" textarea placeholder="e.g. Metformin 500mg twice daily, Lisinopril 10mg..." value={form.current_medications || ''} onSet={set} />
          <Field label="Psychiatric / Mental Health Medications" id="psychiatric_medications" textarea placeholder="e.g. Sertraline 100mg daily..." value={form.psychiatric_medications || ''} onSet={set} />
        </Section>

        {/* Section 3: Conditions */}
        <Section title="Medical Conditions" icon="🏥">
          <div className="grid grid-cols-2 gap-3">
            <CheckField label="Type 2 Diabetic" field="is_diabetic" icon="💉" checked={form.is_diabetic} onSet={set} />
            <CheckField label="Cardiac Patient" field="is_cardiac_patient" icon="❤️" checked={form.is_cardiac_patient} onSet={set} />
            <CheckField label="Epileptic" field="is_epileptic" icon="⚡" checked={form.is_epileptic} onSet={set} />
            <CheckField label="Asthmatic" field="is_asthmatic" icon="💨" checked={form.is_asthmatic} onSet={set} />
            <CheckField label="Has Pacemaker" field="has_pacemaker" icon="🔋" checked={form.has_pacemaker} onSet={set} />
            <CheckField label="Has Medical Implants" field="has_implants" icon="🔩" checked={form.has_implants} onSet={set} />
          </div>
          <Field label="Chronic Conditions (text)" id="chronic_conditions" textarea placeholder="e.g. Hypertension, Coronary Artery Disease..." value={form.chronic_conditions || ''} onSet={set} />
        </Section>

        {/* Section 4: Surgical & Implant History */}
        <Section title="Surgical & Implant History" icon="🔪">
          <Field label="Surgical History" id="surgical_history" textarea placeholder="e.g. CABG in 2020, Appendectomy 1998..." value={form.surgical_history || ''} onSet={set} />
        </Section>

        {/* Section 5: Immunization */}
        <Section title="Immunization Records" icon="💉">
          <Field label="Vaccines & Immunizations" id="immunization_records" textarea placeholder="e.g. COVID-19 Pfizer 2021, Annual flu shot, Hepatitis B..." value={form.immunization_records || ''} onSet={set} />
        </Section>

        {/* Section 6: Emergency Contacts */}
        <Section title="Emergency Contact" icon="📞">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Contact Name" id="emergency_contact_name" type="text" placeholder="Full name" value={form.emergency_contact_name || ''} onSet={set} />
            <Field label="Phone Number" id="emergency_contact_phone" type="tel" placeholder="+1 555 000 0000" value={form.emergency_contact_phone || ''} onSet={set} />
            <Field label="Relation" id="emergency_contact_relation" type="text" placeholder="e.g. Spouse, Parent" value={form.emergency_contact_relation || ''} onSet={set} />
          </div>
        </Section>

        {/* Section 7: Primary Doctor */}
        <Section title="Primary Doctor" icon="🩺">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Doctor Name" id="doctor_name" type="text" placeholder="Dr. Jane Smith" value={form.doctor_name || ''} onSet={set} />
            <Field label="Doctor Phone" id="doctor_phone" type="tel" placeholder="+1 555 000 0000" value={form.doctor_phone || ''} onSet={set} />
          </div>
        </Section>

        {/* Section 8: Doctor Verification (Doctors Only) */}
        {user?.role === 'doctor' && (
          <Section title="Doctor Verification Details" icon="📜">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Doctor ID" id="doctor_id" type="text" placeholder="e.g. DOC123" value={form.doctor_id || ''} onSet={set} />
              <Field label="Medical License Number" id="license_number" type="text" placeholder="e.g. LIC/887/2020" value={form.license_number || ''} onSet={set} />
              <Field label="Hospital Name" id="hospital_name" type="text" placeholder="e.g. Apollo Hospital" value={form.hospital_name || ''} onSet={set} />
              <Field label="Specialization" id="specialization" type="text" placeholder="e.g. Cardiologist" value={form.specialization || ''} onSet={set} />
            </div>
            <Field label="Official Contact Details" id="contact_details" textarea placeholder="e.g. Clinic Address, Office Phone..." value={form.contact_details || ''} onSet={set} />
          </Section>
        )}

        </fieldset>

        {/* Save */}
        {isEditable && (
          <div className="sticky bottom-4 mt-4 z-10">
            <button
              id="save-profile"
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : '💾 Save Medical Profile'}
            </button>
          </div>
        )}
      </form>

      <ChatWidget />
    </div>
  )
}
