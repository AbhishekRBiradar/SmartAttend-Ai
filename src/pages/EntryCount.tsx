import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Clock } from 'lucide-react';

const data = [
  { time: '8 AM', students: 5 },
  { time: '9 AM', students: 45 },
  { time: '10 AM', students: 15 },
  { time: '11 AM', students: 8 },
  { time: '12 PM', students: 2 },
  { time: '1 PM', students: 12 },
  { time: '2 PM', students: 5 },
  { time: '3 PM', students: 3 },
];

export default function EntryCount() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Entry Count Analysis</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 truncate">Total Entries Today</dt>
                <dd className="text-2xl font-bold text-slate-900">95</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 truncate">Peak Hour</dt>
                <dd className="text-2xl font-bold text-slate-900">9:00 AM</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 truncate">Average Entry Time</dt>
                <dd className="text-2xl font-bold text-slate-900">9:15 AM</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-6">Entry Count per Hour</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="students" name="Students Entered" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
