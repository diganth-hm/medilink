export default function MedicalCard({ data }) {
  if (!data) return null

  const conditions = []
  if (data.is_diabetic) conditions.push({ label: 'Diabetic', icon: '💉', color: 'blue' })
  if (data.is_cardiac_patient) conditions.push({ label: 'Cardiac Patient', icon: '❤️', color: 'red' })
  if (data.is_epileptic) conditions.push({ label: 'Epileptic', icon: '⚡', color: 'yellow' })
  if (data.is_asthmatic) conditions.push({ label: 'Asthmatic', icon: '💨', color: 'cyan' })
  if (data.has_pacemaker) conditions.push({ label: 'Pacemaker', icon: '🔋', color: 'purple' })
  if (data.has_implants) conditions.push({ label: 'Medical Implants', icon: '🔩', color: 'orange' })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Blood Group */}
      <div className="emergency-card text-center">
        <p className="text-slate-400 text-sm uppercase tracking-widest mb-1">Blood Group</p>
        <div className="emergency-blood-group">{data.blood_group || 'Unknown'}</div>
      </div>

      {/* Critical Flags */}
      {conditions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">⚠️ Critical Conditions</h3>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c, i) => (
              <span key={i} className="badge-red text-sm px-3 py-1.5">
                {c.icon} {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {data.allergies && (
        <div className="emergency-card">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">⛔ Known Allergies</h3>
          <p className="text-white font-medium">{data.allergies}</p>
        </div>
      )}

      {/* Medications */}
      {data.current_medications && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">💊 Current Medications</h3>
          <p className="text-slate-200">{data.current_medications}</p>
        </div>
      )}

      {/* Emergency Contact */}
      {data.emergency_contact_name && (
        <div className="card border-green-500/30">
          <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">📞 Emergency Contact</h3>
          <p className="font-semibold text-white">{data.emergency_contact_name}</p>
          <p className="text-slate-400 text-sm">{data.emergency_contact_relation}</p>
          <a href={`tel:${data.emergency_contact_phone}`} className="inline-flex items-center gap-2 mt-2 text-green-400 font-semibold hover:text-green-300 transition-colors">
            📱 {data.emergency_contact_phone}
          </a>
        </div>
      )}

      {/* Doctor */}
      {data.doctor_name && (
        <div className="card border-blue-500/30">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">🩺 Primary Doctor</h3>
          <p className="font-semibold text-white">{data.doctor_name}</p>
          <a href={`tel:${data.doctor_phone}`} className="inline-flex items-center gap-2 mt-1 text-blue-400 hover:text-blue-300 transition-colors">
            📱 {data.doctor_phone}
          </a>
        </div>
      )}
    </div>
  )
}
