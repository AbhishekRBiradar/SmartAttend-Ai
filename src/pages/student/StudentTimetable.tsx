import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  User, 
  Sparkles, 
  X, 
  GraduationCap, 
  Mail, 
  Phone, 
  Briefcase, 
  CheckCircle2, 
  Radio, 
  ChevronRight,
  Compass
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Teacher } from '../../types';

const StudentTimetable: React.FC = () => {
  const { timetables, courses, teachers, classSessions, activeSession } = useData();
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const currentDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const defaultDay = days.includes(currentDayName) ? currentDayName : 'Monday';
  
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const slots = timetables.filter(t => String(t.day_of_week) === selectedDay);

  // Helper to check if a slot is currently ongoing
  const isSlotLive = (slot: any) => {
    if (activeSession && (activeSession.course_offering_id === slot.course_offering_id || activeSession.teacher_id === slot.teacher_id)) {
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-200/50 dark:border-amber-900/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            Weekly Timetable & Lecture Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Interactive schedule for lectures, laboratory sessions, room allocations, and professor office references.
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 font-bold text-xs animate-pulse">
            <Radio className="w-4 h-4 text-emerald-500" />
            <span>Active Session Live ({activeSession.room || 'Classroom'})</span>
          </div>
        )}
      </div>

      {/* Weekday Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-3">
        {days.map(day => {
          const isToday = day === currentDayName;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map(slot => {
          const course = courses.find(c => c.id === slot.course_id || c.course_name === slot.course_name);
          const teacher = teachers.find(t => 
            t.id === slot.teacher_id || 
            t.teacher_id === slot.teacher_id || 
            t.user_id === slot.teacher_id ||
            t.name === slot.teacher_name
          ) || teachers[0];

          const live = isSlotLive(slot);

          return (
            <div 
              key={slot.id} 
              className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all flex flex-col justify-between hover:shadow-xl ${
                live 
                  ? 'border-emerald-500 dark:border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
              }`}
            >
              <div className="space-y-4">
                {/* Time badge & code */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {slot.start_time} - {slot.end_time}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {course?.course_code || 'CS301'}
                  </span>
                </div>

                {/* Course Name */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {slot.course_name || course?.course_name || 'Operating Systems & Kernel Architecture'}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold">{slot.room_number || slot.room || 'Lecture Hall 102'}</span>
                  </div>
                </div>

                {/* Teacher Details (Clickable for Faculty Profile Modal) */}
                {teacher && (
                  <div 
                    onClick={() => setSelectedTeacher(teacher)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-200 dark:hover:border-amber-900/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                        {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          {teacher.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">{teacher.designation || 'Faculty In-Charge'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Status footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {live ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Live Class in Progress</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Regular Lecture</span>
                  </span>
                )}
                
                {teacher && (
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Faculty Info
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">No Lectures Scheduled for {selectedDay}</p>
            <p className="text-xs mt-1 text-slate-400">Select another day or consult your academic advisor for elective timings.</p>
          </div>
        )}
      </div>

      {/* --- TEACHER PROFILE MODAL (INTERLINKED) --- */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white relative">
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white text-amber-600 font-bold text-xl flex items-center justify-center shadow-lg">
                  {selectedTeacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedTeacher.name}</h3>
                  <p className="text-amber-100 text-xs font-medium mt-0.5">{selectedTeacher.designation}</p>
                  <p className="text-white/80 text-[11px] mt-1">{selectedTeacher.department || 'Computer Science & Engineering'}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <GraduationCap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Academic Qualification</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.qualification || 'Ph.D. in Computer Science & Engineering'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Briefcase className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Specialization & Domain</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.specialization || 'Distributed Systems, Operating System Internals'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Office Location</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{selectedTeacher.office_location || selectedTeacher.cabin || 'Academic Block B, Room 304'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Office Hours</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{selectedTeacher.office_hours || 'Mon-Thu, 2:00 - 4:00 PM'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-xs">{selectedTeacher.email}</span>
                  </div>
                  {selectedTeacher.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-xs">{selectedTeacher.phone}</span>
                    </div>
                  )}
                </div>

                {selectedTeacher.bio && (
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Faculty Biography:</p>
                    {selectedTeacher.bio}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTeacher(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;
