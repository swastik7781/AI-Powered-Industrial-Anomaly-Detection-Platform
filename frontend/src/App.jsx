import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import LiveInspection from './pages/LiveInspection';
import History from './pages/History';
import Settings from './pages/Settings';

function App() {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<LiveInspection />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
