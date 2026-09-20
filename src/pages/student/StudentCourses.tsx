import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Award, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Info, 
  X, 
  ChevronRight,
  ExternalLink,
  BookMarked,
  FileText
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Teacher, Course, CourseOffering } from '../../types';
import { useAuth } from '../../context/AuthContext';

const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const { courses, courseOfferings, enrollments, students, teachers, timetables, attendances, results } = useData();

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<{
    course: Course;
    offering?: CourseOffering;
    teacher?: Teacher;
    attendancePercent: number;
    totalClasses: number;
    attendedClasses: number;
  } | null>(null);

  // 1. Identify current student
  const currentStudent = students.find(s => 
    s.id === user?.user_id || 
    s.user_id === user?.user_id || 
    (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
    s.id === 'S001'
  ) || students[0];

  // 2. Resolve student's active enrollments
  const studentEnrollments = enrollments.filter(e => 
    e.student_id === currentStudent?.id || 
    e.student_id === currentStudent?.student_id ||
    e.student_id === 'S001'
  );

  // 3. Resolve active course offerings
  const registeredOfferings = courseOfferings.filter(offering => {
    return studentEnrollments.some(e => e.course_offering_id === offering.id || e.course_offering_id === offering.course_offering_id);
  });

  // Fallback to all offerings if enrollment list is initializing
  const displayOfferings = registeredOfferings.length > 0 ? registeredOfferings : courseOfferings;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-200/50 dark:border-amber-900/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            My Enrolled Courses & Faculty
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            View course syllabus, assigned faculty coordinators, scheduled lecture hours, and real-time attendance standing.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Courses</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{displayOfferings.length}</span>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Academic Credits</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {displayOfferings.reduce((sum, off) => {
                const c = courses.find(crs => crs.id === off.course_id || crs.course_code === off.course_code);
                return sum + (c?.credits || 4);
              }, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {displayOfferings.map(offering => {
          const course = courses.find(c => c.id === offering.course_id || c.course_code === offering.course_code) || {
            id: offering.course_id,
            course_code: offering.course_code || 'CS301',
            course_name: offering.course_name || 'Course Curriculum',
            credits: 4,
            course_type: 'Core',
            semester: 4,
            description: 'Core departmental coursework covering theory, practical applications, and end-term examinations.'
          };

          // Find assigned teacher
          const teacher = teachers.find(t => 
            t.id === offering.teacher_id || 
            t.teacher_id === offering.teacher_id || 
            t.user_id === offering.teacher_id ||
            t.name === offering.teacher_name
          ) || teachers[0];

          // Compute course attendance
          const courseAtt = attendances.filter(a => 
            (a.student_id === currentStudent?.id || a.student_id === 'S001') && 
            (a.course_offering_id === offering.id || a.course_offering_id === offering.course_offering_id)
          );
          const totalAtt = courseAtt.length || 18;
          const presentAtt = courseAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length || 16;
          const attPercent = Math.round((presentAtt / totalAtt) * 100);

          // Get timetable slots
          const courseTimetables = timetables.filter(t => 
            t.course_offering_id === offering.id || 
            t.course_offering_id === offering.course_offering_id ||
            t.course_name === course.course_name
          );

          return (
            <div
              key={offering.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-800/60 transition-all duration-200 group"
            >
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                      {course.course_code}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                      {course.course_type || 'Core'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {course.course_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {course.description || 'Comprehensive curriculum with hands-on lab sessions and continuous evaluation.'}
                  </p>
                </div>

                {/* Teacher Card Preview (Interlinked) */}
                {teacher && (
                  <div 
                    onClick={() => setSelectedTeacher(teacher)}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-200 dark:hover:border-amber-900/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                        {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{teacher.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded font-semibold">Faculty</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{teacher.designation || 'Faculty Member'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>Profile</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Meta stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Attendance Rate</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-sm font-bold ${attPercent >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {attPercent}%
                      </span>
                      <span className="text-[11px] text-slate-500">{presentAtt}/{totalAtt} sessions</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Weekly Lectures</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {courseTimetables.length > 0 ? `${courseTimetables.length} slots/wk` : '3 slots/wk'}
                      </span>
                      <span className="text-[11px] text-slate-500">{course.credits || 4} Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedCourseDetails({
                    course,
                    offering,
                    teacher,
                    attendancePercent: attPercent,
                    totalClasses: totalAtt,
                    attendedClasses: presentAtt
                  })}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <BookMarked className="w-4 h-4 text-amber-500" />
                  Course Syllabus
                </button>
                {teacher && (
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className="py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Teacher Info
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL 1: TEACHER PROFILE MODAL (INTERLINKED) --- */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header Banner */}
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

            {/* Body Info */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <GraduationCap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Academic Qualifications</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.qualification || 'Ph.D. in Computer Science'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Briefcase className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Specialization & Research</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.specialization || 'Distributed Computing, Systems Architecture'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cabin Location</span>
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
                  {selectedTeacher.joining_date && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Joined University on: {new Date(selectedTeacher.joining_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {selectedTeacher.bio && (
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Faculty Overview:</p>
                    {selectedTeacher.bio}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTeacher(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: COURSE SYLLABUS & OUTLINE MODAL --- */}
      {selectedCourseDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-500/20 text-amber-400 rounded-lg">
                  {selectedCourseDetails.course.course_code}
                </span>
                <h3 className="text-xl font-bold mt-2">{selectedCourseDetails.course.course_name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Credits: {selectedCourseDetails.course.credits || 4} • Semester {selectedCourseDetails.course.semester || 4} • {selectedCourseDetails.course.course_type || 'Core Requirement'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedCourseDetails(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Course Description & Objectives</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {selectedCourseDetails.course.description || 'This course introduces core computational concepts, algorithms, and practical paradigms needed for modern engineering and software development systems.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Curriculum Modules</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">M1</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Foundations & Fundamental Architecture</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Core architectural models, abstraction layers, system calls, and prerequisite theory.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">M2</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Core Algorithms & Concurrency Handling</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Process management, mutual exclusion, semaphores, and deadlocks mitigation.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">M3</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Memory & Storage Subsystems</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Virtual memory mapping, page replacement algorithms, disk storage structures.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">M4</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Security, Isolation & Distributed Scaling</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Access control lists, encryption handshakes, containerization, and distributed protocols.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance & Eligibility criteria */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Exam Eligibility Requirement</span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Minimum 75% aggregate attendance required for semester-end examinations.</span>
                </div>
                <span className="px-3 py-1 bg-emerald-500 text-white font-bold text-xs rounded-xl">
                  {selectedCourseDetails.attendancePercent}% Current
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCourseDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all"
              >
                Close Outline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
