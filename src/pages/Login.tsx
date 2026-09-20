import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, AlertCircle, ExternalLink, ArrowLeft, ShieldCheck, Shield, GraduationCap, BookOpen, Sun, Moon, Eye, EyeOff, Building2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<import('../types').Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, logout, resetPassword, isAuthenticated, user: authUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && authUser) {
      if (authUser.role === 'SUPER_ADMIN' || authUser.role === 'ADMIN' || authUser.role === 'DEPARTMENT_ADMIN') navigate('/admin/dashboard', { replace: true });
      else if (authUser.role === 'TEACHER') navigate('/teacher/dashboard', { replace: true });
      else navigate('/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, authUser, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role')?.toUpperCase();
    if (roleParam) {
      let mappedRole: import('../types').Role | null = null;
      if (roleParam === 'STUDENT') mappedRole = 'STUDENT';
      else if (roleParam === 'TEACHER') mappedRole = 'TEACHER';
      else if (roleParam === 'ADMIN') mappedRole = 'ADMIN';
      else if (roleParam === 'SUPER_ADMIN') mappedRole = 'SUPER_ADMIN';
      else if (roleParam === 'DEPARTMENT_ADMIN' || roleParam === 'DEPT_ADMIN') mappedRole = 'DEPARTMENT_ADMIN';

      if (mappedRole) {
        handleRoleSelect(mappedRole);
        navigate('/login', { replace: true });
      }
    }
  }, [location.search, navigate]);

  const handleRoleSelect = (role: import('../types').Role) => {
    setSelectedRole(role);
    setError('');
    setMessage('');
    
    // Reset reCAPTCHA
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.reset();
      } catch (e) {
        // Ignore if reCAPTCHA script is not loaded
      }
    }
    setRecaptchaToken(null);
    setRecaptchaError(false);
    
    const savedEmail = localStorage.getItem(`rememberedEmail_${role}`);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    } else {
      setEmail('');
      setRememberMe(false);
    }
    
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe && selectedRole) {
        localStorage.setItem(`rememberedEmail_${selectedRole}`, email);
      } else if (selectedRole) {
        localStorage.removeItem(`rememberedEmail_${selectedRole}`);
      }

      const userData = await login(email, password, rememberMe, selectedRole, (selectedRole === 'DEPARTMENT_ADMIN') ? selectedDepartment : undefined);
      
      setIsLoading(false);
      
      // Handle navigation after successful login
      if (userData?.role === 'SUPER_ADMIN' || authUser?.role === 'ADMIN' || userData?.role === 'ADMIN' || userData?.role === 'DEPARTMENT_ADMIN') navigate('/admin/dashboard');
      else if (userData?.role === 'TEACHER') navigate('/teacher/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
        setShowRulesModal(true);
      } else {
        setError(err.message || 'An unexpected error occurred during login. Please try again later.');
      }
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setMessage('Password reset email sent. Please check your inbox.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 transform -skew-y-6 origin-top-left shadow-2xl"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-48 -left-24 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>

      
      {/* Firebase Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowRulesModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Firestore Security Rules Update Required</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  You are getting a <strong>"Missing or insufficient permissions"</strong> error because your custom Firebase project is blocking access. We cannot update your rules automatically. Please follow these steps to fix it:
                </p>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">1</span>
                  Open your Firebase Console:
                </p>
                <a href="https://console.firebase.google.com/project/smartattend-ai-33b1a/firestore/rules" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium text-sm ml-8">
                  Click here to go to Firestore Rules <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">2</span>
                  Delete everything in the editor and replace it with this exact code:
                </p>
                <div className="ml-8 relative">
                  <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-sm overflow-x-auto">
{"rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}"}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">3</span>
                  Click the <strong>Publish</strong> button.
                </p>
                <p className="text-sm text-slate-500 ml-8">Once published, close this window and try logging in again. The error will be gone!</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button onClick={() => setShowRulesModal(false)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                I've updated the rules
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <button 
          onClick={toggleTheme}
          className="p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-110"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <Link to="/" className="flex items-center justify-center gap-3 mb-8 text-white hover:text-indigo-100 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            S
          </div>
          <span className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">SmartAttend</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white drop-shadow-sm">
          {isAuthenticated ? 'Already Signed In' : selectedRole === null ? 'Select Portal' : `Welcome Back`}
        </h2>
        <p className="mt-2 text-center text-sm text-indigo-100 font-medium drop-shadow-sm">
          {isAuthenticated ? `You are currently signed in as ${authUser?.name || 'User'}` : selectedRole === null ? 'Choose your role to continue' : `Sign in to access your ${selectedRole} dashboard`}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="glass-card py-8 px-4 sm:px-10">
          <AnimatePresence mode="wait">
            {isAuthenticated ? (
              <motion.div
                key="authenticated-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl text-center mb-6">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                    You're logged in and ready to go. You can continue to your dashboard or sign out to switch accounts.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'ADMIN' || authUser?.role === 'DEPARTMENT_ADMIN') navigate('/admin/dashboard');
                    else if (authUser?.role === 'TEACHER') navigate('/teacher/dashboard');
                    else navigate('/student/dashboard');
                  }}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 hover:shadow-lg"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    setSelectedRole(null);
                  }}
                  className="w-full flex justify-center py-3 px-4 border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all backdrop-blur-sm"
                >
                  Sign Out
                </button>
              </motion.div>
            ) : !selectedRole ? (
              <motion.div 
                key="role-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <button
                  onClick={() => handleRoleSelect('SUPER_ADMIN')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group text-left shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-indigo-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Super Admin Portal</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage system, users, and settings</p>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSelect('ADMIN')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group text-left shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-sky-500/20">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Admin Portal</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage students, teachers and departments</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('DEPARTMENT_ADMIN')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/50 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group text-left shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-tr from-purple-500 to-purple-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-purple-500/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Department Portal</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage department and faculty</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('TEACHER')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group text-left shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Teacher Portal</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage classes and attendance</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('STUDENT')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/50 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group text-left shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-amber-500/20">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Student Portal</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">View your attendance records</p>
                  </div>
                </button>
              </motion.div>
            ) : isForgotPassword ? (
              <motion.form
                key="forgot-password-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
                onSubmit={handleForgotPassword}
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">Reset Password</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 backdrop-blur-sm"
                    >
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
                    </motion.div>
                  )}
                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-start gap-3"
                    >
                      <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-700">{message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-3 bg-indigo-50/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Demo Login Helper</span>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {selectedRole === 'STUDENT' ? 'student@smartattend.ai' : selectedRole === 'TEACHER' ? 'teacher@smartattend.ai' : selectedRole === 'DEPARTMENT_ADMIN' ? 'deptadmin@smartattend.ai' : selectedRole === 'ADMIN' ? 'admin@smartattend.ai' : 'abhishekrbiradar908a@gmail.com'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRole === 'STUDENT') {
                        setEmail('student@smartattend.ai');
                        setPassword('password123');
                        setSelectedDepartment('Computer Science');
                      } else if (selectedRole === 'TEACHER') {
                        setEmail('teacher@smartattend.ai');
                        setPassword('password123');
                      } else if (selectedRole === 'DEPARTMENT_ADMIN') {
                        setEmail('deptadmin@smartattend.ai');
                        setPassword('password123');
                      } else if (selectedRole === 'ADMIN') {
                        setEmail('admin@smartattend.ai');
                        setPassword('password123');
                      } else {
                        setEmail('abhishekrbiradar908a@gmail.com');
                        setPassword('password123');
                      }
                      setRecaptchaToken('fallback-verified-token');
                      setError('');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    1-Click Auto Fill
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-200/60 dark:border-slate-700/60 rounded-xl py-3 border bg-white/50 dark:bg-slate-800/50 dark:text-white backdrop-blur-sm transition-all shadow-inner"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:shadow-lg disabled:opacity-70 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError('');
                      setMessage('');
                    }}
                    className="w-full flex justify-center py-3 px-4 border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all backdrop-blur-sm"
                  >
                    Back to Login
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6" 
                onSubmit={handleSubmit}
              >
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 backdrop-blur-sm"
                    >
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg py-3 border bg-slate-50 dark:bg-slate-700 dark:text-white"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full pl-10 pr-10 sm:text-sm border-slate-200/60 dark:border-slate-700/60 rounded-xl py-3 border bg-white/50 dark:bg-slate-800/50 dark:text-white backdrop-blur-sm transition-all shadow-inner"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-500 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>



                <div className="flex flex-col items-center justify-center my-4 overflow-hidden w-full">
                  {!recaptchaError && import.meta.env.VITE_RECAPTCHA_SITE_KEY ? (
                    <div className="transform scale-[0.85] sm:scale-100 origin-center flex flex-col items-center">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                        onChange={(token) => {
                          setRecaptchaToken(token);
                          if (token) setError('');
                        }}
                        onErrored={() => {
                          setRecaptchaError(true);
                          setRecaptchaToken('fallback-verified-token');
                        }}
                        onExpired={() => setRecaptchaToken(null)}
                        theme={theme === 'dark' ? 'dark' : 'light'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRecaptchaError(true);
                          setRecaptchaToken('fallback-verified-token');
                        }}
                        className="mt-1.5 text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors"
                      >
                        reCAPTCHA glitching or blocked? Click here to bypass
                      </button>
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="fallback-captcha-check"
                          checked={!!recaptchaToken}
                          onChange={(e) => {
                            setRecaptchaToken(e.target.checked ? 'fallback-verified-token' : null);
                            if (e.target.checked) setError('');
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="fallback-captcha-check" className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                          I'm not a robot (Security Verification)
                        </label>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${recaptchaToken ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-500 bg-slate-200 dark:bg-slate-600'}`}>
                        {recaptchaToken ? 'Verified' : 'Required'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 rounded dark:bg-slate-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="font-medium text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:shadow-lg disabled:opacity-70
                      ${selectedRole === 'SUPER_ADMIN' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' :
                        selectedRole === 'TEACHER' ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' :
                        selectedRole === 'DEPARTMENT_ADMIN' ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' :
                        'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                      }
                    `}
                  >
                    {isLoading ? 'Signing in...' : `Sign in as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="w-full flex justify-center py-3 px-4 border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all backdrop-blur-sm"
                  >
                    Back to Role Selection
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
