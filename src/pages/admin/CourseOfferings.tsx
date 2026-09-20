import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit, BookOpen, User, Calendar, Layers, Hash } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { CourseOffering } from '../../types';

const CourseOfferings = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const { courseOfferings, courses, teachers, addCourseOffering, deleteCourseOffering } = useData();
  const { departments, semesters, sections, academicYears } = useAcademic();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOffering, setNewOffering] = useState<Partial<CourseOffering>>({
    course_id: '',
    department_id: isDept ? myDept || '' : '',
    teacher_id: '',
    semester_id: '',
    section_id: '',
    academic_year_id: ''
  });

  const filteredOfferings = courseOfferings.filter(o => {
    if (isDept && o.department_id !== myDept) return false;
    const course = courses.find(c => c.id === o.course_id);
    const teacher = teachers.find(t => t.id === o.teacher_id);
    const q = searchTerm.toLowerCase();
    return (
      (course?.course_name || '').toLowerCase().includes(q) ||
      (course?.course_code || '').toLowerCase().includes(q) ||
      (teacher?.name || '').toLowerCase().includes(q)
    );
  });

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffering.course_id || !newOffering.teacher_id) return;

    const course = courses.find(c => c.id === newOffering.course_id);
    const teacher = teachers.find(t => t.id === newOffering.teacher_id);

    await addCourseOffering({
      course_id: newOffering.course_id,
      course_name: course?.course_name,
      course_code: course?.course_code,
      department_id: newOffering.department_id || course?.department_id || 'dept-cse',
      teacher_id: newOffering.teacher_id,
      teacher_name: teacher?.name,
      semester_id: newOffering.semester_id,
      section_id: newOffering.section_id,
      academic_year_id: newOffering.academic_year_id,
      status: 'ACTIVE'
    });

    setIsModalOpen(false);
    setNewOffering({
      course_id: '',
      department_id: isDept ? myDept || '' : '',
      teacher_id: '',
      semester_id: '',
      section_id: '',
      academic_year_id: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Course Offerings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign courses to faculty members, semesters, and sections
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Create Course Offering
        </button>
      </div>

      <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search offerings by course code, title, or instructor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOfferings.map((offering) => {
            const course = courses.find(c => c.id === offering.course_id);
            const teacher = teachers.find(t => t.id === offering.teacher_id);
            const dept = departments.find(d => d.id === (offering.department_id || course?.department_id));

            return (
              <div
                key={offering.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      {offering.course_code || course?.course_code || 'CODE'}
                    </span>
                    <button
                      onClick={() => deleteCourseOffering && deleteCourseOffering(offering.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete offering"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1 mb-1">
                    {offering.course_name || course?.course_name || 'Course Name'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {dept?.name || offering.department_id || 'Engineering'}
                  </p>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{offering.teacher_name || teacher?.name || 'Assigned Faculty'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Semester: {offering.semester_id || 'Standard'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>Section: {offering.section_id || 'Section A'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Offering
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredOfferings.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No Course Offerings Found</p>
            <p className="text-xs mt-1">Create an offering to assign instructors to course sections</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Course Offering</h2>
            <form onSubmit={handleCreateOffering} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                <select
                  required
                  value={newOffering.course_id}
                  onChange={(e) => setNewOffering({ ...newOffering, course_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Faculty / Instructor</label>
                <select
                  required
                  value={newOffering.teacher_id}
                  onChange={(e) => setNewOffering({ ...newOffering, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.department || 'Faculty'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                  <select
                    value={newOffering.semester_id}
                    onChange={(e) => setNewOffering({ ...newOffering, semester_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  >
                    <option value="">Select</option>
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section</label>
                  <select
                    value={newOffering.section_id}
                    onChange={(e) => setNewOffering({ ...newOffering, section_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
                  >
                    <option value="">Select</option>
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  Create Offering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseOfferings;
