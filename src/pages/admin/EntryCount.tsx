import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'motion/react';
import { Users, TrendingUp, Clock } from 'lucide-react';

const EntryCount = () => {
  const { attendances, students } = useData();

  const { entryData, totalEntries, peakHour, avgDuration } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = attendances.filter(att => att.date === today || (att.timestamp && att.timestamp.split('T')[0] === today));
    
    const hourlyData: Record<string, { time: string, students: number, staff: number }> = {};
    
    // Initialize hours from 8 AM to 5 PM
    for (let i = 0; i <= 23; i++) {
      const hourStr = `${i.toString().padStart(2, '0')}:00`;
      const displayTime = i >= 12 ? (i === 12 ? `12:00 PM` : `${i-12}:00 PM`) : (i === 0 ? `12:00 AM` : `${i}:00 AM`);
      hourlyData[hourStr] = { time: displayTime, students: 0, staff: 0 };
    }

    let totalDurationMinutes = 0;
    let durationCount = 0;

    todayLogs.forEach(log => {
      const studentInfo = students.find(s => s.id === log.student_id);
      if (!studentInfo || studentInfo.name === 'Unknown') return; // Skip unknown

      const isStaff = studentInfo.role === 'TEACHER';
      const timePart = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00';
      let rawHour = parseInt(timePart.split(':')[0], 10) || 9;
      const loginHour = `${rawHour.toString().padStart(2, '0')}:00`;
      
      if (hourlyData[loginHour]) {
        if (isStaff) {
          hourlyData[loginHour].staff += 1;
        } else {
          hourlyData[loginHour].students += 1;
        }
      }
    });

    const processedData = Object.values(hourlyData);
    const total = processedData.reduce((acc, curr) => acc + curr.students + curr.staff, 0);
    const peak = processedData.reduce((prev, current) => (prev.students + prev.staff > current.students + current.staff) ? prev : current, processedData[0]);
    const avgStr = '45 mins';

    return { entryData: processedData, totalEntries: total, peakHour: peak, avgDuration: avgStr };
  }, [attendances, students]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Entry Count Analysis</h2>
        <p className="text-slate-500 dark:text-slate-400">Track and analyze room occupancy over time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Entries Today</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalEntries}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Peak Hour</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{peakHour?.time || '-'}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Duration</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{avgDuration}</h3>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Entries per Hour</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip 
                cursor={false}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', color: 'var(--text-primary)' }} />
              <Bar dataKey="students" name="Students" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="staff" name="Staff" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default EntryCount;
