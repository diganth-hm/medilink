import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  VideoCameraIcon, 
  PhoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { API_URL } from '../config';

const SPECIALTIES = [
  'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
  'Orthopedic', 'Gynecologist', 'Pediatrician', 'Psychiatrist',
  'Ophthalmologist', 'Dentist', 'ENT Specialist', 'Other'
];

const TYPE_CONFIG = {
  in_person: { label: 'In-Person', icon: MapPinIcon, color: 'blue' },
  video: { label: 'Video Call', icon: VideoCameraIcon, color: 'purple' },
  phone: { label: 'Phone', icon: PhoneIcon, color: 'green' }
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming | past
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  
  const [formData, setFormData] = useState({
    doctor_name: '',
    specialty: 'General Physician',
    clinic_or_hospital: '',
    appointment_date: '',
    appointment_time: '',
    type: 'in_person',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/appointments`);
      setAppointments(res.data);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      if (editingAppt) {
        await axios.put(`${API_URL}/appointments/${editingAppt.id}`, formData);
        toast.success('Appointment rescheduled! 📅');
      } else {
        await axios.post(`${API_URL}/appointments`, formData);
        toast.success('Appointment booked successfully! ✨');
      }
      setShowForm(false);
      setEditingAppt(null);
      resetForm();
      fetchAppointments();
    } catch (err) {
      toast.error('Failed to save appointment');
    }
  };

  const handleCancelAppt = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await axios.put(`${API_URL}/appointments/${id}`, { status: 'cancelled' });
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await axios.delete(`${API_URL}/appointments/${id}`);
      toast.success('Appointment deleted');
      fetchAppointments();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_name: '',
      specialty: 'General Physician',
      clinic_or_hospital: '',
      appointment_date: '',
      appointment_time: '',
      type: 'in_person',
      reason: '',
      notes: ''
    });
  };

  const openReschedule = (appt) => {
    setEditingAppt(appt);
    setFormData({
      doctor_name: appt.doctor_name,
      specialty: appt.specialty,
      clinic_or_hospital: appt.clinic_or_hospital || '',
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      type: appt.type,
      reason: appt.reason || '',
      notes: appt.notes || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingAppts = appointments
    .filter(a => a.status === 'upcoming' && a.appointment_date >= todayStr)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));

  const pastAppts = appointments
    .filter(a => a.status !== 'upcoming' || a.appointment_date < todayStr)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));

  const stats = {
    total: appointments.length,
    upcoming: appointments.filter(a => a.status === 'upcoming' && a.appointment_date >= todayStr).length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length
  };

  const getCountdown = (dateStr) => {
    const diffTime = new Date(dateStr) - new Date(todayStr);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { label: 'Today!', color: 'bg-red-500' };
    if (diffDays === 1) return { label: 'Tomorrow', color: 'bg-orange-500' };
    if (diffDays < 7) return { label: `In ${diffDays} days`, color: 'bg-amber-500' };
    const weeks = Math.floor(diffDays / 7);
    return { label: `In ${weeks} week${weeks > 1 ? 's' : ''}`, color: 'bg-blue-500' };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in pt-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Appointments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your medical visits and consultations</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingAppt(null); if(!showForm) resetForm(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          {showForm ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          {showForm ? 'Close Form' : 'Book Appointment'}
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Visits', val: stats.total, color: 'border-slate-400', sub: 'Historical records' },
          { label: 'Upcoming', val: stats.upcoming, color: 'border-blue-500', sub: 'Confirmed visits' },
          { label: 'Completed', val: stats.completed, color: 'border-green-500', sub: 'Follow-ups done' },
          { label: 'Cancelled', val: stats.cancelled, color: 'border-red-500', sub: 'Rescheduled visits' }
        ].map((s, i) => (
          <div key={i} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 ${s.color} shadow-sm border-t border-r border-b border-slate-100 dark:border-slate-700`}>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{s.val}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
            <div className="text-[10px] text-slate-500 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* BOOKING FORM (INLINE) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-down">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingAppt ? 'Reschedule Appointment' : 'Book New Appointment'}
            </h3>
          </div>
          <form onSubmit={handleBook} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Doctor Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.doctor_name}
                  onChange={e => setFormData({ ...formData, doctor_name: e.target.value })}
                  placeholder="e.g. Dr. Sarah Johnson"
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Specialty</label>
                <select 
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Clinic / Hospital (Optional)</label>
                <input 
                  type="text" 
                  value={formData.clinic_or_hospital}
                  onChange={e => setFormData({ ...formData, clinic_or_hospital: e.target.value })}
                  placeholder="e.g. Central Health Medical Center"
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1 flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Date</label>
                  <input 
                    required
                    type="date" 
                    min={todayStr}
                    value={formData.appointment_date}
                    onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-black uppercase text-slate-500 ml-1">Time</label>
                  <input 
                    required
                    type="time" 
                    value={formData.appointment_time}
                    onChange={e => setFormData({ ...formData, appointment_time: e.target.value })}
                    className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Appointment Type</label>
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = formData.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: key })}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isActive 
                            ? `bg-white dark:bg-slate-800 shadow-md text-${cfg.color}-600 dark:text-${cfg.color}-400` 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Reason for Visit</label>
                <input 
                  type="text" 
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Main symptom or reason..."
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-500 ml-1">Additional Notes</label>
                <textarea 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any other details..."
                  className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black shadow-xl transition-all active:scale-95"
                >
                  {editingAppt ? 'Confirm Rescheduling' : 'Book Appointment'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowForm(false); setEditingAppt(null); }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white p-4 rounded-2xl font-black transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'upcoming' 
              ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Upcoming ({upcomingAppts.length})
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'past' 
              ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Past ({pastAppts.length})
        </button>
      </div>

      {/* LIST CONTENT */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-44 bg-slate-50 dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'upcoming' ? (
          upcomingAppts.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center space-y-4">
              <div className="text-6xl">🗓️</div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No upcoming appointments</h3>
                <p className="text-slate-500 dark:text-slate-400 italic max-w-sm mx-auto mt-1">Ready for your next health check? Book your next appointment with the button above.</p>
              </div>
              <button 
                 onClick={() => { setShowForm(true); setEditingAppt(null); resetForm(); }}
                className="btn-primary"
              >
                + Book New
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingAppts.map(appt => {
                const countdown = getCountdown(appt.appointment_date);
                const typeCfg = TYPE_CONFIG[appt.type];
                const TypeIcon = typeCfg.icon;
                
                return (
                  <div 
                    key={appt.id} 
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
                  >
                    <div className="flex h-full">
                      {/* Left Strip */}
                      <div className={`w-2 h-full bg-${typeCfg.color}-500/80`} />
                      
                      <div className="flex-1 p-6 space-y-4 relative">
                        {/* Countdown Badge */}
                        <div className={`absolute top-6 right-6 ${countdown.color} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg`}>
                          {countdown.label}
                        </div>

                        <div className="space-y-1 pr-20">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate pr-4">
                            Dr. {appt.doctor_name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold leading-none bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800 uppercase tracking-wide">
                              {appt.specialty}
                            </span>
                             <span className={`flex items-center gap-1 text-[10px] font-bold text-${typeCfg.color}-600 dark:text-${typeCfg.color}-400 lowercase tracking-wider`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeCfg.label}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {appt.clinic_or_hospital && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{appt.clinic_or_hospital}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl w-fit">
                            <CalendarIcon className="w-5 h-5 text-blue-500" />
                            {formatDate(appt.appointment_date)}
                            <span className="text-slate-300 mx-1">|</span>
                            <ClockIcon className="w-5 h-5 text-blue-500" />
                            {formatTime(appt.appointment_time)}
                          </div>
                        </div>

                        {appt.reason && (
                          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                             <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase tracking-tighter text-[9px]">Reason for Visit</span>
                             {appt.reason}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => openReschedule(appt)}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded-xl text-slate-600 dark:text-slate-300 font-bold transition-all text-xs flex items-center justify-center gap-2"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                            Reschedule
                          </button>
                          <button 
                            onClick={() => handleCancelAppt(appt.id)}
                            className="flex-1 py-3 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2"
                          >
                            <NoSymbolIcon className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* PAST TAB */
          pastAppts.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center">
              <p className="text-slate-500 italic">No past appointments yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pastAppts.map(appt => {
                const typeCfg = TYPE_CONFIG[appt.type];
                const TypeIcon = typeCfg.icon;
                
                return (
                  <div 
                    key={appt.id} 
                    className="bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-700 opacity-80 group hover:opacity-100 transition-opacity overflow-hidden"
                  >
                     <div className="flex h-full">
                      <div className="w-1.5 h-full bg-slate-300 dark:bg-slate-700" />
                      <div className="flex-1 p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 dark:text-white">Dr. {appt.doctor_name}</h4>
                            <p className="text-xs text-slate-500">{appt.specialty}</p>
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {appt.status}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(appt.appointment_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <TypeIcon className="w-4 h-4" />
                            {typeCfg.label}
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button 
                            onClick={() => handleDelete(appt.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete record"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}
