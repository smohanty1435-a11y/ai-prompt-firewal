import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  Code,
  Clock,
  Layers,
  FileText,
  Globe,
  FileCheck,
} from 'lucide-react';
import { ThreatBadge } from './ThreatBadge.js';
import { RiskGauge } from './RiskGauge.js';
import type { ScanResult } from '../types/index.js';

interface ScanResultCardProps {
  scan: ScanResult;
  onClear?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
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

export const ScanResultCard: React.FC<ScanResultCardProps> = ({ scan, onClear }) => {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(scan, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceIcon = () => {
    switch (scan.sourceType) {
      case 'url':
        return <Globe size={16} className="text-cyan-400" />;
      case 'pdf':
        return <FileCheck size={16} className="text-amber-400" />;
      default:
        return <FileText size={16} className="text-slate-400" />;
    }
  };

  const glowBorderClass =
    scan.decision === 'BLOCK'
      ? 'threat-glow-block'
      : scan.decision === 'QUARANTINE'
      ? 'threat-glow-quarantine'
      : 'threat-glow-allow';

  return (
    <div className={`glass-panel rounded-xl p-6 transition-all duration-300 border ${glowBorderClass}`}>
      {/* Top Banner: Status & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ThreatBadge decision={scan.decision} size="lg" />
          <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            ID: {scan.scanId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition"
            title="View Raw JSON"
          >
            <Code size={14} />
            <span>{showRawJson ? 'Hide JSON' : 'Inspect JSON'}</span>
          </button>
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 rounded border border-cyan-800/50 transition"
            title="Copy Report JSON"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid: Risk Gauge & Overview Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 border-b border-slate-800 items-center">
        <div className="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
          <RiskGauge score={scan.riskScore} size={110} />
          <div className="mt-2 text-center text-xs text-slate-400">
            Confidence: <span className="font-mono font-semibold text-slate-200">{scan.confidenceScore}%</span>
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Firewall Analysis Explanation
            </h4>
            <p className="text-sm text-slate-200 font-medium leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
              {scan.explanation}
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Recommended Remediation
            </h4>
            <p className="text-xs text-amber-200/90 bg-amber-950/20 p-2.5 rounded border border-amber-900/40 leading-relaxed">
              {scan.remediation}
            </p>
          </div>
        </div>
      </div>

      {/* Detected Attack Categories */}
      <div className="py-5 border-b border-slate-800">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-400" />
          Detected Attack Categories ({scan.attackCategories.length})
        </h4>

        {scan.attackCategories.length === 0 ? (
          <div className="text-xs text-emerald-400/90 flex items-center gap-2 bg-emerald-950/20 p-3 rounded border border-emerald-900/30">
            <span>✓ No attack vector signatures detected in content.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scan.attackCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-950/50 text-rose-300 border border-rose-800/50 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Snippets */}
      {scan.evidence && scan.evidence.length > 0 && (
        <div className="py-5 border-b border-slate-800">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400" />
            Sanitized Threat Evidence ({scan.evidence.length})
          </h4>

          <div className="space-y-3">
            {scan.evidence.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800/80 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-900 text-rose-200'
                          : item.severity === 'HIGH'
                          ? 'bg-orange-900 text-orange-200'
                          : 'bg-amber-900 text-amber-200'
                      }`}
                    >
                      {item.severity}
                    </span>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
                    Matched: {item.matchedPattern}
                  </span>
                </div>

                <div className="font-mono text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/60 overflow-x-auto text-[11px] text-rose-200/90 whitespace-pre-wrap">
                  {item.snippet}
                </div>

                <div className="text-slate-400 text-[11px] italic">
                  Analysis: {item.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata & Telemetry Footer */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            {getSourceIcon()}
            <span className="capitalize">{scan.sourceType}</span>
            {scan.sourceMetadata?.filename && ` (${scan.sourceMetadata.filename})`}
            {scan.sourceMetadata?.domain && ` (${scan.sourceMetadata.domain})`}
          </span>

          {scan.sourceMetadata?.charCount !== undefined && (
            <span>Chars: {scan.sourceMetadata.charCount}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Layers size={13} className="text-slate-500" />
            Methods: {scan.detectionMethods.join(', ')}
          </span>

          <span className="flex items-center gap-1">
            <Clock size={13} className="text-slate-500" />
            {scan.processingDurationMs}ms
          </span>
        </div>
      </div>

      {/* Raw JSON Modal / Dropdown */}
      {showRawJson && (
        <div className="mt-5 p-4 bg-slate-950 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400">Complete JSON Response Payload</span>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
            {JSON.stringify(scan, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
