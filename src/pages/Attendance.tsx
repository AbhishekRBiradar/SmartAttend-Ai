import { useState } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const [logs, setLogs] = useState([
    { id: 1, name: 'Abhishek Biradar', student_id: 'CS2024001', department: 'Computer Science', login_time: new Date(new Date().setHours(9, 15)), logout_time: null, duration: '-', date: new Date() },
    { id: 2, name: 'Rahul Sharma', student_id: 'CS2024002', department: 'Computer Science', login_time: new Date(new Date().setHours(9, 35)), logout_time: null, duration: '-', date: new Date(), late: true },
    { id: 3, name: 'Priya Patel', student_id: 'EE2024015', department: 'Electrical Engineering', login_time: new Date(new Date().setHours(8, 50)), logout_time: new Date(new Date().setHours(11, 30)), duration: '2h 40m', date: new Date() },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Attendance Logs</h1>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Download className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
            Export CSV
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Download className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <input type="date" onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }} className="block w-full pl-3 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <select className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option>All Departments</option>
            <option>Computer Science</option>
            <option>Electrical Engineering</option>
          </select>
        </div>
        <div>
          <select className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option>All Status</option>
            <option>Present</option>
            <option>Late</option>
            <option>Absent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Login Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Logout Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {format(log.date, 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{log.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{log.student_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {format(log.login_time, 'hh:mm a')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {log.logout_time ? format(log.logout_time, 'hh:mm a') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {log.duration}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {log.late ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                      Late
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                      Present
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
