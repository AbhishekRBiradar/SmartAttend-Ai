import React from 'react';
import { Camera, Settings, ShieldAlert, Monitor, Apple, Chrome } from 'lucide-react';

const CameraPermissionGuide = () => {
  return (
    <div className="glass-card shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto mt-6">
      <div className="flex items-center gap-3 mb-4 text-rose-600">
        <ShieldAlert className="w-6 h-6" />
        <h3 className="text-lg font-bold">Camera Access Required</h3>
      </div>
      
      <p className="text-slate-600 mb-6">
        SmartAttend AI needs access to your camera to perform real-time facial recognition and authenticate students. 
        Without camera access, the system cannot detect faces or mark attendance.
      </p>

      <div className="space-y-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Chrome className="w-5 h-5 text-slate-500" />
            Browser Permissions (Chrome/Edge/Firefox)
          </h4>
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
            <li>Look for the camera icon <Camera className="w-4 h-4 inline" /> in the right side of your browser's address bar.</li>
            <li>Click the icon and select <strong>"Always allow..."</strong></li>
            <li>If you don't see the icon, click the lock icon <ShieldAlert className="w-4 h-4 inline" /> on the left side of the address bar.</li>
            <li>Toggle the <strong>Camera</strong> switch to ON.</li>
            <li>Refresh the page.</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Apple className="w-5 h-5 text-slate-500" />
              macOS Settings
            </h4>
            <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
              <li>Open <strong>System Settings</strong>.</li>
              <li>Go to <strong>Privacy & Security</strong>.</li>
              <li>Click on <strong>Camera</strong>.</li>
              <li>Find your browser (e.g., Chrome) and toggle the switch to ON.</li>
              <li>Restart your browser.</li>
            </ol>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-slate-500" />
              Windows Settings
            </h4>
            <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
              <li>Open <strong>Settings</strong> <Settings className="w-4 h-4 inline" />.</li>
              <li>Go to <strong>Privacy & security</strong>.</li>
              <li>Under App permissions, click <strong>Camera</strong>.</li>
              <li>Turn on <strong>"Let apps access your camera"</strong>.</li>
              <li>Ensure your browser is allowed in the list below.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionGuide;
