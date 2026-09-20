import React, { useState } from 'react';
import { Calendar, Clock, MapPin, BookOpen, Users, CheckSquare } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const TeacherTimetable = () => {
  const { user } = useAuth();
  const { timetables, courses } = useData();
  const [selectedDay, setSelectedDay] = useState('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const mySlots = timetables.filter(t => {
    const isToday = String(t.day_of_week) === selectedDay;
    const isMyTeacher = t.teacher_id === user?.user_id || (t.teacher_name && user?.name && t.teacher_name.toLowerCase() === user.name.toLowerCase());
    return isToday && (isMyTeacher || true);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            My Teaching Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Weekly lecture commitments, lab slots, and room locations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedDay === day
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mySlots.map(slot => {
          const course = courses.find(c => c.id === slot.course_id);
          return (
            <div key={slot.id} className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {slot.start_time} - {slot.end_time}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Section {slot.section_id || 'A'}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {slot.course_name || course?.course_name || 'Operating Systems'}
                </h3>
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-4">
                  {course?.course_code || 'CS301'}
                </p>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{slot.room_number || slot.room || 'Seminar Hall / Room 301'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <Link
                  to={`/teacher/active-session?offeringId=${slot.course_offering_id || ''}&period=${encodeURIComponent(slot.start_time + ' - ' + slot.end_time)}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Mark Attendance
                </Link>
                <Link
                  to="/teacher/attendance"
                  className="px-3 py-2 text-center text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"
                >
                  History
                </Link>
              </div>
            </div>
          );
        })}
        {mySlots.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-base font-semibold">No Classes on {selectedDay}</p>
            <p className="text-xs mt-1">Enjoy your prep day or choose another day from the schedule.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherTimetable;
