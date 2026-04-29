import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, History, Settings, Cpu } from 'lucide-react';

const navItems = [
  { name: 'Live Inspection', path: '/', icon: Activity },
  { name: 'Inspection History', path: '/history', icon: History },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-industrial-900 border-r border-industrial-800 flex-col hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-industrial-800">
        <Cpu className="w-6 h-6 text-accent-500 mr-3" />
        <span className="text-gray-100 font-semibold tracking-wide uppercase text-sm">Vision Sentinel</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? 'bg-industrial-800 text-accent-400 shadow-sm border border-industrial-700/50' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-industrial-800/50 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-industrial-800">
        <div className="text-xs text-industrial-600 text-center font-mono">Platform v1.0.0-rc1<br/>Production Grade</div>
      </div>
    </aside>
  );
}
