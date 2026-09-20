import React, { useState } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { motion } from 'motion/react';
import { CheckCircle, AlertCircle } from 'lucide-react';



const ManualEntry = () => {
  const { students, addAttendanceLog } = useData();
  const { departments } = useAcademic();
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<'Present' | 'Late'>('Present');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const subjects = ['Computer Networks', 'Database Systems', 'Operating Systems', 'Software Engineering'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const student = students.find(s => s.id === studentId);
    if (!student) {
      setError('Student ID not found.');
      return;
    }

    if (!subject) {
      setError('Please select a subject.');
      return;
    }

    const deptName = departments.find(d => d.id === student.department_id)?.department_name || student.department || student.department_id || 'General';

    addAttendanceLog({
      studentId: student.id,
      studentName: student.name,
      department: deptName,
      subject,
      loginTime: time,
      logoutTime: null,
      date,
      duration: null,
      status
    });

    setSuccessMessage(`Successfully recorded ${status} for ${student.name} in ${subject}.`);
    setStudentId('');
    // Keep subject, status, date, time for easier consecutive entries
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Manual Attendance Entry</h2>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Record attendance manually if facial recognition fails.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl shadow-sm border border-slate-100 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Student ID</label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder="e.g., S001"
                className="w-full px-4 py-2 rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Subject</label>
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>Select a subject</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Date</label>
              <DatePicker
                
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }}
                className="w-full px-4 py-2 rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Present"
                    checked={status === 'Present'}
                    onChange={() => setStatus('Present')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Present</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Late"
                    checked={status === 'Late'}
                    onChange={() => setStatus('Late')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Late</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              Record Attendance
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ManualEntry;
