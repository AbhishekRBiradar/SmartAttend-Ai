import { useState } from 'react';
import { AlertTriangle, Check, X, UserPlus } from 'lucide-react';

export default function UnknownPersons() {
  const [unknowns, setUnknowns] = useState([
    { id: 1, image: 'https://picsum.photos/seed/unknown1/200/200', time: '10:45 AM', date: 'Oct 24, 2024', status: 'Pending' },
    { id: 2, image: 'https://picsum.photos/seed/unknown2/200/200', time: '09:12 AM', date: 'Oct 24, 2024', status: 'Pending' },
    { id: 3, image: 'https://picsum.photos/seed/unknown3/200/200', time: '08:30 AM', date: 'Oct 23, 2024', status: 'Ignored' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
          Unknown Person Alerts
        </h1>
        <span className="bg-rose-100 text-rose-800 text-sm font-medium px-3 py-1 rounded-full">
          2 Pending Alerts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {unknowns.map((person) => (
          <div key={person.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="relative aspect-square bg-slate-100">
              <img src={person.image} alt="Unknown person" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${
                  person.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  person.status === 'Ignored' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {person.status}
                </span>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-slate-500">
                  <span className="font-medium text-slate-900">{person.date}</span> at {person.time}
                </div>
              </div>
              
              <div className="mt-auto grid grid-cols-3 gap-2">
                <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors group">
                  <Check className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Approve</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors group">
                  <UserPlus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Add to DB</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors group">
                  <X className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Ignore</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
