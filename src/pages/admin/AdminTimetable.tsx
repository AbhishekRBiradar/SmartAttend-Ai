import React, { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, BookOpen, MapPin, User } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { Timetable } from '../../types';

const AdminTimetable = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const { timetables, courses, teachers, addTimetable, deleteTimetable } = useData();
  const { departments, sections, semesters } = useAcademic();

  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState<Partial<Timetable>>({
    course_id: '',
    teacher_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    room_number: 'Room 301',
    section_id: 'sec-a'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const filteredSlots = timetables.filter(t => {
    if (isDept && t.department_id && t.department_id !== myDept) return false;
    return String(t.day_of_week) === selectedDay;
  });

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot.course_id || !newSlot.teacher_id) return;

    const course = courses.find(c => c.id === newSlot.course_id);
    const teacher = teachers.find(t => t.id === newSlot.teacher_id);

    if (addTimetable) {
      await addTimetable({
        course_id: newSlot.course_id,
        course_name: course?.course_name,
        teacher_id: newSlot.teacher_id,
        teacher_name: teacher?.name,
        department_id: isDept ? myDept : course?.department_id,
        day_of_week: newSlot.day_of_week || selectedDay,
        start_time: newSlot.start_time || '09:00',
        end_time: newSlot.end_time || '10:00',
        room_number: newSlot.room_number || 'Room 301',
        section_id: newSlot.section_id || 'sec-a',
        status: 'ACTIVE'
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Class Schedule & Timetable
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master timetable management, lecture room allocations, and weekly schedule
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Add Schedule Slot
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedDay === day
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.map(slot => {
          const course = courses.find(c => c.id === slot.course_id);
          const teacher = teachers.find(t => t.id === slot.teacher_id);

          return (
            <div key={slot.id} className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {slot.start_time} - {slot.end_time}
                  </span>
                  <button
                    onClick={() => deleteTimetable && deleteTimetable(slot.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                  {slot.course_name || course?.course_name || 'Lecture'}
                </h3>
                <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{course?.course_code || 'CODE'}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot.teacher_name || teacher?.name || 'Assigned Faculty'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot.room_number || slot.room || 'Room 301'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Section: {slot.section_id || 'A'}</span>
                <span className="text-emerald-600 font-semibold">Confirmed</span>
              </div>
            </div>
          );
        })}
        {filteredSlots.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No Classes Scheduled for {selectedDay}</p>
            <p className="text-xs mt-1">Click "Add Schedule Slot" to configure the weekly timetable.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Timetable Slot</h2>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                <select
                  required
                  value={newSlot.course_id}
                  onChange={(e) => setNewSlot({ ...newSlot, course_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teacher</label>
                <select
                  required
                  value={newSlot.teacher_id}
                  onChange={(e) => setNewSlot({ ...newSlot, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
                  <select
                    value={newSlot.day_of_week}
                    onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Room</label>
                  <input
                    type="text"
                    value={newSlot.room_number}
                    onChange={(e) => setNewSlot({ ...newSlot, room_number: e.target.value })}
                    placeholder="e.g. Lab 4 / Room 302"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimetable;
