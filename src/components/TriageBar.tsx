// Stage A.1 skeleton — counter-only triage bar. Stage C adds filter chips,
// post-check banners, and bulk actions. Kept minimal so it compiles now.

import React from 'react';

export interface TriageBarProps {
  total: number;
  approved?: number;
  rejected?: number;
  flagged?: number;
  className?: string;
}

export const TriageBar: React.FC<TriageBarProps> = ({
  total, approved, rejected, flagged, className = ''
}) => {
  if (total === 0) return null;
  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 tech-border bg-[var(--surface)] text-xs font-mono ${className}`}>
      <span className="font-bold">{total} total</span>
      {typeof approved === 'number' && (
        <span className="text-[var(--success)]">{approved} approved</span>
      )}
      {typeof rejected === 'number' && rejected > 0 && (
        <span className="text-[var(--danger)]">{rejected} rejected</span>
      )}
      {typeof flagged === 'number' && flagged > 0 && (
        <span className="text-[#E65100]">{flagged} flagged</span>
      )}
    </div>
  );
};

export default TriageBar;
