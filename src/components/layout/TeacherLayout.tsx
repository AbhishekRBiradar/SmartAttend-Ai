import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Edit3,
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  History,
  User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import ScrollToTop from '../ScrollToTop';
import { NotificationBell } from '../notifications/NotificationBell';

const TeacherLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { attendances } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (itemTo: string) => {
    const [itemPath, itemQuery] = itemTo.split('?');
    if (location.pathname !== itemPath) return false;

    if (itemQuery) {
      return location.search === `?${itemQuery}`;
    }

    return !location.search || location.search === '';
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setIsSidebarOpen(false);
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
            navigate('/teacher/dashboard');
            break;
          case 's':
            e.preventDefault();
            navigate('/teacher/students');
            break;
          case 'a':
            e.preventDefault();
            navigate('/teacher/attendance');
            break;
          case 'p':
            e.preventDefault();
            navigate('/teacher/profile');
            break;
          case 'm':
            e.preventDefault();
            navigate('/teacher/manual-entry');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const today = new Date().toISOString().split('T')[0];
  const todaysAbsences = attendances.filter(att => (att.date === today || (att.timestamp && att.timestamp.split('T')[0] === today)) && att.status === 'ABSENT');
  
  const systemNotifications = [];
  if (todaysAbsences.length > 0) {
    systemNotifications.push({ id: 1, text: `${todaysAbsences.length} students marked absent today.`, type: 'warning', link: '/teacher/attendance', time: 'Today' });
  }
  if (systemNotifications.length === 0) {
    systemNotifications.push({ id: 2, text: `No new notifications.`, type: 'success', link: '#', time: '' });
  }

  const navSections = [
    {
      title: null,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard', shortcut: 'Alt+D' },
      ]
    },
    {
      title: 'Academics & Schedule',
      items: [
        { icon: BookOpen, label: 'My Assigned Courses', path: '/teacher/courses', shortcut: 'Alt+C' },
        { icon: Calendar, label: 'My Timetable', path: '/teacher/timetable', shortcut: 'Alt+T' },
      ]
    },
    {
      title: 'Attendance',
      items: [
        { icon: CheckSquare, label: 'Mark Period Attendance', path: '/teacher/active-session' },
        { icon: History, label: 'Attendance History', path: '/teacher/attendance', shortcut: 'Alt+A' },
      ]
    },
    {
      title: 'Students & Assessment',
      items: [
        { icon: Users, label: 'My Students', path: '/teacher/students', shortcut: 'Alt+S' },
        { icon: Edit3, label: 'Subject Marks Entry', path: '/teacher/results?tab=marks' },
        { icon: Award, label: 'Results & Evaluations', path: '/teacher/results', shortcut: 'Alt+R' },
      ]
    },
    {
      title: 'Communication & Profile',
      items: [
        { icon: Bell, label: 'Notifications & Alerts', path: '/teacher/notifications' },
        { icon: User, label: 'My Profile', path: '/teacher/profile', shortcut: 'Alt+P' },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex overflow-hidden relative">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 glass-panel m-4 rounded-2xl
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg">
            T
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">Teacher</span>
        </div>

        <nav className="flex-1 px-4 space-y-4 overflow-y-auto mt-2">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-3 pb-2">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const active = isItemActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden
                      ${active 
                        ? 'text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                      <span>{item.label}</span>
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

        <div className="p-4 mt-auto space-y-2 border-t border-slate-200/50 dark:border-slate-800/50">
          <NavLink
            to="/teacher/profile"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-500/5 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user?.name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {user?.name || 'Teacher'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                View Profile &rarr;
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all duration-300 group font-medium text-xs"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 glass-panel mx-4 mt-4 rounded-2xl px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-500/5 dark:bg-slate-800/50 rounded-xl lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mr-4 whitespace-nowrap hidden sm:block">
              Teacher Portal
            </h1>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button 
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-500/5 dark:bg-slate-800/50 rounded-xl transition-all duration-300 hover:scale-110"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <NotificationBell historyPath="/teacher/notifications" themeColor="emerald" />

            <div 
              onClick={() => navigate('/teacher/profile')}
              title="View Teacher Profile"
              className="flex items-center gap-3 pl-6 border-l border-slate-500/20 relative group cursor-pointer hidden sm:flex"
            >
              <div className="text-right group-hover:opacity-80 transition-opacity">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'TEACHER'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{user?.role || 'TEACHER'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 ring-2 ring-white dark:ring-slate-800 group-hover:scale-105 transition-transform duration-300">
                {user?.name?.charAt(0) || 'T'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
          <ScrollToTop />
        </div>
      </main>
    </div>
  );
};

export default TeacherLayout;
