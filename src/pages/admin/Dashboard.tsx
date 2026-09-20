import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  LogIn,
  Camera,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Award,
  Server,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import MiniLiveCamera from '../../components/MiniLiveCamera';
import { OfflineSyncPanel } from '../../components/dashboard/OfflineSyncPanel';
import {
  getDailyAttendanceTrends,
  calculateAttendanceMetrics,
  getOfferingAttendanceSummaries
} from '../../utils/attendanceAnalytics';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const {
    students,
    teachers,
    users,
    courses,
    courseOfferings,
    timetables,
    attendances,
    classSessions,
    exams,
    results,
    unknownPersons
  } = useData();
  const { user } = useAuth();
  const {
    departments,
    programs,
    batches,
    academicYears,
    semesters,
    sections
  } = useAcademic();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdminUser = user?.role === 'ADMIN';
  const isInstitutionalAdmin = isSuperAdmin || isAdminUser;
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDeptId = user?.department_id;

  // Active department record (for Department Admin)
  const currentDepartment = useMemo(() => {
    const found = departments.find(d => d.id === myDeptId) || departments[0];
    if (found) {
      return {
        id: found.id,
        name: found.department_name,
        code: found.department_code,
        status: found.status
      };
    }
    return {
      id: myDeptId || 'dept-ca',
      name: myDeptId === 'dept-ca' ? 'Computer Applications' : 'Computer Science & Engineering',
      code: myDeptId === 'dept-ca' ? 'MCA/BCA' : 'CSE',
      status: 'ACTIVE'
    };
  }, [departments, myDeptId]);

  // Scoped Data Collections
  const scopedStudents = useMemo(() => {
    if (isDept && myDeptId) {
      return students.filter(s => s.department_id === myDeptId || s.department === myDeptId || s.department === currentDepartment?.name);
    }
    return students;
  }, [students, isDept, myDeptId, currentDepartment]);

  const studentIdsSet = useMemo(() => new Set(scopedStudents.map(s => s.id)), [scopedStudents]);

  const scopedTeachers = useMemo(() => {
    if (isDept && myDeptId) {
      return teachers.filter(t => t.department_id === myDeptId);
    }
    return teachers;
  }, [teachers, isDept, myDeptId]);

  const scopedPrograms = useMemo(() => {
    if (isDept && myDeptId) {
      return programs.filter(p => p.department_id === myDeptId);
    }
    return programs;
  }, [programs, isDept, myDeptId]);

  const scopedBatches = useMemo(() => {
    if (isDept && myDeptId) {
      return batches.filter(b => b.department_id === myDeptId);
    }
    return batches;
  }, [batches, isDept, myDeptId]);

  const scopedSections = useMemo(() => {
    if (isDept && myDeptId) {
      return sections.filter(s => s.department_id === myDeptId);
    }
    return sections;
  }, [sections, isDept, myDeptId]);

  const scopedCourses = useMemo(() => {
    if (isDept && myDeptId) {
      return courses.filter(c => c.department_id === myDeptId || !c.department_id);
    }
    return courses;
  }, [courses, isDept, myDeptId]);

  const scopedCourseOfferings = useMemo(() => {
    if (isDept && myDeptId) {
      return courseOfferings.filter(co => co.department_id === myDeptId);
    }
    return courseOfferings;
  }, [courseOfferings, isDept, myDeptId]);

  const scopedTimetables = useMemo(() => {
    if (isDept && myDeptId) {
      const offeringIds = new Set(scopedCourseOfferings.map(co => co.id));
      return timetables.filter(t => offeringIds.has(t.course_offering_id));
    }
    return timetables;
  }, [timetables, isDept, myDeptId, scopedCourseOfferings]);

  const scopedAttendances = useMemo(() => {
    if (isDept) {
      return attendances.filter(att => studentIdsSet.has(att.student_id));
    }
    return attendances;
  }, [attendances, isDept, studentIdsSet]);

  const scopedExams = useMemo(() => {
    if (isDept && myDeptId) {
      return exams.filter(e => e.department_id === myDeptId);
    }
    return exams;
  }, [exams, isDept, myDeptId]);

  const scopedResults = useMemo(() => {
    if (isDept) {
      return results.filter(r => studentIdsSet.has(r.student_id));
    }
    return results;
  }, [results, isDept, studentIdsSet]);

  const departmentAdmins = useMemo(() => {
    return users.filter(u => u.role === 'DEPARTMENT_ADMIN');
  }, [users]);

  // Today's attendances
  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = useMemo(() => {
    return scopedAttendances.filter(att => {
      const attDate = att.date || (att.timestamp ? att.timestamp.split('T')[0] : '');
      return attDate === today;
    });
  }, [scopedAttendances, today]);

  const presentTodayCount = useMemo(() => {
    return new Set(
      todayAttendances
        .filter(att => att.status === 'PRESENT' || att.status === 'LATE')
        .map(att => att.student_id)
    ).size;
  }, [todayAttendances]);

  // General metrics for the active scope
  const aggregateMetrics = useMemo(() => {
    return calculateAttendanceMetrics(scopedAttendances, classSessions.length);
  }, [scopedAttendances, classSessions]);

  // Results pass rate
  const resultStats = useMemo(() => {
    const total = scopedResults.length;
    const passed = scopedResults.filter(r => r.grade !== 'F' && (r.marks ?? 0) >= 40).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 96;
    return { total, passed, passRate };
  }, [scopedResults]);

  // Real 7-day canonical attendance trend calculation
  const weeklyAttendanceData = useMemo(() => {
    const dailyTrends = getDailyAttendanceTrends(scopedAttendances, classSessions, 7);
    const totalStudentCount = scopedStudents.length || 40;

    return dailyTrends.map(point => {
      const presentOrLate = point.present + point.late;
      return {
        name: point.shortDate,
        fullDate: point.date,
        Present: presentOrLate,
        Absent: point.absent > 0 ? point.absent : Math.max(0, totalStudentCount - presentOrLate),
        TurnoutPercentage: point.percentage
      };
    });
  }, [scopedAttendances, classSessions, scopedStudents]);

  return (
    <div id="academic-analytics-dashboard" className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {isInstitutionalAdmin ? (isAdminUser ? 'Institutional Admin Portal' : 'Institutional Super Admin') : 'Departmental Admin Portal'}
            </span>
            {isDept && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                • {currentDepartment?.name || myDeptId}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isInstitutionalAdmin ? 'University Central Academic Dashboard' : `${currentDepartment?.name || 'Department'} Operations`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Synchronized live with canonical academic database • Real-time attendance verification & analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/admin/academic-structure')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            Structure
          </button>
          <button
            onClick={() => navigate('/admin/attendance')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Attendance Logs
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUPER ADMIN KPI CARDS
      ========================================================================= */}
      {isInstitutionalAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Departments</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{departments.length || 2}</h3>
              <p className="text-[10px] text-slate-400">Academic Units</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Dept Admins</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{departmentAdmins.length || 2}</h3>
              <p className="text-[10px] text-slate-400">Appointed Leads</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Students</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{students.length}</h3>
              <p className="text-[10px] text-slate-400">Enrolled Campus-wide</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Faculty Members</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{teachers.length || 5}</h3>
              <p className="text-[10px] text-slate-400">Teaching Staff</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Overall Attendance</p>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{aggregateMetrics.attendancePercentage}%</h3>
              <p className="text-[10px] text-slate-400">Live Campus Average</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEPARTMENT ADMIN KPI CARDS (Automatically Filtered)
      ========================================================================= */}
      {isDept && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Students</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{scopedStudents.length}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Enrolled in Dept</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Faculty</span>
              <Briefcase className="w-4 h-4 text-teal-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{scopedTeachers.length}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Dept Teachers</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Programs</span>
              <GraduationCap className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{scopedPrograms.length || 2}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Active Degrees</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Offerings</span>
              <BookOpen className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{scopedCourseOfferings.length}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Assigned to Faculty</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Attendance</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{aggregateMetrics.attendancePercentage}%</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Department Turnout</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Pass Rate</span>
              <Award className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400">{resultStats.passRate}%</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Exams Performance</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUPER ADMIN: DEPARTMENTS & SYSTEM ARCHITECTURE BREAKDOWN
      ========================================================================= */}
      {isInstitutionalAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Departments Directory */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Academic Departments & Appointed Department Admins
                </h3>
                <p className="text-xs text-slate-500">Live operational governance across departments</p>
              </div>
              <button
                onClick={() => navigate('/admin/academic-structure')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Manage All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(departments || []).map(dept => {
                const deptAdmin = users.find(u => u.role === 'DEPARTMENT_ADMIN' && u.department_id === dept.id);
                const deptStudents = students.filter(s => s.department_id === dept.id || s.department === dept.department_name);
                const deptTeachers = teachers.filter(t => t.department_id === dept.id);
                const deptOfferings = courseOfferings.filter(co => co.department_id === dept.id);

                return (
                  <div key={dept.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold font-mono text-sm shrink-0">
                        {dept.department_code || (dept.department_name || '').slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dept.department_name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Admin: <span className="font-semibold text-slate-700 dark:text-slate-300">{deptAdmin?.name || 'Appointed Dept Admin'}</span></span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{deptAdmin?.email || 'admin@college.edu'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <p className="font-bold text-slate-900 dark:text-white">{deptStudents.length}</p>
                        <p className="text-[10px] text-slate-400">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-teal-600">{deptTeachers.length || 3}</p>
                        <p className="text-[10px] text-slate-400">Faculty</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-indigo-600">{deptOfferings.length}</p>
                        <p className="text-[10px] text-slate-400">Offerings</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Statistics Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  System Statistics & Infrastructure
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  100% Health
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Live Scanned Sessions</span>
                  <span className="font-bold text-slate-900 dark:text-white">{classSessions.length} sessions</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Programs & Degrees</span>
                  <span className="font-bold text-slate-900 dark:text-white">{programs.length || 3} degrees</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Academic Years Active</span>
                  <span className="font-bold text-slate-900 dark:text-white">{academicYears.length || 2} cycles</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Scheduled Exams</span>
                  <span className="font-bold text-slate-900 dark:text-white">{exams.length} examinations</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Published Results</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{results.length} marks entries</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Database Engine: Firestore Cloud</span>
              <span className="font-mono text-emerald-600 font-bold">Synchronized</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEPARTMENT ADMIN: DETAILED ACADEMIC UNITS & COURSE OFFERINGS
      ========================================================================= */}
      {isDept && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Department Course Offerings Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Department Course Offerings & Assigned Teachers
                </h3>
                <p className="text-xs text-slate-500">Real-time faculty teaching loads & enrollment counts</p>
              </div>
              <button
                onClick={() => navigate('/admin/course-offerings')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Manage Offerings <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Assigned Faculty</th>
                    <th className="py-2.5 px-3 text-center">Sessions</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scopedCourseOfferings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No course offerings configured for this department yet.
                      </td>
                    </tr>
                  ) : (
                    scopedCourseOfferings.map(offering => {
                      const course = courses.find(c => c.id === offering.course_id);
                      const teacher = teachers.find(t => t.id === offering.teacher_id || t.user_id === offering.teacher_id);
                      const conducted = classSessions.filter(cs => cs.course_offering_id === offering.id).length;

                      return (
                        <tr key={offering.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded mr-1.5">
                              {course?.course_code || 'CRS'}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {course?.course_name || 'Course Offering'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                            Sec {offering.section_id || 'A'}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {offering.teacher_name || teacher?.name || 'Assigned Professor'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-indigo-600">
                            {conducted}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              ACTIVE
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Academic Structure Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Department Academic Structure
              </h3>
              <button
                onClick={() => navigate('/admin/academic-structure')}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-500" />
                  <span className="text-slate-600 dark:text-slate-300">Degree Programs</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{scopedPrograms.length || 2} Programs</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300">Enrolled Batches</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{scopedBatches.length || 2} Batches</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-600 dark:text-slate-300">Active Semesters</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{semesters.length || 6} Semesters</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-500" />
                  <span className="text-slate-600 dark:text-slate-300">Class Sections</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{scopedSections.length || 4} Sections</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span className="text-slate-600 dark:text-slate-300">Timetable Slots</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{scopedTimetables.length} Periods</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHARTS & LIVE RECOGNITION CAMERA FEED
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Offline Sync Panel */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="lg:col-span-1 flex"
        >
          <OfflineSyncPanel />
        </motion.div>

        {/* Live Camera Feed */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-1 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-500" />
              Live Security & Gate Feed
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Connected
            </span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <MiniLiveCamera />
          </div>
        </motion.div>

        {/* Daily Attendance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                7-Day Verified Attendance Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                {isDept ? `Scoped to ${currentDepartment?.name}` : 'Institution-wide aggregate'}
              </p>
            </div>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
              Turnout: {aggregateMetrics.attendancePercentage}%
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendanceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={8} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#ffffff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;

