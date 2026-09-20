import { ClipboardList } from "lucide-react";

import AttendanceCalendar from '../../components/attendance/AttendanceCalendar';
import React, { useState, useEffect, useMemo } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import {
  Search,
  Download,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
  UserCheck,
  Shield,
  Edit3,
  Trash2,
  BookOpen,
  Percent,
  Layers,
  GraduationCap,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AttendanceStatus } from '../../types';

import {


  filterAttendanceRecords,
  calculateAttendanceMetrics,
  AttendanceFilterParams
} from '../../utils/attendanceAnalytics';

const Attendance = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const {
    attendances,
    students,
    courses,
    courseOfferings,
    classSessions,
    updateAttendanceRecord,
    deleteAttendanceRecord
  } = useData();
  const { departments, semesters, sections } = useAcademic();

  // Multi-dimensional filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [offeringFilter, setOfferingFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState(isDept ? myDept : '');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayRecords, setSelectedDayRecords] = useState<any[]>([]);
  const itemsPerPage = 12;

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('PRESENT');
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Compile active filter params object
  const activeFilters: AttendanceFilterParams = useMemo(() => {
    return {
      student_id: studentFilter || undefined,
      course_id: courseFilter || undefined,
      course_offering_id: offeringFilter || undefined,
      section_id: sectionFilter || undefined,
      semester_id: semesterFilter || undefined,
      batch_id: batchFilter || undefined,
      department_id: (isDept ? myDept : deptFilter) || undefined,
      academic_year_id: academicYearFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: statusFilter || undefined,
      recognition_method: methodFilter || undefined
    };
  }, [studentFilter, courseFilter, offeringFilter, sectionFilter, semesterFilter, batchFilter, deptFilter, myDept, isDept, academicYearFilter, startDate, endDate, statusFilter, methodFilter]);

  // Filter canonical attendance collection
  const filteredAttendances = useMemo(() => {
    const rawFiltered = filterAttendanceRecords(
      attendances,
      classSessions,
      courseOfferings,
      students,
      activeFilters
    );

    if (!searchTerm) return rawFiltered;

    const q = (searchTerm || '').toLowerCase();
    const studentMap = new Map(students.map(s => [s.id, s]));
    const offeringMap = new Map(courseOfferings.map(co => [co.id, co]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return rawFiltered.filter(att => {
      const student = studentMap.get(att.student_id);
      const offering = offeringMap.get(att.course_offering_id);
      const course = courseMap.get(offering?.course_id || '');

      return (
        (att.id || '').toLowerCase().includes(q) ||
        (student?.name && student.name.toLowerCase().includes(q)) ||
        (student?.usn && student.usn.toLowerCase().includes(q)) ||
        (student?.registrationNumber && student.registrationNumber.toLowerCase().includes(q)) ||
        (course?.course_name && course.course_name.toLowerCase().includes(q)) ||
        (course?.course_code && course.course_code.toLowerCase().includes(q))
      );
    });
  }, [attendances, classSessions, courseOfferings, students, courses, activeFilters, searchTerm]);

  // Pure non-hardcoded attendance metrics calculation
  const metrics = useMemo(() => {
    const relevantSessions = classSessions.filter(cs => {
      if (offeringFilter && cs.course_offering_id !== offeringFilter) return false;
      if (startDate && cs.date < startDate) return false;
      if (endDate && cs.date > endDate) return false;
      return true;
    });

    return calculateAttendanceMetrics(filteredAttendances, relevantSessions.length);
  }, [filteredAttendances, classSessions, offeringFilter, startDate, endDate]);

  // Sort descending by date/timestamp
  const sortedRecords = useMemo(() => {
    return [...filteredAttendances].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || a.date).getTime();
      const timeB = new Date(b.timestamp || b.created_at || b.date).getTime();
      return timeB - timeA;
    });
  }, [filteredAttendances]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, searchTerm]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStudentFilter('');
    setCourseFilter('');
    setOfferingFilter('');
    setSectionFilter('');
    setSemesterFilter('');
    setBatchFilter('');
    if (!isDept) setDeptFilter('');
    setAcademicYearFilter('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setMethodFilter('');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSaving(true);
    try {
      await updateAttendanceRecord(editingRecord.id, {
        status: newStatus,
        reason: editReason || 'Administrative override'
      });
      setEditingRecord(null);
      setEditReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    if (sortedRecords.length === 0) return;

    const studentMap = new Map(students.map(s => [s.id, s]));
    const offeringMap = new Map(courseOfferings.map(co => [co.id, co]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const headers = [
      'Attendance ID',
      'Student ID',
      'USN / Reg No',
      'Student Name',
      'Course Code',
      'Course Name',
      'Section',
      'Date',
      'Status',
      'Recognition Method',
      'Similarity Score',
      'Marked By',
      'Timestamp',
      'Modified Reason'
    ];

    const csvContent = [
      headers.join(','),
      ...sortedRecords.map(r => {
        const student = studentMap.get(r.student_id);
        const offering = offeringMap.get(r.course_offering_id);
        const course = courseMap.get(offering?.course_id || '');

        return [
          `"${r.id}"`,
          `"${r.student_id}"`,
          `"${student?.usn || student?.registrationNumber || r.student_id}"`,
          `"${student?.name || 'Student'}"`,
          `"${course?.course_code || 'CODE'}"`,
          `"${course?.course_name || 'Class Session'}"`,
          `"${offering?.section || 'A'}"`,
          `"${r.date}"`,
          `"${r.status}"`,
          `"${r.recognition_method}"`,
          `"${r.similarity_score ? (r.similarity_score * 100).toFixed(1) + '%' : 'N/A'}"`,
          `"${r.marked_by}"`,
          `"${r.timestamp}"`,
          `"${r.modification_reason || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `canonical_attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-attendance-portal" className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isDept ? 'Department Attendance Analytics' : 'Institutional Attendance Analytics'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              Canonical Source of Truth
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isDept ? `Filtered for ${myDept || 'Department'}` : 'Institution-wide data dynamically computed from session records'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Dynamic Non-Hardcoded Analytics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Conducted</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.totalClassesConducted}
          </p>
          <p className="text-[10px] text-slate-400">Sessions Total</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.present}
          </p>
          <p className="text-[10px] text-slate-400">{metrics.effectivePresentPercentage}% present</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Late</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {metrics.late}
          </p>
          <p className="text-[10px] text-slate-400">{metrics.latePercentage}% late</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Absent</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {metrics.absent}
          </p>
          <p className="text-[10px] text-slate-400">{metrics.absentPercentage}% absent</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600">Excused</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {metrics.excused}
          </p>
          <p className="text-[10px] text-slate-400">{metrics.excusedPercentage}% excused</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600">Turnout Rate</span>
            <Percent className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {metrics.attendancePercentage}%
          </p>
          <p className="text-[10px] font-bold text-emerald-600">Verified</p>
        </div>
      </div>

      {/* Multi-Dimensional Academic Filter Console */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            Multi-Dimensional Academic Filter Matrix
          </h3>
          <span className="text-xs text-slate-400">
            Matching {sortedRecords.length} records
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Quick Search */}
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Student / USN / Code</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, USN, course code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Department */}
          {!isDept && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="">All Departments</option>
                {(departments || []).map(d => (
                  <option key={d.id} value={d.id || d.department_id}>{d.department_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Semesters</option>
              {(semesters || []).map(sem => (
                <option key={sem.id} value={sem.id || sem.semester_id}>Semester {sem.semester_number}</option>
              ))}
            </select>
          </div>

          {/* Course Offering */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Course Offering</label>
            <select
              value={offeringFilter}
              onChange={(e) => setOfferingFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Course Offerings</option>
              {courseOfferings.map(co => {
                const c = courses.find(course => course.id === co.course_id);
                return (
                  <option key={co.id} value={co.id}>
                    {c?.course_code || 'CODE'} — {c?.course_name || co.id} {co.section ? `(Sec ${co.section})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Sections</option>
              {(sections || []).map(sec => (
                <option key={sec.id} value={sec.id || sec.section_id}>{sec.section_name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          {/* Date Range: Start */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
            <DatePicker
              
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Date Range: End */}
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


      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {viewMode === 'list' ? <ClipboardList className="w-5 h-5 text-indigo-500" /> : <Calendar className="w-5 h-5 text-indigo-500" />}
          Attendance {viewMode === 'list' ? 'Records' : 'Calendar'}
        </h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Attendance Records Table or Calendar */}
      {viewMode === 'calendar' ? (
        <AttendanceCalendar records={sortedRecords} onDateClick={(date, records) => { setSelectedDate(date); setSelectedDayRecords(records); }} />
      ) : (
       
       
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course & Section</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Recognition Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No canonical attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const student = students.find(s => s.id === rec.student_id || s.user_id === rec.student_id);
                  const offering = courseOfferings.find(co => co.id === rec.course_offering_id);
                  const course = courses.find(c => c.id === offering?.course_id);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                            {student?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{student?.name || 'Student'}</p>
                            <p className="font-mono text-xs text-slate-400">{student?.usn || student?.registrationNumber || rec.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded mr-2">
                            {course?.course_code || 'CRS'}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {course?.course_name || 'Class Session'}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">Section {offering?.section || 'A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{rec.date}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.recognition_method === 'FACE_RECOGNITION' ? 'Facial Vector' : rec.recognition_method}
                          {rec.similarity_score && (
                            <span className="text-[10px] text-indigo-500 font-mono">
                              ({Math.round(rec.similarity_score * 100)}%)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : rec.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : rec.status === 'EXCUSED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingRecord(rec);
                            setNewStatus(rec.status);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Override
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedRecords.length)} of {sortedRecords.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-semibold"
              >
                Previous
              </button>
              <span className="font-bold text-slate-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      
      )} // End viewMode ternary
{/* Edit Override Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Administrative Attendance Override
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Override status for {editingRecord.id}. This action will be recorded in the audit log.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">New Attendance Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Justification Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for administrative attendance modification..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                {isSaving ? 'Saving...' : 'Apply & Audit Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
