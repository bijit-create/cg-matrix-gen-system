// Stage A.2 — shared read-only question body.
// Deduplicates the stem / options / answer / steps / pairs / items / rationale
// JSX that lived in three places. LaTeX is rendered via LatexText.
//
// Two density modes:
//   'detailed' — labeled sections, larger padding (Pipeline Gate-4 look).
//   'compact'  — no section labels, tighter spacing (QuickGen + cell-review).
//
// Edit-mode UIs (QuickGen inline edit) are NOT handled here — they stay in place
// at each call site because they're coupled to per-site edit state.

import React from 'react';
import type { ReactNode } from 'react';

export type BodyDensity = 'detailed' | 'compact';

export interface QuestionBodyProps {
  q: any;
  qType?: string;
  image?: string;
  density?: BodyDensity;
  /** Render LaTeX in any string field. Caller passes their LatexText renderer. */
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
}

const SectionLabel: React.FC<{ show: boolean; children: ReactNode }> = ({ show, children }) =>
  show ? <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">{children}</label> : null;

export const QuestionBody: React.FC<QuestionBodyProps> = ({ q, qType: qTypeProp, image, density = 'compact', Latex }) => {
  const qType = qTypeProp || q.type || 'mcq';
  const detailed = density === 'detailed';
  const wrapGap = detailed ? 'mb-3' : 'mb-2';
  const stemPad = detailed ? 'p-3 min-h-[40px]' : 'p-2';
  const optPad = detailed ? 'p-2.5' : 'p-2';
  const answer = q.correct_answer ?? q.answer;

  return (
    <div>
      {image && (
        <div className={`${wrapGap} tech-border bg-white p-2 flex justify-center`}>
          <img src={image} alt="Question" className="max-w-full max-h-48 object-contain" />
        </div>
      )}

      {/* Stem */}
      <div className={wrapGap}>
        <SectionLabel show={detailed}>Question Stem</SectionLabel>
        <div className={`tech-border bg-white ${stemPad} text-sm select-all cursor-text`}>
          <Latex text={q.stem} />
        </div>
      </div>

      {/* MCQ */}
      {qType === 'mcq' && q.options?.length > 0 && (
        <div className={wrapGap}>
          <SectionLabel show={detailed}>Options</SectionLabel>
          <div className="flex flex-col gap-1">
            {q.options.map((opt: any, i: number) => {
              const isCorrect = opt.correct || opt.is_correct;
              const label = opt.label || String.fromCharCode(65 + i);
              const correctClass = detailed
                ? (isCorrect ? 'border-[var(--success)] bg-[#E8F5E9]' : 'bg-white')
                : (isCorrect ? 'border-2 border-[var(--success)] bg-[#E8F5E9] shadow-sm' : 'bg-white');
              return (
                <div key={i} className={`text-sm ${optPad} tech-border flex items-start gap-1.5 ${correctClass}`}>
                  <span className={`font-bold text-xs shrink-0 ${isCorrect && !detailed ? 'text-[var(--success)]' : ''}`}>
                    {label}{isCorrect ? (detailed ? ' ✓' : ' ✓ CORRECT') : '.'}
                  </span>
                  <span className="select-all cursor-text flex-1">
                    <Latex text={typeof opt === 'string' ? opt : opt.text} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fill in the blank */}
      {qType === 'fill_blank' && (
        <div className={wrapGap}>
          <SectionLabel show={detailed}>Answer</SectionLabel>
          <div className={`tech-border bg-[#E8F5E9] ${detailed ? 'border-[var(--success)]' : 'border-2 border-[var(--success)] shadow-sm'} ${optPad} text-sm font-mono select-all cursor-text`}>
            {!detailed && <span className="text-[10px] font-bold text-[var(--success)] uppercase mr-2">Answer ✓</span>}
            <Latex text={answer} />
          </div>
        </div>
      )}

      {/* Error analysis */}
      {qType === 'error_analysis' && q.steps?.length > 0 && (
        <div className={wrapGap}>
          <SectionLabel show={detailed}>Student's Work</SectionLabel>
          <div className="flex flex-col gap-1">
            {q.steps.map((step: any, i: number) => {
              const isCorr = step.correct || step.is_correct;
              return (
                <div key={i} className={`tech-border ${optPad} ${isCorr ? 'bg-white' : 'bg-[#FFEBEE] border-[var(--danger)]'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-bold text-xs text-[var(--ink-muted)]">Step {i + 1}: </span>
                      <span className={`text-sm select-all cursor-text ${!isCorr ? 'line-through text-[var(--danger)]' : ''}`}>
                        <Latex text={step.text} />
                      </span>
                    </div>
                    {detailed && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${isCorr ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'}`}>
                        {isCorr ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  {!isCorr && (step.fix || step.correct_version) && (
                    <div className="mt-1 text-xs text-[var(--success)] select-all cursor-text">
                      {detailed ? 'Correct: ' : 'Fix: '}<Latex text={step.fix || step.correct_version} />
                    </div>
                  )}
                  {step.error_type && !isCorr && (
                    <span className="inline-block mt-1 text-[9px] font-mono uppercase px-1.5 py-0.5 bg-[var(--danger)] text-white">{step.error_type}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match */}
      {qType === 'match' && (q.pairs?.length > 0 || q.match_pairs?.length > 0) && (
        <div className={wrapGap}>
          <SectionLabel show={detailed}>Match Pairs</SectionLabel>
          <div className="tech-border bg-white overflow-hidden">
            <div className="grid grid-cols-2 bg-[var(--ink)] text-[var(--bg)]">
              <div className={`${detailed ? 'p-2 text-xs' : 'p-1.5 text-[10px]'} font-bold uppercase`}>Left</div>
              <div className={`${detailed ? 'p-2 text-xs' : 'p-1.5 text-[10px]'} font-bold uppercase border-l border-[#333]`}>
                {detailed ? 'Right (Correct Match)' : 'Right'}
              </div>
            </div>
            {(q.pairs || q.match_pairs || []).map((pair: any, i: number) => {
              const left = typeof pair === 'string' ? pair.split(' → ')[0] : pair.left;
              const right = typeof pair === 'string' ? pair.split(' → ')[1] : pair.right;
              return (
                <div key={i} className="grid grid-cols-2 border-t border-[var(--line-dark)]">
                  <div className={`${optPad} text-sm select-all cursor-text`}><Latex text={left} /></div>
                  <div className={`${optPad} text-sm select-all cursor-text border-l border-[var(--line-dark)] text-[var(--success)] ${detailed ? 'font-medium' : ''}`}>
                    <Latex text={right} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arrange */}
      {qType === 'arrange' && (q.items?.length > 0 || q.arrange_items?.length > 0) && (
        <div className={wrapGap}>
          <SectionLabel show={detailed}>Correct Order</SectionLabel>
          <div className="flex flex-col gap-1">
            {(q.items || q.arrange_items || []).map((item: string, i: number) => (
              <div key={i} className={`flex items-center gap-2 tech-border bg-white ${optPad}`}>
                <span className={`${detailed ? 'w-6 h-6' : 'w-5 h-5'} rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center ${detailed ? 'text-xs' : 'text-[10px]'} font-bold shrink-0`}>{i + 1}</span>
                <span className="text-sm select-all cursor-text flex-1"><Latex text={item} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      {q.rationale && (
        detailed ? (
          <div className="mb-2">
            <SectionLabel show>Rationale</SectionLabel>
            <div className="tech-border bg-[var(--surface)] p-2.5 text-xs select-all cursor-text"><Latex text={q.rationale} /></div>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--ink-muted)] bg-[var(--surface)] p-1.5 tech-border select-all cursor-text"><Latex text={q.rationale} /></div>
        )
      )}
    </div>
  );
};

export default QuestionBody;
