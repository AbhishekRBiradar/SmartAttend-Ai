import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Edit3, 
  CheckCircle2, 
  Save, 
  BookOpen, 
  FileCheck, 
  Download, 
  Users, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const TeacherResults: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryOfferingId = searchParams.get('offeringId') || '';

  const { 
    exams, 
    results, 
    students, 
    courses, 
    courseOfferings, 
    enrollments,
    teachers,
    addResult, 
    updateResult,
    addExam
  } = useData();

  // Identify teacher profile
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

  // Get assigned course offerings
  const assignedOfferings = useMemo(() => {
    return courseOfferings.filter(o => 
      o.teacher_id === teacherId || 
      o.teacher_id === user?.user_id ||
      (o.teacher_name && user?.name && o.teacher_name.toLowerCase().includes((user.name || '').toLowerCase()))
    );
  }, [courseOfferings, teacherId, user]);

  const activeOfferings = assignedOfferings.length > 0 ? assignedOfferings : courseOfferings.slice(0, 3);
  const assignedCourseIds = useMemo(() => new Set(activeOfferings.map(o => o.course_id)), [activeOfferings]);

  // Selected subject offering
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(
    queryOfferingId && activeOfferings.some(o => o.id === queryOfferingId)
      ? queryOfferingId
      : (activeOfferings[0]?.id || '')
  );

  const currentOffering = useMemo(() => {
    return activeOfferings.find(o => o.id === selectedOfferingId) || activeOfferings[0];
  }, [activeOfferings, selectedOfferingId]);

  const currentCourse = useMemo(() => {
    return courses.find(c => c.id === currentOffering?.course_id);
  }, [courses, currentOffering]);

  // Filter exams strictly for this course/subject
  const subjectExams = useMemo(() => {
    if (!currentCourse && !currentOffering) return [];
    return exams.filter(e => 
      e.course_id === currentCourse?.id || 
      e.course_id === currentOffering?.course_id ||
      (e.course_name && currentCourse?.course_name && e.course_name.toLowerCase() === currentCourse.course_name.toLowerCase())
    );
  }, [exams, currentCourse, currentOffering]);

  const [selectedExamId, setSelectedExamId] = useState<string>('');

  useEffect(() => {
    if (subjectExams.length > 0) {
      setSelectedExamId(subjectExams[0].id);
    } else {
      setSelectedExamId('DEFAULT_INTERNAL');
    }
  }, [subjectExams, selectedOfferingId]);

  const currentExam = useMemo(() => {
    return subjectExams.find(e => e.id === selectedExamId) || {
      id: 'DEFAULT_INTERNAL',
      name: `${currentCourse?.course_code || 'Subject'} Internal Assessment`,
      exam_type: 'INTERNAL',
      max_marks: 100,
      passing_marks: 40,
      course_id: currentCourse?.id || currentOffering?.course_id || ''
    };
  }, [subjectExams, selectedExamId, currentCourse, currentOffering]);

  // Students enrolled in this assigned course offering
  const enrolledStudents = useMemo(() => {
    if (!currentOffering) return [];
    const validEnrollmentStudentIds = new Set(
      enrollments
        .filter(e => e.course_offering_id === currentOffering.id && e.status !== 'INACTIVE')
        .map(e => e.student_id)
    );

    let list = students.filter(s => validEnrollmentStudentIds.has(s.id) || validEnrollmentStudentIds.has(s.user_id));

    if (list.length === 0 && currentOffering.department_id) {
      list = students.filter(s => 
        (s.department_id === currentOffering.department_id || s.department === currentOffering.department_id) &&
        s.role !== 'TEACHER'
      ).slice(0, 30);
    }

    return list;
  }, [currentOffering, enrollments, students]);

  // Existing results for this exam & students
  const examResults = useMemo(() => {
    return results.filter(r => 
      r.exam_id === currentExam.id || 
      (r.course_id === (currentCourse?.id || currentOffering?.course_id))
    );
  }, [results, currentExam, currentCourse, currentOffering]);

  const [editingMarks, setEditingMarks] = useState<{ [studentId: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [newExamData, setNewExamData] = useState({
    name: 'Mid Term Assessment',
    exam_type: 'MID_TERM',
    max_marks: 100,
    passing_marks: 40
  });

  // Populate initial marks
  useEffect(() => {
    const marksMap: { [studentId: string]: number } = {};
    enrolledStudents.forEach(st => {
      const res = examResults.find(r => r.student_id === st.id || r.student_id === st.user_id);
      if (res) {
        marksMap[st.id] = res.marks_obtained !== undefined ? res.marks_obtained : (res.marks || 0);
      }
    });
    setEditingMarks(marksMap);
  }, [currentExam, enrolledStudents, examResults]);

  const handleMarkChange = (studentId: string, val: number) => {
    const max = currentExam?.max_marks || 100;
    const clamped = Math.max(0, Math.min(val, max));
    setEditingMarks(prev => ({ ...prev, [studentId]: clamped }));
  };

  const handleSaveAll = async () => {
    if (!currentOffering) return;
    setIsSaving(true);

    try {
      const maxMarks = currentExam?.max_marks || 100;
      const passMarks = currentExam?.passing_marks || 40;

      for (const st of enrolledStudents) {
        const marks = editingMarks[st.id] !== undefined ? editingMarks[st.id] : 0;
        const existing = examResults.find(r => r.student_id === st.id || r.student_id === st.user_id);
        const percentage = Math.round((marks / maxMarks) * 100);
        const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 40 ? 'D' : 'F';
        const status = marks >= passMarks ? 'PASS' : 'FAIL';

        if (existing && updateResult) {
          await updateResult(existing.id, {
            marks_obtained: marks,
            percentage,
            grade,
            status,
            is_published: true
          });
        } else if (addResult) {
          await addResult({
            exam_id: currentExam.id,
            student_id: st.id,
            student_name: st.name,
            course_id: currentOffering.course_id || currentCourse?.id || '',
            course_name: currentCourse?.course_name || currentOffering.course_name || 'Subject',
            course_code: currentCourse?.course_code || currentOffering.course_code || 'CRS',
            marks_obtained: marks,
            max_marks: maxMarks,
            percentage,
            grade,
            status,
            is_published: true
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save assessment marks:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addExam || !currentOffering) return;

    try {
      await addExam({
        name: newExamData.name,
        exam_type: newExamData.exam_type as any,
        course_id: currentOffering.course_id || currentCourse?.id || '',
        course_name: currentCourse?.course_name || currentOffering.course_name || 'Subject',
        department_id: currentOffering.department_id || 'Computer Science',
        max_marks: Number(newExamData.max_marks),
        passing_marks: Number(newExamData.passing_marks),
        academic_year: '2025-2026',
        semester_id: currentOffering.semester_id || 'Semester 4',
        exam_date: new Date().toISOString().split('T')[0]
      });

      setIsCreateExamOpen(false);
    } catch (err) {
      console.error('Failed to create new assessment:', err);
    }
  };

  const handleExportCSV = () => {
    if (enrolledStudents.length === 0) return;

    const max = currentExam?.max_marks || 100;
    const headers = ['Student Name', 'Registration Number / USN', 'Subject Code', 'Subject Name', 'Assessment', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'Status'];
    
    const rows = enrolledStudents.map(st => {
      const score = editingMarks[st.id] !== undefined ? editingMarks[st.id] : 0;
      const pct = Math.round((score / max) * 100);
      const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
      const status = score >= (currentExam?.passing_marks || 40) ? 'PASS' : 'FAIL';

      return [
        `"${st.name}"`,
        `"${st.registrationNumber || st.usn || st.id}"`,
        `"${currentCourse?.course_code || currentOffering?.course_code || 'CS301'}"`,
        `"${currentCourse?.course_name || currentOffering?.course_name || 'Subject'}"`,
        `"${currentExam.name}"`,
        `"${score}"`,
        `"${max}"`,
        `"${pct}%"`,
        `"${grade}"`,
        `"${status}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marks_${currentCourse?.course_code || 'subject'}_${currentExam.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  // Filter student list by search
  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return enrolledStudents;
    return enrolledStudents.filter(s => 
      (s.name || '').toLowerCase().includes(term) ||
      (s.registrationNumber || '').toLowerCase().includes(term) ||
      (s.usn || '').toLowerCase().includes(term)
    );
  }, [enrolledStudents, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Subject Evaluation & Marks Entry
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Assigned Subjects Only
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Input student evaluation scores and publish grades for your department-assigned course offerings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" /> Export Marksheet
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || enrolledStudents.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Publishing...' : 'Save & Publish Marks'}
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
            className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-bold text-sm">Marks and Grades Successfully Published</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Evaluation results recorded for {enrolledStudents.length} students in {currentCourse?.course_name || 'Subject'}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subject & Assessment Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Assigned Course Offering */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Assigned Subject & Section
            </label>
            <select
              value={selectedOfferingId}
              onChange={(e) => setSelectedOfferingId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {activeOfferings.map(offering => {
                const c = courses.find(item => item.id === offering.course_id);
                return (
                  <option key={offering.id} value={offering.id}>
                    {c?.course_code || offering.course_code || 'CS301'} - {c?.course_name || offering.course_name || 'Subject'} (Sec {offering.section_id || offering.section || 'A'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Assessment / Exam */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                Select Assessment / Exam
              </label>
              <button
                type="button"
                onClick={() => setIsCreateExamOpen(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New Assessment
              </button>
            </div>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {subjectExams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.exam_type}) • Max Marks: {exam.max_marks}
                </option>
              ))}
              {subjectExams.length === 0 && (
                <option value="DEFAULT_INTERNAL">
                  {currentCourse?.course_code || 'Subject'} Internal Assessment (Max: 100)
                </option>
              )}
            </select>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Filter Students
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name or roll..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Assessment summary bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-4">
            <span>Subject: <strong className="text-slate-900 dark:text-white font-bold">{currentCourse?.course_name || 'Subject'} ({currentCourse?.course_code || 'CS301'})</strong></span>
            <span>Max Marks: <strong className="text-slate-900 dark:text-white font-bold">{currentExam?.max_marks || 100}</strong></span>
            <span>Passing Marks: <strong className="text-slate-900 dark:text-white font-bold">{currentExam?.passing_marks || 40}</strong></span>
          </div>
          <div>
            Total Roster: <strong className="text-indigo-600 font-bold">{enrolledStudents.length} Students</strong>
          </div>
        </div>
      </div>

      {/* Marks Input Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Registration / USN</th>
                <th className="px-6 py-4">Marks Obtained (Max: {currentExam?.max_marks || 100})</th>
                <th className="px-6 py-4 text-center">Percentage & Grade</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No students enrolled in this assigned course offering.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const max = currentExam?.max_marks || 100;
                  const pass = currentExam?.passing_marks || 40;
                  const currentScore = editingMarks[student.id] !== undefined ? editingMarks[student.id] : 0;
                  const pct = Math.round((currentScore / max) * 100);
                  const isPass = currentScore >= pass;
                  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';

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
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
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
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={max}
                            value={currentScore}
                            onChange={(e) => handleMarkChange(student.id, Number(e.target.value))}
                            className="w-28 px-3.5 py-1.5 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                          <span className="text-xs text-slate-400">/ {max}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                          pct >= 75
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : pct >= 50
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {grade} ({pct}%)
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isPass
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}>
                          {isPass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-500">
            Scores submitted will instantly reflect on the student result portal and grade transcripts.
          </p>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || enrolledStudents.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Publishing Marks...' : 'Save & Publish Marks'}
          </button>
        </div>
      </div>

      {/* Modal for Creating New Assessment for Assigned Subject */}
      {isCreateExamOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Create Subject Assessment
              </h3>
              <button
                onClick={() => setIsCreateExamOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Name</label>
                <input
                  type="text"
                  required
                  value={newExamData.name}
                  onChange={(e) => setNewExamData({ ...newExamData, name: e.target.value })}
                  placeholder="e.g. Unit Test 1 / Quiz 2"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Type</label>
                  <select
                    value={newExamData.exam_type}
                    onChange={(e) => setNewExamData({ ...newExamData, exam_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="INTERNAL">Internal Assessment</option>
                    <option value="MID_TERM">Mid Term</option>
                    <option value="FINAL">Final Exam</option>
                    <option value="QUIZ">Quiz / Assignment</option>
                    <option value="LAB">Lab Practical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    disabled
                    value={currentCourse?.course_code || 'CS301'}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={newExamData.max_marks}
                    onChange={(e) => setNewExamData({ ...newExamData, max_marks: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    min="1"
                    max={newExamData.max_marks}
                    value={newExamData.passing_marks}
                    onChange={(e) => setNewExamData({ ...newExamData, passing_marks: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateExamOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResults;
