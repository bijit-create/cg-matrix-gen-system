// Stage A.1 skeleton — four-phase indicator. Wired in Stage B/C with real state.
// Phases: Brief → Generate → Triage → Export.

import React from 'react';

export type PhaseState = 'pending' | 'active' | 'done' | 'failed';

export interface Phase {
  id: string;
  label: string;
  state: PhaseState;
  /** Optional sub-chips (Pipeline expands Generate into agent substeps) */
  sub?: Phase[];
}

const chipClass = (state: PhaseState) => {
  switch (state) {
    case 'done': return 'bg-[#E8F5E9] text-[#1B5E20] border-[var(--success)]';
    case 'active': return 'bg-[#E3F2FD] text-[#0D47A1] border-[#1565C0] animate-pulse';
    case 'failed': return 'bg-[#FFEBEE] text-[#B71C1C] border-[var(--danger)]';
    default: return 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--line-dark)]';
  }
};

export const PhaseChips: React.FC<{ phases: Phase[]; className?: string }> = ({ phases, className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {phases.map((p, i) => (
      <React.Fragment key={p.id}>
        <div className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${chipClass(p.state)}`}>
          {p.label}
        </div>
        {i < phases.length - 1 && <span className="text-[var(--ink-muted)] text-xs">→</span>}
      </React.Fragment>
    ))}
  </div>
);

export default PhaseChips;
