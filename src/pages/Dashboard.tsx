import { useState, useEffect } from 'react';
import { Users, UserCheck, AlertTriangle, DoorOpen, Camera } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 120,
    presentToday: 87,
    insideRoom: 64,
    unknownDetected: 2
  });

  useEffect(() => {
    // In a real app, fetch from /api/stats
    // fetch('/api/stats').then(res => res.json()).then(setStats);
  }, []);

  const cards = [
    { name: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
    { name: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'bg-emerald-500' },
    { name: 'Inside Room', value: stats.insideRoom, icon: DoorOpen, color: 'bg-indigo-500' },
    { name: 'Unknown Detected', value: stats.unknownDetected, icon: AlertTriangle, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden rounded-xl shadow-sm border border-slate-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                    <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">{card.name}</dt>
                    <dd>
                      <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Camera Preview */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              Live Camera Preview
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
            {/* Mock Camera Feed */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/classroom/800/450')] bg-cover bg-center mix-blend-overlay"></div>
            <div className="text-center z-10">
              <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-slate-400 font-mono text-sm">Camera 1 - Main Entrance</p>
            </div>
            
            {/* Mock Bounding Box */}
            <div className="absolute top-1/4 left-1/3 w-32 h-40 border-2 border-emerald-500 rounded-sm">
              <div className="absolute -top-6 left-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-t-sm font-mono whitespace-nowrap">
                Abhi - Verified (98%)
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-900">Recent Activity</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-4">
              {[
                { name: 'Abhi', action: 'Entered', time: 'Just now', status: 'verified' },
                { name: 'Rahul', action: 'Entered', time: '2 mins ago', status: 'verified' },
                { name: 'Unknown', action: 'Detected', time: '15 mins ago', status: 'alert' },
                { name: 'Priya', action: 'Left', time: '1 hour ago', status: 'verified' },
                { name: 'Amit', action: 'Entered', time: '2 hours ago', status: 'verified' },
              ].map((activity, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${activity.status === 'alert' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity.name}</p>
                    <p className="text-xs text-slate-500">{activity.action}</p>
                  </div>
                  <div className="text-xs text-slate-400">{activity.time}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
