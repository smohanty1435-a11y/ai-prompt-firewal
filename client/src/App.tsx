import React, { useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ScannerPage } from './pages/ScannerPage.js';
import { ProtectedChatPage } from './pages/ProtectedChatPage.js';
import { TestLabPage } from './pages/TestLabPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import type { ScanResult } from './types/index.js';
import { ShieldCheck, Lock, Terminal, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeScanDetail, setActiveScanDetail] = useState<ScanResult | null>(null);

  const handleSelectScan = (scan: ScanResult) => {
    setActiveScanDetail(scan);
    setActiveTab('scanner');
  };

  const handleNavigateScanner = () => {
    setActiveScanDetail(null);
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-[#050811] cyber-grid text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onSelectScan={handleSelectScan}
            onNavigateScanner={handleNavigateScanner}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerPage
            initialScan={activeScanDetail}
            onClearInitialScan={() => setActiveScanDetail(null)}
          />
        )}

        {activeTab === 'chat' && <ProtectedChatPage />}

        {activeTab === 'lab' && <TestLabPage />}

        {activeTab === 'history' && <HistoryPage onSelectScan={handleSelectScan} />}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="font-semibold text-slate-300">Sentinel AI Firewall</span>
            <span>— ET AI Hackathon 2026: Agentic Cybersecurity (Problem 2)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Lock size={12} className="text-emerald-400" /> Zero-Trust AI Ingestion
            </span>
            <span className="flex items-center gap-1">
              <Terminal size={12} className="text-cyan-400" /> SSRF Hardened
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle size={12} className="text-amber-400" /> Multi-Layer Heuristics
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
