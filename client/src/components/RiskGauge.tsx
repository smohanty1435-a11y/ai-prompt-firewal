import React from 'react';

interface RiskGaugeProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, size = 110, strokeWidth = 10 }) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG dimensions
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;

  let strokeColor = '#10b981'; // emerald
  let textClass = 'text-emerald-400';
  let tierLabel = 'LOW RISK';

  if (safeScore >= 75) {
    strokeColor = '#f43f5e'; // rose
    textClass = 'text-rose-400';
    tierLabel = 'CRITICAL';
  } else if (safeScore >= 50) {
    strokeColor = '#f97316'; // orange
    textClass = 'text-orange-400';
    tierLabel = 'HIGH THREAT';
  } else if (safeScore >= 30) {
    strokeColor = '#f59e0b'; // amber
    textClass = 'text-amber-400';
    tierLabel = 'MODERATE';
  }

  return (
    <div className="flex flex-col items-center justify-center select-none" role="meter" aria-valuenow={safeScore} aria-valuemin={0} aria-valuemax={100} aria-label={`Risk score: ${safeScore} out of 100`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
            fill="transparent"
          />
          {/* Animated active progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s ease' }}
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-2xl font-bold font-mono tracking-tight leading-none ${textClass}`}>
            {safeScore}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
          {tierLabel}
        </span>
      </div>
    </div>
  );
};
