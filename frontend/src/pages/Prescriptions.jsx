import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  BeakerIcon, 
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilSquareIcon,
  EyeIcon,
  DocumentIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { API_URL } from '../config';

const FREQUENCY_LABELS = {
  once_daily: 'Once Daily',
  twice_daily: 'Twice Daily',
  thrice_daily: 'Three Times Daily',
  every_8hrs: 'Every 8 Hours',
  weekly: 'Weekly',
  as_needed: 'As Needed'
};

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active | completed | all
  const [showForm, setShowForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    drug_name: '',
    dosage: '',
    frequency: 'once_daily',
    prescribed_by: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    total_quantity: '',
    remaining_quantity: '',
    instructions: '',
    file: null
  });

  const [refillMode, setRefillMode] = useState(null); // { id, remaining }
  const [newRemaining, setNewRemaining] = useState('');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/prescriptions');
      setPrescriptions(res.data);
    } catch (err) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      await axios.post('/prescriptions', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Prescription added! 💊');
      setShowForm(false);
      resetForm();
      fetchPrescriptions();
    } catch (err) {
      toast.error('Failed to save prescription');
    }
  };

  const handleStatusToggle = async (id, currentActive) => {
    try {
      await axios.put(`/prescriptions/${id}`, { is_active: !currentActive });
      toast.success(currentActive ? 'Medication marked completed' : 'Medication re-activated');
      fetchPrescriptions();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription permanently?')) return;
    try {
      await axios.delete(`/prescriptions/${id}`);
      toast.success('Prescription deleted');
      fetchPrescriptions();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const updateRefillCount = async (id) => {
     try {
      await axios.put(`/prescriptions/${id}`, { remaining_quantity: parseInt(newRemaining) });
      toast.success('Refill quantity updated');
      setRefillMode(null);
      fetchPrescriptions();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const checkInteractions = async () => {
    const activeDrugs = prescriptions.filter(p => p.is_active).map(p => p.drug_name);
    if (activeDrugs.length < 2) {
      toast.error('You need at least 2 active medications for interaction check.');
      return;
    }
    
    setAiLoading(true);
    setShowAI(true);
    try {
      const res = await axios.post('/prescriptions/check-interactions', activeDrugs);
      setAiResult(res.data.reply);
    } catch (err) {
      toast.error('AI check failed');
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      drug_name: '',
      dosage: '',
      frequency: 'once_daily',
      prescribed_by: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      total_quantity: '',
      remaining_quantity: '',
      instructions: '',
      file: null
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  const isDueToday = (p) => {
    if (!p.is_active) return false;
    if (['once_daily', 'twice_daily', 'thrice_daily', 'every_8hrs'].includes(p.frequency)) return true;
    if (p.frequency === 'weekly') {
      const start = new Date(p.start_date);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % 7 === 0;
    }
    return false;
  };

  const filtered = prescriptions.filter(p => {
    if (activeTab === 'active') return p.is_active;
    if (activeTab === 'completed') return !p.is_active;
    return true;
  });

  const stats = {
    active: prescriptions.filter(p => p.is_active).length,
    dueToday: prescriptions.filter(isDueToday).length,
    refillSoon: prescriptions.filter(p => p.is_active && p.remaining_quantity !== null && p.remaining_quantity <= 7).length,
    completed: prescriptions.filter(p => !p.is_active).length
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in pt-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Prescriptions</h1>
          <p className="text-slate-500">Track your medications and refill reminders</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={checkInteractions}
            className="border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <SparklesIcon className="w-5 h-5" />
            Check Drug Interactions
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            {showForm ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
            {showForm ? 'Close Form' : 'Add Medication'}
          </button>
        </div>
      </div>

      {/* AI INTERACTION PANEL */}
      {showAI && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-2xl overflow-hidden animate-slide-down">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
              <SparklesIcon className="w-5 h-5" />
              AI Interaction Report
            </div>
            <button onClick={() => setShowAI(false)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {aiLoading ? (
              <div className="flex flex-col items-center py-10 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Analyzing active medications...</p>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="text-sm space-y-4 whitespace-pre-wrap leading-relaxed">
                  {aiResult.split('\n').map((line, i) => {
                    const isDangerous = line.toLowerCase().includes('dangerous') || line.toLowerCase().includes('severe');
                    const isMild = line.toLowerCase().includes('mild') || line.toLowerCase().includes('moderate');
                    const isSafe = line.toLowerCase().includes('safe');
                    
                    let bgColor = '';
                    if (isDangerous) bgColor = 'bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded';
                    else if (isMild) bgColor = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-2 rounded';
                    else if (isSafe) bgColor = 'bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded';

                    return (
                      <div key={i} className={bgColor}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Meds', val: stats.active, color: 'border-green-500', sub: 'Currently taking' },
          { label: 'Due Today', val: stats.dueToday, color: 'border-amber-500', sub: 'Take your doses' },
          { label: 'Refill Soon', val: stats.refillSoon, color: 'border-red-500', sub: '7 doses or less' },
          { label: 'Historical', val: stats.completed, color: 'border-slate-400', sub: 'Finished cycles' }
        ].map((s, i) => (
          <div key={i} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 ${s.color} shadow-sm border-t border-r border-b border-slate-100 dark:border-slate-700`}>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{s.val}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
            <div className="text-[10px] text-slate-500 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ADD FORM (INLINE) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-down">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Prescription</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Drug Name</label>
                <input required type="text" value={formData.drug_name} onChange={e => setFormData({ ...formData, drug_name: e.target.value })} placeholder="e.g. Paracetamol" className="input-field" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Dosage</label>
                  <input required type="text" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} placeholder="e.g. 500mg" className="input-field" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Frequency</label>
                  <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} className="input-field">
                    {Object.entries(FREQUENCY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Prescribed By (Doctor)</label>
                <input type="text" value={formData.prescribed_by} onChange={e => setFormData({ ...formData, prescribed_by: e.target.value })} placeholder="Dr. John Smith" className="input-field" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Start Date</label>
                  <input required type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="input-field" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">End Date (Optional)</label>
                  <input type="date" min={formData.start_date} value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Total Qty (Pills/ml)</label>
                  <input type="number" value={formData.total_quantity} onChange={e => setFormData({ ...formData, total_quantity: e.target.value })} placeholder="30" className="input-field" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Remaining Qty</label>
                  <input type="number" value={formData.remaining_quantity} onChange={e => setFormData({ ...formData, remaining_quantity: e.target.value })} placeholder="30" className="input-field" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Instructions</label>
                <textarea rows={2} value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} placeholder="Take after food..." className="input-field resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Upload Prescription (Image/PDF)</label>
                <div className="flex items-center gap-4">
                  <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="flex-1 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-slate-500">
                    {formData.file ? (
                      <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <DocumentIcon className="w-5 h-5" />
                        {formData.file.name.slice(0, 20)}...
                      </div>
                    ) : (
                      <>
                        <PlusIcon className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase tracking-wider">Select File</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black shadow-xl transition-all active:scale-95">Save Prescription</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white p-4 rounded-2xl font-black transition-all">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        {['active', 'completed', 'all'].map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all capitalize ${
              activeTab === t 
                ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* LIST CONTENT */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center space-y-4">
            <div className="text-6xl">💊</div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No prescriptions added yet</h3>
              <p className="text-slate-500 italic max-w-sm mx-auto mt-1">Track your medications, get refill reminders and check drug interactions.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary">+ Add First</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(p => {
              const due = isDueToday(p);
              const progress = p.total_quantity ? (p.remaining_quantity / p.total_quantity) * 100 : 0;
              const refillSoon = p.is_active && p.remaining_quantity !== null && p.remaining_quantity <= 7;
              
              let barColor = 'bg-green-500';
              if (progress < 10 || refillSoon) barColor = 'bg-red-500';
              else if (progress < 30) barColor = 'bg-yellow-500';

              return (
                <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-3xl border ${due ? 'border-amber-400 shadow-amber-500/10' : 'border-slate-200 dark:border-slate-700'} shadow-sm hover:shadow-xl transition-all group overflow-hidden`}>
                  <div className="flex h-full">
                    {/* Left Strip */}
                    <div className={`w-2 h-full ${p.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                    
                    <div className="flex-1 p-6 space-y-4">
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.drug_name}</h4>
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{p.dosage}</span>
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{FREQUENCY_LABELS[p.frequency]}</span>
                            {due && <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Due Today</span>}
                          </div>
                        </div>
                        {p.file_name && (
                          <a href={`${API_URL}/prescriptions/${p.id}/file`} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <EyeIcon className="w-5 h-5" />
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Prescribed By</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Dr. {p.prescribed_by || 'Unknown'}</p>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Schedule</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                             {new Date(p.start_date).toLocaleDateString()} → {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Ongoing'}
                           </p>
                        </div>
                      </div>

                      {p.instructions && (
                        <p className="text-xs italic text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                           "{p.instructions}"
                        </p>
                      )}

                      {/* Refill Section */}
                      {p.is_active && p.remaining_quantity !== null && (
                        <div className="pt-2 space-y-2">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                              <span className={refillSoon ? 'text-red-600' : 'text-slate-500'}>
                                {refillSoon ? '⚠️ Refill Soon' : 'Inventory'}
                              </span>
                              <span className="text-slate-800 dark:text-white">{p.remaining_quantity} / {p.total_quantity || '?'} Doses</span>
                           </div>
                           <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, progress)}%` }} />
                           </div>
                           
                           {refillMode === p.id ? (
                             <div className="flex gap-2 animate-fade-in">
                               <input 
                                 type="number" 
                                 value={newRemaining} 
                                 onChange={e => setNewRemaining(e.target.value)}
                                 placeholder="New Qty"
                                 className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                               />
                               <button onClick={() => updateRefillCount(p.id)} className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-bold">Update</button>
                               <button onClick={() => setRefillMode(null)} className="text-slate-500 p-1"><XMarkIcon className="w-4 h-4" /></button>
                             </div>
                           ) : (
                             <button onClick={() => { setRefillMode(p.id); setNewRemaining(p.remaining_quantity); }} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Update Remaining Quantity</button>
                           )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex gap-2 pt-2">
                         <button 
                           onClick={() => handleStatusToggle(p.id, p.is_active)}
                           className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                             p.is_active 
                               ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-green-600 hover:text-white' 
                               : 'bg-green-500 text-white'
                           }`}
                         >
                           <ClipboardDocumentCheckIcon className="w-4 h-4" />
                           {p.is_active ? 'Mark Complete' : 'Re-activate'}
                         </button>
                         <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                           <TrashIcon className="w-5 h-5" />
                         </button>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
