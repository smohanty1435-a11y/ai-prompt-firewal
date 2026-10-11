import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  ScanLine,
  Bot,
  FlaskConical,
  History,
  Server,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { HealthStatus } from '../types/index.js';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const data = await api.getHealth();
        if (mounted) {
          setHealth(data);
          setIsHealthy(data.status === 'ok');
        }
      } catch {
        if (mounted) {
          setIsHealthy(false);
        }
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'Firewall Scanner', icon: ScanLine },
    { id: 'chat', label: 'Protected AI Agent', icon: Bot },
    { id: 'lab', label: 'Test Lab & Benchmarks', icon: FlaskConical },
    { id: 'history', label: 'Scan Audit History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-cyan-900/30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 shadow-md shadow-cyan-500/20 text-slate-950 font-bold">
              <ShieldCheck size={22} className="text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-slate-100 font-mono">
                  SENTINEL<span className="text-cyan-400">.AI</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-850">
                  FIREWALL
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Agentic Prompt Injection Firewall
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shadow-sm shadow-cyan-900/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Live System Health Pill */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
                isHealthy
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : isHealthy === false
                  ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title={
                health
                  ? `Service: ${health.service} | DB: ${health.dependencies?.database?.mode} | Uptime: ${health.uptimeSeconds}s`
                  : 'Connecting to firewall gateway...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isHealthy ? 'Gateway Protected' : isHealthy === false ? 'Gateway Offline' : 'Connecting'}
              </span>
              <Server size={12} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-3 space-x-1 border-t border-slate-800/60 bg-slate-950/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
