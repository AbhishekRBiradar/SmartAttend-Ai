import React from 'react';
import { BookOpen, Users, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const TeacherCourses = () => {
  const { user } = useAuth();
  const { courses, courseOfferings, enrollments, students } = useData();

  // Find offerings assigned to this teacher
  const teacherOfferings = courseOfferings.filter(o => 
    o.teacher_id === user?.user_id || 
    (o.teacher_name && user?.name && o.teacher_name.toLowerCase() === user.name.toLowerCase())
  );

  const activeOfferings = teacherOfferings.length > 0 ? teacherOfferings : courseOfferings.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          My Assigned Courses
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Courses, curriculum syllabi, and section rosters assigned for current academic term
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeOfferings.map(offering => {
          const course = courses.find(c => c.id === offering.course_id);
          const enrolledCount = enrollments.filter(e => e.course_offering_id === offering.id).length;

          return (
            <div
              key={offering.id}
              className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    {offering.course_code || course?.course_code || 'CS301'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {course?.credits || 4} Credits
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {offering.course_name || course?.course_name || 'Operating Systems'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                  {course?.description || 'Advanced concepts in computing, architectures, process management, and algorithms.'}
                </p>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{enrolledCount || 45} Students Enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Section {offering.section_id || 'A'} • Semester {offering.semester_id || '4'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <Link
                  to={`/teacher/active-session?offeringId=${offering.id}`}
                  className="flex-1 py-2 text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  Mark Attendance
                </Link>
                <Link
                  to={`/teacher/results?offeringId=${offering.id}&tab=marks`}
                  className="px-3 py-2 text-center text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                >
                  Marks
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherCourses;
