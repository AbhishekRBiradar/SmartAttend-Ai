import { Student } from '../../types';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { User, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../../utils/dateUtils';

const StudentProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, attendances, settings } = useData();
  const { departments, programs, academicYears, semesters, sections } = useAcademic();

  const student = students.find(s => s.id === id);

  const studentLogs = attendances.filter(att => att.student_id === id).sort((a, b) => new Date(b.date || b.timestamp).getTime() - new Date(a.date || a.timestamp).getTime());

  // Group logs by date for day-wise attendance
  const dayWiseAttendance = React.useMemo(() => {
    const grouped: Record<string, { date: string, status: string, periods: number, present: number }> = {};
    studentLogs.forEach(log => {
      if (!grouped[log.date]) {
        grouped[log.date] = { date: log.date, status: 'PRESENT', periods: 0, present: 0 };
      }
      grouped[log.date].periods += 1;
      if (log.status === 'PRESENT') {
        grouped[log.date].present += 1;
      } else if (log.status === 'LATE') {
        grouped[log.date].present += 1;
        if (grouped[log.date].status === 'PRESENT') {
          grouped[log.date].status = 'LATE';
        }
      } else if (log.status === 'ABSENT') {
        grouped[log.date].status = 'ABSENT';
      }
    });
    return Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentLogs]);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <p>Student profile not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white dark:text-white">{student.name}'s Profile</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">View student's personal information and academic details.</p>
        </div>
      </div>

      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
          
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg">
                {student.profilePic ? (
                  <img 
                    src={student.profilePic} 
                    alt={student.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[150px]">
              Profile picture is managed by the administrator.
            </p>
          </div>

          {/* Student Details Section */}
          <div className="flex-1 space-y-8 w-full">
            
            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-medium">
                    {student.firstName || student.name} {student.middleName} {student.lastName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Date of Birth</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.dateOfBirth ? formatDate(student.dateOfBirth) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Gender</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.gender || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Blood Group</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.bloodGroup || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Religion</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.religion || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Caste Name</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.casteName || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Caste Category</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.casteCategory || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Registration Number</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-mono">
                    {student.registrationNumber || student.id}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">USN</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-mono">
                    {student.usn || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Mode of Admission</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.modeOfAdmission || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Date of Admission</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.dateOfAdmission ? formatDate(student.dateOfAdmission) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Academic Year</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {academicYears.find(y => y.id === student.current_academic_year_id)?.year_name || student.academicYear || student.year || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Program / Course</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {programs.find(p => p.id === student.program_id)?.program_name || departments.find(d => d.id === student.department_id)?.department_name || student.courseAdopted || student.department || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Family Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Contact & Family Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Email ID</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Phone Number</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.phone || 'N/A'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Address</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.address || 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-500/20 dark:border-slate-700">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 uppercase tracking-wider">Mother's Details</label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Name:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.motherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Contact:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.motherContact || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-500/20 dark:border-slate-700">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 uppercase tracking-wider">Father's Details</label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Name:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.fatherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Contact:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.fatherContact || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Attendance Section */}
      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-500/10 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white">Day-wise Attendance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm border-b border-slate-500/10 dark:border-slate-800">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Periods Attended</th>
                <th className="px-6 py-4 font-medium">Overall Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayWiseAttendance.map((day, idx) => (
                <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-white dark:text-slate-300 font-medium">{day.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{day.present} / {day.periods}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      day.status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                      day.status === 'Late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {day.status}
                    </span>
                  </td>
                </tr>
              ))}
              {dayWiseAttendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No day-wise attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-500/10 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white">Period-wise Attendance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm border-b border-slate-500/10 dark:border-slate-800">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Subject / Offering</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-white dark:text-slate-300 font-medium">{log.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{log.course_offering_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '09:00'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{log.recognition_method || 'FACE_RECOGNITION'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                      log.status === 'LATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {studentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
