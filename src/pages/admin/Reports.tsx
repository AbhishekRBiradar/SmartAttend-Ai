import React, { useState, useMemo } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Layers,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {


  filterAttendanceRecords,
  calculateAttendanceMetrics,
  getDailyAttendanceTrends
} from '../../utils/attendanceAnalytics';

const Reports = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const {
    attendances,
    students,
    courses,
    courseOfferings,
    classSessions
  } = useData();

  // Filters for Report Generation
  const [selectedDept, setSelectedDept] = useState(isDept ? myDept : '');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedOffering, setSelectedOffering] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Scoped student population
  const scopedStudents = useMemo(() => {
    if (isDept && myDept) {
      return students.filter(s => s.department_id === myDept || s.department === myDept);
    }
    if (selectedDept) {
      return students.filter(s => s.department_id === selectedDept || s.department === selectedDept);
    }
    return students;
  }, [students, isDept, myDept, selectedDept]);

  // Filter canonical attendance logs
  const filteredAttendances = useMemo(() => {
    return filterAttendanceRecords(
      attendances,
      classSessions,
      courseOfferings,
      students,
      {
        department_id: isDept ? myDept : (selectedDept || undefined),
        semester_id: selectedSemester || undefined,
        course_offering_id: selectedOffering || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }
    );
  }, [attendances, classSessions, courseOfferings, students, isDept, myDept, selectedDept, selectedSemester, selectedOffering, startDate, endDate]);

  // Accurate Attendance Metrics
  const metrics = useMemo(() => {
    const relevantSessions = classSessions.filter(cs => {
      if (selectedOffering && cs.course_offering_id !== selectedOffering) return false;
      if (startDate && cs.date < startDate) return false;
      if (endDate && cs.date > endDate) return false;
      return true;
    });

    return calculateAttendanceMetrics(filteredAttendances, relevantSessions.length);
  }, [filteredAttendances, classSessions, selectedOffering, startDate, endDate]);

  // Dynamic Trend Data over last 7 days calculated from canonical data
  const trendData = useMemo(() => {
    const dailyPoints = getDailyAttendanceTrends(filteredAttendances, classSessions, 7);
    return dailyPoints.map(p => ({
      date: p.shortDate,
      fullDate: p.date,
      percentage: p.percentage,
      present: p.present + p.late,
      absent: p.absent
    }));
  }, [filteredAttendances, classSessions]);

  // Export report function
  const handleExportCustomReport = (reportType: string) => {
    if (filteredAttendances.length === 0) {
      alert('No attendance records available for the selected criteria.');
      return;
    }

    const studentMap = new Map(students.map(s => [s.id, s]));
    const offeringMap = new Map(courseOfferings.map(co => [co.id, co]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const headers = [
      'Report Type',
      'Attendance Record ID',
      'Student Roll / USN',
      'Student Name',
      'Department',
      'Course Code',
      'Course Name',
      'Section',
      'Date',
      'Status',
      'Method',
      'Similarity Score',
      'Marked By',
      'Timestamp'
    ];

    const rows = filteredAttendances.map(r => {
      const student = studentMap.get(r.student_id);
      const offering = offeringMap.get(r.course_offering_id);
      const course = courseMap.get(offering?.course_id || '');

      return [
        `"${reportType}"`,
        `"${r.id}"`,
        `"${student?.usn || student?.registrationNumber || r.student_id}"`,
        `"${student?.name || 'Student'}"`,
        `"${student?.department || student?.department_id || 'Department'}"`,
        `"${course?.course_code || 'CRS'}"`,
        `"${course?.course_name || 'Class Session'}"`,
        `"${offering?.section || 'A'}"`,
        `"${r.date}"`,
        `"${r.status}"`,
        `"${r.recognition_method}"`,
        `"${r.similarity_score ? (r.similarity_score * 100).toFixed(1) + '%' : 'N/A'}"`,
        `"${r.marked_by}"`,
        `"${r.timestamp}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="analytics-reports-portal" className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Comprehensive Attendance Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate mathematical analytics from normalized attendance and session records.
          </p>
        </div>
        <button
          onClick={() => handleExportCustomReport('Canonical Institutional Summary')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          Export Scoped Summary (CSV)
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          Report Parameters & Aggregation Scopes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {!isDept && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="">All Departments</option>
                <option value="dept-ca">Computer Applications</option>
                <option value="dept-cse">Computer Science</option>
                <option value="dept-ece">Electronics & Communication</option>
                <option value="dept-me">Mechanical Engineering</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Semesters</option>
              <option value="sem-1">Semester 1</option>
              <option value="sem-2">Semester 2</option>
              <option value="sem-3">Semester 3</option>
              <option value="sem-4">Semester 4</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
            <DatePicker
              
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date</label>
            <DatePicker
              
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Classes Conducted</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalClassesConducted}</h3>
            <p className="text-[10px] text-slate-400">Class sessions recorded</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600">Calculated Attendance Rate</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.attendancePercentage}%
            </h3>
            <p className="text-[10px] text-slate-400">{metrics.present} Present / {metrics.late} Late</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-600">Absences Recorded</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.absent}</h3>
            <p className="text-[10px] text-slate-400">{metrics.absentPercentage}% of total marks</p>
          </div>
        </motion.div>
      </div>

      {/* Dynamic 7-Day Trend Chart & Ready-to-Download Preset Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Daily Attendance Percentage Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Attendance Rate']}
                />
                <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Attendance %"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Pre-Formatted Academic Export Modules
          </h3>
          <div className="flex-1 space-y-3">
            {[
              { title: 'Daily Attendance Master Log', subtitle: 'All students and session verification marks for today', type: 'Daily Attendance Report' },
              { title: 'Course Offering Turnout Report', subtitle: 'Detailed breakdown by course offering, lecture, and instructor', type: 'Offering Breakdown Report' },
              { title: 'At-Risk & Attendance Shortage Roster', subtitle: 'Students with aggregate attendance below 75%', type: 'Shortage & Warning Report' },
              { title: 'Facial Verification Audit Trail', subtitle: 'Vector match confidence scores and timestamp logs', type: 'Biometric AI Audit Report' },
            ].map((report, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{report.title}</p>
                    <p className="text-[11px] text-slate-400">{report.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleExportCustomReport(report.type)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;
