import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-industrial-900 text-gray-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden bg-industrial-900">
        <Topbar />
        
        {/* Subtle radial gradient background pattern for premium feel */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-industrial-800/20 via-transparent to-transparent pointer-events-none mt-16"></div>
        
        <main className="flex-1 overflow-auto p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
