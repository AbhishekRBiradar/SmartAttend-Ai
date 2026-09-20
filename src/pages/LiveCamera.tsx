import { useState } from 'react';
import { Camera, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LiveCamera() {
  const [isRecording, setIsRecording] = useState(true);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Live Camera Monitoring</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
              isRecording ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isRecording ? (
              <>
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Main Camera View */}
        <div className="lg:col-span-3 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800 shadow-xl">
          {isRecording ? (
            <>
              {/* Mock Video Feed */}
              <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/classroom/1200/800')] bg-cover bg-center"></div>
              
              {/* Overlay UI */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-md font-mono flex items-center gap-2 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  REC
                </span>
                <span className="bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-md font-mono border border-white/10">
                  1080p 60FPS
                </span>
                <span className="bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-md font-mono border border-white/10">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Bounding Boxes */}
              <div className="absolute top-1/3 left-1/4 w-40 h-48 border-2 border-emerald-500 rounded-sm">
                <div className="absolute -top-7 left-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-t-sm font-mono whitespace-nowrap flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Abhi - Verified (99%)
                </div>
                <div className="absolute -bottom-7 left-0 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-b-sm font-mono whitespace-nowrap flex items-center gap-1 border border-white/10">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  Blink: OK
                </div>
              </div>

              <div className="absolute top-1/4 right-1/3 w-32 h-40 border-2 border-emerald-500 rounded-sm">
                <div className="absolute -top-7 left-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-t-sm font-mono whitespace-nowrap flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Rahul - Verified (95%)
                </div>
                <div className="absolute -bottom-7 left-0 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-b-sm font-mono whitespace-nowrap flex items-center gap-1 border border-white/10">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  Blink: OK
                </div>
              </div>

              <div className="absolute bottom-1/4 right-1/4 w-36 h-44 border-2 border-rose-500 rounded-sm">
                <div className="absolute -top-7 left-0 bg-rose-500 text-white text-xs px-2 py-1 rounded-t-sm font-mono whitespace-nowrap flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Unknown - Alert
                </div>
                <div className="absolute -bottom-7 left-0 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-b-sm font-mono whitespace-nowrap flex items-center gap-1 border border-white/10">
                  <EyeOff className="w-3 h-3 text-rose-400" />
                  Blink: Pending
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <Camera className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Camera is offline</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Live Detections</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[
              { name: 'Abhi', status: 'Verified', confidence: '99%', blink: 'OK', time: '10:42:15 AM' },
              { name: 'Rahul', status: 'Verified', confidence: '95%', blink: 'OK', time: '10:42:12 AM' },
              { name: 'Unknown', status: 'Alert', confidence: 'N/A', blink: 'Pending', time: '10:41:50 AM' },
            ].map((person, i) => (
              <div key={i} className={`p-3 rounded-lg border ${person.status === 'Alert' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-semibold ${person.status === 'Alert' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {person.name}
                  </span>
                  <span className="text-xs text-slate-500">{person.time}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-medium ${person.status === 'Alert' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {person.status}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500">Confidence</span>
                    <span className="font-medium text-slate-700">{person.confidence}</span>
                  </div>
                  <div className="flex flex-col col-span-2 mt-1">
                    <span className="text-slate-500">Liveness (Blink)</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      {person.blink === 'OK' ? <Eye className="w-3 h-3 text-emerald-500" /> : <EyeOff className="w-3 h-3 text-rose-500" />}
                      {person.blink}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
