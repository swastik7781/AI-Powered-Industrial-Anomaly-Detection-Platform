import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function History() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/history');
      if (!res.ok) throw new Error("API Offline");
      const data = await res.json();
      setHistoryData(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col font-sans animation-fade-in text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">Inspection History</h1>
          <p className="text-sm text-gray-500 mt-1">Audit log of all surface evaluations and anomalous discoveries.</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search ID..." 
              className="pl-9 pr-4 py-2 bg-industrial-800 border border-industrial-700 rounded-md text-sm text-gray-300 focus:outline-none focus:border-accent-500 w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-industrial-800 border border-industrial-700 hover:bg-industrial-700 rounded-md text-sm transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 bg-industrial-800/50 border border-industrial-700 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-industrial-800 border-b border-industrial-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="p-4">Record ID</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Object Class</th>
              <th className="p-4">Status</th>
              <th className="p-4">Confidence</th>
              <th className="p-4">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-700/50">
            {loading && historyData.length === 0 && (
               <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading historical telemetry...</td></tr>
            )}
            {!loading && historyData.length === 0 && (
               <tr><td colSpan="6" className="p-8 text-center text-gray-500">No anomalies have been recorded recently.</td></tr>
            )}
            {historyData.map((row) => (
              <tr key={row.id} className="hover:bg-industrial-700/30 transition-colors">
                <td className="p-4 font-mono text-sm text-gray-300">{row.id}</td>
                <td className="p-4 text-sm text-gray-400">{row.date} <span className="text-gray-500">{row.time}</span></td>
                <td className="p-4 text-sm font-medium text-gray-300 capitalize">{row.type}</td>
                <td className="p-4">
                  {row.status === 'Anomaly' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-danger-900/30 text-danger-500 border border-danger-500/20">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Defect
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-success-900/30 text-success-500 border border-success-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Nominal
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-gray-300">{(row.conf * 100).toFixed(1)}%</span>
                    <div className="w-16 h-1 bg-industrial-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${row.status === 'Anomaly' ? 'bg-danger-500' : 'bg-success-500'}`} 
                        style={{ width: `${row.conf * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm font-mono text-gray-400">{row.lat}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
