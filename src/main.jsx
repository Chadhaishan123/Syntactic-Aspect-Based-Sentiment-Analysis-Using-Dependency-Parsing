import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RealtimeProvider } from './context/RealtimeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Overview from './pages/Overview';
import Studio from './pages/Studio';
import LiveStream from './pages/LiveStream';
import BatchInspector from './pages/BatchInspector';
import Insights from './pages/Insights';
import Methodology from './pages/Methodology';
import History from './pages/History';

import './styles.css';

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="app-main">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="app-content-area">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analyze" element={<Studio />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/live" element={<LiveStream />} />
            <Route path="/batch" element={<BatchInspector />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <AppLayout />
      </RealtimeProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
