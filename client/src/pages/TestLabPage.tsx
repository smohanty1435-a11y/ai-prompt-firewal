import React, { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  RotateCw,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ThreatBadge } from '../components/ThreatBadge.js';
import { ScanResultCard } from '../components/ScanResultCard.js';
import type {
  BenchmarkSample,
  BenchmarkSummary,
  BenchmarkItemResult,
  ScanResult,
} from '../types/index.js';

const CATEGORY_TAGS: Record<string, string> = {
  benign: 'Benign Control Sample',
  instruction_override: 'Instruction Override',
  role_change: 'Role Change (DAN)',
  secret_extraction: 'Secret Extraction',
  tool_abuse: 'Tool / Command Abuse',
  credential_theft: 'Credential Theft',
  context_poisoning: 'Context Poisoning',
  indirect_prompt_injection: 'Indirect Prompt Injection',
  encoded_instructions: 'Encoded Payload',
  multistep_jailbreak: 'Multi-Step Jailbreak',
};

export const TestLabPage: React.FC = () => {
  const [samples, setSamples] = useState<BenchmarkSample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  const [benchmarkSummary, setBenchmarkSummary] = useState<BenchmarkSummary | null>(null);
  const [itemResults, setItemResults] = useState<Record<string, BenchmarkItemResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [runningIndividualId, setRunningIndividualId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      setLoadingSamples(true);
      try {
        const res = await api.getBenchmarkSamples();
        if (res.success) {
          setSamples(res.samples);
        }
      } catch (err) {
        console.error('Failed to load benchmark samples:', err);
      } finally {
        setLoadingSamples(false);
      }
    };

    fetchSamples();
  }, []);

  const handleRunFullBenchmark = async () => {
    setIsRunningAll(true);
    setSelectedScan(null);
    try {
      const res = await api.runBenchmarkEvaluation();
      if (res.success) {
        setBenchmarkSummary(res.summary);
        const map: Record<string, BenchmarkItemResult> = {};
        for (const item of res.results) {
          map[item.id] = item;
        }
        setItemResults(map);
      }
    } catch (err) {
      console.error('Benchmark suite execution failure:', err);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleRunSingleSample = async (sample: BenchmarkSample) => {
    setRunningIndividualId(sample.id);
    try {
      const scanRes = await api.scanText(sample.prompt, 'text');
      const scan = scanRes.scan;

      const passed =
        (sample.expectedDecision === 'ALLOW' && scan.decision === 'ALLOW') ||
        (sample.expectedDecision === 'BLOCK' && (scan.decision === 'BLOCK' || scan.decision === 'QUARANTINE'));

      const resultItem: BenchmarkItemResult = {
        id: sample.id,
        name: sample.name,
        category: sample.category,
        expectedDecision: sample.expectedDecision,
        actualDecision: scan.decision,
        riskScore: scan.riskScore,
        passed,
        scan,
      };

      setItemResults((prev) => ({ ...prev, [sample.id]: resultItem }));
      setSelectedScan(scan);
    } catch (err) {
      console.error(`Failed to scan sample ${sample.id}:`, err);
    } finally {
      setRunningIndividualId(null);
    }
  };

  const filteredSamples = samples.filter((s) => {
    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'benign' && s.category === 'benign') ||
      (filterCategory === 'attacks' && s.category !== 'benign') ||
      s.category === filterCategory;

    const matchesSearch =
      searchTerm === '' ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prompt.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Security Test Lab & Benchmark Suite</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-cyan-950 text-cyan-400 border border-cyan-800">
              EVALUATION HARNESS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized evaluation dataset containing benign queries and adversarial attacks across all 7 mandatory attack vectors.
          </p>
        </div>

        <button
          onClick={handleRunFullBenchmark}
          disabled={isRunningAll || loadingSamples}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
        >
          <Play size={15} className={isRunningAll ? 'animate-spin' : ''} />
          <span>{isRunningAll ? 'Evaluating Benchmark Suite...' : 'Run Full Benchmark Suite'}</span>
        </button>
      </div>

      {/* Benchmark Summary Metrics Card */}
      {benchmarkSummary && (
        <div className="glass-panel p-6 rounded-xl border border-cyan-800/40 threat-glow-allow space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              <span>Benchmark Evaluation Report (N = {benchmarkSummary.totalSamples})</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800">
              Live Verified
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Precision</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {benchmarkSummary.precisionPercentage}%
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Recall</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {benchmarkSummary.recallPercentage}%
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">False Positive Rate</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {benchmarkSummary.falsePositiveRatePercentage}%
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">True Positives</span>
              <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                {benchmarkSummary.truePositives}
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">True Negatives</span>
              <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                {benchmarkSummary.trueNegatives}
              </div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">False Positives</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {benchmarkSummary.falsePositives}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search size={15} className="text-slate-500 ml-1" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test samples by prompt keyword or vector name..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Samples ({samples.length})</option>
            <option value="benign">Benign Controls Only</option>
            <option value="attacks">Malicious Attacks Only</option>
            <option value="instruction_override">Instruction Override</option>
            <option value="role_change">Role Change (DAN)</option>
            <option value="secret_extraction">Secret Extraction</option>
            <option value="tool_abuse">Tool Abuse</option>
            <option value="credential_theft">Credential Theft</option>
            <option value="context_poisoning">Context Poisoning</option>
            <option value="indirect_prompt_injection">Indirect Injection</option>
            <option value="encoded_instructions">Encoded Payload</option>
          </select>
        </div>
      </div>

      {/* Sample Cards List */}
      <div className="space-y-4">
        {filteredSamples.map((sample) => {
          const result = itemResults[sample.id];
          const isTestingThis = runningIndividualId === sample.id;

          return (
            <div
              key={sample.id}
              className={`glass-panel p-5 rounded-xl border transition ${
                result
                  ? result.passed
                    ? 'border-emerald-800/40 bg-emerald-950/10'
                    : 'border-rose-800/40 bg-rose-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        sample.category === 'benign'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {CATEGORY_TAGS[sample.category] || sample.category}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-200">{sample.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400">{sample.description}</p>
                </div>

                {/* Status / Run Button */}
                <div className="flex items-center gap-3">
                  {result && (
                    <div className="flex items-center gap-2 text-xs">
                      <ThreatBadge decision={result.actualDecision} size="sm" />
                      {result.passed ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono text-[11px]">
                          <CheckCircle size={14} /> Pass
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold font-mono text-[11px]">
                          <XCircle size={14} /> Fail
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleRunSingleSample(sample)}
                    disabled={isTestingThis || isRunningAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 rounded-lg border border-cyan-800/50 transition disabled:opacity-50"
                  >
                    <RotateCw size={13} className={isTestingThis ? 'animate-spin' : ''} />
                    <span>{isTestingThis ? 'Testing...' : 'Test Now'}</span>
                  </button>

                  {result?.scan && (
                    <button
                      onClick={() =>
                        setSelectedScan(
                          selectedScan?.scanId === result.scan.scanId ? null : result.scan
                        )
                      }
                      className="text-xs text-slate-400 hover:text-slate-200 underline font-medium"
                    >
                      {selectedScan?.scanId === result.scan.scanId ? 'Hide' : 'Inspect'}
                    </button>
                  )}
                </div>
              </div>

              {/* Prompt Text Box */}
              <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800/60 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {sample.prompt}
              </div>

              {/* Inline Scan Telemetry Viewer */}
              {selectedScan && result?.scan && selectedScan.scanId === result.scan.scanId && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <ScanResultCard scan={selectedScan} onClear={() => setSelectedScan(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
