import React, { useState } from 'react';
import { Award, Plus, Search, Trash2, Edit, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { Exam, Result } from '../../types';
import { uniqueDocs } from '../../utils/firestoreUtils';

const AdminResults = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const { exams, results, students, courses, addExam, deleteExam, addResult, updateResult } = useData();
  const { departments, semesters, sections } = useAcademic();

  const [activeTab, setActiveTab] = useState<'EXAMS' | 'RESULTS'>('EXAMS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    name: '',
    exam_type: 'Midterm',
    course_id: '',
    max_marks: 100,
    passing_marks: 40,
    date: new Date().toISOString().split('T')[0]
  });

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.name || !newExam.course_id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (addExam) {
        const course = courses.find(c => c.id === newExam.course_id || c.course_id === newExam.course_id);
        const resolvedDeptId = isDept ? myDept : (course?.department_id || '');

        await addExam({
          name: newExam.name.trim(),
          exam_type: newExam.exam_type || 'Midterm',
          course_id: newExam.course_id,
          department_id: resolvedDeptId,
          date: newExam.date || new Date().toISOString().split('T')[0],
          max_marks: Number(newExam.max_marks) || 100,
          passing_marks: Number(newExam.passing_marks) || 40,
          status: 'SCHEDULED'
        });
      }
      setIsExamModalOpen(false);
      setNewExam({
        name: '',
        exam_type: 'Midterm',
        course_id: '',
        max_marks: 100,
        passing_marks: 40,
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error creating examination:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Exams & Results Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule examinations, publish grade reports, and track student academic results
          </p>
        </div>

        <button
          onClick={() => setIsExamModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Create Examination
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('EXAMS')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'EXAMS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Examinations ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('RESULTS')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'RESULTS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Student Results ({results.length})
        </button>
      </div>

      {activeTab === 'EXAMS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uniqueDocs(exams).map((exam, idx) => {
            const course = courses.find(c => c.id === exam.course_id || c.course_id === exam.course_id);
            return (
              <div key={exam.id || (exam as any).exam_id || `exam-${idx}`} className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      {exam.exam_type}
                    </span>
                    <button
                      onClick={() => deleteExam && deleteExam(exam.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{exam.name}</h3>
                  <p className="text-xs text-slate-500">{course?.course_name || 'General Course'} ({course?.course_code || 'CODE'})</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p>Date: <span className="font-semibold">{exam.date}</span></p>
                    <p>Max Marks: <span className="font-semibold">{exam.max_marks}</span> (Pass: {exam.passing_marks || 40})</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Status: {exam.status || 'SCHEDULED'}
                  </span>
                </div>
              </div>
            );
          })}
          {exams.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No Exams Scheduled</p>
              <p className="text-xs mt-1">Create an examination to begin entering student grades</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Student</th>
                  <th className="pb-3">Course / Exam</th>
                  <th className="pb-3">Marks</th>
                  <th className="pb-3">Percentage</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {uniqueDocs(results).map((r, idx) => {
                  const s = students.find(stud => stud.id === r.student_id);
                  const exam = exams.find(e => e.id === r.exam_id);
                  const marks = r.marks_obtained ?? r.marks ?? 0;
                  const maxMarks = r.max_marks ?? exam?.max_marks ?? 100;
                  const percentage = r.percentage ?? Math.round((marks / maxMarks) * 100);

                  return (
                    <tr key={r.id || (r as any).result_id || `res-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{s?.name || r.student_name || r.student_id}</p>
                        <p className="text-xs text-slate-400 font-mono">{s?.registrationNumber || r.student_id}</p>
                      </td>
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                        {exam?.name || 'Exam'}
                      </td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        {marks} / {maxMarks}
                      </td>
                      <td className="py-3 text-xs font-semibold">
                        {percentage}%
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                          {r.grade || (percentage >= 80 ? 'A+' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          (r.status === 'PASS' || percentage >= 40)
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {r.status || (percentage >= 40 ? 'PASS' : 'FAIL')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {results.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-semibold">No Published Results Found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Examination</h2>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Term Exam 2025"
                  value={newExam.name}
                  onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                <select
                  required
                  value={newExam.course_id}
                  onChange={(e) => setNewExam({ ...newExam, course_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                  <select
                    value={newExam.exam_type}
                    onChange={(e) => setNewExam({ ...newExam, exam_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  >
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Lab Assessment">Lab Assessment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newExam.date}
                    onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newExam.max_marks}
                    onChange={(e) => setNewExam({ ...newExam, max_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    value={newExam.passing_marks}
                    onChange={(e) => setNewExam({ ...newExam, passing_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newExam.name || !newExam.course_id}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResults;
