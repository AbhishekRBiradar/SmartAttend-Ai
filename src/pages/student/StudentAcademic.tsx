import React from 'react';
import { Building2, GraduationCap, Calendar, Layers, Hash, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';

const StudentAcademic = () => {
  const { user } = useAuth();
  const { students } = useData();
  const { departments } = useAcademic();

  const currentStudent = students.find(s => 
    s.id === user?.user_id || 
    s.user_id === user?.user_id || 
    Boolean(s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase())
  ) || students[0];

  const dept = departments.find(d => d.id === currentStudent?.department_id || d.name === currentStudent?.department);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          Academic Information & Program Details
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review institutional program structure, degree progression, and department contact
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" /> Department & Program
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-900 dark:text-white">{dept?.name || currentStudent?.department || 'Computer Science & Engineering'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Degree Program</span>
              <span className="font-semibold text-slate-900 dark:text-white">Bachelor of Technology (B.Tech)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Batch / Academic Year</span>
              <span className="font-semibold text-slate-900 dark:text-white">2023 - 2027</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Current Semester</span>
              <span className="font-semibold text-slate-900 dark:text-white">Semester 4 (Spring 2025)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Section</span>
              <span className="font-semibold text-slate-900 dark:text-white">Section A</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Academic Standing & Status
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Enrollment Status</span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ACTIVE REGULAR
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Earned Credits</span>
              <span className="font-semibold text-slate-900 dark:text-white">74 / 160 Required</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Face Recognition Verification</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Biometric Profile Enrolled</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Attendance Threshold</span>
              <span className="font-semibold text-slate-900 dark:text-white">&gt; 75% Minimum Mandatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAcademic;
