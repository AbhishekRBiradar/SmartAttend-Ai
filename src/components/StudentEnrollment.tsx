import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useAcademic } from '../context/AcademicContext';
import { Search, Plus, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';
import { Student } from '../types';

interface StudentEnrollmentProps {
  student?: Student;
  studentId?: string;
  offeringId?: string;
  courseId?: string;
  onClose?: () => void;
}

export const StudentEnrollment: React.FC<StudentEnrollmentProps> = ({
  student,
  studentId,
  offeringId,
  courseId,
  onClose
}) => {
  const { students, enrollments, addEnrollment, deleteEnrollment, courseOfferings, courses } = useData();
  const { user } = useAuth();
  const { departments } = useAcademic();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;
  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;
  const [searchTerm, setSearchTerm] = useState('');

  const activeStudentId = student?.id || studentId;

  // MODE 1: Student-centric enrollment view (enrolling this student into courses)
  if (activeStudentId) {
    const studentObj = student || students.find(s => s.id === activeStudentId);
    const studentEnrollments = enrollments.filter(e => e.student_id === activeStudentId);
    const enrolledOfferingIds = new Set(studentEnrollments.map(e => e.course_offering_id));

    const filteredOfferings = courseOfferings.filter(off => {
      const q = searchTerm.toLowerCase();
      const c = courses.find(course => course.id === off.course_id);
      const cName = off.course_name || c?.course_name || '';
      const cCode = off.course_code || c?.course_code || '';
      const tName = off.teacher_name || '';
      return cName.toLowerCase().includes(q) || cCode.toLowerCase().includes(q) || tName.toLowerCase().includes(q);
    });

    const handleToggleStudentOffering = async (offering: typeof courseOfferings[0]) => {
      if (enrolledOfferingIds.has(offering.id)) {
        const target = studentEnrollments.find(e => e.course_offering_id === offering.id);
        if (target && deleteEnrollment) {
          await deleteEnrollment(target.id);
        }
      } else {
        if (addEnrollment) {
          await addEnrollment({
            student_id: activeStudentId,
            course_offering_id: offering.id,
            course_id: offering.course_id,
            enrollment_date: new Date().toISOString().split('T')[0],
            status: 'ENROLLED'
          });
        }
      }
    };

    return (
      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Course Enrollments for {studentObj?.name || 'Student'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage assigned course offerings and semester enrollments
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            {studentEnrollments.length} Active Courses
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search offerings by course name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
          {filteredOfferings.map(offering => {
            const course = courses.find(c => c.id === offering.course_id);
            const isEnrolled = enrolledOfferingIds.has(offering.id);
            return (
              <div key={offering.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {course?.course_code ? course.course_code.slice(0, 3) : 'CRS'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {offering.course_name || course?.course_name || 'Course Offering'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {offering.course_code || course?.course_code} • Instructor: {offering.teacher_name || 'Staff'} • Section {offering.section || 'A'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStudentOffering(offering)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 ${
                    isEnrolled
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100'
                  }`}
                >
                  {isEnrolled ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Drop
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Enroll
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MODE 2: Course/Offering centric view
  const targetOffering = courseOfferings.find(o => o.id === offeringId);
  const targetCourse = courses.find(c => c.id === (targetOffering?.course_id || courseId));

  const enrolledStudentIds = new Set(
    enrollments
      .filter(e => e.course_offering_id === offeringId || (courseId && e.course_id === courseId))
      .map(e => e.student_id)
  );

  const filteredStudents = students.filter(s => {
    if (isDept) {
      const studentDept = s.department_id || s.department;
      const isMyDept = studentDept === myDept || 
        studentDept === myDeptId || 
        studentDept === myDeptName || 
        (myDeptObj && (studentDept === myDeptObj.id || studentDept === myDeptObj.department_id || studentDept === myDeptObj.name || (studentDept as any) === (myDeptObj as any).department_name));
      if (!isMyDept) return false;
    }
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q));
  });

  const handleToggleEnrollment = async (st: Student) => {
    if (isDept) {
      const studentDept = st.department_id || st.department;
      const isMyDept = studentDept === myDept || 
        studentDept === myDeptId || 
        studentDept === myDeptName || 
        (myDeptObj && (studentDept === myDeptObj.id || studentDept === myDeptObj.department_id || studentDept === myDeptObj.name || (studentDept as any) === (myDeptObj as any).department_name));
      if (!isMyDept) return;
    }
    if (enrolledStudentIds.has(st.id)) {
      const target = enrollments.find(
        e => e.student_id === st.id && (e.course_offering_id === offeringId || (courseId && e.course_id === courseId))
      );
      if (target && deleteEnrollment) {
        await deleteEnrollment(target.id);
      }
    } else {
      if (addEnrollment) {
        await addEnrollment({
          student_id: st.id,
          course_offering_id: offeringId || '',
          course_id: courseId || targetOffering?.course_id || '',
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'ENROLLED'
        });
      }
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Course Enrollment Manager
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {targetCourse?.course_name ? `${targetCourse.course_name} (${targetCourse.course_code})` : 'Manage Student Enrollments'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
          {enrolledStudentIds.size} Enrolled
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search students by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
        {filteredStudents.map(st => {
          const isEnrolled = enrolledStudentIds.has(st.id);
          return (
            <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  {st.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{st.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{st.id} • {st.department || 'CSE'}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleEnrollment(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 ${
                  isEnrolled
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100'
                }`}
              >
                {isEnrolled ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Drop
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Enroll
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentEnrollment;
