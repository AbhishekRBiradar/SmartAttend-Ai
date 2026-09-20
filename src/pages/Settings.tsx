import React, { useState } from 'react';
import { Save, Sliders, Camera, Shield, Clock } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    confidenceThreshold: 0.85,
    blinkThreshold: 0.5,
    autoLogoutMinutes: 10,
    cameraResolution: '1080p',
    enableNotifications: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-500" />
          System Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI & Recognition Settings */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-medium text-slate-900">AI & Recognition</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="confidenceThreshold" className="block text-sm font-medium text-slate-700">
                Face Recognition Confidence Threshold
              </label>
              <div className="mt-1 flex items-center gap-4">
                <input
                  type="range"
                  name="confidenceThreshold"
                  id="confidenceThreshold"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={settings.confidenceThreshold}
                  onChange={handleChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {settings.confidenceThreshold}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Higher values reduce false positives but may miss faces in poor lighting.</p>
            </div>

            <div>
              <label htmlFor="blinkThreshold" className="block text-sm font-medium text-slate-700">
                Blink Detection Threshold (Liveness)
              </label>
              <div className="mt-1 flex items-center gap-4">
                <input
                  type="range"
                  name="blinkThreshold"
                  id="blinkThreshold"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={settings.blinkThreshold}
                  onChange={handleChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {settings.blinkThreshold}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Threshold for Eye Aspect Ratio (EAR) to detect a blink.</p>
            </div>
          </div>
        </div>

        {/* Camera Settings */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Camera className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-medium text-slate-900">Camera Configuration</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="cameraResolution" className="block text-sm font-medium text-slate-700">
                Default Resolution
              </label>
              <select
                id="cameraResolution"
                name="cameraResolution"
                value={settings.cameraResolution}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
              >
                <option value="720p">720p (Fastest)</option>
                <option value="1080p">1080p (Recommended)</option>
                <option value="4k">4K (High CPU Usage)</option>
              </select>
            </div>
          </div>
        </div>

        {/* System & Security */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-medium text-slate-900">System & Security</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="autoLogoutMinutes" className="block text-sm font-medium text-slate-700">
                Auto Logout Time (Minutes)
              </label>
              <input
                type="number"
                name="autoLogoutMinutes"
                id="autoLogoutMinutes"
                min="1"
                max="60"
                value={settings.autoLogoutMinutes}
                onChange={handleChange}
                className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-2 text-sm text-slate-500">If a face disappears for this duration, the student is automatically logged out.</p>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="enableNotifications"
                  name="enableNotifications"
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="enableNotifications" className="font-medium text-slate-700">Enable Smart Notifications</label>
                <p className="text-slate-500">Receive alerts for unknown persons, late entries, and camera disconnections.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Save className="-ml-1 mr-2 h-5 w-5" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
