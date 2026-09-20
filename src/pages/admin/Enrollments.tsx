import React, { useState } from 'react';
import { UserCheck, Search, Plus, Trash2, Filter, GraduationCap, BookOpen, Layers } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import StudentEnrollment from '../../components/StudentEnrollment';

const Enrollments = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;
  const { enrollments, students, courses, courseOfferings, deleteEnrollment } = useData();
  const { departments, semesters, sections } = useAcademic();

  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;

  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const filteredOfferings = courseOfferings.filter(o => {
    if (!isDept) return true;
    const offDept = o.department_id || o.department;
    return offDept === myDept || offDept === myDeptId || offDept === myDeptName || 
      (myDeptObj && (offDept === myDeptObj.id || offDept === myDeptObj.department_id || offDept === myDeptObj.name || (offDept as any) === (myDeptObj as any).department_name));
  });

  const activeOfferingId = selectedOfferingId || filteredOfferings[0]?.id || '';
  const currentOffering = courseOfferings.find(o => o.id === activeOfferingId);
  const currentCourse = courses.find(c => c.id === currentOffering?.course_id);

  const offeringEnrollments = enrollments.filter(e => e.course_offering_id === activeOfferingId);

  const filteredEnrollmentList = offeringEnrollments.filter(e => {
    const student = students.find(s => s.id === e.student_id);
    const q = searchTerm.toLowerCase();
    return (
      (student?.name || '').toLowerCase().includes(q) ||
      (student?.id || '').toLowerCase().includes(q) ||
      (student?.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Student Course Enrollments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage course registrations, section rosters, and student enrollments
          </p>
        </div>

        <button
          onClick={() => setIsEnrollModalOpen(true)}
          disabled={!activeOfferingId}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Enroll Students
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Offering Selector */}
        <div className="lg:col-span-1 glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Course Offerings
          </h3>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filteredOfferings.map(o => {
              const c = courses.find(course => course.id === o.course_id);
              const isSelected = (o.id === activeOfferingId);
              const count = enrollments.filter(e => e.course_offering_id === o.id).length;

              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOfferingId(o.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {o.course_code || c?.course_code || 'CODE'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
                      {count}
                    </span>
                  </div>
                  <p className="text-xs font-semibold line-clamp-1">{o.course_name || c?.course_name || 'Course'}</p>
                  <span className="text-[10px] text-slate-400">Section: {o.section_id || 'A'} • {o.teacher_name || 'Faculty'}</span>
                </button>
              );
            })}
            {filteredOfferings.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No offerings available</p>
            )}
          </div>
        </div>

        {/* Right: Enrolled Roster */}
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentOffering?.course_name || currentCourse?.course_name || 'Select an Offering'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentOffering?.teacher_name ? `Instructor: ${currentOffering.teacher_name}` : 'Course Roster'} • {offeringEnrollments.length} registered students
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter roster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Student</th>
                  <th className="pb-3">Registration ID</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Enrollment Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEnrollmentList.map(enrollment => {
                  const student = students.find(s => s.id === enrollment.student_id);
                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {student?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{student?.name || 'Student'}</p>
                          <p className="text-xs text-slate-400">{student?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {student?.registrationNumber || student?.id}
                      </td>
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                        {student?.department || 'CSE'}
                      </td>
                      <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                        {enrollment.enrollment_date || 'Standard'}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {enrollment.status || 'ENROLLED'}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => deleteEnrollment && deleteEnrollment(enrollment.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Remove student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEnrollmentList.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No Students Enrolled</p>
                <p className="text-xs mt-1">Click "Enroll Students" to add registered students to this section.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {isEnrollModalOpen && activeOfferingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full">
            <StudentEnrollment
              offeringId={activeOfferingId}
              courseId={currentOffering?.course_id}
              onClose={() => setIsEnrollModalOpen(false)}
            />
            <div className="mt-3 text-center">
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enrollments;
