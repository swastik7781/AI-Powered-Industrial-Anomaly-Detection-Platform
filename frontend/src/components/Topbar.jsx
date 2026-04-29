import React, { useState, useEffect } from 'react';
import { Bell, Activity } from 'lucide-react';

export default function Topbar() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-industrial-900/80 backdrop-blur-md border-b border-industrial-800 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <div className="flex items-center px-3 py-1.5 bg-success-500/10 border border-success-500/20 rounded text-success-500 text-xs font-mono uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse mr-2"></span>
          Telemetry Active
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="hidden md:flex items-center text-gray-500 text-xs font-mono space-x-4">
          <span className="flex items-center"><Activity className="w-3 h-3 mr-1 text-gray-600"/> Latency: &lt;10ms</span>
        </div>
        <div className="h-4 w-px bg-industrial-700 hidden md:block"></div>
        <span className="text-gray-400 text-sm font-mono w-24 text-right">{time}</span>
        <button className="relative text-gray-400 hover:text-gray-200 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="h-8 w-8 rounded bg-industrial-800 border border-industrial-700 flex items-center justify-center shadow-sm">
          <span className="text-xs font-bold text-accent-400">ADMIN</span>
        </div>
      </div>
    </header>
  );
}
