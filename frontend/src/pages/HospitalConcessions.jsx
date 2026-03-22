import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  MapPinIcon, 
  InformationCircleIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  GlobeAltIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'

const SCHEMES = [
  // ── CENTRAL GOVERNMENT SCHEMES ──
  {
    id: 1, name: "Ayushman Bharat – PM-JAY",
    type: "central", state: "All India",
    category: "Insurance", coverage: "₹5 lakh/year per family",
    eligibility: "BPL families, SECC database listed",
    conditions: ["all"],
    description: "World's largest health insurance scheme. Covers secondary and tertiary hospitalisation.",
    how_to_apply: "Visit nearest Common Service Centre or empanelled hospital with Aadhaar",
    website: "https://pmjay.gov.in",
    helpline: "14555",
  },
  {
    id: 2, name: "Central Government Health Scheme (CGHS)",
    type: "central", state: "All India",
    category: "Insurance", coverage: "Cashless treatment",
    eligibility: "Central government employees and pensioners",
    conditions: ["all"],
    description: "Comprehensive health care for central govt employees across 75+ cities.",
    how_to_apply: "Apply through your department or visit CGHS wellness centre",
    website: "https://cghs.gov.in",
    helpline: "1800-11-2345",
  },
  {
    id: 3, name: "Employees' State Insurance (ESIC)",
    type: "central", state: "All India",
    category: "Insurance", coverage: "Full medical + cash benefits",
    eligibility: "Employees earning ≤ ₹21,000/month in ESI-covered factories",
    conditions: ["all"],
    description: "Medical, sickness, maternity, disability and dependent benefits.",
    how_to_apply: "Enroll through employer. Visit ESIC dispensary with ESI card.",
    website: "https://esic.gov.in",
    helpline: "1800-11-2526",
  },
  {
    id: 4, name: "Rashtriya Arogya Nidhi (RAN)",
    type: "central", state: "All India",
    category: "Financial Aid", coverage: "Up to ₹15 lakh",
    eligibility: "BPL patients with life-threatening diseases at govt hospitals",
    conditions: ["cardiac", "cancer", "kidney", "liver"],
    description: "One-time financial assistance for BPL patients needing expensive treatment.",
    how_to_apply: "Apply through the medical superintendent of government hospital",
    website: "https://mohfw.gov.in",
    helpline: "1800-180-1104",
  },
  {
    id: 5, name: "Health Minister's Cancer Patient Fund",
    type: "central", state: "All India",
    category: "Financial Aid", coverage: "Up to ₹2 lakh",
    eligibility: "BPL cancer patients at Regional Cancer Centres",
    conditions: ["cancer"],
    description: "Financial aid for cancer treatment at government Regional Cancer Centres.",
    how_to_apply: "Apply through the treating Regional Cancer Centre",
    website: "https://mohfw.gov.in",
    helpline: "1800-180-1104",
  },
  {
    id: 6, name: "Pradhan Mantri Dialysis Programme",
    type: "central", state: "All India",
    category: "Free Treatment", coverage: "Free dialysis sessions",
    eligibility: "BPL patients with chronic kidney disease",
    conditions: ["kidney"],
    description: "Free haemodialysis at district hospitals under PPP model.",
    how_to_apply: "Visit nearest district hospital nephrology unit",
    website: "https://nhm.gov.in",
    helpline: "1800-180-1104",
  },
  {
    id: 7, name: "Janani Suraksha Yojana (JSY)",
    type: "central", state: "All India",
    category: "Maternity", coverage: "₹1,400 (rural) / ₹1,000 (urban) cash",
    eligibility: "Pregnant women from BPL / SC / ST households",
    conditions: ["maternity"],
    description: "Cash incentive for institutional delivery to reduce maternal and infant mortality.",
    how_to_apply: "Register at nearest government health centre during pregnancy",
    website: "https://nhm.gov.in",
    helpline: "104",
  },
  {
    id: 8, name: "National Mental Health Programme (NMHP)",
    type: "central", state: "All India",
    category: "Mental Health", coverage: "Free outpatient + medicines",
    eligibility: "All citizens at government hospitals",
    conditions: ["psychiatric"],
    description: "Free mental health services at District Mental Health Programme centres.",
    how_to_apply: "Visit nearest DMHP centre or government hospital psychiatry OPD",
    website: "https://nimhans.ac.in",
    helpline: "NIMHANS: 080-46110007",
  },

  // ── STATE SCHEMES ──
  {
    id: 9, name: "Karnataka Arogya Karnataka",
    type: "state", state: "Karnataka",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "Karnataka residents with Kutumba Rashana card",
    conditions: ["all"],
    description: "State health insurance covering 1,600+ procedures at empanelled hospitals.",
    how_to_apply: "Visit nearest Nada Kacheri with Aadhaar and ration card",
    website: "https://arogyakarnataka.gov.in",
    helpline: "104",
  },
  {
    id: 10, name: "Tamil Nadu Chief Minister's Comprehensive Health Insurance",
    type: "state", state: "Tamil Nadu",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "TN families with annual income < ₹72,000",
    conditions: ["all"],
    description: "Covers 1,027 surgical procedures and 23 follow-up treatments.",
    how_to_apply: "Apply at District Collectorate or empanelled hospital",
    website: "https://www.cmchistn.com",
    helpline: "044-28592828",
  },
  {
    id: 11, name: "Kerala Karunya Health Scheme",
    type: "state", state: "Kerala",
    category: "Financial Aid", coverage: "Up to ₹3 lakh",
    eligibility: "Kerala BPL families with serious illness",
    conditions: ["cardiac", "cancer", "kidney"],
    description: "Financial assistance for treatments not covered under other schemes.",
    how_to_apply: "Apply through District Medical Officer",
    website: "https://karunya.kerala.gov.in",
    helpline: "0471-2308854",
  },
  {
    id: 12, name: "Maharashtra Mahatma Jyotiba Phule Jan Arogya Yojana",
    type: "state", state: "Maharashtra",
    category: "Insurance", coverage: "₹1.5 lakh/year (₹2.5 lakh for serious)",
    eligibility: "Maharashtra yellow/orange ration card holders",
    conditions: ["all"],
    description: "Covers 996 medical and surgical procedures at empanelled hospitals.",
    how_to_apply: "Visit empanelled hospital with ration card and Aadhaar",
    website: "https://www.jeevandayee.gov.in",
    helpline: "155388",
  },
  {
    id: 13, name: "Andhra Pradesh Dr. YSR Aarogyasri",
    type: "state", state: "Andhra Pradesh",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "AP white ration card holders",
    conditions: ["all"],
    description: "Cashless treatment for 2,478 medical procedures at empanelled hospitals.",
    how_to_apply: "Visit nearest empanelled hospital with white ration card",
    website: "https://aarogyasri.telangana.gov.in",
    helpline: "104",
  },
  {
    id: 14, name: "Telangana Aarogyasri Health Care Trust",
    type: "state", state: "Telangana",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "Telangana white ration card holders",
    conditions: ["all"],
    description: "Comprehensive cashless health coverage for BPL families.",
    how_to_apply: "Visit empanelled hospital with white ration card",
    website: "https://aarogyasri.telangana.gov.in",
    helpline: "104",
  },
  {
    id: 15, name: "Rajasthan Mukhyamantri Chiranjeevi Swasthya Bima Yojana",
    type: "state", state: "Rajasthan",
    category: "Insurance", coverage: "₹25 lakh/year",
    eligibility: "All Rajasthan families (₹850/year premium for non-BPL)",
    conditions: ["all"],
    description: "One of India's highest coverage schemes. Includes COVID treatment.",
    how_to_apply: "Register on chiranjeevi.rajasthan.gov.in with Jan Aadhaar",
    website: "https://chiranjeevi.rajasthan.gov.in",
    helpline: "181",
  },
  {
    id: 16, name: "Gujarat MA Vatsalya Yojana",
    type: "state", state: "Gujarat",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "Gujarat BPL families and SECC-listed households",
    conditions: ["all"],
    description: "Cashless treatment at empanelled private and government hospitals.",
    how_to_apply: "Enroll at nearest government hospital with Aadhaar",
    website: "https://mavatsalya.gujarat.gov.in",
    helpline: "104",
  },
  {
    id: 17, name: "West Bengal Swasthya Sathi",
    type: "state", state: "West Bengal",
    category: "Insurance", coverage: "₹5 lakh/year per family",
    eligibility: "All WB families — universal coverage",
    conditions: ["all"],
    description: "Universal health coverage for all West Bengal families. Covers 1,600+ packages.",
    how_to_apply: "Apply at nearest Duare Sarkar camp or BDO office",
    website: "https://swasthyasathi.gov.in",
    helpline: "1800-345-5384",
  },
  {
    id: 18, name: "Punjab Sarbat Sehat Bima Yojana",
    type: "state", state: "Punjab",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "Punjab smart ration card holders + construction workers",
    conditions: ["all"],
    description: "Cashless treatment at 800+ empanelled hospitals across Punjab.",
    how_to_apply: "Visit empanelled hospital with smart ration card",
    website: "https://sha.punjab.gov.in",
    helpline: "104",
  },
  {
    id: 19, name: "Madhya Pradesh Deen Dayal Antyodaya Upchar Yojana",
    type: "state", state: "Madhya Pradesh",
    category: "Free Treatment", coverage: "Free OPD + IPD at govt hospitals",
    eligibility: "All MP residents at government hospitals",
    conditions: ["all"],
    description: "Free medicines, diagnostics and treatment at all MP government hospitals.",
    how_to_apply: "Visit any government hospital in Madhya Pradesh",
    website: "https://health.mp.gov.in",
    helpline: "104",
  },
  {
    id: 20, name: "Odisha Biju Swasthya Kalyan Yojana",
    type: "state", state: "Odisha",
    category: "Insurance", coverage: "₹5 lakh (women ₹10 lakh)/year",
    eligibility: "Odisha households with National Food Security Act cards",
    conditions: ["all"],
    description: "Higher coverage for women. Covers 220+ medical packages.",
    how_to_apply: "Visit empanelled hospital with NFSA card and Aadhaar",
    website: "https://bsky.odisha.gov.in",
    helpline: "104",
  },
  {
    id: 21, name: "Himachal Pradesh Him Care Scheme",
    type: "state", state: "Himachal Pradesh",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "HP residents not covered under CGHS/ESIC",
    conditions: ["all"],
    description: "Covers 1,740+ medical packages at empanelled hospitals.",
    how_to_apply: "Register at nearest Lok Mitra Kendra with Aadhaar",
    website: "https://hpsbys.in",
    helpline: "104",
  },
  {
    id: 22, name: "Uttarakhand Atal Ayushman Yojana",
    type: "state", state: "Uttarakhand",
    category: "Insurance", coverage: "₹5 lakh/year",
    eligibility: "All Uttarakhand families",
    conditions: ["all"],
    description: "Universal health coverage for all UK families at empanelled hospitals.",
    how_to_apply: "Apply at nearest CSC or empanelled hospital with Aadhaar",
    website: "https://ayushmanuttarakhand.org",
    helpline: "104",
  },
  {
    id: 23, name: "Goa Deen Dayal Swasthya Seva Yojana",
    type: "state", state: "Goa",
    category: "Insurance", coverage: "₹2.5–4 lakh/year",
    eligibility: "Goa residents with annual income < ₹3 lakh",
    conditions: ["all"],
    description: "Cashless treatment at empanelled hospitals in Goa.",
    how_to_apply: "Apply at Directorate of Health Services, Panaji",
    website: "https://www.goa.gov.in",
    helpline: "104",
  },
  {
    id: 24, name: "Bihar Mukhyamantri Chikitsa Sahayta Kosh",
    type: "state", state: "Bihar",
    category: "Financial Aid", coverage: "Up to ₹1 lakh",
    eligibility: "Bihar BPL patients with serious illness",
    conditions: ["cardiac", "cancer", "kidney", "liver"],
    description: "One-time financial aid for BPL patients needing expensive treatment.",
    how_to_apply: "Apply through Civil Surgeon of concerned district",
    website: "https://health.bih.nic.in",
    helpline: "104",
  },
  {
    id: 25, name: "Assam Atal Amrit Abhiyan",
    type: "state", state: "Assam",
    category: "Insurance", coverage: "₹2 lakh/year",
    eligibility: "Assam families with annual income < ₹5 lakh",
    conditions: ["cardiac", "cancer", "kidney", "neurological", "burns"],
    description: "Covers 5 critical disease categories at empanelled hospitals.",
    how_to_apply: "Register at District Health Society office",
    website: "https://atalaamritabhiyan.assam.gov.in",
    helpline: "104",
  },
];

const CATEGORIES = ["All", "Insurance", "Financial Aid", "Free Treatment", "Maternity", "Mental Health"];

const SchemeCard = ({ scheme, userConditions, isExpanded, onToggle }) => {
  const matches = useMemo(() => {
    if (!userConditions || userConditions.length === 0) return false;
    return scheme.conditions.some(c => c === 'all' || userConditions.some(uc => uc.toLowerCase().includes(c.toLowerCase())));
  }, [scheme.conditions, userConditions]);

  return (
    <div className={`bg-white dark:bg-slate-900 border-2 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 
      ${matches ? 'border-amber-400/50 dark:border-amber-500/30' : 'border-slate-100 dark:border-slate-800'}`}>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
              ${scheme.type === 'central' 
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
              {scheme.type}
            </span>
            {matches && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 animate-pulse">
                Matches Profile ✨
              </span>
            )}
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
            {scheme.state}
          </div>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase tracking-tight">{scheme.name}</h3>
        
        <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-tight">
                {scheme.category}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <p className="text-secondary text-xs font-bold">{scheme.coverage}</p>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2 italic">
          "{scheme.description}"
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-slate-500 font-bold leading-tight">
              Eligible: <span className="text-slate-900 dark:text-slate-200 font-black">{scheme.eligibility}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={onToggle}
          className="w-full mt-6 py-3 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-all active:scale-95"
        >
          {isExpanded ? (
              <>Less Details <ChevronUpIcon className="w-4 h-4" /></>
          ) : (
              <>Learn More <ChevronDownIcon className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="space-y-6">
                <div>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 border-l-2 border-blue-500 pl-2">Full Description</p>
                   <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{scheme.description}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 border-l-2 border-green-500 pl-2">How To Apply</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{scheme.how_to_apply}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {scheme.conditions.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest text-slate-400 rounded-lg">
                            {c}
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <a href={`tel:${scheme.helpline}`} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                        <PhoneIcon className="w-4 h-4" /> 📞 {scheme.helpline}
                    </a>
                    <a href={scheme.website} target="_blank" rel="noreferrer" className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                         Website <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default function HospitalConcessions() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [matchingOnly, setMatchingOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user) {
      axios.get('/patient/profile').then(res => setProfile(res.data)).catch(() => {});
    }
  }, [user]);

  const userConditions = useMemo(() => {
    if (!profile) return [];
    const conds = [
      profile.chronic_conditions,
      profile.is_diabetic && 'diabetic',
      profile.is_cardiac_patient && 'cardiac',
      profile.is_epileptic && 'epileptic',
      profile.is_asthmatic && 'asthmatic',
    ].filter(Boolean).flatMap(c => typeof c === 'string' ? c.split(',').map(s => s.trim()) : [c]);
    return conds;
  }, [profile]);

  const states = useMemo(() => {
    const list = Array.from(new Set(SCHEMES.map(s => s.state))).sort();
    return ["All India", ...list.filter(s => s !== "All India")];
  }, []);

  const stats = useMemo(() => {
    const centralCount = SCHEMES.filter(s => s.type === 'central').length;
    const stateCount = SCHEMES.filter(s => s.type === 'state').length;
    const uniqueStates = new Set(SCHEMES.map(s => s.state)).size;
    return { centralCount, stateCount, uniqueStates };
  }, []);

  const filteredSchemes = useMemo(() => {
    return SCHEMES.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase());
      const matchState = selectedState === 'All India' || s.state === selectedState || s.state === 'All India';
      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchConditions = !matchingOnly || s.conditions.some(c => c === 'all' || userConditions.some(uc => uc.toLowerCase().includes(c.toLowerCase())));

      return matchSearch && matchState && matchCategory && matchConditions;
    });
  }, [search, selectedState, selectedCategory, matchingOnly, userConditions]);

  const matchedCount = useMemo(() => {
      if (userConditions.length === 0) return 0;
      return SCHEMES.filter(s => s.conditions.some(c => c === 'all' || userConditions.some(uc => uc.toLowerCase().includes(c.toLowerCase())))).length;
  }, [userConditions]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-3">
                    <BuildingLibraryIcon className="w-6 h-6 text-blue-500" />
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-blue-500/20">
                        {SCHEMES.length} Schemes Available
                    </span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Hospital Fee Concessions</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold italic border-l-2 border-slate-200 dark:border-slate-800 pl-4">
                  Identify government medical aid and insurance schemes tailored to your health profile across central and state jurisdictions.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                {[
                  { label: "Central", val: stats.centralCount, icon: GlobeAltIcon, color: "blue" },
                  { label: "State", val: stats.stateCount, icon: MapPinIcon, color: "green" },
                  { label: "Up to", val: "₹25L", icon: SparklesIcon, color: "amber" },
                  { label: "States", val: stats.uniqueStates, icon: MapPinIcon, color: "purple" }
                ].map((st, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
                        <st.icon className={`w-5 h-5 text-${st.color}-500 mb-1`} />
                        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{st.val}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{st.label}</span>
                    </div>
                ))}
            </div>
        </header>

        {/* Personalized Banner */}
        {profile && matchedCount > 0 && (
            <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent border-l-4 border-amber-500 rounded-r-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-left duration-500 shadow-xl shadow-amber-500/5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">✨</div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Schemes matching your profile</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">We found <span className="text-amber-500">{matchedCount} schemes</span> that specifically cover your reported health conditions.</p>
                    </div>
                </div>
                <button 
                  onClick={() => setMatchingOnly(!matchingOnly)}
                  className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg
                    ${matchingOnly 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-black/20' 
                        : 'bg-amber-500 text-white shadow-amber-500/30 hover:scale-105 active:scale-95'}`}
                >
                    {matchingOnly ? 'Show All Schemes' : 'Show Matching Only'}
                </button>
            </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Search */}
                <div className="lg:col-span-4 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search schemes by name or disease..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>

                {/* State Dropdown */}
                <div className="lg:col-span-3 relative">
                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select 
                      value={selectedState}
                      onChange={e => setSelectedState(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Categories */}
                <div className="lg:col-span-5">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <FunnelIcon className="w-5 h-5 text-slate-400 shrink-0 mr-1" />
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all
                                    ${selectedCategory === cat 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSchemes.map(s => (
                <SchemeCard 
                    key={s.id} 
                    scheme={s} 
                    userConditions={userConditions}
                    isExpanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                />
            ))}
        </div>

        {filteredSchemes.length === 0 && (
            <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <FunnelIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">No Schemes Found</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold italic tracking-tight">Try adjusting your filters or search keywords.</p>
                <button 
                  onClick={() => { setSearch(''); setSelectedState('All India'); setSelectedCategory('All'); setMatchingOnly(false); }}
                  className="mt-8 text-blue-500 font-black uppercase tracking-widest text-xs hover:underline"
                >
                    Reset All Filters
                </button>
            </div>
        )}

      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.5rem; }
      `}</style>
    </div>
  )
}
