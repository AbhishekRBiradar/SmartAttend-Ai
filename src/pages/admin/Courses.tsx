import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, BookOpen, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { Status } from '../../types';

const Courses = () => {
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id;
  const { courses, teachers, addCourse, updateCourse, deleteCourse, addCourseOffering } = useData();
  const { departments } = useAcademic();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState<any>({ course_code: '', course_name: '', department_id: isDept ? (myDept || '') : '', program_id: '', course_type: '', credits: 3, teacher_id: '' });
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const filteredCourses = courses.filter(c => (isDept ? c.department_id === myDept : true)).filter(c => {
    const term = (searchTerm || '').toLowerCase();
    return (
      (c.course_name || '').toLowerCase().includes(term) ||
      (c.course_code || '').toLowerCase().includes(term) ||
      (c.department_id || '').toLowerCase().includes(term)
    );
  });

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate course code
    const isDuplicate = courses.some(
      c => (c.course_code || '').toLowerCase() === (newCourse.course_code || '').toLowerCase() && c.id !== editingCourseId
    );

    if (isDuplicate) {
      alert(`A course with code ${newCourse.course_code} already exists.`);
      return;
    }

    const courseToSave = { 
      course_code: newCourse.course_code,
      course_name: newCourse.course_name,
      department_id: newCourse.department_id,
      program_id: newCourse.program_id || '',
      course_type: newCourse.course_type || 'Core',
      credits: Number(newCourse.credits) || 3,
      status: 'ACTIVE' as Status
    };
    const editId = editingCourseId;
    const assignedTeacherId = newCourse.teacher_id;
    const courseId = editId || `CRS-${(newCourse.course_code || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '')}`;
    
    setIsModalOpen(false);
    setEditingCourseId(null);
    setNewCourse({ course_code: '', course_name: '', department_id: isDept ? (myDept || '') : '', program_id: '', course_type: '', credits: 3, teacher_id: '' });

    try {
      if (editId) {
        await updateCourse(editId, courseToSave);
      } else {
        await addCourse({ ...courseToSave, id: courseId, course_id: courseId } as any);
      }

      if (assignedTeacherId) {
        await addCourseOffering({
          course_id: courseId,
          teacher_id: assignedTeacherId,
          department_id: newCourse.department_id,
          program_id: newCourse.program_id || '',
          batch_id: '',
          academic_year_id: '',
          semester_id: '',
          section_id: '',
          status: 'ACTIVE' as Status
        });
      }
    } catch (err) {
      console.error("Error saving course:", err);
    }
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setNewCourse({ course_code: '', course_name: '', department_id: isDept ? (myDept || '') : '', program_id: '', course_type: '', credits: 3, teacher_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourseId(course.id);
    setNewCourse({ course_code: course.course_code, course_name: course.course_name, department_id: course.department_id, credits: course.credits, teacher_id: course.teacher_id || '' });
    setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
    setCourseToDelete(id);
  };

  const handleBulkDelete = async () => {
    setIsSaving(true);
    try {
      for (const id of selectedCourseIds) {
        await deleteCourse(id);
      }
      setSelectedCourseIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete courses');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (courseToDelete) {
      const idToDelete = courseToDelete;
      setCourseToDelete(null);
      await deleteCourse(idToDelete);
    }
  };

  useEffect(() => {
    const handleCloseAll = () => {
      setIsModalOpen(false);
      setCourseToDelete(null);
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Course Management</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Manage subjects and courses offered.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Course
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-slate-500/10 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by course name, code, or department..." 
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-500/5 dark:bg-slate-800/50 border-b border-slate-500/10 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">
                <th className="p-4">Course Code</th>
                <th className="p-4">Course Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Credits</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course, idx) => (
                <motion.tr 
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="border-b border-slate-500/10 hover:bg-slate-500/5 dark:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4 font-mono text-sm text-indigo-600 font-medium">{course.course_code}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white">{course.course_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{course.department_id}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{course.credits}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(course)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(course.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No courses found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-500/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingCourseId ? 'Edit Course' : 'Add New Course'}</h3>
              </div>
              <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Course Code</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.course_code || ''}
                    onChange={e => setNewCourse({...newCourse, course_code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="e.g. CS101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Course Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.course_name || ''}
                    onChange={e => setNewCourse({...newCourse, course_name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Introduction to Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Department</label>
                  <select 
                    required
                    value={newCourse.department_id || ''}
                    onChange={e => setNewCourse({...newCourse, department_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isDept}
                  >
                    {!isDept ? (
                      <>
                        <option value="" disabled>Select Department</option>
                        {(departments || []).map(d => (
                          <option key={d.id} value={d.id || ''}>{d.department_name}</option>
                        ))}
                      </>
                    ) : (
                      <option value={myDept || ''}>{myDept}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Credits</label>
                  <input 
                    type="number" 
                    min="1"
                    max="6"
                    required
                    value={newCourse.credits || ''}
                    onChange={e => setNewCourse({...newCourse, credits: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Assign Teacher (Optional)</label>
                  <select 
                    value={newCourse.teacher_id || ''}
                    onChange={e => setNewCourse({...newCourse, teacher_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Teacher --</option>
                    {(teachers || []).map(t => (
                      <option key={t.id || t.teacher_id} value={t.id || t.teacher_id}>
                        {t.name} ({t.teacher_id || t.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : (editingCourseId ? 'Update Course' : 'Save Course')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Course?</h3>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this course? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setCourseToDelete(null)}
                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bulk Delete Confirmation */}
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Delete {selectedCourseIds.length} Courses?</h3>
              <p className="text-sm text-slate-500">This action cannot be undone. Are you sure you want to delete the selected courses?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Delete All'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Courses;
