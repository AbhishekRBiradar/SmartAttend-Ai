import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ShieldCheck, Users, BarChart3, ArrowRight, Eye, Clock, UserX, ChevronDown, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ScrollToTop from '../components/ScrollToTop';

const LandingPage = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDashboardRedirect = () => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user?.role === 'TEACHER') navigate('/teacher/dashboard');
    else navigate('/student/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-200">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">SmartAttend AI</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Home</a>
              <a href="#about" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">About System</a>
              <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Features</a>
              <a href="#demo" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Live Demo</a>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="relative" ref={dropdownRef}>
                {isAuthenticated ? (
                  <button
                    onClick={handleDashboardRedirect}
                    className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all gap-2"
                  >
                    Dashboard <LayoutDashboard className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsLoginOpen(!isLoginOpen)}
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all gap-2"
                    >
                      Login <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    <AnimatePresence>
                      {isLoginOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 z-50 overflow-hidden"
                        >
                          <Link to="/login?role=admin" className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Admin Portal</Link>
                          <Link to="/login?role=teacher" className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Teacher Portal</Link>
                          <Link to="/login?role=student" className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Student Portal</Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6"
            >
              Seamless, Real-Time <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                Automated Authentication
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed"
            >
              A deep learning-driven facial recognition system designed for modern classrooms and offices. 
              Powered by InsightFace, SCRFD, and 512-D Embeddings.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isAuthenticated ? (
                <button
                  onClick={handleDashboardRedirect}
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all gap-2"
                >
                  Go to Dashboard <LayoutDashboard className="w-5 h-5" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all gap-2"
                >
                  Sign In <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
              >
                Explore Features
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Core Capabilities</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Our system leverages state-of-the-art computer vision models to ensure accurate, fast, and secure attendance tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Camera, title: 'Real-Time Detection', desc: 'Instant face detection and recognition using InsightFace and SCRFD.' },
              { icon: Eye, title: 'Liveness Verification', desc: 'Advanced anti-spoofing heuristics to prevent photo presentation attacks.' },
              { icon: ShieldCheck, title: 'Secure Authentication', desc: 'Automated logging with high confidence thresholds.' },
              { icon: Users, title: 'Student Management', desc: 'Easily manage student records and facial datasets.' },
              { icon: Clock, title: 'Late Entry Tracking', desc: 'Automatically flags students arriving after the designated time.' },
              { icon: UserX, title: 'Unknown Person Alerts', desc: 'Detects unregistered faces and alerts administrators instantly.' },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-12">Powered by Advanced Technology</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70">
            <div className="text-2xl font-bold tracking-wider">React</div>
            <div className="text-2xl font-bold tracking-wider">Flask</div>
            <div className="text-2xl font-bold tracking-wider">OpenCV</div>
            <div className="text-2xl font-bold tracking-wider">InsightFace</div>
            <div className="text-2xl font-bold tracking-wider">FAISS HNSW</div>
            <div className="text-2xl font-bold tracking-wider">SQLite</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 py-12 border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">SmartAttend AI</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            © {new Date().getFullYear()} Major Project. All rights reserved.
          </p>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
};

export default LandingPage;
