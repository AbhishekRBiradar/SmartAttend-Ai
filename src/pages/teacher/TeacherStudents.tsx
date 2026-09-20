import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  X, 
  ArrowUpDown, 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckSquare,
  Award,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TeacherStudents: React.FC = () => {
  const { students, enrollments, courseOfferings, teachers, timetables, courses, attendances } = useData();
  const { user } = useAuth();
  const { departments: acadDepartments } = useAcademic();
  const navigate = useNavigate();

  // Find current teacher
  const teacher = useMemo(() => {
    if (!user) return null;
    return teachers.find(t => 
      t.user_id === user.user_id || 
      t.id === user.user_id || 
      t.email === user.email ||
      (t.name && user.name && t.name.toLowerCase() === user.name.toLowerCase())
    );
  }, [teachers, user]);

  const teacherId = teacher?.id || user?.user_id || '';

  // Find course offerings assigned to this teacher by department
  const myOfferings = useMemo(() => {
    return courseOfferings.filter(co => 
      co.teacher_id === teacherId || 
      co.teacher_id === user?.user_id ||
      (co.teacher_name && user?.name && co.teacher_name.toLowerCase().includes((user.name || '').toLowerCase()))
    );
  }, [courseOfferings, teacherId, user]);

  const activeOfferings = myOfferings.length > 0 ? myOfferings : courseOfferings.slice(0, 3);
  const myOfferingIds = useMemo(() => activeOfferings.map(o => o.id), [activeOfferings]);

  // Timetable periods for this teacher's offerings
  const myTimetablePeriods = useMemo(() => {
    return timetables.filter(t => 
      myOfferingIds.includes(t.course_offering_id) || 
      t.teacher_id === teacherId ||
      (t.teacher_name && user?.name && t.teacher_name.toLowerCase() === user.name.toLowerCase())
    );
  }, [timetables, myOfferingIds, teacherId, user]);

  // State filters
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'registrationNumber' | 'attendancePct', direction: 'asc' | 'desc' } | null>(null);

  // Filter students to strictly those enrolled in the assigned offering/period
  const scopedStudentsWithMeta = useMemo(() => {
    // If a specific offering/period is selected
    let targetOfferingIds: string[] = [];
    if (selectedPeriodFilter === 'ALL') {
      targetOfferingIds = myOfferingIds;
    } else {
      targetOfferingIds = [selectedPeriodFilter];
    }

    // Get enrollments for the targeted offerings
    const relevantEnrollments = enrollments.filter(e => 
      targetOfferingIds.includes(e.course_offering_id) && e.status !== 'INACTIVE'
    );
    const enrolledStudentIds = new Set(relevantEnrollments.map(e => e.student_id));

    let studentList = students.filter(s => 
      (enrolledStudentIds.has(s.id) || enrolledStudentIds.has(s.user_id)) && 
      s.role !== 'TEACHER'
    );

    // Fallback if no explicit enrollments exist in mock data
    if (studentList.length === 0 && activeOfferings.length > 0) {
      const deptIds = new Set(activeOfferings.map(o => o.department_id).filter(Boolean));
      studentList = students.filter(s => 
        (deptIds.has(s.department_id) || deptIds.has(s.department)) && 
        s.role !== 'TEACHER'
      ).slice(0, 35);
    }

    // Attach offering & attendance info to each student
    return studentList.map(student => {
      const enrollment = relevantEnrollments.find(e => e.student_id === student.id || e.student_id === student.user_id);
      const offering = activeOfferings.find(o => o.id === (enrollment?.course_offering_id || selectedPeriodFilter)) || activeOfferings[0];
      const course = courses.find(c => c.id === offering?.course_id);
      
      // Calculate attendance in this course
      const studentCourseLogs = attendances.filter(a => 
        (a.student_id === student.id || a.student_id === student.user_id) &&
        (offering ? a.course_offering_id === offering.id || a.course_id === offering.course_id : true)
      );
      const totalLogs = studentCourseLogs.length;
      const presentLogs = studentCourseLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const attendancePct = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 85;

      return {
        ...student,
        assignedOffering: offering,
        assignedCourse: course,
        attendancePct
      };
    });
  }, [selectedPeriodFilter, myOfferingIds, enrollments, students, activeOfferings, courses, attendances]);

  // Apply search and sorting
  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = scopedStudentsWithMeta;

    if (term) {
      result = result.filter(s => 
        (s.name || '').toLowerCase().includes(term) ||
        (s.registrationNumber || '').toLowerCase().includes(term) ||
        (s.usn || '').toLowerCase().includes(term) ||
        (s.id || '').toLowerCase().includes(term) ||
        (s.assignedCourse?.course_name || '').toLowerCase().includes(term)
      );
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let valA: any = a[sortConfig.key] || '';
        let valB: any = b[sortConfig.key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [scopedStudentsWithMeta, searchTerm, sortConfig]);

  const requestSort = (key: 'name' | 'registrationNumber' | 'attendancePct') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Assigned Period Student Rosters
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Department Scoped
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access students assigned specifically to your department course offerings and timetable periods.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/teacher/active-session')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Period / Offering Selector */}
          <div className="w-full md:w-auto flex-1 max-w-xl">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Select Assigned Period / Course Offering:
            </label>
            <select
              value={selectedPeriodFilter}
              onChange={(e) => setSelectedPeriodFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">All My Assigned Course Offerings ({activeOfferings.length} Courses)</option>
              {activeOfferings.map(offering => {
                const c = courses.find(item => item.id === offering.course_id);
                return (
                  <option key={offering.id} value={offering.id}>
                    {c?.course_code || offering.course_code || 'CS301'} - {c?.course_name || offering.course_name || 'Subject'} • Section {offering.section_id || offering.section || 'A'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Search Roster:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or USN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredStudents.length}</strong> assigned students
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedPeriodFilter === 'ALL' ? 'Combined assigned courses' : 'Filtered to selected period roster'}
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">#</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    Student Details
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition"
                  onClick={() => requestSort('registrationNumber')}
                >
                  <div className="flex items-center gap-1.5">
                    Registration / USN
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-4">Assigned Subject & Section</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition text-center"
                  onClick={() => requestSort('attendancePct')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Subject Attendance
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No students found in this assigned period roster.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const courseName = student.assignedCourse?.course_name || student.assignedOffering?.course_name || 'Subject';
                  const courseCode = student.assignedCourse?.course_code || student.assignedOffering?.course_code || 'CS301';
                  const section = student.assignedOffering?.section_id || student.assignedOffering?.section || 'A';
                  const pct = student.attendancePct;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {student.profilePic ? (
                            <img
                              src={student.profilePic}
                              alt={student.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {(student.name || 'S').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-[11px] text-slate-400">{student.email || student.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {student.registrationNumber || student.usn || student.id}
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{courseName}</p>
                          <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                            {courseCode} • Section {section}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          pct >= 75 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : pct >= 60
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}>
                          {pct}% Turnout
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/teacher/students/${student.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudents;
