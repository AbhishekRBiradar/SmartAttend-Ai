import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle, RefreshCw, Zap, Shield, Play, Pause } from 'lucide-react';
import { useData } from '../context/DataContext';

interface CameraFeedProps {
  id?: string;
  name?: string;
  usePythonBackend?: boolean;
  onBackendOffline?: () => void;
  onDetection?: (data: any[]) => void;
  onDetect?: (data: any[]) => void;
  addNotification?: (message: string, type: 'warning' | 'error' | 'info') => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  id = 'cam-live',
  name = 'Camera Feed',
  usePythonBackend = false,
  onBackendOffline,
  onDetection,
  onDetect,
  addNotification
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { students } = useData();

  const handleDetectionCallback = onDetect || onDetection;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionBoxes, setDetectionBoxes] = useState<Array<{
    name: string;
    studentId: string;
    confidence: number;
    box: { x: number; y: number; width: number; height: number };
  }>>([]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setHasCameraPermission(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError(err.message || 'Camera permission denied or camera not found');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive]);

  // Periodic simulation/detection engine when active
  useEffect(() => {
    if (!isActive || !handleDetectionCallback) return;

    const interval = setInterval(() => {
      if (students.length > 0 && Math.random() > 0.4) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        const simData = [{
          student_id: randomStudent.id,
          name: randomStudent.name,
          confidence: Math.floor(Math.random() * 8) + 92,
          timestamp: new Date().toISOString()
        }];
        handleDetectionCallback(simData);

        setDetectionBoxes([{
          name: randomStudent.name,
          studentId: randomStudent.id,
          confidence: simData[0].confidence,
          box: { x: 30 + Math.random() * 20, y: 25 + Math.random() * 15, width: 35, height: 45 }
        }]);

        setTimeout(() => {
          setDetectionBoxes([]);
        }, 1800);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isActive, students, handleDetectionCallback]);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
      {cameraError ? (
        <div className="text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <CameraOff className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-rose-300">Camera Feed Unavailable</p>
          <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* AI Recognition Overlay Bounding Boxes */}
          {detectionBoxes.map((det, idx) => (
            <div
              key={idx}
              className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-lg pointer-events-none transition-all duration-300 animate-pulse"
              style={{
                left: `${det.box.x}%`,
                top: `${det.box.y}%`,
                width: `${det.box.width}%`,
                height: `${det.box.height}%`
              }}
            >
              <div className="absolute -top-7 left-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap">
                <Zap className="w-3 h-3 fill-white" />
                {det.name} ({det.confidence}%)
              </div>
            </div>
          ))}

          {/* Header Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-bold text-white tracking-wide uppercase">
                {name}
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setIsActive(!isActive)}
                className="p-1.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md rounded-full border border-slate-700 text-white transition-colors"
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CameraFeed;
