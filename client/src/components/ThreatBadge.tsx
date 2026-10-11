import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';
import type { FirewallDecision } from '../types/index.js';

interface ThreatBadgeProps {
  decision: FirewallDecision;
  size?: 'sm' | 'md' | 'lg';
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({ decision, size = 'md' }) => {
  const configs = {
    ALLOW: {
      label: 'ALLOW — PASSED',
      sublabel: 'Verified Safe',
      icon: ShieldCheck,
      classes: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300',
      iconClass: 'text-emerald-400',
    },
    BLOCK: {
      label: 'BLOCK — REJECTED',
      sublabel: 'Threat Neutralized',
      icon: ShieldAlert,
      classes: 'bg-rose-950/60 border-rose-500/50 text-rose-300',
      iconClass: 'text-rose-400',
    },
    QUARANTINE: {
      label: 'QUARANTINE — ISOLATED',
      sublabel: 'Untrusted Content',
      icon: AlertTriangle,
      classes: 'bg-amber-950/60 border-amber-500/50 text-amber-300',
      iconClass: 'text-amber-400',
    },
    REVIEW: {
      label: 'REVIEW — FLAGGED',
      sublabel: 'Requires Inspection',
      icon: HelpCircle,
      classes: 'bg-blue-950/60 border-blue-500/50 text-blue-300',
      iconClass: 'text-blue-400',
    },
  };

  const cfg = configs[decision] || configs.REVIEW;
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5 font-semibold',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium tracking-wide shadow-sm ${cfg.classes} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Security Decision: ${decision}`}
    >
      <Icon size={iconSizes[size]} className={cfg.iconClass} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};
