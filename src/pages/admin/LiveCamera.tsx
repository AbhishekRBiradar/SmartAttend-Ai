import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Camera, AlertTriangle, X, Activity, Settings, Plus, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CameraFeed from '../../components/CameraFeed';

const LiveCamera = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!usePythonBackend) {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2500);
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [usePythonBackend]);
  const [showPythonInstructions, setShowPythonInstructions] = useState(false);
  const { students, attendances, unknownPersons, settings, addAttendanceLog, addUnknownPerson, simulateDetection } = useData();
  const { departments } = useAcademic();
  const loggedTodayRef = useRef<Set<string>>(new Set());
  const unknownLoggedRef = useRef<Set<string>>(new Set());

  const isDeptAdmin = user?.role === 'DEPARTMENT_ADMIN';
  const userDeptId = user?.department_id;
  const userDeptName = useMemo(() => {
    if (!userDeptId) return '';
    return departments.find(d => d.id === userDeptId)?.department_name || userDeptId;
  }, [departments, userDeptId]);

  const targetStudents = useMemo(() => {
    if (!isDeptAdmin || !userDeptId) return students;
    return students.filter(s => s.department_id === userDeptId || s.department === userDeptId || s.department === userDeptName);
  }, [students, isDeptAdmin, userDeptId, userDeptName]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = useMemo(() => {
    return attendances.filter(att => {
      const dateStr = att.date || (att.timestamp ? att.timestamp.split('T')[0] : '');
      if (dateStr !== todayStr) return false;
      if (!isDeptAdmin || !userDeptId) return true;
      return targetStudents.some(s => s.id === att.student_id);
    });
  }, [attendances, todayStr, isDeptAdmin, userDeptId, userDeptName, targetStudents]);

  const presentCount = useMemo(() => {
    return new Set(todayLogs.map(l => l.student_id)).size;
  }, [todayLogs]);

  const totalStudentsCount = targetStudents.length || 50;
  const absentCount = Math.max(0, totalStudentsCount - presentCount);
  
  const [selectedCameraId, setSelectedCameraId] = useState<string>(settings.cameras?.[0]?.id || 'cam-1');
  const [notifications, setNotifications] = useState<{id: number, message: string, type: 'warning'|'error'|'info'}[]>([]);

  useEffect(() => {
    if (settings.cameras && settings.cameras.length > 0 && !settings.cameras.find(c => c.id === selectedCameraId)) {
      setSelectedCameraId(settings.cameras[0].id);
    }
  }, [settings.cameras, selectedCameraId]);

  const addNotification = (message: string, type: 'warning'|'error'|'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const prevUnknownCount = useRef(unknownPersons.length);
  useEffect(() => {
    if (unknownPersons.length > prevUnknownCount.current) {
      const newest = unknownPersons[0];
      if (newest.status === 'Pending') {
        addNotification('Alert: Unknown person detected!', 'error');
      }
    }
    prevUnknownCount.current = unknownPersons.length;
  }, [unknownPersons]);

  const handleDetection = (data: any[], cameraId: string, cameraName: string) => {
    const camera = settings.cameras?.find(c => c.id === cameraId);
    const cameraTimetable = camera?.timetable || settings.timetable || [];
    
    data.forEach(async (face) => {
      if (face.name !== 'Unknown') {
        const student = students.find(s => s.id === face.name || s.name === face.name);
        
        // Ensure temporal verification has passed in backend
        if (face.status && face.status === "VERIFYING") {
          return;
        }
        if (face.status && face.status === "ALREADY_MARKED" && usePythonBackend) {
          // If the backend says ALREADY_MARKED, it might be for a different session.
          // But since the backend only uses a global 'logged_today', let's rely on the frontend's logKey logic.
          // Actually, if we rely on frontend's logKey logic, we can just proceed here.
        }

        
        if (student) {
          const studentDept = departments.find(d => d.id === student.department_id)?.department_name || student.department || student.department_id || 'General';
          // Check if student belongs to this camera's assigned class, if specified
          if (camera && camera.assignedClass && camera.assignedClass !== 'All' && student.department_id !== camera.assignedClass && studentDept !== camera.assignedClass && student.role !== 'TEACHER') {
            return; // Skip if they don't belong here and are not a teacher
          }

          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = now.toISOString().split('T')[0];
          
          let currentPeriod = null;
          for (const p of cameraTimetable) {
            if (timeString >= p.startTime && timeString <= p.endTime) {
              currentPeriod = p;
              break;
            }
          }
          
          const subject = currentPeriod ? currentPeriod.subject : 'General Entry';
          const logKey = `${face.name}-${subject}-${dateString}-${cameraName}`;
          
          if (!loggedTodayRef.current.has(logKey)) {
            loggedTodayRef.current.add(logKey);
            
            let isLate = false;
            if (currentPeriod) {
              const [startHour, startMin] = currentPeriod.startTime.split(':').map(Number);
              const gracePeriod = settings.lateEntryGracePeriod || 10;
              const threshold = new Date(now);
              threshold.setHours(startHour, startMin + gracePeriod, 0, 0);
              isLate = now > threshold;
            } else {
              const [lateHour, lateMinute] = settings.lateEntryTime.split(':').map(Number);
              isLate = now.getHours() > lateHour || (now.getHours() === lateHour && now.getMinutes() > lateMinute);
            }

            await addAttendanceLog({
              studentId: student.id,
              studentName: student.name,
              department: studentDept,
              subject: `${subject} (${cameraName})`,
              loginTime: timeString,
              logoutTime: null,
              date: dateString,
              duration: null,
              status: isLate ? 'Late' : 'Present',
            });
          }
        }
      } else if (face.imageUrl && face.status !== 'LOW_QUALITY') {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toISOString().split('T')[0];
        // We only want to log unknown persons periodically so we don't spam
        const key = `unknown-${cameraId}-${dateString}-${now.getHours()}-${now.getMinutes()}`; // log at most once every 1 min per camera
        if (!unknownLoggedRef.current.has(key)) {
          unknownLoggedRef.current.add(key);
          addUnknownPerson({
            imageUrl: face.imageUrl,
            time: timeString,
            date: dateString,
            status: 'Pending'
          });
        }
      }
    });
  };

  const recentDetections = [
    ...attendances.slice(0, 3).map((att, i) => ({
      id: att.id || att.student_id,
      name: students.find(s => s.id === att.student_id)?.name || att.student_id || 'Student',
      subject: att.course_offering_id || 'Class',
      status: 'HIGH_CONFIDENCE',
      time: att.timestamp ? new Date(att.timestamp).toLocaleTimeString() : '09:00',
      type: 'known',
      confidence: Math.round((att.similarity_score || 0.95) * 100) - i
    })),
    ...unknownPersons.filter(p => p.status === 'Pending').slice(0, 2).map((p, i) => ({
      id: p.id,
      name: 'Unknown',
      subject: 'N/A',
      status: 'Alert',
      time: p.time,
      type: 'unknown',
      confidence: 45 - i
    }))
  ].sort((a, b) => new Date(`1970/01/01 ${b.time}`).getTime() - new Date(`1970/01/01 ${a.time}`).getTime());

  const simulateMultipleLogins = () => {
    addNotification("Security Alert: Multiple login attempts detected for ID S002.", "warning");
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="absolute top-0 right-0 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border w-80 ${
                note.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                note.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium flex-1">{note.message}</p>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="shrink-0 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPythonInstructions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-500/10 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Python Backend Not Found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">The AI Studio preview cannot run the Python backend automatically.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPythonInstructions(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-slate-700 dark:text-slate-200">
                  To use the advanced Python face detection (InsightFace + ArcFace (512-D)), you must run the backend locally on your own machine.
                </p>
                
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Step 1: Download the project</h4>
                  <p className="text-slate-300 text-sm mb-4">Export this project as a ZIP file or to GitHub using the Settings menu in AI Studio.</p>
                  
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Step 2: Install dependencies</h4>
                  <code className="text-emerald-400 text-sm block mb-4">
                    cd python_backend<br/>
                    pip install -r requirements.txt
                  </code>
                  
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Step 3: Run the server</h4>
                  <code className="text-emerald-400 text-sm block">
                    python app.py
                  </code>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                  Once the Flask server is running on <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">http://localhost:5000</code>, you can click "Enable Python Backend" again.
                </p>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                <button
                  onClick={() => setShowPythonInstructions(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isSyncing ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : usePythonBackend ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-bounce' : usePythonBackend ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isSyncing ? 'Syncing...' : usePythonBackend ? 'Live: Python' : 'Offline: Browser AI'}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mr-2 hidden sm:block">Select a camera to view live feed and detections.</p>
          {isDeptAdmin && userDeptName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Building2 className="w-3 h-3" />
              {userDeptName} Department
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings.cameras && settings.cameras.length > 0 && (
            <>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 glass-card focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {settings.cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.name}</option>
                ))}
              </select>
            </>
          )}
          
          <div className="relative group">
            <button 
              onClick={() => navigate('/admin/settings')}
              className="flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> Camera Config
            </button>
          </div>
          <div className="relative group">
            <button 
              onClick={simulateDetection}
              className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Simulate Detection
            </button>
          </div>
          <div className="relative group">
            <button 
              onClick={simulateMultipleLogins}
              className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Test Multi-Login Alert
            </button>
          </div>
          <div className="relative group">
            <button 
              onClick={() => setUsePythonBackend(!usePythonBackend)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                usePythonBackend 
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 
              {usePythonBackend ? 'Python Backend Active' : 'Browser AI Active (Offline)'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* Camera Feed */}
        <div className={`lg:col-span-3 xl:col-span-4 grid gap-4 overflow-y-auto min-h-0`}>
          {settings.cameras?.filter(c => c.id === selectedCameraId).map(camera => (
            <CameraFeed 
              key={camera.id}
              id={camera.id}
              name={camera.name}
              usePythonBackend={usePythonBackend}
              onBackendOffline={() => setUsePythonBackend(false)}
              onDetection={(data) => handleDetection(data, camera.id, camera.name)}
              addNotification={addNotification}
            />
          ))}
          {(!settings.cameras || settings.cameras.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-900 rounded-2xl p-8 text-center min-h-[400px]">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-300 mb-2">No Cameras Configured</p>
              <p className="text-sm">Please add a camera in the Settings panel.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="glass-card dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-700 flex flex-col overflow-hidden h-[600px] lg:h-auto">
          <div className="p-4 border-b border-slate-500/10 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-semibold text-slate-800 dark:text-white">Live Detections (All Cameras)</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {recentDetections.map((person, i) => (
              <div key={i} className={`p-3 rounded-xl border ${person.status === 'Alert' ? 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-semibold ${person.status === 'Alert' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {person.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{person.time}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-500 dark:text-slate-400">Location/Subject</span>
                    <span className={`font-medium ${person.status === 'Alert' ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'} line-clamp-1`}>
                      {person.subject}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 dark:text-slate-400">Confidence</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{person.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
            {recentDetections.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                No recent detections.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCamera;

