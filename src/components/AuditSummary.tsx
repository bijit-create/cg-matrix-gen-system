// Stage E3 — audit summary header + per-category pass-rate bars.

import React from 'react';
import type { AuditResult, AuditFlag, AuditCategory } from '../agents/audit';
import { AUDIT_CATEGORY_LABELS } from '../agents/audit';

// Single source of truth lives in agents/audit.ts so every new category gets
// a clean label without per-component churn (Stage F categories: distractor
// source, misconception coverage, rationale hygiene, answer leak, image cue,
// edge cases — all flow through automatically).
const CATEGORY_LABELS = AUDIT_CATEGORY_LABELS;

/** Each category: { touched, flagged } across all questions. */
function summarizeByCategory(audit: AuditResult): Array<{
  category: AuditCategory;
  touched: number;       // questions where this category was evaluated
  flagged: number;       // questions with any flag in this category
  passPct: number;       // 100 * (touched - flagged) / touched
}> {
  const counts: Record<string, { touched: number; flagged: number }> = {};
  const total = audit.perQuestion.length;
  (Object.keys(CATEGORY_LABELS) as AuditCategory[]).forEach(c => {
    counts[c] = { touched: total, flagged: 0 };
  });
  audit.perQuestion.forEach(r => {
    const seen = new Set<AuditCategory>();
    r.flags.forEach(f => seen.add(f.category));
    seen.forEach(c => { counts[c].flagged += 1; });
  });
  return (Object.keys(CATEGORY_LABELS) as AuditCategory[])
    .map(c => ({
      category: c,
      touched: counts[c].touched,
      flagged: counts[c].flagged,
      passPct: counts[c].touched > 0 ? ((counts[c].touched - counts[c].flagged) / counts[c].touched) * 100 : 100,
    }))
    // Surface the categories with any flags first; fully-clean ones drop off.
    .filter(r => r.flagged > 0 || r.category === 'rule' || r.category === 'factual' || r.category === 'pedagogical' || r.category === 'language');
}

export const AuditSummary: React.FC<{
  audit: AuditResult;
  onBulkRegen?: (sev: 'fail' | 'warn') => void;
  bulkBusy?: boolean;
}> = ({ audit, onBulkRegen, bulkBusy }) => {
  const fail = audit.perQuestion.filter(r => r.severity === 'fail').length;
  const warn = audit.perQuestion.filter(r => r.severity === 'warn').length;
  const pass = audit.perQuestion.filter(r => r.severity === 'pass').length;
  const total = audit.perQuestion.length;
  const byCat = summarizeByCategory(audit);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
    }}>
      {/* Top row: counts + bulk actions */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap', marginBottom: 14,
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--fg-muted)', marginBottom: 4,
            fontFamily: 'var(--font-body)',
          }}>Audit summary</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <CountBlock label="Total" value={total} color="var(--swiftee-deep)" />
            <CountBlock label="Pass" value={pass} color="var(--green-400)" />
            <CountBlock label="Warn" value={warn} color="#B37400" />
            <CountBlock label="Fail" value={fail} color="#C8573B" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {fail > 0 && (
            <button
              className="sw-btn sw-btn-primary sw-btn-sm"
              disabled={bulkBusy}
              onClick={() => onBulkRegen?.('fail')}
            >
              {bulkBusy ? 'Working…' : `Regenerate ${fail} failing`}
            </button>
          )}
          {warn > 0 && (
            <button
              className="sw-btn sw-btn-ghost sw-btn-sm"
              disabled={bulkBusy}
              onClick={() => onBulkRegen?.('warn')}
            >
              {bulkBusy ? 'Working…' : `Regenerate ${warn} warns`}
            </button>
          )}
        </div>
      </div>

      {/* Category pass-rate bars */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 10,
      }}>
        {byCat.map(r => (
          <CategoryBar key={r.category} label={CATEGORY_LABELS[r.category]} passPct={r.passPct} flagged={r.flagged} touched={r.touched} />
        ))}
      </div>

      {/* Set-level flags — keep them visible here as a mini strip */}
      {audit.setFlags.length > 0 && (
        <div style={{
          marginTop: 12,
          display: 'flex', gap: 6, flexWrap: 'wrap',
        }}>
          {audit.setFlags.map((f: AuditFlag, i: number) => (
            <span
              key={i}
              className={`sw-chip sw-chip-${f.severity === 'fail' ? 'red' : 'gold'} sw-chip-sm`}
              title={f.message}
            >
              {CATEGORY_LABELS[f.category]}: {f.message.length > 60 ? f.message.slice(0, 60) + '…' : f.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const CountBlock: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
  </div>
);

const CategoryBar: React.FC<{
  label: string;
  passPct: number;
  flagged: number;
  touched: number;
}> = ({ label, passPct, flagged, touched }) => {
  const clean = flagged === 0;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 4, fontSize: 11,
      }}>
        <span style={{ color: 'var(--swiftee-deep)', fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--fg-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
          {clean ? `${touched}/${touched}` : `${touched - flagged}/${touched} pass`}
        </span>
      </div>
      <div style={{
        height: 6, background: '#F0F1F4', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${passPct.toFixed(0)}%`,
          background: passPct >= 90 ? 'var(--green-400)' : passPct >= 60 ? 'var(--swiftee-gold)' : '#C8573B',
          borderRadius: 3,
          transition: 'width 240ms var(--ease-out)',
        }} />
      </div>
    </div>
  );
};

export default AuditSummary;
