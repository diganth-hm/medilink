import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  SparklesIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  BeakerIcon,
  QueueListIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <QueueListIcon className="w-4 h-4" />, color: 'slate' },
  { id: 'lab_report', label: 'Lab Reports', icon: <BeakerIcon className="w-4 h-4" />, color: 'blue', emoji: '🧪' },
  { id: 'prescription', label: 'Prescriptions', icon: <DocumentTextIcon className="w-4 h-4" />, color: 'green', emoji: '💊' },
  { id: 'scan', label: 'Scans', icon: <MagnifyingGlassIcon className="w-4 h-4" />, color: 'purple', emoji: '🔬' },
  { id: 'vaccination', label: 'Vaccination', icon: <ShieldCheckIcon className="w-4 h-4" />, color: 'teal', emoji: '💉' },
  { id: 'surgery', label: 'Surgery', icon: <CpuChipIcon className="w-4 h-4" />, color: 'red', emoji: '🏥' },
  { id: 'other', label: 'Other', icon: <DocumentTextIcon className="w-4 h-4" />, color: 'gray', emoji: '📄' },
];

const CATEGORY_STYLES = {
  lab_report: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800' },
  prescription: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600', border: 'border-green-200 dark:border-green-800' },
  scan: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600', border: 'border-purple-200 dark:border-purple-800' },
  vaccination: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600', border: 'border-teal-200 dark:border-teal-800' },
  surgery: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600', border: 'border-red-200 dark:border-red-800' },
  other: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600', border: 'border-gray-200 dark:border-gray-800' },
};

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first
  const [summaries, setSummaries] = useState({}); // { recordId: summaryText }
  const [summarizingId, setSummarizingId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'lab_report',
    record_date: new Date().toISOString().split('T')[0],
    doctor_name: '',
    notes: '',
    file: null
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/health-records`);
      setRecords(res.data);
    } catch (err) {
      toast.error('Failed to load health records');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('File too large (Max 10MB)');
      return;
    }
    setFormData({ ...formData, file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('record_date', formData.record_date);
    data.append('doctor_name', formData.doctor_name);
    data.append('notes', formData.notes);
    if (formData.file) data.append('file', formData.file);

    try {
      toast.loading('Saving record...', { id: 'upload' });
      await axios.post(`${API_URL}/health-records`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Record saved successfully', { id: 'upload' });
      setShowForm(false);
      setFormData({
        title: '',
        category: 'lab_report',
        record_date: new Date().toISOString().split('T')[0],
        doctor_name: '',
        notes: '',
        file: null
      });
      fetchRecords();
    } catch (err) {
      toast.error('Failed to save record', { id: 'upload' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await axios.delete(`${API_URL}/health-records/${id}`);
      toast.success('Record deleted');
      fetchRecords();
    } catch (err) {
      toast.error('Failed to delete record');
    }
  };

  const handleAiSummary = async (record) => {
    if (summaries[record.id]) {
      // Toggle off if already exists
      const newSummaries = { ...summaries };
      delete newSummaries[record.id];
      setSummaries(newSummaries);
      return;
    }

    setSummarizingId(record.id);
    try {
      const prompt = `Summarize this medical record in simple language for a patient:
      Title: ${record.title}, Category: ${record.category}, Date: ${record.record_date},
      Doctor: ${record.doctor_name || 'N/A'}, Notes: ${record.notes || 'N/A'}.
      Give a 2-3 sentence plain English summary and flag anything that needs attention.`;

      const res = await axios.post(`${API_URL}/chatbot/chat`, { message: prompt });
      setSummaries({ ...summaries, [record.id]: res.data.response });
    } catch (err) {
      toast.error('AI Summary failed');
    } finally {
      setSummarizingId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.doctor_name && r.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.record_date);
      const dateB = new Date(b.record_date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [records, searchTerm, activeCategory, sortOrder]);

  const stats = useMemo(() => {
    const total = records.length;
    const lastAdded = records.length > 0 ? records.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0].record_date : 'N/A';
    const labReports = records.filter(r => r.category === 'lab_report').length;
    return { total, lastAdded, labReports };
  }, [records]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in pt-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Health Records</h1>
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-800">
              {records.length} Records
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your medical history, prescriptions, and reports securely.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          {showForm ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          {showForm ? 'Close Form' : 'Add Record'}
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={stats.total} icon={<QueueListIcon />} color="blue" />
        <StatCard title="Last Added" value={formatDate(stats.lastAdded) === 'Invalid Date' ? stats.lastAdded : formatDate(stats.lastAdded)} icon={<CalendarDaysIcon />} color="emerald" />
        <StatCard title="Lab Reports" value={stats.labReports} icon={<BeakerIcon />} color="purple" />
        <StatCard title="Upcoming" value="0 scheduled" icon={<ClockIcon />} color="amber" isMuted />
      </div>

      {/* UPLOAD FORM (INLINE) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-700 shadow-2xl animate-slide-down overflow-hidden">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
               <DocumentTextIcon className="w-5 h-5" />
            </span>
            New Health Record
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Record Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="e.g. Annual Blood Work 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Record Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.record_date}
                    onChange={e => setFormData({...formData, record_date: e.target.value})}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Doctor Name (Optional)</label>
                <input 
                  type="text" 
                  value={formData.doctor_name}
                  onChange={e => setFormData({...formData, doctor_name: e.target.value})}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Dr. Sarah Johnson"
                />
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Medical Notes</label>
                <textarea 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  placeholder="Key findings or specific doctor instructions..."
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Attachment</label>
                <div className="relative group">
                   <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all
                      ${formData.file ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400 bg-slate-50 dark:bg-slate-900/50'}
                    `}
                  >
                    {formData.file ? (
                      <>
                        <ShieldCheckIcon className="w-10 h-10 text-green-500 mb-2" />
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-xs">{formData.file.name}</span>
                        <span className="text-xs text-slate-500">{(formData.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-10 h-10 text-slate-400 group-hover:text-red-500 mb-2 transition-colors" />
                        <span className="font-bold text-slate-600 dark:text-slate-400">Click to upload file</span>
                        <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 10MB)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 flex gap-4">
               <button 
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:-translate-y-1"
                >
                  Save Healthcare Record
                </button>
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-4 rounded-2xl font-bold transition-all text-slate-700 dark:text-white"
                >
                  Cancel
                </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by report title or doctor..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-6 py-4 bg-white dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <FunnelIcon className="w-5 h-5" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap flex items-center gap-2 transition-all border-2
                ${activeCategory === cat.id 
                  ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-200'}
              `}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* RECORDS LIST */}
      <div className="space-y-4 relative">
        {loading ? (
             <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-700" />
                ))}
             </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[40px] p-20 text-center space-y-6">
            <div className="inline-flex p-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600">
               <DocumentTextIcon className="w-16 h-16 opacity-40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">No health records yet</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm italic">Add your first record above. Store lab reports, prescriptions, scans and more securely.</p>
            </div>
            <button 
              onClick={() => setShowForm(true)}
              className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-xl transition-all active:scale-95"
            >
              + Create First Record
            </button>
          </div>
        ) : (
          <div className="space-y-4 relative">
             {/* Timeline Line */}
             <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 hidden md:block" />
             
             {filteredRecords.map(record => (
                <div key={record.id} className="relative pl-0 md:pl-16 group transition-all">
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 top-8 w-14 h-14 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center text-2xl shadow-md z-10 transition-transform group-hover:scale-110 hidden md:flex
                    ${CATEGORY_STYLES[record.category]?.bg}
                  `}>
                    {CATEGORIES.find(c => c.id === record.category)?.emoji}
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group-hover:border-red-500/30 overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[record.category]?.bg} ${CATEGORY_STYLES[record.category]?.text} ${CATEGORY_STYLES[record.category]?.border}`}>
                              {record.category.replace('_', ' ')}
                           </span>
                           <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{record.title}</h4>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                           <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                              <CalendarDaysIcon className="w-4 h-4 text-red-500" />
                              {formatDate(record.record_date)}
                           </div>
                           {record.doctor_name && (
                             <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                               <UserIcon className="w-4 h-4 text-blue-500" />
                               {record.doctor_name}
                             </div>
                           )}
                        </div>

                        {record.notes && (
                          <p className="text-slate-500 dark:text-slate-400 text-sm italic line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border-l-4 border-slate-300 dark:border-slate-600">
                            "{record.notes}"
                          </p>
                        )}
                        
                        {/* AI SUMMARY SECTION */}
                        {summaries[record.id] && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl animate-fade-in relative">
                            <button 
                              onClick={() => {
                                const newS = {...summaries};
                                delete newS[record.id];
                                setSummaries(newS);
                              }}
                              className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                            <div className="flex gap-3">
                              <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">AI Clinical Insight</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                  {summaries[record.id]}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row lg:flex-col items-center justify-end gap-3 flex-shrink-0">
                         {record.file_name && (
                           <>
                            <a 
                              href={`${API_URL}/health-records/${record.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700 group/btn flex items-center gap-2"
                              title="View File"
                            >
                              <EyeIcon className="w-5 h-5" />
                              <span className="text-xs font-bold lg:hidden">View</span>
                            </a>
                            <a 
                              href={`${API_URL}/health-records/${record.id}/file`}
                              download={record.file_name}
                              className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-5 h-5" />
                              <span className="text-xs font-bold lg:hidden">Download</span>
                            </a>
                           </>
                         )}
                         <button 
                          onClick={() => handleAiSummary(record)}
                          disabled={summarizingId === record.id}
                          className={`p-3 rounded-2xl transition-all shadow-sm border flex items-center gap-2
                            ${summaries[record.id] 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600'}
                          `}
                          title="Generate AI Summary"
                        >
                          {summarizingId === record.id ? (
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <SparklesIcon className="w-5 h-5" />
                          )}
                          <span className="text-xs font-bold lg:hidden">AI Summary</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(record.id)}
                          className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"
                          title="Delete Record"
                        >
                          <TrashIcon className="w-5 h-5" />
                          <span className="text-xs font-bold lg:hidden">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, isMuted = false }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-100 dark:border-purple-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800',
  };

  return (
    <div className={`p-4 rounded-3xl border shadow-sm transition-all hover:shadow-md ${isMuted ? 'opacity-60' : ''} ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">{title}</p>
          <p className="text-lg font-black tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
