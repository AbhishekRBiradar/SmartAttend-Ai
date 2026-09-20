import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

const MiniLiveCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        // console.warn("Error accessing camera:", err);
        setError("Could not access camera");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden relative aspect-video flex items-center justify-center shadow-inner">
      {error ? (
        <div className="text-center p-6">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-500 ${isStreaming ? 'opacity-100' : 'opacity-0'}`}
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Camera className="w-8 h-8 mb-2 animate-pulse" />
              <p className="text-sm">Initializing camera...</p>
            </div>
          )}
          {isStreaming && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wide">LIVE</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MiniLiveCamera;
