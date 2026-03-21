import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTags(str) {
  if (!str) return []
  return str.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
}

function bloodStripeColor(bg) {
  return bg === 'O-' ? '#b91c1c' : '#1d4ed8'
}

function formatDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return iso }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-full max-w-[400px] mx-auto animate-pulse space-y-4">
      <div className="rounded-2xl bg-slate-800 h-56 w-full" />
      <div className="flex gap-3 justify-center">
        <div className="h-10 w-32 rounded-xl bg-slate-700" />
        <div className="h-10 w-32 rounded-xl bg-slate-700" />
        <div className="h-10 w-32 rounded-xl bg-slate-700" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 rounded-xl bg-slate-800" />
      ))}
    </div>
  )
}

function Pill({ color, children }) {
  const colors = {
    red: 'bg-red-600/20 text-red-300 border border-red-600/40',
    green: 'bg-green-600/20 text-green-300 border border-green-600/40',
    blue: 'bg-blue-600/20 text-blue-300 border border-blue-600/40',
    slate: 'bg-slate-600/30 text-slate-300 border border-slate-600/40',
  }
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[color] || colors.slate}`}>
      {children}
    </span>
  )
}

function AccordionSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="font-semibold text-white flex items-center gap-2">
          <span className="text-lg">{icon}</span> {title}
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-4 bg-slate-900/40 text-sm text-slate-300 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 w-36 flex-shrink-0">{label}:</span>
      <span className="text-slate-200">{value || '—'}</span>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MedicalIDCard() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [qrImageUrl, setQrImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [flipped, setFlipped] = useState(false)

  const frontRef = useRef(null)
  const backRef = useRef(null)

  useEffect(() => {
    async function load() {
      if (!token) return
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [profileRes, qrRes] = await Promise.allSettled([
          axios.get(`${API_URL}/patient/profile`, { headers }),
          axios.get(`${API_URL}/qrcode/my-qr`, { headers, responseType: 'blob' }),
        ])
        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data)
        } else {
          setError('Could not load your medical profile.')
        }
        if (qrRes.status === 'fulfilled') {
          setQrImageUrl(URL.createObjectURL(qrRes.value.data))
        }
      } catch {
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // ── Derived data ───────────────────────────────────────────────────────────
  const name = user?.name || profile?.name || 'Patient Name'
  const bloodGroup = profile?.blood_group || '—'
  const medilinkId = user?.medilink_id || profile?.medilink_id || '—'
  const isOrganDonor = profile?.is_organ_donor || false

  const allergies = parseTags(profile?.allergies)
  const medications = parseTags(profile?.current_medications)
  const conditions = [
    profile?.is_diabetic && { label: 'Diabetic', icon: '💉' },
    profile?.is_cardiac_patient && { label: 'Cardiac', icon: '❤️' },
    profile?.is_epileptic && { label: 'Epileptic', icon: '⚡' },
    profile?.is_asthmatic && { label: 'Asthmatic', icon: '💨' },
    profile?.has_pacemaker && { label: 'Pacemaker', icon: '🔋' },
    profile?.has_implants && { label: 'Implants', icon: '🔩' },
  ].filter(Boolean)

  const stripe = bloodStripeColor(bloodGroup)

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    const ref = flipped ? backRef.current : frontRef.current
    if (!ref) return
    try {
      const canvas = await html2canvas(ref, { useCORS: true, scale: 2 })
      const link = document.createElement('a')
      link.download = `medilink-card-${medilinkId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Card downloaded as PNG!')
    } catch (e) {
      toast.error('Download failed: ' + e.message)
    }
  }

  const handlePrint = () => window.print()

  const handleShare = async () => {
    const text = `My MediLink Emergency ID: ${medilinkId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MediLink Emergency ID', text })
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('MediLink ID copied to clipboard!')
      } catch {
        toast.error('Could not copy to clipboard.')
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
        <div className="max-w-md w-full mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Medical ID Card</h1>
          <p className="text-slate-400 text-sm">Loading your card…</p>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <Link to="/dashboard/profile" className="btn-primary px-6 py-3 rounded-xl">
          Complete Your Profile
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* ── Print-only styles ───────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #medilink-print-wrapper { display: flex !important; }
          #medilink-print-wrapper * { display: revert !important; }
          @page { size: A4 landscape; margin: 1cm; }
        }
        .card-scene {
          perspective: 1000px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.65s cubic-bezier(0.4,0.2,0.2,1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 1rem;
          overflow: hidden;
        }
        .card-face.back {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="min-h-screen pt-24 pb-16 px-4 flex flex-col items-center max-w-2xl mx-auto">

        {/* Header */}
        <div className="w-full mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">Digital Medical ID Card</h1>
          <p className="text-slate-400 text-sm">Your secure identity for emergencies. Flip, download, or print.</p>
        </div>

        {/* ── 3D Flip Card ─────────────────────────────────────────────── */}
        <div
          id="medilink-print-wrapper"
          className="w-full flex flex-col sm:flex-row gap-6 justify-center items-start print:gap-8"
        >
          {/* FRONT (print always visible) */}
          <div className="card-scene w-full max-w-[400px] print:max-w-[48%]"
            style={{ aspectRatio: '1.586 / 1' }}>
            <div className={`card-inner ${flipped ? 'flipped' : ''}`}>

              {/* ── FRONT FACE ── */}
              <div className="card-face front" ref={frontRef}>
                <div
                  className="w-full h-full flex flex-col justify-between p-5 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #0c1a3a 60%, #0b2550 100%)',
                  }}
                >
                  {/* ECG decoration */}
                  <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 400 252" preserveAspectRatio="none">
                    <path d="M0 126 L80 126 L95 92 L120 180 L145 72 L165 142 L180 126 L400 126"
                      fill="none" stroke="#E5341A" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* Top row */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        {/* Cross icon */}
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H14V8H9V13H14V19H19V13H24V8H19V3ZM5 8H0V13H5V19H10V13H5V8Z" transform="scale(0.75) translate(1,1)" />
                          <rect x="10" y="3" width="4" height="18" rx="1" />
                          <rect x="3" y="10" width="18" height="4" rx="1" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-white tracking-tight block leading-none text-sm">MediLink</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-red-400 font-bold">Emergency ID</span>
                      </div>
                    </div>
                    {/* Blood group badge */}
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg border border-white/20">
                      🩸 {bloodGroup}
                    </div>
                  </div>

                  {/* Middle: name + badges */}
                  <div className="relative z-10 mt-auto">
                    <p className="text-white text-xl font-bold uppercase tracking-wide leading-tight truncate">
                      {name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="bg-red-700/60 text-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/40">
                        {bloodGroup}
                      </span>
                      {isOrganDonor && (
                        <span className="bg-green-700/60 text-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/40">
                          🫀 Organ Donor
                        </span>
                      )}
                      {conditions.slice(0, 2).map(c => (
                        <span key={c.label} className="bg-blue-800/50 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                          {c.icon} {c.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: ID + QR */}
                  <div className="flex justify-between items-end relative z-10 mt-3">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">MediLink ID</p>
                      <p className="font-mono text-sm text-blue-300 tracking-widest">{medilinkId}</p>
                    </div>
                    {qrImageUrl ? (
                      <div className="p-1.5 bg-white rounded-lg shadow-xl flex-shrink-0">
                        <img src={qrImageUrl} alt="QR Code" className="w-14 h-14 object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center text-slate-600 text-[9px] text-center p-1">
                        No QR
                      </div>
                    )}
                  </div>

                  {/* Accent stripe */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1.5"
                    style={{ background: stripe }}
                  />
                </div>
              </div>

              {/* ── BACK FACE ── */}
              <div className="card-face back" ref={backRef}>
                <div className="w-full h-full bg-white flex flex-col justify-between p-4 text-gray-800">
                  {/* Top strip header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MediLink — Back</span>
                    <span className="text-[10px] text-slate-400">{medilinkId}</span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] flex-1">
                    {/* Allergies */}
                    <div className="col-span-2">
                      <p className="font-bold text-red-700 uppercase tracking-wide mb-0.5 text-[9px]">⚠ Allergies</p>
                      {allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {allergies.slice(0, 4).map(a => (
                            <span key={a} className="bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                              {a}
                            </span>
                          ))}
                          {allergies.length > 4 && <span className="text-red-500 text-[9px]">+{allergies.length - 4} more</span>}
                        </div>
                      ) : <span className="text-slate-400">None on file</span>}
                    </div>

                    {/* Conditions */}
                    <div>
                      <p className="font-bold text-slate-600 uppercase tracking-wide mb-0.5 text-[9px]">Conditions</p>
                      {conditions.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {conditions.map(c => (
                            <span key={c.label} className="text-[9px]">{c.icon} {c.label}</span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400">None</span>}
                    </div>

                    {/* Medications */}
                    <div>
                      <p className="font-bold text-slate-600 uppercase tracking-wide mb-0.5 text-[9px]">Medications</p>
                      {medications.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {medications.slice(0, 3).map(m => (
                            <span key={m} className="text-[9px] truncate">{m}</span>
                          ))}
                          {medications.length > 3 && (
                            <span className="text-slate-500 text-[9px]">+{medications.length - 3} more</span>
                          )}
                        </div>
                      ) : <span className="text-slate-400">None</span>}
                    </div>

                    {/* Emergency Contact */}
                    <div className="col-span-2">
                      <p className="font-bold text-slate-600 uppercase tracking-wide mb-0.5 text-[9px]">📞 Emergency Contact</p>
                      {profile?.emergency_contact_name ? (
                        <p className="text-[9px]">
                          {profile.emergency_contact_name}
                          {profile.emergency_contact_relation && ` (${profile.emergency_contact_relation})`}
                          {profile.emergency_contact_phone && ` · ${profile.emergency_contact_phone}`}
                        </p>
                      ) : <span className="text-slate-400">Not set</span>}
                    </div>

                    {/* Doctor */}
                    {profile?.doctor_name && (
                      <div className="col-span-2">
                        <p className="font-bold text-slate-600 uppercase tracking-wide mb-0.5 text-[9px]">🩺 Treating Doctor</p>
                        <p className="text-[9px]">{profile.doctor_name}{profile.doctor_phone && ` · ${profile.doctor_phone}`}</p>
                      </div>
                    )}

                    {/* Issued */}
                    <div className="col-span-2">
                      <p className="text-[8px] text-slate-400">Issued: {formatDate(profile?.created_at)}</p>
                    </div>
                  </div>

                  {/* Bottom strip */}
                  <div
                    className="mt-2 text-white text-[9px] font-bold text-center py-1 px-2 rounded"
                    style={{ background: stripe }}
                  >
                    🚨 In emergency, scan QR or call 112
                  </div>
                </div>
              </div>

            </div>{/* card-inner */}
          </div>{/* card-scene */}

          {/* Print: back always shown next to front */}
          <div className="hidden print:block w-full max-w-[48%]" style={{ aspectRatio: '1.586/1' }}>
            <div className="w-full h-full bg-white flex flex-col justify-between p-4 text-gray-800 rounded-2xl border border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MediLink — Back</span>
                <span className="text-[10px] text-slate-400">{medilinkId}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] flex-1">
                <div className="col-span-2">
                  <p className="font-bold text-red-700 text-[9px] uppercase mb-0.5">⚠ Allergies</p>
                  <p className="text-[9px]">{allergies.join(', ') || 'None'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-[9px] uppercase mb-0.5">Conditions</p>
                  <p className="text-[9px]">{conditions.map(c => c.label).join(', ') || 'None'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-[9px] uppercase mb-0.5">Medications</p>
                  <p className="text-[9px]">{medications.slice(0, 3).join(', ') || 'None'}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-slate-600 text-[9px] uppercase mb-0.5">📞 Emergency Contact</p>
                  <p className="text-[9px]">{profile?.emergency_contact_name || '—'} {profile?.emergency_contact_phone || ''}</p>
                </div>
                {profile?.doctor_name && (
                  <div className="col-span-2">
                    <p className="font-bold text-slate-600 text-[9px] uppercase mb-0.5">🩺 Doctor</p>
                    <p className="text-[9px]">{profile.doctor_name}</p>
                  </div>
                )}
              </div>
              <div className="mt-2 text-white text-[9px] font-bold text-center py-1 rounded" style={{ background: stripe }}>
                🚨 In emergency, scan QR or call 112
              </div>
            </div>
          </div>

        </div>{/* print wrapper */}

        {/* ── Flip + Actions ───────────────────────────────────────────────── */}
        <div className="print:hidden mt-6 w-full max-w-[400px] flex flex-col items-center gap-4">

          {/* Flip button */}
          <button
            onClick={() => setFlipped(f => !f)}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold rounded-xl transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {flipped ? 'Show Front' : 'Flip to Back'}
          </button>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-1.5 py-3 px-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 text-xs"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-1.5 py-3 px-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200 text-xs"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Card
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1.5 py-3 px-2 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 text-xs"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share ID
            </button>
          </div>
        </div>

        {/* ── Medical Summary (screen only) ─────────────────────────────── */}
        <div className="print:hidden mt-10 w-full max-w-2xl space-y-3">
          <h2 className="text-xl font-bold text-white mb-4">📋 Medical Summary</h2>

          <AccordionSection title="Personal Info" icon="👤" defaultOpen>
            <InfoRow label="Full Name" value={name} />
            <InfoRow label="Date of Birth" value={formatDate(profile?.date_of_birth)} />
            <InfoRow label="Blood Group" value={bloodGroup} />
            <InfoRow label="MediLink ID" value={medilinkId} />
            <InfoRow label="Organ Donor" value={isOrganDonor ? 'Yes ✓' : 'No'} />
          </AccordionSection>

          <AccordionSection title="Conditions & Flags" icon="🏥">
            {conditions.length > 0
              ? conditions.map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  <span>{c.icon}</span>
                  <span className="text-green-300 font-medium">{c.label}</span>
                  <span className="text-green-500 text-xs">✓</span>
                </div>
              ))
              : <p className="text-slate-500">No flagged conditions</p>
            }
            {profile?.chronic_conditions && (
              <div className="mt-2">
                <p className="text-slate-500 text-xs mb-1">Chronic Conditions:</p>
                <p>{profile.chronic_conditions}</p>
              </div>
            )}
          </AccordionSection>

          <AccordionSection title="Medications" icon="💊">
            {medications.length > 0
              ? medications.map(m => (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>{m}</span>
                </div>
              ))
              : <p className="text-slate-500">No medications on file</p>
            }
            {profile?.psychiatric_medications && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <p className="text-slate-500 text-xs mb-1">Psychiatric / Mental Health:</p>
                <p>{profile.psychiatric_medications}</p>
              </div>
            )}
          </AccordionSection>

          <AccordionSection title="Allergies" icon="⚠️">
            {allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allergies.map(a => (
                  <Pill key={a} color="red">{a}</Pill>
                ))}
              </div>
            ) : <p className="text-slate-500">No allergies on file</p>}
          </AccordionSection>

          <AccordionSection title="Emergency Contacts" icon="📞">
            {profile?.emergency_contact_name ? (
              <div className="flex flex-col gap-1">
                <InfoRow label="Name" value={profile.emergency_contact_name} />
                <InfoRow label="Relation" value={profile.emergency_contact_relation} />
                <div className="flex gap-2 items-center">
                  <span className="text-slate-500 w-36 flex-shrink-0">Phone:</span>
                  {profile.emergency_contact_phone ? (
                    <a
                      href={`tel:${profile.emergency_contact_phone}`}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {profile.emergency_contact_phone}
                    </a>
                  ) : '—'}
                </div>
              </div>
            ) : <p className="text-slate-500">No emergency contact set</p>}
          </AccordionSection>

          <AccordionSection title="Medical History" icon="📖">
            {profile?.surgical_history
              ? <div><p className="text-slate-400 text-xs uppercase mb-1">Surgical History</p><p>{profile.surgical_history}</p></div>
              : null}
            {profile?.immunization_records
              ? <div className="mt-2"><p className="text-slate-400 text-xs uppercase mb-1">Immunizations</p><p>{profile.immunization_records}</p></div>
              : null}
            {!profile?.surgical_history && !profile?.immunization_records && (
              <p className="text-slate-500">No history on file</p>
            )}
            {profile?.doctor_name && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <p className="text-slate-400 text-xs uppercase mb-1">🩺 Treating Doctor</p>
                <InfoRow label="Name" value={profile.doctor_name} />
                <InfoRow label="Phone" value={profile.doctor_phone} />
              </div>
            )}
          </AccordionSection>

          {/* Edit link */}
          <div className="pt-4 pb-2 text-center">
            <Link
              to="/dashboard/settings"
              className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2"
            >
              Edit your profile in Settings → Edit Profile
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
