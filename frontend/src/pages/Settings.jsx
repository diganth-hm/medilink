import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  UserIcon, 
  LockClosedIcon, 
  IdentificationIcon, 
  SunIcon, 
  MoonIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  TrashIcon, 
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [accessLogs, setAccessLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  
  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('medilink_theme') || 'system')
  
  // Password Update State
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  
  // Preferences State
  const [prefs, setPrefs] = useState({
    notifications_appointments: true,
    notifications_refills: true,
    notifications_health_tips: true,
    qr_access_log: true
  })

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePass, setDeletePass] = useState('')

  useEffect(() => {
    fetchPrefs()
    checkBackend()
    applyTheme(theme)
    fetchAccessLogs()
  }, [])

  const fetchPrefs = async () => {
    try {
      const res = await axios.get('/users/me')
      if (res.data.preferences) {
        setPrefs(res.data.preferences)
      }
    } catch (err) {
      console.error('Failed to fetch preferences')
    } finally {
      setLoading(false)
    }
  }

  const checkBackend = async () => {
    try {
      await axios.get('/health')
      setBackendStatus('online')
    } catch (err) {
      setBackendStatus('offline')
    }
  }

  const fetchAccessLogs = async () => {
    try {
      const res = await axios.get('/users/me/access-log')
      setAccessLogs(res.data)
    } catch (err) {
      console.error('Failed to fetch access logs')
    }
  }

  const applyTheme = (t) => {
    const root = document.documentElement
    root.classList.remove('dark')
    
    let effectiveTheme = t
    if (t === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    }
    localStorage.setItem('medilink_theme', t)
    setTheme(t)
    
    // Broadcast message to keep it in sync if needed (optional)
  }

  const handlePrefToggle = async (key) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    try {
      await axios.put('/users/me/preferences', newPrefs)
      toast.success('Preference updated')
    } catch (err) {
      toast.error('Failed to update preference')
      setPrefs(prefs) // revert
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    try {
      await axios.put('/users/me/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      toast.success('Password updated!')
      setShowPasswordForm(false)
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await axios.delete('/users/me', { data: { password: deletePass } })
      toast.success('Account deleted permanently')
      logout()
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    }
  }

  const getPasswordStrength = (pw) => {
    if (!pw) return ''
    if (pw.length < 6) return 'Weak'
    if (pw.length < 10) return 'Fair'
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Strong'
    return 'Fair'
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-4xl mx-auto px-4 py-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account, privacy, and app experience</p>
      </header>

      {/* SECTION 1: ACCOUNT */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Account</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Edit Profile Row */}
          <button 
            onClick={() => navigate('/dashboard/profile?edit=true')}
            className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left border-b border-slate-100 dark:border-slate-700/30"
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl">
              <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Edit Profile</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update personal & medical info</p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-slate-400" />
          </button>

          {/* Change Password Row */}
          <div className="border-b border-slate-100 dark:border-slate-700/30">
            <button 
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
            >
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl">
                <LockClosedIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Change Password</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Secure your account with a strong password</p>
              </div>
              {showPasswordForm ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronRightIcon className="w-5 h-5 text-slate-400" />}
            </button>
            
            {showPasswordForm && (
              <form onSubmit={handlePasswordUpdate} className="p-6 pt-0 space-y-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/30">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Current Password</label>
                    <input 
                      type={showPass.current ? "text" : "password"}
                      required
                      value={passwordData.current_password}
                      onChange={e => setPasswordData({...passwordData, current_password: e.target.value})}
                      className="input w-full pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-3 top-8 text-slate-400">
                      {showPass.current ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  <div></div> {/* Spacer */}
                  
                  <div className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">New Password</label>
                    <input 
                      type={showPass.new ? "text" : "password"}
                      required
                      value={passwordData.new_password}
                      onChange={e => setPasswordData({...passwordData, new_password: e.target.value})}
                      className="input w-full pr-10"
                      placeholder="Min. 8 characters"
                    />
                    <button type="button" onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-3 top-8 text-slate-400">
                      {showPass.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                    {passwordData.new_password && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${
                            getPasswordStrength(passwordData.new_password) === 'Weak' ? 'w-1/3 bg-red-500' :
                            getPasswordStrength(passwordData.new_password) === 'Fair' ? 'w-2/3 bg-amber-500' :
                            'w-full bg-green-500'
                          }`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase ${
                          getPasswordStrength(passwordData.new_password) === 'Weak' ? 'text-red-500' :
                          getPasswordStrength(passwordData.new_password) === 'Fair' ? 'text-amber-500' :
                          'text-green-500'
                        }`}>{getPasswordStrength(passwordData.new_password)}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Confirm New Password</label>
                    <input 
                      type={showPass.confirm ? "text" : "password"}
                      required
                      value={passwordData.confirm_password}
                      onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})}
                      className="input w-full pr-10"
                      placeholder="Confirm new password"
                    />
                    <button type="button" onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-3 top-8 text-slate-400">
                      {showPass.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary py-2 px-6">Update Password</button>
                  <button type="button" onClick={() => setShowPasswordForm(false)} className="btn-ghost py-2">Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* MediLink ID Row */}
          <div className="flex items-center gap-4 p-5">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl">
              <IdentificationIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Your MediLink ID</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Used for quick medical reference</p>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg font-mono font-black text-slate-900 dark:text-emerald-400 tracking-wider">
                {user?.medilink_id || 'Generating...'}
              </code>
              <button 
                onClick={() => copyToClipboard(user?.medilink_id)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                title="Copy ID"
              >
                <ClipboardIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: APPEARANCE */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Appearance</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-xl">
                {theme === 'dark' ? <MoonIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> : <SunIcon className="w-6 h-6 text-amber-600" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">App Theme</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose how MediLink looks to you</p>
              </div>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
              {['light', 'system', 'dark'].map((t) => (
                <button
                  key={t}
                  onClick={() => applyTheme(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    theme === t 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: NOTIFICATIONS */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Notifications</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          
          {[
            { id: 'notifications_appointments', label: 'Appointment Reminders', sub: 'Get notified 24 hours before appointments', color: 'blue' },
            { id: 'notifications_refills', label: 'Refill Alerts', sub: 'Alert when medication has 7 or fewer doses left', color: 'emerald' },
            { id: 'notifications_health_tips', label: 'Health Tips', sub: 'Weekly health tips based on your conditions', color: 'purple' }
          ].map((item, idx) => (
            <div key={item.id} className={`flex items-center justify-between p-5 ${idx !== 2 ? 'border-b border-slate-100 dark:border-slate-700/30' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`bg-${item.color}-100 dark:bg-${item.color}-900/30 p-2.5 rounded-xl`}>
                  <BellIcon className={`w-6 h-6 text-${item.color}-600 dark:text-${item.color}-400`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{item.label}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.sub}</p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={prefs[item.id]} onChange={() => handlePrefToggle(item.id)} />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}

        </div>
      </section>

      {/* SECTION 4: PRIVACY & SECURITY */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Privacy & Security</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Access Log Row */}
          <div className="border-b border-slate-100 dark:border-slate-700/30">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
            >
              <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2.5 rounded-xl">
                <ShieldCheckIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Emergency Access Log</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">See who has scanned your QR code</p>
              </div>
              {showLogs ? <ChevronDownIcon className="w-5 h-5 text-slate-400" /> : <ChevronRightIcon className="w-5 h-5 text-slate-400" />}
            </button>
            
            {showLogs && (
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/30 space-y-2">
                {accessLogs.length > 0 ? accessLogs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/30 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-black uppercase tracking-tighter">Emergency Scan</div>
                      <span className="text-slate-500 dark:text-slate-400">{log.location || 'Unknown Location'}</span>
                    </div>
                    <span className="font-mono text-slate-400">{new Date(log.scanned_at).toLocaleString()}</span>
                  </div>
                )) : (
                  <p className="p-4 text-center text-sm text-slate-500 italic">No access events recorded yet.</p>
                )}
              </div>
            )}
          </div>

          {/* 2FA Coming Soon */}
          <div className="flex items-center gap-4 p-5 opacity-60 grayscale cursor-not-allowed">
            <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl">
              <LockClosedIcon className="w-6 h-6 text-slate-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-slate-500">Secure logins with OTP verification</p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5: DANGER ZONE */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500/80 ml-1">Danger Zone</h2>
        <div className="bg-white dark:bg-slate-800 border-2 border-red-500/10 dark:border-red-500/20 rounded-2xl overflow-hidden shadow-sm shadow-red-500/5">
          
          <div className="bg-red-50 dark:bg-red-950/20 p-5 border-b border-red-500/10 flex items-center gap-4">
             <TrashIcon className="w-6 h-6 text-red-600" />
             <div className="flex-1">
                <h3 className="font-bold text-red-600">Delete Account</h3>
                <p className="text-sm text-red-400">Permanently delete your profile and all medical records</p>
             </div>
             {!showDeleteConfirm && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border-2 border-red-500 text-red-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/20"
                >
                  Delete Account
                </button>
             )}
          </div>

          {showDeleteConfirm && (
            <div className="p-6 bg-red-50/50 dark:bg-red-950/10 space-y-6">
              <div className="bg-white dark:bg-slate-800 border-2 border-red-500 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrashIcon className="w-24 h-24 text-red-600" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-red-600 font-black text-xl mb-2">ARE YOU ABSOLUTELY SURE?</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                    Deleting your account is <strong>permanent</strong> and cannot be undone. 
                    You will immediately lose access to your MediLink ID, all prescriptions, medical history, and appointments.
                  </p>
                  
                  <div className="max-w-md">
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-widest">Enter Password to Confirm</label>
                    <input 
                      type="password"
                      value={deletePass}
                      onChange={e => setDeletePass(e.target.value)}
                      className="input border-red-500/30 focus:border-red-500 w-full mb-4"
                      placeholder="Your current password"
                    />
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleDeleteAccount}
                        disabled={!deletePass}
                        className="bg-red-600 text-white font-black px-6 py-2.5 rounded-xl shadow-xl shadow-red-900/40 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:scale-100"
                      >
                        I understand, delete my account
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: ABOUT */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 ml-1">About</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl">
                <InformationCircleIcon className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">MediLink v1.0.0</h3>
                <p className="text-xs text-slate-400 font-mono tracking-tighter">Your lifelong medical companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-xs font-black uppercase tracking-widest ${backendStatus === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                Backend {backendStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <a 
              href="https://medilink.com/privacy" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 group"
            >
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Privacy Policy</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </a>
            <a 
              href="https://medilink.com/terms" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 group"
            >
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Terms of Service</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </a>
          </div>

          <div className="text-center pt-4">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em]">Built with ❤️ in Next-Gen Tech</p>
          </div>
        </div>
      </section>

    </div>
  )
}
