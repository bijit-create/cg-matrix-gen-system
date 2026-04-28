// Bank — destination for a completed generation run. Shows the questions with
// three primary actions: Run Audit, Export ZIP, Regenerate batch. Stage E3 adds
// the color-coded AuditView beneath.

import React, { useState } from 'react';
import { useBank, bankStore } from './bankStore';
import { QuestionBody } from './QuestionBody';
import { Icon } from './swiftee/atoms';
import { AuditView } from './AuditView';
import type { AuditResult, AuditReport } from '../agents/audit';
import { checkImageProviderHealth, type ImageProviderHealth } from '../agents/api';

export interface BankViewProps {
  /** LatexText component threaded in from App.tsx so the bank doesn't re-import katex. */
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
  /** Triggers a browser download via the existing exporter. */
  onExport: () => Promise<void> | void;
  /** Optional — wired in Stage E4. Regenerates a single question using the audit flags as EXTRA CONSTRAINT. */
  onRegenerateWithFeedback?: (q: any, report: AuditReport) => void | Promise<void>;
  /** Optional — wired in Stage E4. Serially regenerates all fails or all warns. */
  onBulkRegen?: (sev: 'fail' | 'warn') => void | Promise<void>;
  /** Generate (or regenerate) the image for a single question. */
  onGenerateImage?: (q: any) => void | Promise<void>;
  /** Optional — id of the question currently being regenerated. */
  busyQuestionId?: string | null;
  imageBusyQuestionId?: string | null;
  bulkBusy?: boolean;
}

export const BankView: React.FC<BankViewProps> = ({
  Latex, onExport, onRegenerateWithFeedback, onBulkRegen, onGenerateImage,
  busyQuestionId, imageBusyQuestionId, bulkBusy,
}) => {
  const bank = useBank();
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<{ done: number; total: number } | null>(null);
  const [providerHealth, setProviderHealth] = useState<ImageProviderHealth | null>(null);
  const [pingingProvider, setPingingProvider] = useState(false);

  const pingImageProvider = async () => {
    setPingingProvider(true);
    try {
      const r = await checkImageProviderHealth();
      setProviderHealth(r);
    } catch (e: any) {
      setProviderHealth({
        openai: { configured: false, model: 'unknown', reachable: false, error: e?.message?.slice(0, 120) || 'health check failed' },
        gemini: { configured: false, keyCount: 0 },
        strict: false,
      });
    } finally {
      setPingingProvider(false);
    }
  };

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
        imageProviders: bank.imageProviders,
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
          <button
            className="sw-btn sw-btn-ghost"
            onClick={pingImageProvider}
            disabled={pingingProvider}
            title="Check whether the image-gen pipeline is using OpenAI gpt-image-2 or falling back to Gemini"
          >
            <Icon name="image" size="sm" />
            {pingingProvider ? 'Checking…' : 'Image provider'}
          </button>
          <button className="sw-btn sw-btn-ghost" onClick={onExport}>
            <Icon name="download" size="sm" /> Export ZIP
          </button>
        </div>
      </div>

      {providerHealth && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: '#fff', border: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column', gap: 6,
          fontSize: 12, color: 'var(--swiftee-deep)',
          fontFamily: 'var(--font-body)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: providerHealth.openai.reachable ? '#27a55b'
                  : providerHealth.openai.configured ? '#C8573B'
                  : '#B37400',
              }} />
              <b>OpenAI {providerHealth.openai.model}</b>
              <span style={{ color: 'var(--fg-secondary)' }}>
                {providerHealth.openai.reachable
                  ? 'configured & reachable — gpt-image-2 is the active path'
                  : providerHealth.openai.configured
                    ? `configured but unreachable: ${providerHealth.openai.error || 'unknown error'}`
                    : 'OPENAI_API_KEY not set in Vercel — every image is Gemini fallback'}
              </span>
            </div>
            <button
              onClick={() => setProviderHealth(null)}
              className="sw-btn sw-btn-ghost sw-btn-sm"
              style={{ padding: '2px 8px' }}
              title="Dismiss"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: providerHealth.gemini.configured ? '#27a55b' : '#C8573B',
            }} />
            <b>Gemini</b>
            <span style={{ color: 'var(--fg-secondary)' }}>
              {providerHealth.gemini.configured
                ? `configured (${providerHealth.gemini.keyCount} key${providerHealth.gemini.keyCount === 1 ? '' : 's'}) — used as fallback`
                : 'GEMINI_API_KEY not set'}
            </span>
          </div>
          {providerHealth.strict && (
            <div style={{ marginTop: 4, color: '#B37400' }}>
              <b>Strict mode</b> active (IMAGE_PROVIDER_STRICT=true) — OpenAI failures will not fall back to Gemini.
            </div>
          )}
        </div>
      )}

      {/* Audit view when results exist; otherwise a plain pre-audit question list. */}
      {bank.audit ? (
        <AuditView
          questions={bank.questions}
          audit={bank.audit}
          questionImages={bank.questionImages}
          imageProviders={bank.imageProviders}
          Latex={Latex}
          onRegenerateWithFeedback={onRegenerateWithFeedback}
          onBulkRegen={onBulkRegen}
          onGenerateImage={onGenerateImage}
          busyQuestionId={busyQuestionId}
          imageBusyQuestionId={imageBusyQuestionId}
          bulkBusy={bulkBusy}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#F7F0FE', borderLeft: '3px solid var(--swiftee-purple)',
            fontSize: 12, color: 'var(--swiftee-deep)',
          }}>
            <b>No audit run yet.</b> Click <b>Run audit</b> above to evaluate every question against factual, pedagogical, language, terminology, grade, distractor, scenario, and visual-ratio checks. Results will be color-coded.
          </div>
          {bank.questions.map(q => {
            const qId = q.id || q.question_id;
            return (
              <div
                key={qId}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="sw-chip sw-chip-purple sw-chip-sm">{q.cell || q.cg_cell}</span>
                  <span className="sw-chip sw-chip-outline sw-chip-sm">{String(q.type || 'mcq').toUpperCase().replace('_', ' ')}</span>
                  <div style={{ flex: 1 }} />
                  {q.needs_image && onGenerateImage && (
                    <button
                      onClick={() => onGenerateImage(q)}
                      disabled={imageBusyQuestionId === qId}
                      className="sw-btn sw-btn-ghost sw-btn-sm"
                      style={{ padding: '4px 8px' }}
                      title={bank.questionImages[qId] ? 'Replace this image with a fresh one' : 'Generate the image this question needs'}
                    >
                      <Icon name={bank.questionImages[qId] ? 'refresh' : 'image'} size="sm" />
                      {imageBusyQuestionId === qId ? 'Working…' : bank.questionImages[qId] ? 'Refresh image' : 'Generate image'}
                    </button>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{qId}</span>
                </div>
                <QuestionBody
                  q={q}
                  qType={q.type || 'mcq'}
                  image={bank.questionImages[qId]}
                  imageProvider={bank.imageProviders?.[qId]}
                  density="compact"
                  Latex={Latex}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BankView;
