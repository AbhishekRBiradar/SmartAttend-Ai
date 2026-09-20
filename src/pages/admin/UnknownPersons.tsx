import React, { useState } from 'react';
import { ShieldAlert, Check, X, Search, Clock, UserX, UserPlus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatDate } from '../../utils/dateUtils';

const UnknownPersons = () => {
  const { unknownPersons, updateUnknownPersonStatus, students, addDatasetImage } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Ignored'>('Pending');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [assigningTo, setAssigningTo] = useState<string>('');
  
  const handleAssign = async () => {
    if (selectedPerson && assigningTo) {
      if (selectedPerson.imageUrl) {
        await addDatasetImage(assigningTo, selectedPerson.imageUrl);
      }
      updateUnknownPersonStatus(selectedPerson.id, 'Approved');
      setSelectedPerson(null);
      setAssigningTo('');
    }
  };

  const filteredPersons = unknownPersons
    .filter(p => statusFilter === 'All' ? true : p.status === statusFilter)
    .filter(p => {
      const term = (searchTerm || '').toLowerCase();
      return (
        (p.id || '').toLowerCase().includes(term) || 
        (p.time || '').toLowerCase().includes(term) ||
        (p.date || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return b.time.localeCompare(a.time);
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Unknown Person Detection
          </h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Review, assign, and manage unrecognized faces detected by the system.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-500/20 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none glass-card dark:bg-slate-800 text-slate-800 dark:text-white dark:text-white transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-slate-500/20 dark:border-slate-700 rounded-xl glass-card dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Assigned/Approved</option>
            <option value="Ignored">Ignored</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPersons.map(person => (
          <div key={person.id} className="glass-card dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-500/20 dark:border-slate-700 hover:shadow-md transition-shadow group">
            <div className="relative aspect-square">
              {person.imageUrl ? (
                <img 
                  src={person.imageUrl} 
                  alt="Unknown" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-transform duration-300 group-hover:scale-105">
                  <UserX className="w-16 h-16 mb-2 opacity-50" />
                  <span className="text-sm font-medium">No Image Captured</span>
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md ${
                  person.status === 'Pending' ? 'bg-rose-500/90 text-white border border-rose-400' :
                  person.status === 'Approved' ? 'bg-emerald-500/90 text-white border border-emerald-400' :
                  'bg-slate-500/90 text-white border border-slate-400'
                }`}>
                  {person.status}
                </span>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white dark:text-white">Alert #{person.id}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {person.time}</span>
                  {person.date && <span>• {formatDate(person.date)}</span>}
                </div>
              </div>

              {person.status === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPerson(person)}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign
                  </button>
                  <button
                    onClick={() => updateUnknownPersonStatus(person.id, 'Ignored')}
                    className="flex-none px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                    title="Ignore"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredPersons.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-400 glass-card dark:bg-slate-800 rounded-2xl border border-slate-500/20 dark:border-slate-700 border-dashed">
            <UserX className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-800 dark:text-white dark:text-white mb-1">No alerts found</h3>
            <p>No unknown persons matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-500/10 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                Assign Face to Student
              </h3>
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-900 shrink-0 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  {selectedPerson.imageUrl ? (
                    <img src={selectedPerson.imageUrl} alt="Target Face" className="w-full h-full object-cover" />
                  ) : (
                    <UserX className="w-10 h-10 text-slate-400 opacity-50" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white dark:text-white mb-1">Captured Face</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1 mb-2">
                    <Clock className="w-4 h-4" />
                    {selectedPerson.time} {selectedPerson.date ? `on ${formatDate(selectedPerson.date)}` : ''}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                    Assigning this face will add it to the student's dataset, improving future recognition accuracy.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Student</label>
                <select
                  value={assigningTo}
                  onChange={(e) => setAssigningTo(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-500/20 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Choose a registered student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.registrationNumber || s.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setSelectedPerson(null)}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assigningTo}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Assign & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnknownPersons;
