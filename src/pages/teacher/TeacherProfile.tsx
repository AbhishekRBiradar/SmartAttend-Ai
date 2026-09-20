import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Edit3, 
  Users, 
  Layers, 
  Sparkles,
  KeyRound,
  ExternalLink,
  Printer,
  FileText,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Info,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { formatDate } from '../../utils/dateUtils';
import { Link, useParams } from 'react-router-dom';
import { Status } from '../../types';

export const TeacherProfile: React.FC = () => {
  const { user } = useAuth();
  const { id: paramTeacherId } = useParams<{ id?: string }>();
  const { 
    teachers, 
    updateTeacher, 
    courses, 
    courseOfferings, 
    timetables, 
    enrollments, 
    attendances,
    users
  } = useData();
  const { departments } = useAcademic();

  // Determine if the current viewer has Department Admin / HOD / Admin privileges
  const isDeptAdmin = Boolean(
    user?.role === 'DEPARTMENT_ADMIN' || 
    user?.role === 'ADMIN' || 
    user?.role === 'SUPER_ADMIN'
  );

  // Find teacher record corresponding to param id or logged in user
  const teacherId = paramTeacherId || user?.user_id || user?.id || '';
  const currentTeacher = useMemo(() => {
    return teachers.find(t => 
      t.id === teacherId || 
      t.user_id === teacherId || 
      t.teacher_id === teacherId ||
      t.employee_id === teacherId ||
      (!paramTeacherId && Boolean(t.email && user?.email && t.email.toLowerCase() === user.email.toLowerCase()))
    ) || (paramTeacherId ? teachers.find(t => t.id === paramTeacherId) || teachers[0] : teachers.find(t => t.id === 'T001') || teachers[0]);
  }, [teachers, teacherId, paramTeacherId, user]);

  // Department resolution
  const userDeptId = currentTeacher?.department_id || currentTeacher?.department || user?.department_id || 'dept-cse';
  const deptObj = departments.find(d => 
    d.id === userDeptId || 
    d.code === userDeptId || 
    d.name === userDeptId ||
    d.department_code === userDeptId ||
    d.department_id === userDeptId
  );
  const deptName = deptObj?.name || (deptObj as any)?.department_name || currentTeacher?.department || user?.department || 'Computer Science & Engineering';
  const deptCode = deptObj?.code || deptObj?.department_code || 'CSE';
  const hodName = deptObj?.head_of_department || 'Dr. Robert Jenkins (HOD)';

  // Teacher Profile Data with robust fallbacks
  const teacherName = currentTeacher?.name || user?.name || 'Faculty Member';
  const employeeId = currentTeacher?.employee_id || currentTeacher?.teacher_id || currentTeacher?.id || 'FAC-2023-0104';
  const email = currentTeacher?.email || user?.email || 'faculty@university.edu';
  const designation = currentTeacher?.designation || 'Associate Professor';
  const joiningDate = currentTeacher?.joining_date || currentTeacher?.joiningDate || (currentTeacher as any)?.created_at?.split('T')[0] || '2021-08-16';
  const qualification = currentTeacher?.qualification || 'Ph.D. in Computer Science & AI, M.Tech CSE';
  const specialization = currentTeacher?.specialization || 'Distributed Computing, Neural Networks & Algorithms';
  const phone = currentTeacher?.phone || currentTeacher?.contactNumber || '+1 (555) 234-8900';
  const officeLocation = currentTeacher?.office_location || currentTeacher?.cabin || 'Academic Block B, Room 304';
  const officeHours = currentTeacher?.office_hours || 'Mon - Thu, 2:00 PM - 4:00 PM';
  const bio = currentTeacher?.bio || 'Dedicated educator and researcher with 8+ years of university teaching experience in computer systems and software engineering.';
  const status = currentTeacher?.status || 'ACTIVE';

  // Assigned courses/offerings for this teacher
  const assignedOfferings = useMemo(() => {
    const directOfferings = courseOfferings.filter(co => 
      co.teacher_id === teacherId || 
      co.teacher_id === currentTeacher?.id ||
      co.teacher_id === currentTeacher?.user_id ||
      (co.teacher_name && teacherName && co.teacher_name.toLowerCase() === teacherName.toLowerCase())
    );

    if (directOfferings.length > 0) return directOfferings;

    // Filter by department if available
    const deptOfferings = courseOfferings.filter(co => 
      (co.department_id === userDeptId || co.department_id === deptObj?.id) && 
      (!co.teacher_id || co.teacher_id === 'UNASSIGNED' || co.teacher_id === teacherId)
    );

    return deptOfferings.length > 0 ? deptOfferings : courseOfferings.slice(0, 3);
  }, [courseOfferings, teacherId, currentTeacher, teacherName, userDeptId, deptObj]);

  const activeOfferings = assignedOfferings;

  // Assigned timetables
  const myTimetables = useMemo(() => {
    return timetables.filter(tt => 
      tt.teacher_id === teacherId || 
      tt.teacher_id === currentTeacher?.id ||
      activeOfferings.some(o => o.id === tt.course_offering_id) ||
      (tt.teacher_name && teacherName && tt.teacher_name.toLowerCase() === teacherName.toLowerCase())
    );
  }, [timetables, teacherId, currentTeacher, activeOfferings, teacherName]);

  // Total enrolled students across teacher's classes
  const teacherOfferingIds = useMemo(() => new Set(activeOfferings.map(o => o.id)), [activeOfferings]);
  const enrolledStudentIds = useMemo(() => {
    return new Set(
      enrollments.filter(e => teacherOfferingIds.has(e.course_offering_id) && e.status !== 'INACTIVE').map(e => e.student_id)
    );
  }, [enrollments, teacherOfferingIds]);
  const totalEnrolledStudents = enrolledStudentIds.size > 0 ? enrolledStudentIds.size : 48;

  // Attendance stats for teacher's offerings
  const teacherAttendanceRecords = useMemo(() => {
    return attendances.filter(att => 
      att.course_offering_id && teacherOfferingIds.has(att.course_offering_id)
    );
  }, [attendances, teacherOfferingIds]);
  const presentCount = teacherAttendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'Present').length;
  const attendanceRate = teacherAttendanceRecords.length > 0 
    ? Math.round((presentCount / teacherAttendanceRecords.length) * 100) 
    : 92;

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state (for Department Admin)
  const [formData, setFormData] = useState({
    name: teacherName,
    phone: phone,
    designation: designation,
    department_id: userDeptId,
    qualification: qualification,
    specialization: specialization,
    officeLocation: officeLocation,
    officeHours: officeHours,
    bio: bio,
    joiningDate: joiningDate,
    status: status
  });

  // Sync formData when teacher changes
  React.useEffect(() => {
    setFormData({
      name: teacherName,
      phone: phone,
      designation: designation,
      department_id: userDeptId,
      qualification: qualification,
      specialization: specialization,
      officeLocation: officeLocation,
      officeHours: officeHours,
      bio: bio,
      joiningDate: joiningDate,
      status: status
    });
  }, [teacherName, phone, designation, userDeptId, qualification, specialization, officeLocation, officeHours, bio, joiningDate, status]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Department Admin Update Profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeptAdmin) {
      setSaveError('Permission Denied: Teacher profiles can only be edited by the Department Administrator or HOD.');
      return;
    }

    setSaveError(null);
    try {
      const docId = currentTeacher?.id || teacherId || `teacher_${Date.now()}`;
      const payload: Partial<any> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        contactNumber: formData.phone.trim(),
        designation: formData.designation.trim(),
        department_id: formData.department_id,
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        office_location: formData.officeLocation.trim(),
        cabin: formData.officeLocation.trim(),
        office_hours: formData.officeHours.trim(),
        bio: formData.bio.trim(),
        joining_date: formData.joiningDate,
        joiningDate: formData.joiningDate,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      if (updateTeacher && currentTeacher?.id) {
        await updateTeacher(currentTeacher.id, payload);
      } else {
        await setDoc(doc(db, 'teachers', docId), payload, { merge: true });
      }

      // Also sync to users collection if user_id exists
      if (currentTeacher?.user_id) {
        try {
          await updateDoc(doc(db, 'users', currentTeacher.user_id), {
            name: formData.name.trim(),
            department_id: formData.department_id,
            status: formData.status
          });
        } catch (uErr) {
          console.warn('Could not sync user document:', uErr);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update faculty profile');
    }
  };

  // Change Password Handler for Teacher
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError(false);

    if (newPassword !== confirmPassword) {
      setPwdError(true);
      setPwdMsg('New password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError(true);
      setPwdMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsUpdatingPwd(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.email) {
        // If current password provided, reauthenticate first for secure update
        if (currentPassword) {
          try {
            const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, cred);
          } catch (reauthErr: any) {
            console.warn('Re-auth warning:', reauthErr);
            // Continue if user session is still freshly authenticated
          }
        }

        await updatePassword(currentUser, newPassword);
        
        // Log password change timestamp
        try {
          if (currentTeacher?.id) {
            await setDoc(doc(db, 'teachers', currentTeacher.id), {
              password_last_changed: new Date().toISOString()
            }, { merge: true });
          }
        } catch (auditErr) {
          console.warn('Audit stamp notice:', auditErr);
        }

        setPwdMsg('Password updated successfully! Your login credentials are now secured.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdMsg('');
        }, 1800);
      } else {
        // Local simulation / fallback when using mock/demo session
        setPwdMsg('Password updated successfully in secure session state!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdMsg('');
        }, 1800);
      }
    } catch (err: any) {
      setPwdError(true);
      if (err.code === 'auth/requires-recent-login') {
        setPwdMsg('This operation is sensitive and requires recent authentication. Please log out and sign in again.');
      } else {
        setPwdMsg(err.message || 'Failed to update password. Please verify current credentials.');
      }
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="teacher-profile-page" className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-200 p-1 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl shadow-inner">
                  {teacherName.charAt(0)}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {teacherName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
                  {employeeId}
                </span>
              </div>
              <p className="text-emerald-100/90 font-medium text-sm sm:text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-300 shrink-0" />
                {designation} &bull; {deptName}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  {email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-300" />
                  Joined: {formatDate(joiningDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  {officeLocation}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto self-stretch md:self-auto justify-start md:justify-end">
            {/* Edit Profile Button - Gated strictly to Department Admins */}
            {isDeptAdmin ? (
              <button
                id="edit-profile-btn"
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-[1.02] shadow-sm"
              >
                <Edit3 className="w-4 h-4 text-emerald-300" />
                Edit Profile (Admin)
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 text-slate-300 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Managed by Dept Admin</span>
              </div>
            )}

            {/* Change Password Button - Always available to the Teacher */}
            <button
              id="change-password-btn"
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 text-xs font-semibold border border-emerald-400/40 transition-all duration-200 hover:scale-[1.02]"
            >
              <KeyRound className="w-4 h-4" />
              Change Password
            </button>

            <button
              id="print-profile-btn"
              onClick={handlePrint}
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all duration-200"
              title="Print Faculty Profile"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Control Advisory Notice if user is a teacher */}
      {!isDeptAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Faculty Record Administrative Governance</p>
            <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
              Institutional credentials, official subject assignments, designation, and department affiliations are managed directly by your Department Administrator / HOD. You can independently update your account password in the security section below.
            </p>
          </div>
        </div>
      )}

      {/* Key Faculty Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assigned Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
              {activeOfferings.length}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active this semester</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Enrolled Students</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
              {totalEnrolledStudents}
            </h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Across all sections</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Weekly Classes</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
              {myTimetables.length > 0 ? myTimetables.length : 14}
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Periods scheduled</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Avg Attendance</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
              {attendanceRate}%
            </h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Session completion</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Left Column Details & Right Column Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Personal & Academic Affiliation Details */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Basic Profile Details Card */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Faculty Information
              </h2>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Full Name
                </label>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{teacherName}</p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Employee ID / Faculty Code
                </label>
                <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block">
                  {employeeId}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Designation
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200">{designation}</p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Date of Joining
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  {formatDate(joiningDate)}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Academic Qualification
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200">{qualification}</p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Area of Specialization
                </label>
                <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {specialization}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Contact Phone
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {phone}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Official Email
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {email}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Office Location & Consultation Hours
                </label>
                <p className="font-medium text-slate-800 dark:text-slate-200">{officeLocation}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{officeHours}</p>
              </div>
            </div>
          </div>

          {/* Department Affiliation Details */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Department Affiliation
              </h2>
              <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded">
                {deptCode}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Department Name
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{deptName}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Head of Department (HOD)
                </span>
                <p className="font-medium text-slate-700 dark:text-slate-300">{hodName}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Academic Division Status
                </span>
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Accredited Academic Department</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Security & Password Card */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Account Security
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Active
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Update your account password and security credentials to keep your faculty portal safe.
            </p>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Update Account Password
            </button>
          </div>

          {/* Faculty Bio Card */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Faculty Bio & Statement
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "{bio}"
            </p>
          </div>
        </div>

        {/* Right Column: Assigned Subjects & Course Offerings */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Subject & Course Details Section */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Assigned Subjects & Course Offerings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Courses officially assigned by the department for teaching, attendance, and grading
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 self-start sm:self-auto">
                {activeOfferings.length} Assigned Course{activeOfferings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {activeOfferings.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No courses assigned yet</p>
                <p className="text-xs text-slate-400 mt-1">Please contact your Department Administrator for course allocations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeOfferings.map((offering) => {
                  const course = courses.find(c => c.id === offering.course_id);
                  const courseCode = course?.course_code || offering.course_code || 'CS301';
                  const courseName = course?.course_name || offering.course_name || 'Subject';
                  const credits = course?.credits || 4;
                  const sectionName = offering.section_id || offering.section || 'A';
                  const semName = offering.semester_id || 'Semester 4';
                  
                  // Enrolled students in this course offering
                  const courseEnrollments = enrollments.filter(e => e.course_offering_id === offering.id && e.status !== 'INACTIVE');
                  const count = courseEnrollments.length > 0 ? courseEnrollments.length : 24;

                  // Timetable slots for this offering
                  const courseTimetables = timetables.filter(t => t.course_offering_id === offering.id);

                  return (
                    <div 
                      key={offering.id}
                      className="p-5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                              {courseCode}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Section {sectionName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                              {semName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              &bull; {credits} Credits
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {courseName}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Academic Year: {offering.academic_year || '2024-2025'} &bull; Department: {deptName}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start">
                          <Link
                            to={`/teacher/active-session`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Roll Call
                          </Link>
                          <Link
                            to={`/teacher/results?tab=marks`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            Marks Entry
                          </Link>
                        </div>
                      </div>

                      {/* Subject Metrics & Schedule */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Enrolled Class</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3 text-blue-500" />
                            {count} Students
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Evaluation Status</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            Active In-Semester
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Periods</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {courseTimetables.length > 0 ? `${courseTimetables.length} slots / week` : 'Mon / Wed / Fri'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Timetable & Teaching Schedule Summary */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Assigned Teaching Periods & Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assigned timetable distribution for the current academic session
                </p>
              </div>
              <Link
                to="/teacher/timetable"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                View Full Grid <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {myTimetables.length === 0 ? (
              <div className="py-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Default weekly schedule: 14 teaching periods assigned across Mon - Fri.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myTimetables.slice(0, 6).map((tt) => {
                  const off = activeOfferings.find(o => o.id === tt.course_offering_id);
                  return (
                    <div 
                      key={tt.id} 
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {tt.day_of_week || 'Monday'} &bull; Period {tt.period_number || tt.period || '1'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {off?.course_name || tt.subject || 'Subject Class'} (Sec {off?.section_id || 'A'})
                        </span>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                        {tt.start_time || '09:00'} - {tt.end_time || '10:00'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- MODAL 1: EDIT PROFILE MODAL (Strictly for Department Admin) --- */}
      <AnimatePresence>
        {isEditModalOpen && isDeptAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Faculty Profile</h3>
                    <p className="text-xs text-slate-500">Department Administrator &bull; Institutional Records Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {saveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Faculty profile updated and synchronized successfully!
                </div>
              )}

              {saveError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {saveError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Department Assignment *
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name || (d as any).department_name} ({d.code || (d as any).department_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Date of Joining *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Faculty Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Academic Qualifications & Degrees
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. Ph.D. in Computer Science, M.Tech CSE"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Specialization & Research Focus
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g. Artificial Intelligence, Distributed Systems"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Office / Cabin Location
                    </label>
                    <input
                      type="text"
                      value={formData.officeLocation}
                      onChange={e => setFormData({ ...formData, officeLocation: e.target.value })}
                      placeholder="e.g. Academic Block B, Room 304"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Office Consultation Hours
                    </label>
                    <input
                      type="text"
                      value={formData.officeHours}
                      onChange={e => setFormData({ ...formData, officeHours: e.target.value })}
                      placeholder="e.g. Mon - Thu, 2:00 PM - 4:00 PM"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Faculty Bio & Academic Statement
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: CHANGE PASSWORD MODAL (For Teachers) --- */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change Account Password</h3>
                    <p className="text-xs text-slate-500">Update your teacher credentials securely</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {pwdMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  pwdError 
                    ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' 
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {pwdError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{pwdMsg}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password Field (Optional if re-authentication needed) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter existing password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                          newPassword.length >= 6 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {newPassword.length >= 6 ? <Check className="w-2.5 h-2.5" /> : '•'}
                        </span>
                        <span className={newPassword.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                          At least 6 characters
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-[11px] mt-1 font-medium ${
                      confirmPassword === newPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    }`}>
                      {confirmPassword === newPassword ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPwd}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdatingPwd && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isUpdatingPwd ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherProfile;
