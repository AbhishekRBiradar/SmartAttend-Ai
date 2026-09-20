import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Save, Sliders, Camera, Shield, Bell, Database, Download, Trash2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { SecurityAccessMatrix } from '../../components/SecurityAccessMatrix';
import ConfirmModal from '../../components/ConfirmModal';

const Settings = () => {
  const { settings, updateSettings, seedSampleData, purgePreloadedData, students, users, courses, attendances, auditLogs } = useData();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [backendStatus, setBackendStatus] = useState<any>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  React.useEffect(() => {
    const getDevices = async () => {
      try {
        let allDevices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length > 0 && !videoDevices[0].label) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            allDevices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {
            console.warn("Camera permission denied, unable to fetch device labels.");
          }
        }
        setDevices(videoDevices);
      } catch (err) {
        console.warn("Error enumerating devices:", err);
      }
    };
    getDevices();
    
    // Fetch Python backend hardware status
    fetch('http://localhost:5000/config')
      .then(res => res.json())
      .then(data => setBackendStatus(data))
      .catch(err => console.warn("Backend offline or unreachable:", err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    await seedSampleData();
    setIsSeeding(false);
    setSeedSuccess(true);
    setTimeout(() => setSeedSuccess(false), 3000);
  };

  const executePurge = async () => {
    setIsPurging(true);
    setShowPurgeConfirm(false);
    try {
      await purgePreloadedData();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    } catch (e) {
      alert("Error purging data. Ensure you have Super Admin permissions.");
    }
    setIsPurging(false);
  };

  const handlePurge = () => {
    setShowPurgeConfirm(true);
  };

  const handleBackup = () => {
    const data = {
      students,
      attendances,
      settings: localSettings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Settings</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure AI models, camera parameters, and system behavior.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* AI Model Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">AI Model Configuration</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Adjust thresholds for InsightFace and SCRFD.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Engine Matching Sensitivity</label>
                <span className="text-sm font-bold text-indigo-600">{localSettings.confidenceThreshold}</span>
              </div>
              <input 
                type="range" 
                min="0.5" max="0.99" step="0.01"
                value={localSettings.confidenceThreshold || ''}
                onChange={(e) => setLocalSettings({...localSettings, confidenceThreshold: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Higher values reduce false positives but may reject valid faces in poor lighting.</p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Anti-Spoofing Threshold (Not Configured)</label>
                <span className="text-sm font-bold text-indigo-600">{localSettings.blinkThreshold}</span>
              </div>
              <input 
                type="range" 
                min="0.1" max="0.9" step="0.1"
                value={localSettings.blinkThreshold || ''}
                onChange={(e) => setLocalSettings({...localSettings, blinkThreshold: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">EAR (Eye Aspect Ratio) threshold to register a valid blink.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Embedding Match Threshold</label>
                <input 
                  type="number" 
                  min="0.1" max="1.0" step="0.05"
                  value={localSettings.matchThreshold ?? 0.45}
                  onChange={(e) => setLocalSettings({...localSettings, matchThreshold: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Cosine distance limit for FAISS vector matching (lower is stricter).</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Required Consistent Frames</label>
                <input 
                  type="number" 
                  min="1" max="15" step="1"
                  value={localSettings.consistentFrames ?? 3}
                  onChange={(e) => setLocalSettings({...localSettings, consistentFrames: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Number of consecutive frames required to confirm temporal verification.</p>
              </div>
            </div>
          </div>
        </motion.div>

        
        {/* Hardware & AI Processing Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hardware & AI Engine Configuration</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure ONNX execution providers and processing resolution.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">AI Execution Provider</label>
                  {backendStatus && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${backendStatus.has_cuda ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {backendStatus.has_cuda ? 'CUDA Detected' : 'CPU Mode'}
                    </span>
                  )}
                </div>
                <select
                  value={localSettings.aiProvider ?? 'auto'}
                  onChange={(e) => setLocalSettings({...localSettings, aiProvider: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="auto">Auto-detect (Prefer NVIDIA CUDA)</option>
                  <option value="cpu">Force CPU Only</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  At startup, the Python backend will check for NVIDIA GPUs. If available and set to Auto, CUDA will be leveraged for ONNX acceleration.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">AI Detection Resolution</label>
                <select
                  value={localSettings.aiResolution ?? '1280x720'}
                  onChange={(e) => setLocalSettings({...localSettings, aiResolution: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="640x640">640x640 (Maximum Performance)</option>
                  <option value="1280x720">1280x720 (Balanced / Default)</option>
                  <option value="1920x1080">1920x1080 (High Accuracy)</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  The internal tensor shape sent to InsightFace/SCRFD. Higher resolution increases accuracy for smaller faces but drastically reduces FPS.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Multi-Camera Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Multi-Camera Configurations</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage individual cameras, their resolution, and specific timetables.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const newCamera = {
                  id: `cam-${Date.now()}`,
                  name: `New Camera ${localSettings.cameras?.length + 1 || 1}`,
                  resolution: '1080p' as '1080p',
                  frameRate: 30,
                  assignedClass: '',
                  timetable: []
                };
                setLocalSettings({...localSettings, cameras: [...(localSettings.cameras || []), newCamera]});
              }}
              className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              + Add Camera
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            {(localSettings.cameras || []).map((camera, camIndex) => (
              <div key={camera.id} className="p-4 border border-slate-500/20 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={camera.name || ''}
                    onChange={(e) => {
                      const newCameras = [...localSettings.cameras];
                      newCameras[camIndex].name = e.target.value;
                      setLocalSettings({...localSettings, cameras: newCameras});
                    }}
                    className="font-semibold text-lg text-slate-800 dark:text-white border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500 px-1 py-0.5"
                    placeholder="Camera Name"
                  />
                  <button
                    onClick={() => {
                      const newCameras = localSettings.cameras.filter(c => c.id !== camera.id);
                      setLocalSettings({...localSettings, cameras: newCameras});
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Physical Device</label>
                    <select
                      value={camera.deviceId || ''}
                      onChange={(e) => {
                        const newCameras = [...localSettings.cameras];
                        newCameras[camIndex].deviceId = e.target.value;
                        setLocalSettings({...localSettings, cameras: newCameras});
                      }}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Default Camera</option>
                      {devices.map((device, i) => (
                        <option key={device.deviceId || i} value={device.deviceId || ''}>
                          {device.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Resolution</label>
                    <select
                      value={camera.resolution || ''}
                      onChange={(e) => {
                        const newCameras = [...localSettings.cameras];
                        newCameras[camIndex].resolution = e.target.value as any;
                        setLocalSettings({...localSettings, cameras: newCameras});
                      }}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4k">4K</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Frame Rate</label>
                    <select
                      value={camera.frameRate || ''}
                      onChange={(e) => {
                        const newCameras = [...localSettings.cameras];
                        newCameras[camIndex].frameRate = parseInt(e.target.value);
                        setLocalSettings({...localSettings, cameras: newCameras});
                      }}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="15">15 FPS</option>
                      <option value="30">30 FPS</option>
                      <option value="60">60 FPS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Assigned Class (Dept)</label>
                    <select
                      value={camera.assignedClass || ''}
                      onChange={(e) => {
                        const newCameras = [...localSettings.cameras];
                        newCameras[camIndex].assignedClass = e.target.value;
                        setLocalSettings({...localSettings, cameras: newCameras});
                      }}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {Array.from(new Set([
                        ...students.map(s => s.department).filter(Boolean),
                        ...courses.map(c => c.department_id).filter(Boolean)
                      ])).map(dept => (
                        <option key={dept} value={dept || ''}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="glass-card rounded-lg p-4 border border-slate-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Camera Specific Timetable</label>
                    <button
                      onClick={() => {
                        const newCameras = [...localSettings.cameras];
                        const defaultSubject = courses[0]?.course_code || courses[0]?.course_name || 'General Entry';
                        newCameras[camIndex].timetable = [
                          ...(newCameras[camIndex].timetable || []),
                          { id: Date.now().toString(), subject: defaultSubject, startTime: '09:00', endTime: '10:00' }
                        ];
                        setLocalSettings({...localSettings, cameras: newCameras});
                      }}
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors font-medium"
                    >
                      + Add Period
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(camera.timetable || []).map((period, pIndex) => (
                      <div key={period.id} className="flex flex-wrap gap-2 items-center text-sm">
                        <select
                          value={period.subject || ''}
                          onChange={(e) => {
                            const newCameras = [...localSettings.cameras];
                            newCameras[camIndex].timetable[pIndex].subject = e.target.value;
                            setLocalSettings({...localSettings, cameras: newCameras});
                          }}
                          className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Course / Subject</option>
                          {courses.map(course => (
                            <option key={course.id} value={course.course_code || course.course_name || ''}>
                              {course.course_code ? `${course.course_code} - ${course.course_name}` : course.course_name}
                            </option>
                          ))}
                          {period.subject && !courses.some(c => c.course_code === period.subject || c.course_name === period.subject) && (
                            <option value={period.subject || ''}>{period.subject}</option>
                          )}
                        </select>
                        <input
                          type="time"
                          value={period.startTime || ''}
                          onChange={(e) => {
                            const newCameras = [...localSettings.cameras];
                            newCameras[camIndex].timetable[pIndex].startTime = e.target.value;
                            setLocalSettings({...localSettings, cameras: newCameras});
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 w-28"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={period.endTime || ''}
                          onChange={(e) => {
                            const newCameras = [...localSettings.cameras];
                            newCameras[camIndex].timetable[pIndex].endTime = e.target.value;
                            setLocalSettings({...localSettings, cameras: newCameras});
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 w-28"
                        />
                        <select
                          value={period.teacherId || ''}
                          onChange={(e) => {
                            const newCameras = [...localSettings.cameras];
                            newCameras[camIndex].timetable[pIndex].teacherId = e.target.value;
                            setLocalSettings({...localSettings, cameras: newCameras});
                          }}
                          className="px-2 py-1.5 flex-1 min-w-[140px] rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Faculty / Teacher</option>
                          {users.filter(u => (u as any).role === 'TEACHER').map(teacher => (
                            <option key={teacher.user_id || (teacher as any).id} value={teacher.user_id || (teacher as any).id || ''}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const newCameras = [...localSettings.cameras];
                            newCameras[camIndex].timetable = newCameras[camIndex].timetable.filter(p => p.id !== period.id);
                            setLocalSettings({...localSettings, cameras: newCameras});
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!camera.timetable || camera.timetable.length === 0) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">No periods configured for this camera.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!localSettings.cameras || localSettings.cameras.length === 0) && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-500/20 border-dashed">
                No cameras configured. Add a camera to start monitoring.
              </p>
            )}
          </div>
        </motion.div>

        {/* System Rules */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">System Rules & Security</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage attendance rules and session limits.</p>
            </div>
          </div>
          <div className="p-6 border-b border-slate-500/10 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">General Late Entry Time</label>
                <input 
                  type="time" 
                  value={localSettings.lateEntryTime || ''}
                  onChange={(e) => setLocalSettings({...localSettings, lateEntryTime: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Default late mark time if outside timetable periods.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Auto Logout Time (minutes)</label>
                <input 
                  type="number" 
                  min="1" max="60"
                  value={localSettings.autoLogoutTime || ''}
                  onChange={(e) => setLocalSettings({...localSettings, autoLogoutTime: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Time before a student is logged out if face disappears.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Late Entry Grace Period (minutes)</label>
                <input 
                  type="number" 
                  min="0" max="60"
                  value={localSettings.lateEntryGracePeriod ?? 10}
                  onChange={(e) => setLocalSettings({...localSettings, lateEntryGracePeriod: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Minutes after a period starts before marking as late.</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Class Timetable</label>
                <button
                  onClick={() => {
                    const defaultSubject = courses[0]?.course_code || courses[0]?.course_name || 'General Entry';
                    const newPeriod = { id: Date.now().toString(), subject: defaultSubject, startTime: '12:00', endTime: '13:00' };
                    setLocalSettings({...localSettings, timetable: [...(localSettings.timetable || []), newPeriod]});
                  }}
                  className="text-sm bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-3 py-1.5 rounded-lg transition-colors font-medium border border-indigo-200 dark:border-indigo-800"
                >
                  + Add Period
                </button>
              </div>
              
              <div className="space-y-3">
                {(localSettings.timetable || []).map((period, index) => (
                  <div key={period.id} className="flex flex-col md:flex-row gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-500/20">
                    <select
                      value={period.subject || ''}
                      onChange={(e) => {
                        const newTimetable = [...localSettings.timetable];
                        newTimetable[index].subject = e.target.value;
                        setLocalSettings({...localSettings, timetable: newTimetable});
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Select Course / Subject</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.course_code || course.course_name || ''}>
                          {course.course_code ? `${course.course_code} - ${course.course_name}` : course.course_name}
                        </option>
                      ))}
                      {period.subject && !courses.some(c => c.course_code === period.subject || c.course_name === period.subject) && (
                        <option value={period.subject || ''}>{period.subject}</option>
                      )}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={period.startTime || ''}
                        onChange={(e) => {
                          const newTimetable = [...localSettings.timetable];
                          newTimetable[index].startTime = e.target.value;
                          setLocalSettings({...localSettings, timetable: newTimetable});
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 text-sm w-32"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={period.endTime || ''}
                        onChange={(e) => {
                          const newTimetable = [...localSettings.timetable];
                          newTimetable[index].endTime = e.target.value;
                          setLocalSettings({...localSettings, timetable: newTimetable});
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 text-sm w-32"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newTimetable = localSettings.timetable.filter(p => p.id !== period.id);
                        setLocalSettings({...localSettings, timetable: newTimetable});
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!localSettings.timetable || localSettings.timetable.length === 0) && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-500/20 border-dashed">
                    No class periods configured.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications & Alerts</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure email and push notifications.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-800 dark:text-white">Daily Attendance Summary</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive an email report at the end of the day.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:glass-card after:border-slate-300 after:dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-800 dark:text-white">Student Absence Alerts</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notify teachers when a student misses 3 consecutive classes.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:glass-card after:border-slate-300 after:dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <h4 className="text-sm font-medium text-slate-800 dark:text-white">Unknown Person Alerts</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Send alerts when an unrecognized face is detected.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={localSettings.enableNotifications} onChange={(e) => setLocalSettings({...localSettings, enableNotifications: e.target.checked})} />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:glass-card after:border-slate-300 after:dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Firestore Security & RBAC Inspector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
        >
          <SecurityAccessMatrix />
        </motion.div>

        {/* Data Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-slate-500/10 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Data Management</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Backup database and manage preloaded data.</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={handleSeed}
              disabled={isSeeding || isPurging}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors border border-indigo-200 disabled:opacity-50"
            >
              <Database className="w-5 h-5" />
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
            <button 
              onClick={handlePurge}
              disabled={isSeeding || isPurging}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-medium transition-colors border border-rose-200 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              {isPurging ? 'Purging...' : 'Purge Data'}
            </button>
            <button 
              onClick={handleBackup}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors border border-slate-500/20">
              <Download className="w-5 h-5" />
              Backup Data
            </button>
          </div>
          {seedSuccess && (
            <div className="px-6 pb-6">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium">
                Sample data seeded successfully! Go to Dashboard to see the results.
              </div>
            </div>
          )}
          {purgeSuccess && (
            <div className="px-6 pb-6 mt-[-10px]">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium">
                All preloaded academic data and notifications were successfully purged!
              </div>
            </div>
          )}
        </motion.div>

      </div>
      <ConfirmModal
        isOpen={showPurgeConfirm}
        title="Purge Database?"
        message="Are you sure you want to purge all preloaded academic structure, courses, and notifications? This action cannot be undone."
        onConfirm={executePurge}
        onCancel={() => setShowPurgeConfirm(false)}
        confirmText="Purge Data"
      />
    </div>
  );
};

export default Settings;
