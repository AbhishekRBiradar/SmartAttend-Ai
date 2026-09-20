import React, { useState, useEffect } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Calendar, Filter, Download, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, UserCheck, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList } from "lucide-react";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar";
import { AttendanceStatus } from '../../types';
import { formatDate } from '../../utils/dateUtils';



const TeacherAttendance = () => {
  const { user } = useAuth();
  const { 
    attendances, 
    students, 
    courses, 
    courseOfferings, 
    classSessions, 
    enrollments,
    updateAttendanceRecord 
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOfferingId, setSelectedOfferingId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayRecords, setSelectedDayRecords] = useState<any[]>([]);
  const itemsPerPage = 12;

  // Edit record state for quick corrections
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('PRESENT');
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Determine teacher's assigned course offerings
  const teacherOfferings = courseOfferings.filter(co => 
    co.teacher_id === user?.user_id || 
    (user && (user as any).id && co.teacher_id === (user as any).id) || 
    (co.teacher_name && user?.name && co.teacher_name.toLowerCase().includes((user.name || '').toLowerCase()))
  );

  const teacherOfferingIds = new Set(teacherOfferings.map(co => co.id));

  // Build enriched canonical records for the teacher
  const teacherRecords = attendances
    .filter(att => teacherOfferingIds.has(att.course_offering_id) || teacherOfferings.length === 0)
    .map(att => {
      const student = students.find(s => s.id === att.student_id || s.user_id === att.student_id);
      const offering = courseOfferings.find(co => co.id === att.course_offering_id);
      const course = courses.find(c => c.id === offering?.course_id);
      const session = classSessions.find(cs => cs.id === att.session_id);

      return {
        ...att,
        studentName: student?.name || 'Unknown Student',
        studentRoll: student?.registrationNumber || student?.id || att.student_id,
        department: student?.department || student?.department_id || 'Computer Science',
        courseCode: course?.course_code || offering?.course_id || 'CRS',
        courseName: course?.course_name || 'Class Session',
        section: offering?.section || 'A',
        room: session?.room || att.period || 'Main Hall',
        sessionDate: att.date || session?.date || '',
      };
    });

  // Filter records
  const filteredLogs = teacherRecords.filter(r => {
    const matchesSearch = 
      (r.studentName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (r.studentRoll || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (r.courseName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (r.courseCode || '').toLowerCase().includes((searchTerm || '').toLowerCase());

    const matchesDate = dateFilter ? (r.date === dateFilter || r.sessionDate === dateFilter) : true;
    const matchesOffering = selectedOfferingId === 'All' || r.course_offering_id === selectedOfferingId;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesMethod = methodFilter === 'All' || r.recognition_method === methodFilter;

    return matchesSearch && matchesDate && matchesOffering && matchesStatus && matchesMethod;
  });

  // Sort descending by timestamp/date
  filteredLogs.sort((a, b) => new Date(b.timestamp || b.created_at || b.date).getTime() - new Date(a.timestamp || a.created_at || a.date).getTime());

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, selectedOfferingId, statusFilter, methodFilter]);

  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Attendance ID',
      'Student Roll / USN',
      'Student Name',
      'Course Code',
      'Course Name',
      'Section',
      'Date',
      'Period / Room',
      'Status',
      'Recognition Method',
      'Similarity Score',
      'Marked By',
      'Timestamp'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(r => [
        `"${r.id}"`,
        `"${r.studentRoll}"`,
        `"${r.studentName}"`,
        `"${r.courseCode}"`,
        `"${r.courseName}"`,
        `"${r.section}"`,
        `"${formatDate(r.date)}"`,
        `"${r.room}"`,
        `"${r.status}"`,
        `"${r.recognition_method}"`,
        `"${r.similarity_score ? (r.similarity_score * 100).toFixed(1) + '%' : 'N/A'}"`,
        `"${r.marked_by}"`,
        `"${r.timestamp}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `teacher_attendance_${dateFilter || 'all_dates'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSaving(true);
    try {
      await updateAttendanceRecord(editingRecord.id, {
        status: newStatus,
        reason: editReason || 'Teacher manual correction'
      });
      setEditingRecord(null);
      setEditReason('');
    } catch (err) {
      console.warn("Failed to update attendance record", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Class Attendance Reports</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Teacher Portal
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and export biometric class session attendances for your enrolled course offerings.
          </p>
        </div>
        <button 
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student or course..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          {/* Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <DatePicker 
               
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          {/* Course Offering */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={selectedOfferingId}
              onChange={(e) => setSelectedOfferingId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
            >
              <option value="All">All My Courses</option>
              {teacherOfferings.map(co => {
                const c = courses.find(item => item.id === co.course_id);
                return (
                  <option key={co.id} value={co.id}>
                    {c?.course_name || co.course_id} (Sec {co.section})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              <option value="All">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>

          {/* Method */}
          <div className="relative">
            <select 
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              <option value="All">All Verification Types</option>
              <option value="FACE_RECOGNITION">Face AI Recognition</option>
              <option value="MANUAL">Manual Teacher Entry</option>
            </select>
          </div>
        </div>

        {/* Clear filter bar */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredLogs.length}</span> class records
          </div>
          {(searchTerm || dateFilter || selectedOfferingId !== 'All' || statusFilter !== 'All' || methodFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
                setSelectedOfferingId('All');
                setStatusFilter('All');
                setMethodFilter('All');
              }}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>


      <div className="flex items-center justify-between mb-4 mt-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {viewMode === 'list' ? <ClipboardList className="w-5 h-5 text-indigo-500" /> : <Calendar className="w-5 h-5 text-indigo-500" />}
          Attendance {viewMode === 'list' ? 'Logs' : 'Calendar'}
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

      {/* Main Table or Calendar */}
      {viewMode === 'calendar' ? (
        <AttendanceCalendar records={filteredLogs} onDateClick={(date, records) => { setSelectedDate(date); setSelectedDayRecords(records); }} />
      ) : (

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="p-4">Student</th>
                <th className="p-4">Course & Class</th>
                <th className="p-4">Date & Room</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Status</th>
                <th className="p-4">Marked By</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedLogs.map((r, idx) => (
                <motion.tr 
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Student */}
                  <td className="p-4">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {r.studentName}
                    </div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.studentRoll}
                    </div>
                  </td>

                  {/* Course */}
                  <td className="p-4">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200">
                      {r.courseName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{r.courseCode}</span>
                      <span>• Sec {r.section}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-4">
                    <div className="font-mono text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {formatDate(r.date)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.room}
                    </div>
                  </td>

                  {/* Method */}
                  <td className="p-4">
                    {r.recognition_method === 'FACE_RECOGNITION' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Sparkles className="w-3 h-3" />
                        Face Match {r.similarity_score ? `(${(r.similarity_score * 100).toFixed(0)}%)` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <UserCheck className="w-3 h-3" />
                        Manual Entry
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      r.status === 'LATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                      r.status === 'EXCUSED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                    }`}>
                      {r.status === 'PRESENT' && <CheckCircle2 className="w-3 h-3" />}
                      {r.status === 'LATE' && <Clock className="w-3 h-3" />}
                      {r.status === 'ABSENT' && <XCircle className="w-3 h-3" />}
                      {r.status === 'EXCUSED' && <AlertCircle className="w-3 h-3" />}
                      {r.status}
                    </span>
                  </td>

                  {/* Marked By */}
                  <td className="p-4">
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {r.marked_by}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setEditingRecord(r);
                        setNewStatus(r.status);
                        setEditReason(r.modification_reason || '');
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Override Status"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    No attendance records found for your classes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Page <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )} // End viewMode ternary
      {/* Calendar Day Detail Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Attendance for {selectedDate}
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto pr-2">
                <div className="space-y-2">
                  {selectedDayRecords.map(record => {
                    const student = students.find(s => s.user_id === record.student_id || s.id === record.student_id);
                    const course = courses.find(c => c.id === record.course_id || c.course_id === record.course_id);
                    return (
                      <div key={record.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{student?.name || record.studentName || 'Unknown Student'}</p>
                          <p className="text-[10px] text-slate-500">{course?.course_name || record.course_name || record.course_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg">{record.recognition_method || 'MANUAL'}</span>
                          <span className={`
                            text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider
                            ${record.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : ''}
                            ${record.status === 'ABSENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : ''}
                            ${record.status === 'LATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : ''}
                            ${record.status === 'EXCUSED' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : ''}
                          `}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Adjust Student Status</h3>
                <button 
                  onClick={() => setEditingRecord(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Student:</span>{' '}
                  <strong className="text-slate-900 dark:text-white">{editingRecord.studentName} ({editingRecord.studentRoll})</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Course:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{editingRecord.courseName}</span>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Update Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as AttendanceStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewStatus(st)}
                        className={`py-2 px-3 rounded-xl font-semibold text-xs transition-all border ${
                          newStatus === st 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Reason / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Arrived 15 minutes in with medical slip"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherAttendance;
