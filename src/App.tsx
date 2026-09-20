import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AcademicProvider } from './context/AcademicContext';
import { ThemeProvider } from './context/ThemeContext';
import BackgroundCameraService from "./components/BackgroundCameraService";
import { RulesHelperModal } from './components/RulesHelperModal';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

import AdminLayout from './components/layout/AdminLayout';
import TeacherLayout from './components/layout/TeacherLayout';
import StudentLayout from './components/layout/StudentLayout';

import Dashboard from './pages/admin/Dashboard';
import LiveCamera from './pages/admin/LiveCamera';
import Students from './pages/admin/Students';
import StudentProfile from './pages/admin/StudentProfile';
import Attendance from './pages/admin/Attendance';
import EntryCount from './pages/admin/EntryCount';
import UnknownPersons from './pages/admin/UnknownPersons';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Users from './pages/admin/Users';
import Courses from './pages/admin/Courses';
import CourseOfferings from './pages/admin/CourseOfferings';
import Enrollments from './pages/admin/Enrollments';
import DeletedRecords from './pages/admin/DeletedRecords';
import AdminResults from './pages/admin/AdminResults';
import AcademicStructure from './pages/admin/AcademicStructure';
import AdminTimetable from './pages/admin/AdminTimetable';
import DataMigration from './pages/admin/DataMigration';
import SystemIntegrationTest from './pages/admin/SystemIntegrationTest';
import NotificationCenterPage from './pages/common/NotificationCenterPage';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherStudentProfile from './pages/teacher/StudentProfile';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherResults from './pages/teacher/TeacherResults';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import ActiveSession from './pages/teacher/ActiveSession';
import TeacherProfile from './pages/teacher/TeacherProfile';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentViewProfile from './pages/student/StudentProfile';
import StudentCourses from './pages/student/StudentCourses';
import StudentResults from './pages/student/StudentResults';
import StudentAcademic from './pages/student/StudentAcademic';
import StudentTimetable from './pages/student/StudentTimetable';

const ProtectedRoute = ({ children, allowedRoles, allowedRole }: { children: React.ReactNode, allowedRoles?: string[], allowedRole?: string }) => {
  const { isAuthenticated, user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const roles = allowedRoles || (allowedRole ? [allowedRole] : []);
  
  const userRole = user?.role || '';
  
  const hasAccess = roles.length === 0 || roles.includes(userRole);
  
  if (!hasAccess) {
    const redirectPath = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'DEPARTMENT_ADMIN') 
      ? '/admin/dashboard' 
      : (userRole === 'TEACHER') 
        ? '/teacher/dashboard' 
        : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  useEffect(() => {
    const handleRulesError = () => setShowRulesModal(true);
    window.addEventListener('firebase-rules-error', handleRulesError);
    return () => window.removeEventListener('firebase-rules-error', handleRulesError);
  }, []);
  return (
    <ThemeProvider>
    <AuthProvider>
      <AcademicProvider>
      <DataProvider>
        <Router>
          <BackgroundCameraService />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Admin & Department Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="camera" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN']}>
                  <LiveCamera />
                </ProtectedRoute>
              } />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="users" element={<Users />} />
              <Route path="courses" element={<Courses />} />
              <Route path="course-offerings" element={<CourseOfferings />} />
              <Route path="enrollments" element={<Enrollments />} />
              <Route path="timetable" element={<AdminTimetable />} />
              <Route path="academic-structure" element={<AcademicStructure />} />
              <Route path="migration" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <DataMigration />
                </ProtectedRoute>
              } />
              <Route path="integration-test" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SystemIntegrationTest />
                </ProtectedRoute>
              } />
              <Route path="results" element={<AdminResults />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="entry-count" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <EntryCount />
                </ProtectedRoute>
              } />
              <Route path="unknown" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <UnknownPersons />
                </ProtectedRoute>
              } />
              <Route path="reports" element={<Reports />} />
              <Route path="deleted-records" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <DeletedRecords />
                </ProtectedRoute>
              } />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<NotificationCenterPage />} />
            </Route>

            {/* Teacher Routes */}
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['TEACHER']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="timetable" element={<TeacherTimetable />} />
              <Route path="active-session" element={<ActiveSession />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="students/:id" element={<TeacherStudentProfile />} />
              <Route path="courses" element={<TeacherCourses />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="results" element={<TeacherResults />} />
              <Route path="profile" element={<TeacherProfile />} />
              <Route path="profile/:id" element={<TeacherProfile />} />
              <Route path="notifications" element={<NotificationCenterPage />} />
            </Route>

            {/* Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="timetable" element={<StudentTimetable />} />
              <Route path="profile" element={<StudentViewProfile />} />
              <Route path="profile/:id" element={<StudentViewProfile />} />
              <Route path="academic" element={<StudentAcademic />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="results" element={<StudentResults />} />
              <Route path="notifications" element={<NotificationCenterPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </DataProvider>
      </AcademicProvider>
      <RulesHelperModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
