import { Link } from 'react-router-dom';
import { Camera, Shield, Zap, Users, BarChart3, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">SmartAttend AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">Features</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900">About System</a>
              <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Admin Login</Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
              >
                Live Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              <span className="block">Deep Learning-Driven</span>
              <span className="block text-indigo-600">Facial Recognition</span>
            </h1>
            <p className="mt-6 text-xl text-slate-500 max-w-2xl mx-auto">
              Seamless, real-time automated authentication system for modern classrooms and offices. Powered by YOLOv11 and FaceNet.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
              >
                View Dashboard
                <ChevronRight className="ml-2 -mr-1 w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-indigo-700 bg-indigo-50 border border-transparent rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Everything you need for smart attendance
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: 'Real-time Face Detection',
                  description: 'Lightning-fast face detection using YOLOv11 and FaceNet for high accuracy.',
                  icon: Camera,
                },
                {
                  name: 'Blink-based Liveness',
                  description: 'Prevents spoofing attacks by ensuring the detected face is a real, live person.',
                  icon: Shield,
                },
                {
                  name: 'Automatic Attendance',
                  description: 'Logs entry and exit times automatically without any manual intervention.',
                  icon: Zap,
                },
                {
                  name: 'Smart Dashboard',
                  description: 'Comprehensive analytics and real-time monitoring of all activities.',
                  icon: BarChart3,
                },
                {
                  name: 'Student Management',
                  description: 'Easily manage student records, datasets, and attendance history.',
                  icon: Users,
                },
              ].map((feature) => (
                <div key={feature.name} className="pt-6">
                  <div className="flow-root bg-slate-50 rounded-lg px-6 pb-8 h-full border border-slate-100">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-md shadow-lg">
                          <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-slate-900 tracking-tight">{feature.name}</h3>
                      <p className="mt-5 text-base text-slate-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
