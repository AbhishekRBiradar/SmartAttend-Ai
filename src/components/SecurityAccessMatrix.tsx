import React from 'react';
import { ShieldCheck, Check, X, Lock } from 'lucide-react';
import { Role } from '../types';

export const SecurityAccessMatrix: React.FC = () => {
  const roles: { role: Role; title: string; color: string }[] = [
    { role: 'SUPER_ADMIN', title: 'Super Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    { role: 'ADMIN', title: 'Institution Admin', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
    { role: 'DEPARTMENT_ADMIN', title: 'Dept Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    { role: 'TEACHER', title: 'Faculty / Teacher', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { role: 'STUDENT', title: 'Student', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ];

  const permissions = [
    { name: 'Live Camera Face Recognition', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
    { name: 'View All Department Records', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { name: 'Department Scoped Records', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'] },
    { name: 'Enroll & Train Faces', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'] },
    { name: 'Manage Academic Structure', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'] },
    { name: 'Take Class Attendance', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
    { name: 'Input & Publish Grades', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
    { name: 'View Personal Attendance & Marks', roles: ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT'] },
    { name: 'System Settings & Audit Logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { name: 'Data Migration & Backup', roles: ['SUPER_ADMIN'] },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Role-Based Access Control (RBAC) Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforced at Firestore security rules layer and UI presentation layer
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="pb-3 font-semibold text-slate-700 dark:text-slate-300">Feature / Operation</th>
              {roles.map(r => (
                <th key={r.role} className="pb-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.color}`}>
                    {r.title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {permissions.map((perm, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  {perm.name}
                </td>
                {roles.map(r => {
                  const hasAccess = perm.roles.includes(r.role);
                  return (
                    <td key={r.role} className="py-3 text-center">
                      {hasAccess ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SecurityAccessMatrix;
