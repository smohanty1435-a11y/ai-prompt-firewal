import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  FileCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ThreatBadge } from '../components/ThreatBadge.js';
import { ScanResultCard } from '../components/ScanResultCard.js';
import type { ScanResult } from '../types/index.js';

interface HistoryPageProps {
  onSelectScan?: (scan: ScanResult) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = () => {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [decisionFilter, setDecisionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [inspectModalScan, setInspectModalScan] = useState<ScanResult | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getScansHistory({
        page,
        limit,
        decision: decisionFilter || undefined,
        sourceType: sourceFilter || undefined,
        search: searchQuery || undefined,
      });

      if (res.success) {
        setScans(res.scans);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, decisionFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'url':
        return (
          <span className="flex items-center gap-1 text-cyan-300 font-mono text-[11px]">
            <Globe size={13} /> URL
          </span>
        );
      case 'pdf':
        return (
          <span className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
            <FileCheck size={13} /> PDF
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <FileText size={13} /> Text
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Audit & Scan History Log</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-cyan-950 text-cyan-400 border border-cyan-800">
              {totalCount} RECORDS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete cryptographic audit trail of all past firewall evaluations, decisions, and evidence records.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
          <span>Refresh Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search size={15} className="text-slate-500 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by scan ID or explanation keywords..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700 font-medium"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Decisions</option>
              <option value="BLOCK">BLOCK Only</option>
              <option value="ALLOW">ALLOW Only</option>
              <option value="QUARANTINE">QUARANTINE Only</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Ingestion Sources</option>
              <option value="text">Direct Text</option>
              <option value="pasted">Pasted Text</option>
              <option value="pdf">PDF Upload</option>
              <option value="url">URL Fetch</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs">
          Notice: {error}
        </div>
      )}

      {/* History Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {scans.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <History size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">No records found matching filters</p>
            <p className="text-slate-600">Run a scan in the Workspace to log security inspection events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Scan ID</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Enforcement Decision</th>
                  <th className="py-3 px-4">Risk Rating</th>
                  <th className="py-3 px-4">Attack Categories</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scans.map((scan) => (
                  <tr
                    key={scan.scanId}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setInspectModalScan(scan)}
                  >
                    <td className="py-3 px-4 font-mono text-cyan-300 font-medium">
                      {scan.scanId}
                    </td>
                    <td className="py-3 px-4">
                      {getSourceBadge(scan.sourceType)}
                    </td>
                    <td className="py-3 px-4">
                      <ThreatBadge decision={scan.decision} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
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
                    <td className="py-3 px-4 text-slate-300">
                      {scan.attackCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {scan.attackCategories.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300"
                            >
                              {c.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {scan.processingDurationMs}ms
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(scan.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectModalScan(scan);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs"
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

        {/* Pagination Toolbar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/60 text-xs">
          <span className="text-slate-400">
            Showing Page <span className="font-mono text-slate-200">{page}</span> of{' '}
            <span className="font-mono text-slate-200">{totalPages}</span> ({totalCount} total scans)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Detail Modal */}
      {inspectModalScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-t-xl border border-slate-800">
              <span className="text-sm font-bold text-slate-200">
                Scan Audit Detail — {inspectModalScan.scanId}
              </span>
              <button
                onClick={() => setInspectModalScan(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <ScanResultCard scan={inspectModalScan} onClear={() => setInspectModalScan(null)} />
          </div>
        </div>
      )}
    </div>
  );
};
