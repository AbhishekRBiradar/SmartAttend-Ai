import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  ClipboardList, 
  BarChart3, 
  UserX, 
  FileText, 
  Settings,
  LogOut,
  Bell,
  UserCog,
  BookOpen,
  Sun,
  Moon,
  Search,
  Trash2,
  Award,
  Building2,
  Calendar,
  Database,
  Activity,
  GraduationCap,
  Layers,
  Clock
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useTheme } from '../../context/ThemeContext';
import ScrollToTop from '../ScrollToTop';
import { NotificationBell } from '../notifications/NotificationBell';

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const { students, courses, users, teachers, attendances, unknownPersons } = useData();
  const { departments } = useAcademic();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (itemTo: string) => {
    const [itemPath, itemQuery] = itemTo.split('?');
    if (location.pathname !== itemPath) return false;

    if (itemQuery) {
      const currentParams = new URLSearchParams(location.search);
      const targetParams = new URLSearchParams(`?${itemQuery}`);
      const targetTab = (targetParams.get('tab') || '').toLowerCase();

      if (itemPath === '/admin/academic-structure') {
        const normTarget = (targetTab === 'years' || targetTab === 'academicyears') ? 'years' : targetTab;
        const currentTab = (currentParams.get('tab') || 'departments').toLowerCase();
        const normCurrent = (currentTab === 'years' || currentTab === 'academicyears') ? 'years' : currentTab;
        return normTarget === normCurrent;
      }

      if (itemPath === '/admin/results') {
        const normTarget = targetTab === 'results' ? 'marks' : targetTab;
        const rawCurrent = (currentParams.get('tab') || 'exams').toLowerCase();
        const normCurrent = rawCurrent === 'results' ? 'marks' : rawCurrent;
        return normTarget === normCurrent;
      }

      return location.search === `?${itemQuery}`;
    }

    if (itemPath === '/admin/academic-structure') {
      const currentTab = (new URLSearchParams(location.search).get('tab') || 'departments').toLowerCase();
      return currentTab === 'departments';
    }

    if (itemPath === '/admin/results') {
      const currentTab = (new URLSearchParams(location.search).get('tab') || 'exams').toLowerCase();
      return currentTab === 'exams';
    }

    return !location.search || location.search === '';
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const pendingUnknowns = unknownPersons.filter(p => p.status === 'Pending').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todaysAbsences = attendances.filter(att => (att.date === today || (att.timestamp && att.timestamp.split('T')[0] === today)) && att.status === 'ABSENT');
  
  const systemNotifications = [];
  if (pendingUnknowns > 0) {
    systemNotifications.push({ id: 1, text: `${pendingUnknowns} unknown persons detected pending review.`, type: 'warning', link: '/admin/unknown', time: 'Just now' });
  }
  if (todaysAbsences.length > 0) {
    systemNotifications.push({ id: 2, text: `${todaysAbsences.length} students marked absent today.`, type: 'info', link: '/admin/attendance', time: 'Today' });
  }
  if (systemNotifications.length === 0) {
    systemNotifications.push({ id: 3, text: `No new notifications. System running smoothly.`, type: 'success', link: '#', time: '' });
  }

  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;

  // Search over students, courses, and users
  const q = (searchQuery || '').toLowerCase();
  const filteredStudents = searchQuery.trim() === '' ? [] : students.filter(student => {
    if (isDept) {
      const studentDept = student.department_id || student.department;
      if (studentDept && myDept && studentDept !== myDept) {
        // Also check if dept name matches
        const deptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept);
        const matches = studentDept === myDept || (deptObj && (studentDept === deptObj.id || studentDept === deptObj.name || studentDept === deptObj.department_name));
        if (!matches) return false;
      }
    }
    return (
      (student.name || '').toLowerCase().includes(q) || 
      (student.id || '').toLowerCase().includes(q) ||
      (student.usn || '').toLowerCase().includes(q) ||
      (student.registrationNumber || '').toLowerCase().includes(q)
    );
  }).map(s => ({ ...s, type: 'student' as const }));

  const filteredCourses = searchQuery.trim() === '' ? [] : (courses || []).filter(course => {
    if (isDept) {
      const cDept = course.department_id || (course as any).department;
      if (cDept && myDept && cDept !== myDept) {
        const deptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept);
        const matches = cDept === myDept || (deptObj && (cDept === deptObj.id || cDept === deptObj.name || cDept === deptObj.department_name));
        if (!matches) return false;
      }
    }
    return (
      (course.course_name || '').toLowerCase().includes(q) ||
      (course.course_code || '').toLowerCase().includes(q) ||
      (course.id || '').toLowerCase().includes(q) ||
      (course.department_id || '').toLowerCase().includes(q)
    );
  }).map(c => ({ 
    id: c.id, 
    code: c.course_code, 
    name: c.course_name, 
    department: c.department_id, 
    credits: c.credits, 
    type: 'course' as const 
  }));

  const allSystemUsers = [
    ...(users || []).map(u => ({ user_id: u.user_id || u.id, name: u.name, email: u.email, role: u.role || 'USER', department: u.department_id || (u as any).department || 'All' })),
    ...(teachers || []).map(t => ({ user_id: t.teacher_id || t.id, name: t.name, email: t.email, role: 'TEACHER', department: t.department_id || 'All' }))
  ];

  const filteredUsers = searchQuery.trim() === '' ? [] : allSystemUsers.filter(u => {
    if (isDept) {
      if (u.role === 'SUPER_ADMIN' || u.role === 'ADMIN') return false;
      const uDept = u.department;
      if (uDept && myDept && uDept !== myDept) {
        const deptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept);
        const matches = uDept === myDept || (deptObj && (uDept === deptObj.id || uDept === deptObj.name || uDept === deptObj.department_name));
        if (!matches) return false;
      }
    }
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.user_id || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }).map(u => ({ ...u, type: 'user' as const }));

  const searchResults = [...filteredStudents, ...filteredCourses, ...filteredUsers].slice(0, 8);

  const handleResultClick = (result: any) => {
    setSearchQuery('');
    if (result.type === 'student') {
      navigate(`/admin/students/${result.id}`);
    } else if (result.type === 'course') {
      navigate('/admin/courses');
    } else if (result.type === 'user') {
      navigate('/admin/users');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery('');
        setIsSearchFocused(false);
        setShowNotifications(false);
        window.dispatchEvent(new CustomEvent('close-all-modals'));
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // We will use Alt + Key for shortcuts to avoid OS overrides
      if (e.altKey) {
        switch ((e.key || '').toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/admin/dashboard');
            break;
          case 'c':
            e.preventDefault();
            navigate('/admin/camera');
            break;
          case 'a':
            e.preventDefault();
            navigate('/admin/attendance');
            break;
          case 's':
            e.preventDefault();
            navigate('/admin/students');
            break;
          case 'r':
            e.preventDefault();
            navigate('/admin/reports');
            break;
          case 'u':
            e.preventDefault();
            navigate('/admin/users');
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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdminUser = user?.role === 'ADMIN';

  interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    badge?: number;
    adminOnly?: boolean;
  }

  interface NavSection {
    title: string | null;
    items: NavItem[];
    hideForAdmin?: boolean;
  }

  const navSections: NavSection[] = [
    {
      title: null,
      items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'Alt+D' }
      ]
    },
    {
      title: 'Academic',
      items: [
        { to: '/admin/academic-structure?tab=departments', icon: Building2, label: 'Departments' },
        ...((user?.role === 'DEPARTMENT_ADMIN' || user?.role === 'SUPER_ADMIN') ? [
          { to: '/admin/academic-structure?tab=programs', icon: GraduationCap, label: 'Programs' },
          { to: '/admin/academic-structure?tab=years', icon: Calendar, label: 'Academic Years' },
          { to: '/admin/academic-structure?tab=batches', icon: Layers, label: 'Batches' },
          { to: '/admin/academic-structure?tab=semesters', icon: Clock, label: 'Semesters' },
          { to: '/admin/academic-structure?tab=sections', icon: Users, label: 'Sections' },
        ] : [])
      ]
    },
    {
      title: 'People',
      items: [
        { to: '/admin/students', icon: Users, label: 'Students', shortcut: 'Alt+S' },
        { to: '/admin/users', icon: UserCog, label: user?.role === 'DEPARTMENT_ADMIN' ? 'Faculty' : 'Teachers / Users', shortcut: 'Alt+U' },
      ]
    },

    {
      title: 'Academics',
      hideForAdmin: true,
      items: [
        { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
        { to: '/admin/course-offerings', icon: BookOpen, label: 'Course Offerings' },
        { to: '/admin/enrollments', icon: Users, label: 'Enrollments' },
        { to: '/admin/timetable', icon: Calendar, label: 'Timetable', shortcut: 'Alt+T' },
      ]
    },
    {
      title: 'Attendance',
      items: [
        { to: '/admin/camera', icon: Camera, label: 'Live Attendance', shortcut: 'Alt+C' },
        { to: '/admin/attendance', icon: ClipboardList, label: 'Attendance Records', shortcut: 'Alt+A' },
        { to: '/admin/entry-count', icon: BarChart3, label: 'Analytics', adminOnly: true },
      ]
    },
    {
      title: 'Examinations',
      items: [
        { to: '/admin/results?tab=exams', icon: Award, label: 'Exams' },
        { to: '/admin/results?tab=marks', icon: FileText, label: 'Marks & Results' },
        ...(!isDept ? [
          { to: '/admin/results?tab=transcripts', icon: GraduationCap, label: 'Transcripts' },
          { to: '/admin/results?tab=audit', icon: Activity, label: 'Audit Logs' },
        ] : []),
      ]
    },
    {
      title: 'System & Utilities',
      items: [
        { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
        ...((isSuperAdmin || isAdminUser) ? [
          { to: '/admin/settings', icon: Settings, label: 'Settings' },
          { to: '/admin/unknown', icon: UserX, label: 'Unknown Persons', badge: pendingUnknowns },
          { to: '/admin/deleted-records', icon: Trash2, label: 'Deleted Records' },
        ] : []),
        ...(isSuperAdmin ? [
          { to: '/admin/migration', icon: Database, label: 'Data Migration' },
          { to: '/admin/integration-test', icon: Activity, label: 'Integration Test' },
        ] : [])
      ]
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-panel m-4 rounded-2xl flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">SmartAttend</span>
        </div>

        <nav className="flex-1 px-4 space-y-4 overflow-y-auto mt-2">
          {navSections.filter(section => !(isAdminUser && section.hideForAdmin)).map((section, idx) => {
            const filteredItems = section.items.filter(item => !item.adminOnly || isSuperAdmin);
            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {section.title && (
                  <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-3 pb-2">
                    {section.title}
                  </div>
                )}
                {filteredItems.map((item) => {
                  const active = isItemActive(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group relative overflow-hidden ${
                        active
                          ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-900/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        {item.shortcut && (
                          <span className="hidden group-hover:inline-block text-xs uppercase font-bold tracking-wider opacity-50">
                            {item.shortcut}
                          </span>
                        )}
                        {item.badge && item.badge > 0 && (
                          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
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
          <div className="flex items-center gap-4 flex-1">
            <div className="mr-4 hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white whitespace-nowrap flex items-center gap-3">
                {user?.role === 'DEPARTMENT_ADMIN' ? 'Department Portal' : 'Admin Portal'}
                {user?.role === 'DEPARTMENT_ADMIN' && user?.department_id && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] rounded-full font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/30">
                    {user.department_id}
                  </span>
                )}
                {user?.role === 'SUPER_ADMIN' && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 text-[10px] rounded-full font-bold uppercase tracking-wider border border-purple-200 dark:border-purple-500/30">
                    Global Admin
                  </span>
                )}
              </h1>
            </div>
            
            {/* Global Search Bar */}
            <div className="relative max-w-md w-full">
              <div className="relative flex items-center group">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search students, courses, or users by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="glass-input !py-2 !pl-9 !pr-4 !rounded-lg text-sm w-full transition-all outline-none"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result: any) => {
                        let icon = <Users className="w-4 h-4 text-indigo-500" />;
                        let subLabel = '';
                        let badgeColor = 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
                        let label = 'Student';

                        if (result.type === 'course') {
                          icon = <BookOpen className="w-4 h-4 text-emerald-500" />;
                          subLabel = `${result.code} • ${result.department} • ${result.credits} Credits`;
                          badgeColor = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
                          label = 'Course';
                        } else if (result.type === 'user') {
                          icon = <UserCog className="w-4 h-4 text-purple-500" />;
                          subLabel = `${result.email} • Role: ${result.role}`;
                          badgeColor = 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
                          label = result.role;
                        } else {
                          subLabel = `ID: ${result.id} ${result.usn ? `• USN: ${result.usn}` : ''} • ${result.department}`;
                        }

                        return (
                          <div 
                            key={`${result.type}-${result.id}`} 
                            className="px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-start gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                            onMouseDown={() => handleResultClick(result)}
                          >
                            <div className="mt-1 p-1.5 bg-slate-500/10 rounded-lg">
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {result.name}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${badgeColor}`}>
                                  {label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {subLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center flex flex-col items-center">
                       <Search className="w-6 h-6 mb-2 opacity-30" />
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-500/5 dark:bg-slate-800/50 rounded-xl transition-all duration-300 hover:scale-110"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <NotificationBell historyPath="/admin/notifications" themeColor="indigo" />
            
            <div className="flex items-center gap-3 pl-6 border-l border-slate-500/20 relative group cursor-pointer">
              <div className="text-right hidden sm:block group-hover:opacity-80 transition-opacity">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-white dark:ring-slate-800 group-hover:scale-105 transition-transform duration-300">
                {user?.name?.charAt(0) || 'A'}
              </div>
              
              {/* Simple hover dropdown for profile */}
              <div className="absolute right-0 top-full mt-2 w-48 glass-card hidden group-hover:block z-50 py-1 origin-top-right animate-in fade-in zoom-in duration-200">
                <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-500/5 dark:bg-slate-800/50 transition-colors flex items-center gap-2 font-medium">
                  <UserCog className="w-4 h-4 text-slate-400" /> My Profile
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-500/5 dark:bg-slate-800/50 transition-colors flex items-center gap-2 font-medium">
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </button>
                <div className="h-px bg-slate-500/10 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 font-medium">
                  <LogOut className="w-4 h-4 text-rose-500" /> Logout
                </button>
              </div>
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

export default AdminLayout;
