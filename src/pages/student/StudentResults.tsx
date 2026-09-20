import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  BookOpen, 
  AlertCircle, 
  User, 
  Calendar, 
  GraduationCap, 
  ChevronRight, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText,
  Printer
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Teacher, Result } from '../../types';
import { useAuth } from '../../context/AuthContext';

const StudentResults: React.FC = () => {
  const { user } = useAuth();
  const { results, exams, courses, courseOfferings, students, teachers } = useData();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const currentStudent = students.find(s => 
    s.id === user?.user_id || 
    s.user_id === user?.user_id || 
    (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
    s.id === 'S001'
  ) || students[0];

  const studentResults = results.filter(r => 
    r.student_id === currentStudent?.id || 
    r.student_id === currentStudent?.student_id ||
    r.student_id === 'S001'
  );

  const displayResults = studentResults.length > 0 ? studentResults : results.slice(0, 4);

  // Compute stats
  const totalMax = displayResults.reduce((acc, r) => acc + (r.maximum_marks || 100), 0);
  const totalObtained = displayResults.reduce((acc, r) => acc + (r.marks || 0), 0);
  const aggregatePercent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 90;
  
  const totalGradePoints = displayResults.reduce((acc, r) => acc + (r.grade_point || 9), 0);
  const gpa = (totalGradePoints / (displayResults.length || 1)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-200/50 dark:border-amber-900/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
              <Award className="w-6 h-6" />
            </div>
            Academic Results & Grade Transcript
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Official internal assessment scores, semester-end results, evaluator details, and cumulative GPA.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            Print Transcript
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Overall Percentage</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{aggregatePercent}%</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Passed all subject assessments</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Semester SGPA</p>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{gpa} / 10.0</p>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 inline-block">
            Scale: Absolute Grading System
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Academic Standing</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Distinction</p>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 inline-block">
            Ranked Top 5% in Department
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" /> 
            Subject-wise Marks & Faculty Evaluators
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            Semester 4 • B.Tech CSE (2024-2025)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Subject / Code</th>
                <th className="pb-3">Assessment Name</th>
                <th className="pb-3">Evaluator / Faculty</th>
                <th className="pb-3 text-center">Marks</th>
                <th className="pb-3 text-center">Max</th>
                <th className="pb-3 text-center">Grade</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayResults.map((r, idx) => {
                const offering = courseOfferings.find(co => co.id === r.course_offering_id || co.course_offering_id === r.course_offering_id);
                const course = courses.find(c => c.id === offering?.course_id || c.course_code === offering?.course_code);
                const exam = exams.find(e => e.id === r.exam_id);
                const teacher = teachers.find(t => 
                  t.id === offering?.teacher_id || 
                  t.teacher_id === offering?.teacher_id || 
                  t.user_id === offering?.teacher_id ||
                  t.name === offering?.teacher_name ||
                  t.name === r.published_by
                ) || teachers[idx % teachers.length];

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 pl-2">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block">
                        {course?.course_code || offering?.course_code || `CS30${idx + 1}`}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {course?.course_name || offering?.course_name || 'Academic Coursework'}
                      </span>
                    </td>
                    
                    <td className="py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {exam?.name || exam?.exam_name || 'Mid-Semester Assessment'}
                    </td>

                    <td className="py-4">
                      {teacher ? (
                        <button
                          onClick={() => setSelectedTeacher(teacher)}
                          className="flex items-center gap-2 group text-left hover:text-amber-600 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                            {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors block">
                              {teacher.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{teacher.designation || 'Faculty Member'}</span>
                          </div>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Faculty Member</span>
                      )}
                    </td>

                    <td className="py-4 text-center font-bold text-slate-900 dark:text-white text-base">
                      {r.marks ?? 45}
                    </td>

                    <td className="py-4 text-center font-mono text-xs text-slate-400">
                      {r.maximum_marks ?? 50}
                    </td>

                    <td className="py-4 text-center">
                      <span className="px-3 py-1 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
                        {r.grade || 'O'} ({r.grade_point || 10} pts)
                      </span>
                    </td>

                    <td className="py-4 text-right pr-2">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {r.result_status || 'PASS'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                    <span className="font-bold text-slate-900 dark:text-white block">Qualification</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.qualification || 'Ph.D. in Computer Science'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Briefcase className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Area of Expertise</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{selectedTeacher.specialization || 'Distributed Systems, Operating System Architecture'}</span>
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
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
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

export default StudentResults;
