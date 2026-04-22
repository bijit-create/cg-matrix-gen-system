// Stage E3 — per-question audited card with color-coded left border and
// flag list. Uses QuestionBody for the actual question rendering.

import React, { useState } from 'react';
import { QuestionBody } from './QuestionBody';
import { Icon } from './swiftee/atoms';
import type { AuditReport, AuditFlag } from '../agents/audit';

const sevBorder = (s: 'pass' | 'warn' | 'fail' | undefined) =>
  s === 'fail' ? '#C8573B'
  : s === 'warn' ? 'var(--swiftee-gold)'
  : s === 'pass' ? 'var(--green-300)'
  : 'var(--border-subtle)';

const sevChipKind = (s: 'pass' | 'warn' | 'fail'): 'red' | 'gold' | 'green' =>
  s === 'fail' ? 'red' : s === 'warn' ? 'gold' : 'green';

const sevDot = (s: 'pass' | 'warn' | 'fail') =>
  s === 'fail' ? '#C8573B' : s === 'warn' ? '#F5B301' : 'var(--green-300)';

export interface AuditCardProps {
  q: any;
  report?: AuditReport;
  image?: string;
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
  onRegenerateWithFeedback?: (q: any, report: AuditReport) => void | Promise<void>;
  onEdit?: (q: any) => void;
  busy?: boolean;
}

export const AuditCard: React.FC<AuditCardProps> = ({
  q, report, image, Latex, onRegenerateWithFeedback, onEdit, busy,
}) => {
  const sev = report?.severity;
  const qId = q.id || q.question_id;
  const flags = report?.flags || [];
  // Fails/warns start expanded, passes collapsed.
  const [flagsOpen, setFlagsOpen] = useState(sev !== 'pass');

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border-subtle)',
        borderLeft: `4px solid ${sevBorder(sev)}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 14px',
        borderBottom: flagsOpen && flags.length > 0 ? '1px solid var(--border-subtle)' : 'none',
      }}>
        <span className="sw-chip sw-chip-purple sw-chip-sm">{q.cell || q.cg_cell}</span>
        <span className="sw-chip sw-chip-outline sw-chip-sm">{String(q.type || 'mcq').toUpperCase().replace('_', ' ')}</span>
        {sev && <span className={`sw-chip sw-chip-${sevChipKind(sev)} sw-chip-sm`}>{sev.toUpperCase()}</span>}
        {typeof report?.score === 'number' && (
          <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
            SME {report.score}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{qId}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px' }}>
        <QuestionBody q={q} qType={q.type || 'mcq'} image={image} density="compact" Latex={Latex} />
      </div>

      {/* Flag list + actions */}
      {flags.length > 0 && (
        <div>
          <button
            onClick={() => setFlagsOpen(v => !v)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 14px',
              background: '#FAFAFC', border: 'none',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, cursor: 'pointer',
            }}
          >
            <Icon name={flagsOpen ? 'expand_less' : 'expand_more'} size="sm" />
            <span style={{ fontWeight: 700, color: 'var(--swiftee-deep)' }}>
              {flags.length} finding{flags.length === 1 ? '' : 's'}
            </span>
            {!flagsOpen && (
              <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>
                {flags.slice(0, 2).map(f => f.category).join(', ')}{flags.length > 2 ? '…' : ''}
              </span>
            )}
          </button>
          {flagsOpen && (
            <div style={{
              padding: '8px 14px 14px',
              background: '#FAFAFC',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {flags.map((f: AuditFlag, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '6px 10px', borderRadius: 8,
                      background: '#fff', border: `1px solid ${sevBorder(f.severity)}`,
                      fontSize: 12, lineHeight: 1.45,
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: sevDot(f.severity), marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div>
                        <span style={{
                          fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
                          fontWeight: 800, color: sevDot(f.severity),
                          fontFamily: 'var(--font-display)', marginRight: 8,
                        }}>{f.category}</span>
                        <span style={{ color: 'var(--swiftee-deep)' }}>{f.message}</span>
                      </div>
                      {f.fix && (
                        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--fg-secondary)', fontStyle: 'italic' }}>
                          → {f.fix}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {report && onRegenerateWithFeedback && (
                  <button
                    className="sw-btn sw-btn-primary sw-btn-sm"
                    disabled={busy}
                    onClick={() => onRegenerateWithFeedback(q, report)}
                  >
                    <Icon name="refresh" size="sm" />
                    {busy ? 'Regenerating…' : 'Regenerate with feedback'}
                  </button>
                )}
                {onEdit && (
                  <button
                    className="sw-btn sw-btn-ghost sw-btn-sm"
                    onClick={() => onEdit(q)}
                  >
                    <Icon name="edit" size="sm" /> Edit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditCard;
