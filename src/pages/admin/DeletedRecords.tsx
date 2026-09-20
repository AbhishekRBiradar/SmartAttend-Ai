import React, { useState } from 'react';
import { Trash2, RotateCcw, Search, AlertCircle, Filter, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const DeletedRecords = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'STUDENTS' | 'ATTENDANCE' | 'COURSES'>('ALL');
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Mock / local recycle bin registry
  const [trashItems, setTrashItems] = useState([
    { id: 'del-1', type: 'STUDENTS', title: 'John Doe (CS-2023-089)', deletedAt: '2025-02-28 14:20', deletedBy: 'Admin' },
    { id: 'del-2', type: 'ATTENDANCE', title: 'Attendance Log - CS301 (Batch B)', deletedAt: '2025-02-27 10:15', deletedBy: 'Faculty' },
    { id: 'del-3', type: 'COURSES', title: 'CS402: Cloud Computing Lab', deletedAt: '2025-02-25 09:30', deletedBy: 'Super Admin' }
  ]);

  const handleRestore = (id: string) => {
    setTrashItems(prev => prev.filter(item => item.id !== id));
    setRestoredId(id);
    setTimeout(() => setRestoredId(null), 3000);
  };

  const filteredItems = trashItems.filter(item => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    const q = searchTerm.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.deletedBy.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            Recycle Bin & Deleted Records
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Safely review, audit, or restore recently deleted database entries
          </p>
        </div>
      </div>

      {restoredId && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4" /> Record successfully restored!
        </div>
      )}

      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search deleted records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(['ALL', 'STUDENTS', 'ATTENDANCE', 'COURSES'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterType === tab
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Record</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Deleted Date</th>
                <th className="pb-3">Deleted By</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pl-2 font-medium text-slate-900 dark:text-white">
                    {item.title}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-500 font-mono">
                    {item.deletedAt}
                  </td>
                  <td className="py-3 text-xs text-slate-600 dark:text-slate-400">
                    {item.deletedBy}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Recycle Bin is Empty</p>
              <p className="text-xs mt-1">No soft-deleted records matching the active filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeletedRecords;
