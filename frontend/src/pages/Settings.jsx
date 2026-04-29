import React, { useState, useEffect } from 'react';
import { Save, Sliders, Monitor, Bell, HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [threshold, setThreshold] = useState(3.51);
  const [overlayStyle, setOverlayStyle] = useState('minimal');
  const [modelType, setModelType] = useState('patchcore');
  const [theme, setTheme] = useState('dark');
  const [saved, setSaved] = useState(false);

  // Persistence logic placeholder
  useEffect(() => {
    const o = localStorage.getItem('overlay_style');
    if (o) setOverlayStyle(o);
    const th = localStorage.getItem('theme');
    if (th) setTheme(th);
    
    // Fetch the absolutely truthful mathematical ML threshold dynamically from Uvicorn
    fetch('http://localhost:8000/api/v1/config')
      .then(res => res.json())
      .then(data => {
        if(data && data.threshold) {
           setThreshold(data.threshold);
           setModelType(data.model_type || 'patchcore');
        }
      }).catch(e => console.error('Silent backend fetch error.'));
  }, []);

  const handleSave = async () => {
    localStorage.setItem('overlay_style', overlayStyle);
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    try {
      await fetch('http://localhost:8000/api/v1/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: threshold, model_type: modelType })
      });
    } catch (e) {
      console.error('Failed to sync config with backend:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto font-sans text-gray-200 animation-fade-in pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">System Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Adjust inference parameters and UI observability preferences.</p>
      </div>

      <div className="space-y-6">
        
        {/* Inference Settings */}
        <section className="bg-industrial-800/50 border border-industrial-700 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <HardDrive className="w-5 h-5 text-accent-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">Inference Engine</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Active Model Architecture</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setModelType('patchcore')}
                  className={`p-4 rounded-lg border text-left transition-colors ${modelType === 'patchcore' ? 'bg-accent-500/10 border-accent-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-industrial-900 border-industrial-700 hover:border-industrial-600'}`}
                >
                  <div className="font-medium text-gray-200">Pretrained ResNet Feature Embedding</div>
                  <div className="text-xs text-gray-500 mt-1">PatchCore-style memory bank. Optimized for high F1 precision.</div>
                </button>
                <button 
                  onClick={() => setModelType('unet')}
                  className={`p-4 rounded-lg border text-left transition-colors ${modelType === 'unet' ? 'bg-accent-500/10 border-accent-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-industrial-900 border-industrial-700 hover:border-industrial-600'}`}
                >
                  <div className="font-medium text-gray-200">Deep UNet Autoencoder</div>
                  <div className="text-xs text-gray-500 mt-1">SSIM+MSE loss reconstruction. High sensitivity to structural defects.</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-400 flex items-center">
                  <Sliders className="w-4 h-4 mr-2" />
                  Global Anomaly Threshold
                </label>
                <span className="text-xs font-mono bg-industrial-900 px-2 py-1 rounded text-accent-400">{threshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="15.0" step="0.1" 
                value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-industrial-900 rounded-lg appearance-none cursor-pointer accent-accent-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Highly Sensitive</span>
                <span>Strict Precision</span>
              </div>
            </div>
          </div>
        </section>

        {/* UI Settings */}
        <section className="bg-industrial-800/50 border border-industrial-700 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <Monitor className="w-5 h-5 text-accent-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">Observability HUD</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Overlay Rendering Style</label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="radio" value="minimal" checked={overlayStyle === 'minimal'} onChange={() => setOverlayStyle('minimal')} className="w-4 h-4 bg-industrial-900 border-industrial-700 text-accent-500 focus:ring-accent-500 focus:ring-offset-industrial-800"/>
                <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">Minimal Bounding Box (Red/Green indicators)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="radio" value="heatmap" checked={overlayStyle === 'heatmap'} onChange={() => setOverlayStyle('heatmap')} className="w-4 h-4 bg-industrial-900 border-industrial-700 text-accent-500 focus:ring-accent-500 focus:ring-offset-industrial-800"/>
                <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">Full Pixel-wise Heatmap Display (Alpha blended)</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">Color Theme</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setTheme('dark');
                  document.documentElement.classList.remove('light-theme');
                }}
                className={`p-3 rounded-lg border text-center transition-colors ${theme === 'dark' ? 'bg-accent-500/10 border-accent-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] text-gray-200' : 'bg-industrial-900 border-industrial-700 hover:border-industrial-600 text-gray-400'}`}
              >
                <div className="font-medium">Dark Mode</div>
              </button>
              <button 
                onClick={() => {
                  setTheme('light');
                  document.documentElement.classList.add('light-theme');
                }}
                className={`p-3 rounded-lg border text-center transition-colors ${theme === 'light' ? 'bg-accent-500/10 border-accent-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] text-gray-200' : 'bg-industrial-900 border-industrial-700 hover:border-industrial-600 text-gray-400'}`}
              >
                <div className="font-medium">Light Mode</div>
              </button>
            </div>
          </div>
        </section>
        
        {/* Alerts */}
        <section className="bg-industrial-800/50 border border-industrial-700 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-accent-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">Alert Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-300">Audible Alarms</p>
               <p className="text-xs text-gray-500 mt-1">Play a warning tone when an anomaly confidence exceeds 90%.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-industrial-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
            </label>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="flex items-center bg-accent-500 hover:bg-accent-600 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-accent-500/20"
          >
            {saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? 'Configuration Applied' : 'Apply Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
}
