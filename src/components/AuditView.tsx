// Stage E3 — visual AuditView. Renders AuditSummary + filter chips + list of
// color-coded AuditCards. Bulk regen actions are passthrough stubs here (E4
// will wire them). Used inside BankView when bank.audit is non-null.

import React, { useState, useMemo } from 'react';
import { AuditSummary } from './AuditSummary';
import { AuditCard } from './AuditCard';
import type { AuditResult, AuditReport } from '../agents/audit';

type SevFilter = 'all' | 'fail' | 'warn' | 'pass';

export interface AuditViewProps {
  questions: any[];
  audit: AuditResult;
  questionImages: Record<string, string>;
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
  onRegenerateWithFeedback?: (q: any, report: AuditReport) => void | Promise<void>;
  onBulkRegen?: (sev: 'fail' | 'warn') => void | Promise<void>;
  onEdit?: (q: any) => void;
  /** id of the question currently being regenerated (for spinner); null if none */
  busyQuestionId?: string | null;
  bulkBusy?: boolean;
}

export const AuditView: React.FC<AuditViewProps> = ({
  questions, audit, questionImages, Latex,
  onRegenerateWithFeedback, onBulkRegen, onEdit,
  busyQuestionId, bulkBusy,
}) => {
  const [filter, setFilter] = useState<SevFilter>('all');

  const reportByQid = useMemo(() => {
    const m = new Map<string, AuditReport>();
    audit.perQuestion.forEach(r => m.set(r.questionId, r));
    return m;
  }, [audit]);

  const counts = useMemo(() => ({
    all: audit.perQuestion.length,
    fail: audit.perQuestion.filter(r => r.severity === 'fail').length,
    warn: audit.perQuestion.filter(r => r.severity === 'warn').length,
    pass: audit.perQuestion.filter(r => r.severity === 'pass').length,
  }), [audit]);

  const visible = useMemo(() => questions.filter(q => {
    if (filter === 'all') return true;
    const r = reportByQid.get(q.id || q.question_id);
    return r?.severity === filter;
  }), [questions, filter, reportByQid]);

  return (
    <div>
      <AuditSummary audit={audit} onBulkRegen={onBulkRegen} bulkBusy={bulkBusy} />

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', 'fail', 'warn', 'pass'] as SevFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`sw-btn sw-btn-sm ${filter === f ? 'sw-btn-primary' : 'sw-btn-ghost'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} · {counts[f]}
          </button>
        ))}
      </div>

      {/* Card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(q => {
          const qId = q.id || q.question_id;
          return (
            <AuditCard
              key={qId}
              q={q}
              report={reportByQid.get(qId)}
              image={questionImages[qId]}
              Latex={Latex}
              onRegenerateWithFeedback={onRegenerateWithFeedback}
              onEdit={onEdit}
              busy={busyQuestionId === qId}
            />
          );
        })}
        {visible.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13,
          }}>
            No questions match this filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditView;
