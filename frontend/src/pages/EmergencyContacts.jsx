import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  PhoneIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const UNIVERSAL_CONTACTS = [
  { name: "National Emergency", number: "112", icon: "🚨", color: "#dc2626", desc: "Police, Fire, Ambulance — All in one" },
  { name: "Ambulance", number: "108", icon: "🚑", color: "#16a34a", desc: "Free ambulance service" },
  { name: "Police", number: "100", icon: "👮", color: "#2563eb", desc: "Police emergency" },
  { name: "Fire", number: "101", icon: "🔥", color: "#ea580c", desc: "Fire brigade" },
  { name: "Disaster Management", number: "1078", icon: "🌊", color: "#7c3aed", desc: "NDMA helpline" },
  { name: "Child Helpline", number: "1098", icon: "👶", color: "#db2777", desc: "Childline India" },
  { name: "Women Helpline", number: "1091", icon: "🆘", color: "#9333ea", desc: "Women in distress" },
  { name: "Senior Citizen", number: "14567", icon: "👴", color: "#ca8a04", desc: "Elder care helpline" },
  { name: "Poison Control", number: "1800-116-117", icon: "☠️", color: "#4b5563", desc: "National poison helpline" },
  { name: "Mental Health", number: "iCall: 9152987821", icon: "🧠", color: "#0891b2", desc: "iCall mental health support" },
];

const RELATIONSHIP_COLORS = {
  Spouse: 'bg-pink-500',
  Parent: 'bg-blue-600',
  Sibling: 'bg-green-600',
  Child: 'bg-orange-500',
  Friend: 'bg-purple-500',
  Doctor: 'bg-emerald-600',
  Other: 'bg-gray-500'
};

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Doctor', 'Other'];

export default function EmergencyContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Other',
    phone: '',
    is_primary: false
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/emergency-contacts`);
      setContacts(res.data);
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/emergency-contacts/${editingId}`, formData);
        toast.success('Contact updated');
      } else {
        await axios.post(`${API_URL}/emergency-contacts`, formData);
        toast.success('Contact added');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', relationship: 'Other', phone: '', is_primary: false });
      fetchContacts();
    } catch (err) {
      toast.error('Failed to save contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      is_primary: contact.is_primary
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/emergency-contacts/${id}`);
      toast.success('Contact deleted');
      setDeletingId(null);
      fetchContacts();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-10 animate-fade-in">
      
      {/* SECTION A: MY EMERGENCY CONTACTS */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Emergency Contacts</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Personal contacts who should be notified in an emergency.</p>
          </div>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Add Contact</span>
            </button>
          )}
        </div>

        {/* INLINE FORM */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl animate-slide-down">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Relationship</label>
                <select 
                  value={formData.relationship}
                  onChange={e => setFormData({...formData, relationship: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                >
                  {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-red-500 outline-none font-mono"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={e => setFormData({...formData, is_primary: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium group-hover:text-red-600 transition-colors">Set as Primary Contact</span>
                </label>
              </div>
              
              <div className="sm:col-span-2 pt-4 flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-bold transition-all"
                >
                  {editingId ? 'Update Contact' : 'Save Contact'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-3 rounded-xl font-bold transition-all text-slate-700 dark:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : contacts.length === 0 && !showForm ? (
          /* EMPTY STATE */
          <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600">
              <PhoneIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">No emergency contacts added yet</h3>
              <p className="text-slate-500 max-w-xs mx-auto text-sm italic">Add at least one person who should be contacted during medical emergencies.</p>
            </div>
            <button 
              onClick={() => setShowForm(true)}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg transition-transform active:scale-95"
            >
              + Add Contact
            </button>
          </div>
        ) : (
          /* CONTACT CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {contacts.sort((a,b) => b.is_primary - a.is_primary).map(contact => (
              <div 
                key={contact.id} 
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                {deletingId === contact.id ? (
                  <div className="absolute inset-0 bg-red-600 text-white flex flex-col items-center justify-center p-4 text-center z-10 animate-fade-in">
                    <p className="font-bold mb-3">Permanent Delete?</p>
                    <div className="flex gap-4">
                      <button onClick={() => handleDelete(contact.id)} className="px-5 py-2 bg-white text-red-600 rounded-full font-bold text-sm shadow-lg">Confirm</button>
                      <button onClick={() => setDeletingId(null)} className="px-5 py-2 bg-black/20 text-white rounded-full font-bold text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full ${RELATIONSHIP_COLORS[contact.relationship] || 'bg-slate-500'} flex items-center justify-center text-white text-xl font-bold shadow-inner`}>
                      {getInitials(contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold truncate text-slate-900 dark:text-white uppercase tracking-tight">{contact.name}</h4>
                        {contact.is_primary && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700 uppercase tracking-tighter shadow-sm">
                            <StarIcon className="w-2.5 h-2.5 fill-amber-600" />
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 uppercase tracking-wide">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-slate-500 mt-1.5">{contact.phone}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <a 
                        href={`tel:${contact.phone}`}
                        className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Call"
                      >
                        <PhoneIcon className="w-5 h-5" />
                      </a>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(contact)}
                          className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeletingId(contact.id)}
                          className="p-2 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* FLOATING ACTION BUTTON REPLACEMENT */}
            {contacts.length > 0 && !showForm && (
               <button 
                onClick={() => setShowForm(true)}
                className="col-span-1 sm:col-span-2 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-bold flex items-center justify-center gap-2"
               >
                 <PlusIcon className="w-6 h-6" />
                 <span>Add Another Contact</span>
               </button>
            )}
          </div>
        )}
      </section>

      {/* SECTION B: NATIONAL EMERGENCY NUMBERS */}
      <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">National Help Desk</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Official government helplines always available.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {UNIVERSAL_CONTACTS.map((contact, i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:translate-x-1"
              style={{ borderLeft: `4px solid ${contact.color}` }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: `${contact.color}15` }}>
                {contact.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{contact.name}</h4>
                <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 uppercase tracking-wide">{contact.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-lg">{contact.number}</span>
                <a 
                  href={`tel:${contact.number}`}
                  className="p-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md active:scale-90 transition-all px-4 flex items-center gap-1.5"
                >
                  <PhoneIcon className="w-4 h-4 fill-white" />
                  <span className="text-xs font-black uppercase">Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
}
