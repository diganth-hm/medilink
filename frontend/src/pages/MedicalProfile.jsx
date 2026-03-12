import { useState, useEffect } from 'react'
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
  <div className="card mb-6">
    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
      <span className="text-xl">{icon}</span> {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
)

const Field = ({ label, id, onSet, textarea, ...props }) => (
  <div>
    <label htmlFor={id} className="label">{label}</label>
    {textarea ? (
      <textarea id={id} className="input" rows={3} {...props} onChange={e => onSet(id, e.target.value)} />
    ) : (
      <input id={id} className="input" {...props} onChange={e => onSet(id, e.target.value)} />
    )}
  </div>
)

const CheckField = ({ label, field, icon, checked, onSet }) => (
  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
    checked ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'
  }`}>
    <input type="checkbox" className="hidden" checked={checked} onChange={e => onSet(field, e.target.checked)} />
    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-slate-700'}`}>
      {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </div>
    <span className="text-lg">{icon}</span>
    <span className="text-sm text-slate-200">{label}</span>
  </label>
)

// ──────────────────────────────────────────────────────────────────────────────

export default function MedicalProfile() {
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


  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Medical Profile</h1>
        <p className="text-slate-400">This information will be shown to responders in an emergency</p>
      </div>

      <form onSubmit={handleSave}>
        {/* Section 1: Basic Info */}
        <Section title="Basic Info" icon="👤">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Blood Group</label>
              <select id="blood_group" className="input" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
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

        {/* Save */}
        <div className="sticky bottom-4 mt-4">
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
      </form>

      <ChatWidget />
    </div>
  )
}
