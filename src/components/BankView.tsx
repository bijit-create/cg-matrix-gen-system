// Bank — destination for a completed generation run. Shows the questions with
// three primary actions: Run Audit, Export ZIP, Regenerate batch. Stage E3 adds
// the color-coded AuditView beneath.

import React, { useState } from 'react';
import { useBank, bankStore } from './bankStore';
import { QuestionBody } from './QuestionBody';
import { Icon } from './swiftee/atoms';
import type { AuditResult } from '../agents/audit';

export interface BankViewProps {
  /** LatexText component threaded in from App.tsx so the bank doesn't re-import katex. */
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
  /** Triggers a browser download via the existing exporter. */
  onExport: () => Promise<void> | void;
}

export const BankView: React.FC<BankViewProps> = ({ Latex, onExport }) => {
  const bank = useBank();
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<{ done: number; total: number } | null>(null);

  const runAudit = async () => {
    if (bank.questions.length === 0) return;
    setAuditing(true);
    setAuditProgress({ done: 0, total: bank.questions.length });
    try {
      const { runFullAudit } = await import('../agents/audit');
      const result: AuditResult = await runFullAudit(bank.questions, {
        lo: bank.lo,
        skill: bank.skill,
        metadata: bank.metadata,
        profile: bank.gradeScopeProfile,
        chapterContent: bank.chapterContent,
        boardProfile: bank.boardProfile,
        onProgress: (done, total) => setAuditProgress({ done, total }),
      });
      bankStore.setAudit(result);
    } catch (e) {
      // Swallowed — shown through the audit panel (Stage E3). For now log.
      console.error('Audit failed', e);
    } finally {
      setAuditing(false);
      setAuditProgress(null);
    }
  };

  if (bank.questions.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', maxWidth: 640, margin: '80px auto' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--bg-tint)', color: 'var(--swiftee-purple)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Icon name="inventory_2" size="xl" />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
          color: 'var(--swiftee-deep)', marginBottom: 8,
        }}>
          Nothing banked yet
        </div>
        <div style={{ color: 'var(--fg-secondary)', fontSize: 14, lineHeight: 1.55 }}>
          Run a generation in <b style={{ color: 'var(--swiftee-deep)' }}>Workspace</b> — Quick
          or Pipeline mode. Once you approve the final set (or finish a Quick batch), the
          questions land here for audit, regeneration, and export.
        </div>
      </div>
    );
  }

  const total = bank.questions.length;
  const failCount = bank.audit?.perQuestion.filter(r => r.severity === 'fail').length ?? 0;
  const warnCount = bank.audit?.perQuestion.filter(r => r.severity === 'warn').length ?? 0;
  const passCount = bank.audit?.perQuestion.filter(r => r.severity === 'pass').length ?? 0;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 16,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
            color: 'var(--swiftee-deep)', lineHeight: 1.2,
          }}>Bank</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
            {total} items from a {bank.mode === 'pipeline' ? 'Pipeline' : 'Quick Generate'} run
            {bank.metadata?.gradeCode && <> · Grade {bank.metadata.gradeCode}</>}
            {bank.metadata?.subjectCode && <> · {bank.metadata.subjectCode}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {bank.audit && (
            <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
              {passCount > 0 && <span className="sw-chip sw-chip-green sw-chip-sm">{passCount} pass</span>}
              {warnCount > 0 && <span className="sw-chip sw-chip-gold sw-chip-sm">{warnCount} warn</span>}
              {failCount > 0 && <span className="sw-chip sw-chip-red sw-chip-sm">{failCount} fail</span>}
            </div>
          )}
          <button
            className="sw-btn sw-btn-primary"
            disabled={auditing}
            onClick={runAudit}
            title="Run full audit across every QA parameter"
          >
            <Icon name="check_circle" size="sm" />
            {auditing
              ? (auditProgress ? `Auditing ${auditProgress.done}/${auditProgress.total}…` : 'Auditing…')
              : bank.audit ? 'Re-run audit' : 'Run audit'}
          </button>
          <button className="sw-btn sw-btn-ghost" onClick={onExport}>
            <Icon name="download" size="sm" /> Export ZIP
          </button>
        </div>
      </div>

      {/* Set-level audit flags (if any) */}
      {bank.audit && bank.audit.setFlags.length > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: '#FFF9E6', borderLeft: '3px solid var(--swiftee-gold)',
          marginBottom: 14, fontSize: 12, color: '#8A5A00',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Set-level findings</div>
          {bank.audit.setFlags.map((f, i) => (
            <div key={i} style={{ marginTop: 2 }}>
              · <b style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>{f.category}</b> — {f.message}
            </div>
          ))}
        </div>
      )}

      {/* Question list (E3 will replace this with the full AuditView cards) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bank.questions.map(q => {
          const report = bank.audit?.perQuestion.find(r => r.questionId === (q.id || q.question_id));
          const borderColor =
            report?.severity === 'fail' ? '#C8573B'
            : report?.severity === 'warn' ? 'var(--swiftee-gold)'
            : report?.severity === 'pass' ? 'var(--green-300)'
            : 'var(--border-subtle)';
          return (
            <div
              key={q.id || q.question_id}
              style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="sw-chip sw-chip-purple sw-chip-sm">{q.cell || q.cg_cell}</span>
                <span className="sw-chip sw-chip-outline sw-chip-sm">{String(q.type || 'mcq').toUpperCase().replace('_', ' ')}</span>
                {report?.severity === 'fail' && <span className="sw-chip sw-chip-red sw-chip-sm">FAIL</span>}
                {report?.severity === 'warn' && <span className="sw-chip sw-chip-gold sw-chip-sm">WARN</span>}
                {report?.severity === 'pass' && <span className="sw-chip sw-chip-green sw-chip-sm">PASS</span>}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {q.id || q.question_id}
                </span>
              </div>
              <QuestionBody
                q={q}
                qType={q.type || 'mcq'}
                image={bank.questionImages[q.id || q.question_id]}
                density="compact"
                Latex={Latex}
              />
              {report && report.flags.length > 0 && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 8,
                  background: '#FAFAFC', border: '1px solid var(--border-subtle)',
                  fontSize: 11, color: 'var(--fg-secondary)',
                }}>
                  <div style={{
                    fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 4,
                  }}>
                    Findings · {report.flags.length}
                  </div>
                  {report.flags.slice(0, 5).map((f, i) => {
                    const dot = f.severity === 'fail' ? '#C8573B' : f.severity === 'warn' ? '#F5B301' : 'var(--green-300)';
                    return (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 2 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0 }} />
                        <span><b style={{ color: 'var(--swiftee-deep)' }}>{f.category}:</b> {f.message}</span>
                      </div>
                    );
                  })}
                  {report.flags.length > 5 && (
                    <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--fg-muted)' }}>
                      +{report.flags.length - 5} more…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BankView;
