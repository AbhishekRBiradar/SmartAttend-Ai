import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckSquare, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Save, 
  ArrowLeft, 
  Search, 
  Calendar as CalendarIcon, 
  BookOpen, 
  MapPin, 
  Sparkles, 
  RotateCcw,
  History,
  Check,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AttendanceStatus } from '../../types';
import { DatePicker } from '../../components/ui/DatePicker';
import { motion, AnimatePresence } from 'motion/react';

const ActiveSession: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryOfferingId = searchParams.get('offeringId') || '';
  const queryPeriod = searchParams.get('period') || '';

  const { 
    courses, 
    courseOfferings, 
    students, 
    enrollments, 
    timetables, 
    attendances,
    teachers,
    classSessions,
    startClassSession,
    endClassSession,
    markSessionAttendance,
    updateAttendanceRecord
  } = useData();

  // Find teacher profile
  const currentTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find(t => t.user_id === user.user_id || t.id === user.user_id || t.email === user.email);
  }, [teachers, user]);

  const teacherId = currentTeacher?.id || user?.user_id || '';

  // Get assigned course offerings
  const assignedOfferings = useMemo(() => {
    return courseOfferings.filter(o => 
      o.teacher_id === teacherId || 
      o.teacher_id === user?.user_id ||
      (o.teacher_name && user?.name && o.teacher_name.toLowerCase().includes((user.name || '').toLowerCase()))
    );
  }, [courseOfferings, teacherId, user]);

  const activeOfferings = assignedOfferings.length > 0 ? assignedOfferings : courseOfferings.slice(0, 3);

  // Selected state
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(
    queryOfferingId && activeOfferings.some(o => o.id === queryOfferingId)
      ? queryOfferingId
      : (activeOfferings[0]?.id || '')
  );

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(queryPeriod || 'Period 1 (09:00 - 10:00)');
  const [roomNumber, setRoomNumber] = useState<string>('Room 302');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [remarks, setRemarks] = useState<{ [studentId: string]: string }>({});
  const [studentStatuses, setStudentStatuses] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current selected offering & course
  const currentOffering = useMemo(() => {
    return activeOfferings.find(o => o.id === selectedOfferingId) || activeOfferings[0];
  }, [activeOfferings, selectedOfferingId]);

  const currentCourse = useMemo(() => {
    return courses.find(c => c.id === currentOffering?.course_id);
  }, [courses, currentOffering]);

  // Timetable slots for this offering
  const offeringTimetable = useMemo(() => {
    if (!currentOffering) return [];
    return timetables.filter(t => t.course_offering_id === currentOffering.id);
  }, [timetables, currentOffering]);

  // Students enrolled in this specific offering
  const enrolledStudents = useMemo(() => {
    if (!currentOffering) return [];
    const validEnrollmentStudentIds = new Set(
      enrollments
        .filter(e => e.course_offering_id === currentOffering.id && e.status !== 'INACTIVE')
        .map(e => e.student_id)
    );

    let list = students.filter(s => validEnrollmentStudentIds.has(s.id) || validEnrollmentStudentIds.has(s.user_id));
    
    // Fallback if no explicit enrollments match demo data
    if (list.length === 0 && currentOffering.department_id) {
      list = students.filter(s => 
        (s.department_id === currentOffering.department_id || s.department === currentOffering.department_id) &&
        s.role !== 'TEACHER'
      ).slice(0, 30);
    }
    
    return list;
  }, [currentOffering, enrollments, students]);

  // Initial population of student statuses from existing attendance on that date/period, or default to PRESENT
  useEffect(() => {
    if (!currentOffering) return;
    
    // Check if attendance was already recorded for this date & offering
    const existing = attendances.filter(a => 
      a.course_offering_id === currentOffering.id && 
      (a.date === selectedDate || (a.timestamp && a.timestamp.split('T')[0] === selectedDate))
    );

    const initialMap: { [studentId: string]: AttendanceStatus } = {};
    const initialRemarks: { [studentId: string]: string } = {};

    enrolledStudents.forEach(st => {
      const rec = existing.find(a => a.student_id === st.id || a.student_id === st.user_id);
      if (rec) {
        initialMap[st.id] = (rec.status as AttendanceStatus) || 'PRESENT';
        if (rec.remarks) initialRemarks[st.id] = rec.remarks;
      } else {
        initialMap[st.id] = 'PRESENT';
      }
    });

    setStudentStatuses(initialMap);
    setRemarks(initialRemarks);
  }, [currentOffering, selectedDate, selectedPeriod, enrolledStudents, attendances]);

  // Status updates
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: { [studentId: string]: AttendanceStatus } = {};
    enrolledStudents.forEach(st => {
      updated[st.id] = status;
    });
    setStudentStatuses(updated);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = enrolledStudents.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    Object.values(studentStatuses).forEach(st => {
      if (st === 'PRESENT') present++;
      else if (st === 'ABSENT') absent++;
      else if (st === 'LATE') late++;
      else if (st === 'EXCUSED') excused++;
    });

    return { total, present, absent, late, excused };
  }, [enrolledStudents, studentStatuses]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return enrolledStudents;
    return enrolledStudents.filter(s => 
      (s.name || '').toLowerCase().includes(term) ||
      (s.registrationNumber || '').toLowerCase().includes(term) ||
      (s.usn || '').toLowerCase().includes(term) ||
      (s.id || '').toLowerCase().includes(term)
    );
  }, [enrolledStudents, searchTerm]);

  // Submit attendance records
  const handleSaveAttendance = async () => {
    if (!currentOffering || enrolledStudents.length === 0) return;

    setIsSaving(true);
    try {
      // Find or start an active class session for this offering
      let targetSession = classSessions.find(
        cs => cs.course_offering_id === currentOffering.id && cs.date === selectedDate && cs.status === 'ACTIVE'
      );

      if (!targetSession && startClassSession) {
        try {
          targetSession = await startClassSession(currentOffering.id, roomNumber);
        } catch (sessionErr) {
          console.warn("Notice: startClassSession returned or existing", sessionErr);
        }
      }

      const sessionId = targetSession?.id || `SES_${currentOffering.id}_${selectedDate.replace(/-/g, '')}`;

      for (const st of enrolledStudents) {
        const status = studentStatuses[st.id] || 'PRESENT';
        if (markSessionAttendance) {
          await markSessionAttendance({
            sessionId: sessionId,
            studentId: st.id,
            status: status as any,
            method: 'MANUAL',
            period: selectedPeriod,
            reason: remarks[st.id] || 'Teacher period roll call'
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit attendance roll call:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/dashboard"
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                Period Attendance Roll Call
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Department Assigned
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Mark and submit verified classroom attendance for your assigned timetable periods.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/teacher/attendance"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <History className="w-4 h-4 text-indigo-600" />
            Attendance History
          </Link>
          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || enrolledStudents.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Submitting...' : 'Save & Submit Attendance'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-bold text-sm">Attendance Successfully Recorded</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {metrics.present} Present, {metrics.absent} Absent recorded for {currentCourse?.course_name || 'Class'} on {selectedDate}.
                </p>
              </div>
            </div>
            <Link
              to="/teacher/attendance"
              className="text-xs font-bold underline hover:text-emerald-900 dark:hover:text-emerald-100"
            >
              View in Logs
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Period Configuration Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Assigned Course Offering */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Assigned Subject & Section
            </label>
            <select
              value={selectedOfferingId}
              onChange={(e) => setSelectedOfferingId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {activeOfferings.map(offering => {
                const c = courses.find(item => item.id === offering.course_id);
                return (
                  <option key={offering.id} value={offering.id}>
                    {c?.course_code || offering.course_code || 'CRS'} - {c?.course_name || offering.course_name || 'Course'} (Sec {offering.section_id || offering.section || 'A'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              Class Session Date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Timetable Period */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Assigned Period / Slot
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {offeringTimetable.length > 0 ? (
                offeringTimetable.map(t => (
                  <option key={t.id} value={`${t.day_of_week} (${t.start_time} - ${t.end_time})`}>
                    {t.day_of_week} ({t.start_time} - {t.end_time}) • {t.room || 'Room 301'}
                  </option>
                ))
              ) : (
                <>
                  <option value="Period 1 (09:00 - 10:00)">Period 1 (09:00 - 10:00)</option>
                  <option value="Period 2 (10:00 - 11:00)">Period 2 (10:00 - 11:00)</option>
                  <option value="Period 3 (11:15 - 12:15)">Period 3 (11:15 - 12:15)</option>
                  <option value="Period 4 (01:15 - 02:15)">Period 4 (01:15 - 02:15)</option>
                  <option value="Period 5 (02:15 - 03:15)">Period 5 (02:15 - 03:15)</option>
                  <option value="Period 6 (03:30 - 04:30)">Period 6 (03:30 - 04:30)</option>
                </>
              )}
            </select>
          </div>

          {/* Room Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Classroom / Laboratory
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. Room 302 / Lab 2"
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Live Attendance Tally Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              Total Enrolled: <span className="text-slate-900 dark:text-white font-black">{metrics.total}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Present: <span className="font-black">{metrics.present}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/50">
              <XCircle className="w-4 h-4 text-rose-600" />
              Absent: <span className="font-black">{metrics.absent}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/50">
              <Clock className="w-4 h-4 text-amber-600" />
              Late: <span className="font-black">{metrics.late}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 border border-purple-200 dark:border-purple-900/50">
              <AlertCircle className="w-4 h-4 text-purple-600" />
              Excused: <span className="font-black">{metrics.excused}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkAll('PRESENT')}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-lg transition"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll('ABSENT')}
              className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 rounded-lg transition"
            >
              Mark All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or USN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStudents.length}</span> students for this period
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Student Details</th>
                <th className="px-6 py-3.5">Registration / USN</th>
                <th className="px-6 py-3.5 text-center">Attendance Status</th>
                <th className="px-6 py-3.5">Notes / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No enrolled students found for the selected subject/section.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const currentStatus = studentStatuses[st.id] || 'PRESENT';

                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        currentStatus === 'ABSENT' 
                          ? 'bg-rose-50/30 dark:bg-rose-950/10' 
                          : currentStatus === 'LATE'
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {st.profilePic ? (
                            <img
                              src={st.profilePic}
                              alt={st.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {(st.name || 'S').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">{st.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{st.email || st.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {st.registrationNumber || st.usn || st.id}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'PRESENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" /> Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'ABSENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" /> Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'LATE')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" /> Late
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'EXCUSED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'EXCUSED'
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. Medical leave, Late 10m)"
                          value={remarks[st.id] || ''}
                          onChange={(e) => setRemarks({ ...remarks, [st.id]: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer save bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-500">
            Attendance submitted will update the department attendance registry and student records in real time.
          </p>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || enrolledStudents.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Submitting Roll Call...' : 'Save & Submit Period Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSession;
