import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RealtimeProvider } from './context/RealtimeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Overview from './pages/Overview';
import Studio from './pages/Studio';
import Compare from './pages/Compare';
import AspectQA from './pages/AspectQA';

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
            <Route path="/compare" element={<Compare />} />
            <Route path="/aspect-qa" element={<AspectQA />} />
            <Route path="*" element={<Overview />} />
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
