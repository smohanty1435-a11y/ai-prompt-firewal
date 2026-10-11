import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  TrendingUp,
  FileText,
  Globe,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ThreatBadge } from '../components/ThreatBadge.js';
import type { DashboardMetrics, ScanResult } from '../types/index.js';

interface DashboardPageProps {
  onSelectScan: (scan: ScanResult) => void;
  onNavigateScanner: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  instruction_override: 'Instruction Override',
  role_change: 'Role Change / Persona Hijack',
  secret_extraction: 'Secret Extraction',
  tool_abuse: 'Tool / Command Abuse',
  credential_theft: 'Credential Theft',
  context_poisoning: 'Context Poisoning',
  indirect_prompt_injection: 'Indirect Prompt Injection',
  encoded_instructions: 'Encoded / Steganography',
  multistep_jailbreak: 'Multi-Step Jailbreak',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectScan, onNavigateScanner }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardSummary();
      if (res.success) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Security Operations Dashboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-cyan-950 text-cyan-400 border border-cyan-800">
              LIVE TELEMETRY
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics and attack vector classification metrics across all protected ingestion pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateScanner}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-md shadow-cyan-500/20 transition"
          >
            <span>Scan New Input</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs">
          Notice: {error}. Start the backend server or execute a scan to populate telemetry.
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Scans */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Scans</span>
            <Activity size={18} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">
              {metrics?.totalScans ?? 0}
            </span>
            <span className="text-xs text-slate-400">inspected</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">All sources combined</div>
        </div>

        {/* Blocked Threats */}
        <div className="glass-panel p-5 rounded-xl border border-rose-900/40 threat-glow-block">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300 uppercase tracking-wider">Blocked Attacks</span>
            <ShieldAlert size={18} className="text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-rose-400">
              {metrics?.blockedCount ?? 0}
            </span>
            <span className="text-xs text-rose-300/80 font-mono">
              ({metrics?.blockRatePercentage ?? 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Neutralized prior to agent</div>
        </div>

        {/* Quarantined */}
        <div className="glass-panel p-5 rounded-xl border border-amber-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">Quarantined</span>
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {metrics?.quarantinedCount ?? 0}
            </span>
            <span className="text-xs text-slate-400">isolated</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Requires security review</div>
        </div>

        {/* Allowed Safe */}
        <div className="glass-panel p-5 rounded-xl border border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">Passed Clean</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {metrics?.allowedCount ?? 0}
            </span>
            <span className="text-xs text-slate-400">safe</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Passed to downstream LLM</div>
        </div>

        {/* Avg Risk Score */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Risk Score</span>
            <TrendingUp size={18} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">
              {metrics?.averageRiskScore ?? 0}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Aggregate fleet risk</div>
        </div>
      </div>

      {/* Middle Grid: Category Distribution & Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Category Breakdown */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
              Threat Vector Distribution by Category
            </h3>
            <span className="text-xs text-slate-500 font-mono">Real Ingestion Counts</span>
          </div>

          <div className="space-y-3 pt-2">
            {metrics?.categoryDistribution &&
              Object.entries(metrics.categoryDistribution).map(([category, count]) => {
                const total = metrics.totalScans || 1;
                const percentage = Math.min(100, Math.round((count / total) * 100));
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">
                        {CATEGORY_NAMES[category] || category}
                      </span>
                      <span className="font-mono text-slate-400">
                        {count} hits ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          count > 0 ? 'bg-gradient-to-r from-cyan-500 to-rose-500' : 'bg-transparent'
                        }`}
                        style={{ width: `${Math.max(count > 0 ? 5 : 0, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Input Source Distribution */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Ingestion Channels
          </h3>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-cyan-400" />
                <span className="text-xs font-medium text-slate-300">Direct / Pasted Text</span>
              </div>
              <span className="text-sm font-bold font-mono text-slate-100">
                {(metrics?.sourceDistribution?.text ?? 0) + (metrics?.sourceDistribution?.pasted ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <FileCheck size={18} className="text-amber-400" />
                <span className="text-xs font-medium text-slate-300">PDF Document Uploads</span>
              </div>
              <span className="text-sm font-bold font-mono text-slate-100">
                {metrics?.sourceDistribution?.pdf ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">Web Ingestion (URL)</span>
              </div>
              <span className="text-sm font-bold font-mono text-slate-100">
                {metrics?.sourceDistribution?.url ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Feed */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Recent Firewall Interceptions
          </h3>
          <span className="text-xs text-slate-500 font-mono">Last 8 Activity Events</span>
        </div>

        {(!metrics?.recentScans || metrics.recentScans.length === 0) ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <p>No scans recorded yet.</p>
            <p className="text-slate-600">Use the Scanner or Test Lab to submit prompts and observe real-time telemetry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                <tr>
                  <th className="py-2.5 px-3">Scan ID</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Categories</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics.recentScans.map((scan) => (
                  <tr
                    key={scan.scanId}
                    className="hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => onSelectScan(scan)}
                  >
                    <td className="py-3 px-3 font-mono text-slate-300 font-medium">
                      {scan.scanId}
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-400 font-mono text-[11px]">
                      {scan.sourceType}
                    </td>
                    <td className="py-3 px-3">
                      <ThreatBadge decision={scan.decision} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      <span
                        className={
                          scan.riskScore >= 75
                            ? 'text-rose-400'
                            : scan.riskScore >= 40
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {scan.riskScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {scan.attackCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {scan.attackCategories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300"
                            >
                              {CATEGORY_NAMES[cat] || cat}
                            </span>
                          ))}
                          {scan.attackCategories.length > 2 && (
                            <span className="text-[10px] text-slate-500">
                              +{scan.attackCategories.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScan(scan);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
