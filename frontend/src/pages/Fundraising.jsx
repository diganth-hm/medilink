import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { 
  CheckCircleIcon, 
  ArrowPathIcon, 
  DocumentTextIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function Fundraising() {
  const [loading, setLoading] = useState(false)
  const [submittedApp, setSubmittedApp] = useState(null)
  const [activeTab, setActiveTab] = useState('apply') // apply | my-apps
  const [myApplications, setMyApplications] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const { token } = useAuth()
  const [form, setForm] = useState({
    name: '',
    medical_condition: '',
    hospital_name: '',
    estimated_cost: '',
    phone_number: '',
    email: '',
    description: ''
  })

  useEffect(() => {
    if (activeTab === 'my-apps') {
      fetchMyApplications()
    }
  }, [activeTab])

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get(`${API_URL}/fundraising/my-applications`)
      setMyApplications(res.data)
    } catch (err) {
      toast.error('Failed to load applications')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/fundraising/apply`, 
        { ...form, estimated_cost: parseFloat(form.estimated_cost) },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      setSubmittedApp(res.data)
      toast.success('Application submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/fundraising/${id}/withdraw`)
      setMyApplications(prev => prev.map(app => app.id === id ? res.data : app))
      toast.success('Application withdrawn successfully')
      setWithdrawingId(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Withdrawal failed')
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved': return { label: 'Approved ✓', color: 'bg-green-500/10 text-green-400 border-green-500/20', step: 3 };
      case 'rejected': return { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20', step: 3 };
      case 'under_review': return { label: 'Under Review', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', step: 2 };
      case 'withdrawn': return { label: 'Withdrawn', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20 line-through', step: 0 };
      default: return { label: 'Pending Review', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', step: 1 };
    }
  }

  if (submittedApp) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <div className="max-w-md w-full glass p-8 rounded-3xl text-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400 shadow-lg shadow-green-500/10">
            <CheckCircleIcon className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-black text-primary mb-4">Application Submitted!</h2>
          <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-800 text-left space-y-2">
            <div className="flex justify-between text-xs">
                <span className="text-secondary font-bold uppercase tracking-widest">Application ID</span>
                <span className="text-blue-400 font-mono font-bold">#{submittedApp.id}</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-secondary font-bold uppercase tracking-widest">Email Sent To</span>
                <span className="text-white font-bold">{submittedApp.email}</span>
            </div>
          </div>
          <p className="text-secondary text-sm mb-8 leading-relaxed">
            Your application has been received and a confirmation email was sent.
            Our medical board will review your details within <strong>3-5 business days</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <button 
                onClick={() => { setSubmittedApp(null); setActiveTab('my-apps'); }} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black shadow-lg shadow-blue-900/40 transition-all uppercase tracking-widest text-sm"
            >
                View Status →
            </button>
            <button onClick={() => setSubmittedApp(null)} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Submit Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Fundraising</h1>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter text-sm italic">Emergency Medical Support</p>
                </div>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                <button 
                    onClick={() => setActiveTab('apply')}
                    className={`px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'apply' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Apply Now
                </button>
                <button 
                    onClick={() => setActiveTab('my-apps')}
                    className={`px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'my-apps' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    My Requests
                </button>
            </div>
        </div>

        {activeTab === 'apply' ? (
          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <DocumentTextIcon className="w-6 h-6 text-blue-500" />
                New Application
            </h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                  <input type="text" required placeholder="John Doe" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Medical Condition</label>
                  <input type="text" required placeholder="e.g. Coronary Artery Disease" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" value={form.medical_condition} onChange={e => setForm({...form, medical_condition: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Hospital Name</label>
                  <input type="text" required placeholder="Apollo Hospital" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" value={form.hospital_name} onChange={e => setForm({...form, hospital_name: e.target.value})} />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Estimated Cost (₹)</label>
                  <input type="number" required placeholder="500000" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold text-blue-500" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Phone Number</label>
                  <input type="tel" required placeholder="+91 99887 76655" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Email Address</label>
                  <input type="email" required placeholder="your@email.com" className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              <div className="relative group">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Detailed Case Description</label>
                <textarea required rows={5} placeholder="Explain the urgency, diagnosis, and financial need..." className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl flex gap-4 items-start">
                <ArrowPathIcon className="w-6 h-6 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-bold">
                  All applications undergo a strict 3-tier verification process by our board to prevent fraud. 
                  Have your medical reports and hospital invoices ready for post-submission verification.
                </p>
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98]">
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        SUBMITTING...
                    </div>
                ) : 'SUBMIT APPLICATION'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {myApplications.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/50 p-20 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <DocumentTextIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2">No Requests Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto font-bold uppercase tracking-tighter italic">Your submitted fundraising applications will appear here for tracking.</p>
                </div>
            ) : (
                myApplications.map((app) => {
                    const { label, color, step } = getStatusConfig(app.status);
                    const isExpanded = expandedId === app.id;
                    const isWithdrawing = withdrawingId === app.id;

                    return (
                        <div key={app.id} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-xl shadow-slate-900/5 ${isExpanded ? 'ring-2 ring-blue-500/30' : ''}`}>
                            {/* Main Row */}
                            <div 
                                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                                        🏥
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{app.medical_condition}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${color}`}>
                                                {label}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">{app.hospital_name} · <span className="text-blue-500 font-mono">₹{Number(app.estimated_cost).toLocaleString()}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Submitted Date</p>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{new Date(app.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-blue-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="px-8 pb-8 pt-2 border-t border-slate-50 dark:border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
                                    {/* Timeline */}
                                    {app.status !== 'withdrawn' && (
                                        <div className="mb-8 pt-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-l-4 border-blue-500 pl-3">Application Progress</p>
                                            <div className="flex items-center justify-between relative px-2">
                                                <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 -z-1" />
                                                <div className="absolute top-1/2 left-4 right-4 h-1 bg-blue-500 -translate-y-1/2 -z-1 transition-all duration-1000" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                                                
                                                {[
                                                    { icon: ClockIcon, label: 'Submitted', active: step >= 1 },
                                                    { icon: ArrowPathIcon, label: 'Review', active: step >= 2 },
                                                    { icon: CheckCircleIcon, label: 'Decision', active: step >= 3 }
                                                ].map((s, idx) => (
                                                    <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${s.active ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300'}`}>
                                                            <s.icon className="w-4 h-4" />
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${s.active ? 'text-blue-500' : 'text-slate-400'}`}>{s.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Applicant ID</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">#FAPP-{app.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Records</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{app.email}</p>
                                                <p className="text-sm font-bold text-slate-500">{app.phone_number}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Medical Reason</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-slate-200 dark:border-slate-800 pl-3">"{app.description}"</p>
                                        </div>
                                    </div>

                                    {/* Withdraw Logic */}
                                    {['pending', 'under_review'].includes(app.status) && (
                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                            {isWithdrawing ? (
                                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-in zoom-in-95 duration-200">
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">🚨 Proceed with withdrawal? This cannot be undone.</p>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleWithdraw(app.id); }}
                                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-lg transition-colors uppercase tracking-widest"
                                                        >
                                                            Yes, Withdraw
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setWithdrawingId(null); }}
                                                            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-lg transition-colors uppercase tracking-widest"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setWithdrawingId(app.id); }}
                                                    className="inline-flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest group"
                                                >
                                                    <XMarkIcon className="w-4 h-4 stroke-[3]" />
                                                    Withdraw Application
                                                    <div className="h-0.5 w-0 group-hover:w-full bg-red-500 transition-all duration-300" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })
            )}
          </div>
        )}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
