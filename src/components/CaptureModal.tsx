import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onSuccess?: () => void;
  onCapture?: (base64Image: string) => void;
}

const ANGLES = ['Front', 'Slight Left', 'Slight Right', 'Slight Up', 'Slight Down'];

const CaptureModal: React.FC<CaptureModalProps> = ({ isOpen, onClose, studentId, studentName, onSuccess, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'select' | 'camera' | 'uploading'>('select');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const { addDatasetImage } = useData();

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('select');
      setCapturedImages([]);
      setError(null);
      setSuccess(null);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    setSuccess(null);
    setCapturedImages([]);
    setStep('camera');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setStep('select');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCaptureNext = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      
      const newImages = [...capturedImages, base64Image];
      setCapturedImages(newImages);
      
      if (newImages.length === 5) {
        processEnrollment(newImages);
      }
    }
  };

  const processEnrollment = async (images: string[]) => {
    stopCamera();
    setStep('uploading');
    setError(null);
    try {
      for (let i = 0; i < images.length; i++) {
        await addDatasetImage(studentId, images[i]);
      }
      setSuccess("All 5 face angles enrolled successfully!");
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      console.warn(err);
      setError(err.message || "Failed to enroll images. Please try again.");
      setStep('select');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 5);
      const readImages: string[] = [];
      
      setStep('uploading');
      
      for (const file of files) {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(file);
        readImages.push(await promise);
      }
      
      processEnrollment(readImages);
    }
  };

  if (!isOpen) return null;

  const currentAngle = ANGLES[Math.min(capturedImages.length, 4)];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden flex flex-col rounded-2xl"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              Multi-Angle Enrollment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enrolling for {studentName} ({studentId})</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {step === 'select' && (
            <div className="flex flex-col gap-4">
              <div className="text-center p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">High-Accuracy Enrollment</h4>
                <p className="text-sm text-indigo-700/80 dark:text-indigo-400">
                  The AI requires 5 angles (Front, Left, Right, Up, Down) for robust 512-D embedding creation.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group"
                >
                  <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Use Web Camera</span>
                </button>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload 5 Photos</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'camera' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  Image {capturedImages.length + 1} of 5
                </span>
                <span className="text-sm font-bold bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                  Look {currentAngle}
                </span>
              </div>
              
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                
                {/* Guide overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-8 rounded-full border-dashed" />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCaptureNext}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Capture {currentAngle}
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-2">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Processing Face Data</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                Extracting 512-D embeddings and building FAISS vectors. This might take a moment.
              </p>
            </div>
          )}
        </div>
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
};

export default CaptureModal;
