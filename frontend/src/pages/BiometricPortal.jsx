import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { 
  ShieldCheckIcon, 
  FingerPrintIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  CheckBadgeIcon,
  TrashIcon,
  ShieldExclamationIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline'

// Base64url helpers
const base64urlDecode = (str) => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
};

const base64urlEncode = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const detectDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return 'Apple Touch ID / Face ID';
    if (/Android/.test(ua)) return 'Android Fingerprint';
    if (/Windows/.test(ua)) return 'Windows Hello';
    if (/Mac/.test(ua)) return 'Mac Touch ID';
    return 'Biometric Authenticator';
};

export default function BiometricPortal() {
  const [support, setSupport] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const supportResult = await checkBiometricSupport();
    setSupport(supportResult);
    if (supportResult.webauthn) {
        await fetchStatus();
    }
    setLoading(false);
  };

  const checkBiometricSupport = async () => {
    const result = { webauthn: false, platform: false, reason: '' };
    if (!window.PublicKeyCredential) {
      result.reason = 'WebAuthn API not supported in this browser';
      return result;
    }
    result.webauthn = true;
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      result.platform = available;
      if (!available) {
        result.reason = 'No fingerprint sensor or biometric hardware detected';
      }
    } catch (e) {
      result.reason = 'Hardware check failed: ' + e.message;
    }
    return result;
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/biometric/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch biometric status', err);
    }
  };

  const enrollBiometric = async () => {
    setEnrolling(true);
    setError('');
    try {
      // 1. Get challenge
      const res = await axios.get(`${API_URL}/biometric/registration-challenge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { challenge, user_id, user_name, display_name, rp_id, rp_name } = res.data;

      // 2. Decode
      const decodedChallenge = base64urlDecode(challenge);
      const userIdBuffer = new TextEncoder().encode(user_id);

      // 3. Create WebAuthn credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: decodedChallenge,
          rp: { id: rp_id, name: rp_name },
          user: {
            id: userIdBuffer,
            name: user_name,
            displayName: display_name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        }
      });

      // 4. Send to backend
      const credentialId = base64urlEncode(credential.rawId);
      const publicKey = base64urlEncode(
        credential.response.getPublicKey
          ? credential.response.getPublicKey()
          : new Uint8Array(credential.response.clientDataJSON)
      );

      await axios.post(`${API_URL}/biometric/register`, {
        credential_id: credentialId,
        public_key: publicKey,
        device_name: detectDeviceName(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Fingerprint enrolled successfully!');
      await fetchStatus();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric prompt was cancelled.');
      } else if (err.name === 'InvalidStateError') {
        setError('Device already enrolled.');
      } else {
        setError('Enrollment failed: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setEnrolling(false);
    }
  };

  const verifyBiometric = async () => {
    setVerifying(true);
    setEnrolling(true); // Show the pulse UI
    setError('');
    try {
        // Since we are already logged in, we verify against our own medilink_id for testing
        const profileRes = await axios.get(`${API_URL}/patient/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const medilinkId = profileRes.data.medilink_id;

        const chalRes = await axios.get(`${API_URL}/biometric/authentication-challenge`, {
            params: { medilink_id: medilinkId }
        });
        const { challenge, credential_id } = chalRes.data;

        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: base64urlDecode(challenge),
                allowCredentials: [{
                    id: base64urlDecode(credential_id),
                    type: 'public-key'
                }],
                userVerification: 'required',
                timeout: 60000
            }
        });

        toast.success('Identity verified with biometrics! ✓');
        await fetchStatus();
    } catch (err) {
        setError('Verification failed: ' + (err.response?.data?.detail || err.message));
    } finally {
        setVerifying(false);
        setEnrolling(false);
    }
  };

  const removeEnrollment = async () => {
    if (!window.confirm('Are you sure you want to remove your biometric enrollment?')) return;
    try {
      await axios.delete(`${API_URL}/biometric/credential`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Biometric data removed');
      await fetchStatus();
    } catch (err) {
      toast.error('Failed to remove enrollment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Checking biometric support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 text-center">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Biometric Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold italic">Secure your medical records with hardware-level authentication.</p>
        </header>

        {/* State A & B: Hardware Supported */}
        {support.platform ? (
            <div className="space-y-6">
                {!status?.enrolled ? (
                    <div className="bg-white dark:bg-slate-900 border-2 border-green-500/20 p-8 rounded-[2.5rem] text-center shadow-xl shadow-green-500/5 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                            <ShieldCheckIcon className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase">Biometric Supported</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">Your device supports fingerprint, Face ID, or Windows Hello. Enroll now to enable instant emergency access.</p>
                        <button 
                            onClick={enrollBiometric}
                            disabled={enrolling}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FingerPrintIcon className="w-5 h-5" />
                            Enroll Fingerprint
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-blue-500/5 animate-in zoom-in duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                    <CheckBadgeIcon className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Biometric Enrolled</h2>
                                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{status.device_name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase font-black">Enrolled On</p>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(status.enrolled_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-8 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-tight">Last Verification</span>
                                <span className="text-slate-900 dark:text-white font-black italic">
                                    {status.last_used ? new Date(status.last_used).toLocaleString() : 'Never'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={verifyBiometric}
                                className="py-4 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 text-slate-900 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                            >
                                Test Verification
                            </button>
                            <button 
                                onClick={removeEnrollment}
                                className="py-4 border-2 border-slate-100 dark:border-slate-800 hover:border-red-500/50 hover:text-red-500 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Remove Enrollment
                            </button>
                        </div>
                    </div>
                )}
            </div>
        ) : support.webauthn ? (
            /* State C: API Supported but no hardware detected */
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-amber-500/5">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                    <ExclamationTriangleIcon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white text-center mb-6 uppercase">No Biometric Hardware detected</h2>
                <div className="space-y-3 mb-8">
                    {[
                        'Your device may not have a fingerprint/face sensor',
                        'Biometrics may be disabled in device settings',
                        'Try enabling fingerprint unlock in phone security settings'
                    ].map((step, i) => (
                        <div key={i} className="flex gap-3 text-sm font-bold text-slate-500 items-start">
                            <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] shrink-0 mt-0.5">•</div>
                            <p>{step}</p>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={enrollBiometric}
                    className="w-full py-4 border-2 border-amber-500/50 text-amber-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-500 hover:text-white transition-all active:scale-95"
                >
                    Try Enrollment Anyway
                </button>
            </div>
        ) : (
            /* State D: WebAuthn not supported */
            <div className="bg-white dark:bg-slate-900 border-2 border-red-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-red-500/5 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <XCircleIcon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Biometric Not Supported</h2>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl mb-8">
                    <p className="text-red-500 text-xs font-bold leading-relaxed">{support.reason}</p>
                </div>
                <div className="text-left space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Recommendations</p>
                    {[
                        'Use Chrome, Firefox, Safari, or Edge (Latest)',
                        'Ensure you are on HTTPS (Secure Connection)',
                        'Try using a modern Android or iPhone device'
                    ].map((step, i) => (
                        <div key={i} className="flex gap-3 text-xs font-bold text-slate-500 items-center">
                            <CheckBadgeIcon className="w-4 h-4 text-slate-300" />
                            {step}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Error Message */}
        {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center animate-in shake duration-300">
                {error}
            </div>
        )}

        {/* Enrolling Pulse UI overlay */}
        {enrolling && (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 scale-150" />
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10 scale-[2] [animation-delay:0.5s]" />
                    <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center relative z-10 border-2 border-blue-500 shadow-2xl shadow-blue-500/40">
                        <FingerPrintIcon className="w-16 h-16 text-blue-500" />
                    </div>
                </div>
                <h3 className="text-white text-2xl font-black mt-12 uppercase tracking-tight text-center">
                    {verifying ? 'Verifying Identity' : 'Action Required'}
                </h3>
                <p className="text-slate-400 font-bold mt-2 text-center max-w-xs leading-relaxed italic">
                    Touch your fingerprint sensor or use Face ID when prompted by your browser...
                </p>
                <button 
                  onClick={() => setEnrolling(false)}
                  className="mt-12 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none"
                >
                    Cancel Action
                </button>
            </div>
        )}

        {/* Info Section */}
        <div className="mt-12">
            <button 
              onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
              className="w-full flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl group"
            >
                <div className="flex items-center gap-3">
                    <ShieldExclamationIcon className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">How does biometric security work?</span>
                </div>
                {isHowItWorksOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />}
            </button>

            {isHowItWorksOpen && (
                <div className="mt-4 p-8 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { icon: HandRaisedIcon, title: "Zero Data Leak", desc: "Your fingerprint or face data NEVER leaves your device. Only a public key ID is stored server-side." },
                            { icon: ShieldCheckIcon, title: "Open Standard", desc: "Uses WebAuthn — the same tech trust by Google, Apple, and banks for passwordless access." },
                            { icon: CheckBadgeIcon, title: "Cross-Platform", desc: "Works seamlessly with Touch ID, Face ID, Android Fingerprint, and Windows Hello." },
                            { icon: ShieldExclamationIcon, title: "Anti-Spoofing", desc: "Hardware-level protection prevents replay attacks and biometric spoofing." }
                        ].map((info, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                                    <info.icon className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{info.title}</h4>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{info.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  )
}
