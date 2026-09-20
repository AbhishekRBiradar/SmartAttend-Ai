import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { 
  LayoutDashboard, 
  LogOut,
  BookOpen,
  Sun,
  Moon,
  User,
  Award,
  Calendar,
  Bell,
  Building2,
  GraduationCap,
  Layers,
  Hash,
  ClipboardList
} from 'lucide-react';
import ScrollToTop from '../ScrollToTop';
import { NotificationBell } from '../notifications/NotificationBell';

const StudentLayout = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { students } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (itemTo: string) => {
    const [itemPath, itemQuery] = itemTo.split('?');
    if (location.pathname !== itemPath) return false;

    if (itemQuery) {
      return location.search === `?${itemQuery}`;
    }

    if (itemPath === '/student/academic') {
      const currentTab = (new URLSearchParams(location.search).get('tab') || 'department').toLowerCase();
      return currentTab === 'department';
    }

    return !location.search || location.search === '';
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('close-all-modals'));
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.altKey) {
        switch ((e.key || '').toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/student/dashboard');
            break;
          case 'p':
            e.preventDefault();
            navigate('/student/profile');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: null,
      items: [
        { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'Alt+D' },
        { to: '/student/profile', icon: User, label: 'My Profile', shortcut: 'Alt+P' },
      ]
    },
    {
      title: 'Academic',
      items: [
        { to: '/student/academic?tab=department', icon: Building2, label: 'My Department' },
        { to: '/student/academic?tab=program', icon: GraduationCap, label: 'My Program' },
        { to: '/student/academic?tab=batch', icon: Calendar, label: 'My Batch' },
        { to: '/student/academic?tab=semester', icon: Layers, label: 'My Semester' },
        { to: '/student/academic?tab=section', icon: Hash, label: 'My Section' },
      ]
    },
    {
      title: 'Academics & Performance',
      items: [
        { to: '/student/courses', icon: BookOpen, label: 'My Courses', shortcut: 'Alt+C' },
        { to: '/student/timetable', icon: Calendar, label: 'My Timetable', shortcut: 'Alt+T' },
        { to: '/student/dashboard', icon: ClipboardList, label: 'My Attendance' },
        { to: '/student/results', icon: Award, label: 'My Results', shortcut: 'Alt+R' },
      ]
    },
    {
      title: 'Utilities',
      items: [
        { to: '/student/notifications', icon: Bell, label: 'Notifications', shortcut: 'Alt+N' },
      ]
    }
  ];

  const student = students.find(s => 
    s.id === user?.user_id || 
    s.user_id === user?.user_id || 
    Boolean(s.email && user?.email && s.email.toLowerCase() === (user.email || '').toLowerCase())
  ) || students.find(s => s.id === 'S001') || students[0];
  const studentId = student?.id || user?.user_id || 'S001';

  const getPageTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Student Dashboard';
    if (location.pathname.includes('/profile')) return 'My Profile';
    if (location.pathname.includes('/academic')) return 'My Academic Context';
    return 'Student Portal';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-panel m-4 rounded-2xl flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">Student</span>
        </div>

        <div className="px-6 py-3 mb-2 border-b border-slate-500/10">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-0.5">Student Portal</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{student?.name || user?.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-medium">{student?.registrationNumber || student?.id || studentId}</p>
        </div>

        <nav className="flex-1 px-4 space-y-4 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-3 pb-2">
                  {section.title}
                </div>
              )}
              {section.items.map((item, itemIdx) => {
                const active = isItemActive(item.to);
                return (
                  <NavLink
                    key={`${item.to}-${itemIdx}`}
                    to={item.to}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden ${
                      active
                        ? 'text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span className="hidden group-hover:inline-block relative z-10 text-xs uppercase font-bold tracking-wider opacity-50">
                        {item.shortcut}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 px-3 py-2.5 w-full rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all duration-300 group font-medium"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 glass-panel mx-4 mt-4 rounded-2xl px-6 flex items-center justify-between z-20 shrink-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-4 ml-auto">
            <button 
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-500/5 dark:bg-slate-800/50 rounded-xl transition-all duration-300 hover:scale-110"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <NotificationBell historyPath="/student/notifications" themeColor="amber" />

            <div className="flex items-center gap-3 pl-6 border-l border-slate-500/20 relative group cursor-pointer hidden sm:flex">
              <div className="text-right group-hover:opacity-80 transition-opacity">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{user?.role}</p>
              </div>
              {student?.profilePic ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src={student.profilePic} alt={user?.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20 ring-2 ring-white dark:ring-slate-800 group-hover:scale-105 transition-transform duration-300">
                  {user?.name?.charAt(0) || 'S'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
          <Outlet />
          <ScrollToTop />
        </div>
      </main>
    </div>
  );
};

export default StudentLayout;
