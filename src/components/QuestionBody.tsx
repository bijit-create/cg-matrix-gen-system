// Stage D4 — Swiftee-styled read-only question body.
// Deduplicates the stem / options / answer / steps / pairs / items / rationale
// JSX that lived in three places. LaTeX is rendered via LatexText.
//
// Two density modes (layout variance only; palette is fully Swiftee):
//   'detailed' — labeled sections, larger padding (Pipeline Gate-4 look).
//   'compact'  — no section labels, tighter spacing (QuickGen + cell-review).
//
// Edit-mode UIs (QuickGen inline edit) are NOT handled here — they stay in place
// at each call site because they're coupled to per-site edit state.

import React from 'react';
import type { ReactNode } from 'react';
import { splitPair } from '../utils/matchPairs';
import { extractMarkdownTable } from '../utils/markdownTable';

export type BodyDensity = 'detailed' | 'compact';

export interface QuestionBodyProps {
  q: any;
  qType?: string;
  image?: string;
  density?: BodyDensity;
  /** LaTeX renderer. Caller supplies the app-level LatexText so we don't pull katex twice. */
  Latex: React.FC<{ text: any; className?: string; block?: boolean }>;
}

const SectionLabel: React.FC<{ show: boolean; children: ReactNode }> = ({ show, children }) =>
  show
    ? (
      <label
        style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--fg-muted)',
          marginBottom: 6, display: 'block',
          fontFamily: 'var(--font-body)',
        }}
      >
        {children}
      </label>
    )
    : null;

export const QuestionBody: React.FC<QuestionBodyProps> = ({
  q, qType: qTypeProp, image, density = 'compact', Latex,
}) => {
  const qType = qTypeProp || q.type || 'mcq';
  const detailed = density === 'detailed';
  const wrapGap = { marginBottom: detailed ? 14 : 10 };
  const stemPad = detailed ? '12px 14px' : '10px 12px';
  const rowPad = detailed ? '10px 12px' : '8px 10px';
  const answer = q.correct_answer ?? q.answer;

  const stemStyle: React.CSSProperties = {
    fontSize: 14, color: 'var(--swiftee-deep)', lineHeight: 1.5,
    fontWeight: 500,
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {image && (
        <div style={{
          ...wrapGap,
          border: '1px solid var(--border-subtle)', borderRadius: 10,
          background: '#fff', padding: 8,
          display: 'flex', justifyContent: 'center',
        }}>
          <img src={image} alt="Question" style={{ maxWidth: '100%', maxHeight: 192, objectFit: 'contain' }} />
        </div>
      )}

      {/* Stem — detects inline markdown tables and renders them as proper HTML
           tables so tabular data doesn't collapse into unreadable prose. */}
      <div style={wrapGap}>
        <SectionLabel show={detailed}>Question Stem</SectionLabel>
        <div
          className="select-all cursor-text"
          style={{
            padding: stemPad, borderRadius: 10, background: '#fff',
            border: '1px solid var(--border-subtle)',
            ...stemStyle,
          }}
        >
          {(() => {
            const parsed = extractMarkdownTable(String(q.stem || ''));
            if (!parsed.table) return <Latex text={q.stem} />;
            return (
              <>
                {parsed.before && (
                  <div style={{ marginBottom: 10 }}><Latex text={parsed.before} /></div>
                )}
                <div style={{
                  overflow: 'auto', borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  margin: '8px 0',
                }}>
                  <table style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                  }}>
                    <thead>
                      <tr>
                        {parsed.table.headers.map((h, i) => (
                          <th key={i} style={{
                            background: 'var(--swiftee-deep)', color: '#fff',
                            padding: '8px 10px', textAlign: 'left',
                            fontFamily: 'var(--font-display)', fontWeight: 700,
                            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: '1px solid var(--swiftee-deep)',
                          }}><Latex text={h} /></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.table.rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFC' }}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{
                              padding: '8px 10px',
                              borderTop: '1px solid var(--border-subtle)',
                              color: 'var(--swiftee-deep)',
                            }}><Latex text={cell} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsed.after && (
                  <div style={{ marginTop: 10 }}><Latex text={parsed.after} /></div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* MCQ */}
      {qType === 'mcq' && q.options?.length > 0 && (
        <div style={wrapGap}>
          <SectionLabel show={detailed}>Options</SectionLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {q.options.map((opt: any, i: number) => {
              const isCorrect = opt.correct || opt.is_correct;
              const label = opt.label || String.fromCharCode(65 + i);
              const text = typeof opt === 'string' ? opt : opt.text;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10,
                    alignItems: 'center', padding: rowPad, borderRadius: 8,
                    background: isCorrect ? '#E5F5EE' : '#FAFAFC',
                    border: `1px solid ${isCorrect ? '#9FD9B8' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: '#fff', border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--swiftee-deep)',
                    fontFamily: 'var(--font-display)',
                  }}>{label}</div>
                  <div className="select-all cursor-text" style={{ fontSize: 13, color: 'var(--swiftee-deep)' }}>
                    <Latex text={text} />
                  </div>
                  {isCorrect ? (
                    <span className="sw-chip sw-chip-green sw-chip-sm">Correct</span>
                  ) : opt.why_wrong || opt.why ? (
                    <span style={{
                      fontSize: 10, color: 'var(--fg-muted)',
                      fontStyle: 'italic', maxWidth: 200, textAlign: 'right',
                    }}>→ {opt.why_wrong || opt.why}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fill in the blank */}
      {qType === 'fill_blank' && (
        <div style={wrapGap}>
          <SectionLabel show={detailed}>Answer</SectionLabel>
          <div
            className="select-all cursor-text"
            style={{
              padding: rowPad, borderRadius: 8,
              background: '#E5F5EE', border: '1px solid #9FD9B8',
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 13, color: 'var(--swiftee-deep)', fontWeight: 600,
            }}
          >
            <span className="sw-chip sw-chip-green sw-chip-sm" style={{ fontFamily: 'var(--font-display)' }}>Answer</span>
            <Latex text={answer} />
          </div>
        </div>
      )}

      {/* Error analysis */}
      {qType === 'error_analysis' && q.steps?.length > 0 && (
        <div style={wrapGap}>
          <SectionLabel show={detailed}>Student's Work</SectionLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {q.steps.map((step: any, i: number) => {
              const isCorr = step.correct || step.is_correct;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 10,
                    alignItems: 'start', padding: rowPad, borderRadius: 8,
                    background: isCorr ? '#F6FCF8' : '#FEF7F6',
                    border: `1px solid ${isCorr ? '#C6E6D5' : '#F3CBC5'}`,
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--swiftee-deep)',
                    fontFamily: 'var(--font-display)',
                  }}>Step {i + 1}</div>
                  <div style={{ fontSize: 13, color: 'var(--swiftee-deep)' }}>
                    <span
                      className="select-all cursor-text"
                      style={{ textDecoration: isCorr ? 'none' : 'line-through', color: isCorr ? 'var(--swiftee-deep)' : '#C8573B' }}
                    >
                      <Latex text={step.text} />
                    </span>
                    {!isCorr && (step.fix || step.correct_version) && (
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--green-400)' }}>
                        Correct: <Latex text={step.fix || step.correct_version} />
                      </div>
                    )}
                    {step.error_type && !isCorr && (
                      <span
                        style={{
                          display: 'inline-block', marginTop: 4,
                          fontSize: 9, fontFamily: 'ui-monospace, Menlo, monospace',
                          textTransform: 'uppercase', padding: '2px 6px',
                          background: '#C8573B', color: '#fff', borderRadius: 4,
                        }}
                      >{step.error_type}</span>
                    )}
                  </div>
                  {!isCorr && <span className="sw-chip sw-chip-red sw-chip-sm">Error</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match */}
      {qType === 'match' && (q.pairs?.length > 0 || q.match_pairs?.length > 0) && (
        <div style={wrapGap}>
          <SectionLabel show={detailed}>Match Pairs</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 10, rowGap: 8 }}>
            {(q.pairs || q.match_pairs || []).map((pair: any, i: number) => {
              const { left, right } = splitPair(pair);
              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, background: '#FAFAFC',
                    border: '1px solid var(--border-subtle)', fontSize: 13,
                    color: 'var(--swiftee-deep)',
                  }}>
                    <Latex text={left} />
                  </div>
                  <div style={{
                    alignSelf: 'center', textAlign: 'center',
                    color: 'var(--swiftee-purple)', fontWeight: 700,
                  }}>→</div>
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tint)',
                    border: '1px solid var(--border-brand-soft)', fontSize: 13,
                    color: 'var(--swiftee-deep)', fontWeight: 500,
                  }}>
                    <Latex text={right} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Arrange */}
      {qType === 'arrange' && (q.items?.length > 0 || q.arrange_items?.length > 0) && (
        <div style={wrapGap}>
          <SectionLabel show={detailed}>Correct Order</SectionLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {(q.items || q.arrange_items || []).map((item: string, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: rowPad, borderRadius: 8, background: '#fff',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{
                  width: detailed ? 24 : 20, height: detailed ? 24 : 20,
                  borderRadius: 999,
                  background: 'var(--swiftee-deep)', color: 'var(--swiftee-gold)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: detailed ? 12 : 10, fontWeight: 800, flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                }}>{i + 1}</span>
                <span className="select-all cursor-text" style={{ fontSize: 13, color: 'var(--swiftee-deep)', flex: 1 }}>
                  <Latex text={item} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rationale — purple-left-border callout */}
      {q.rationale && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 8,
          background: '#F7F0FE', borderLeft: '3px solid var(--swiftee-purple)',
          fontSize: 12, color: 'var(--swiftee-deep)', lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700 }}>Rationale · </span>
          <span className="select-all cursor-text"><Latex text={q.rationale} /></span>
        </div>
      )}

      {/* QA flag note — gold-left-border callout */}
      {q.qa_note && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: '#FFF9E6', borderLeft: '3px solid var(--swiftee-gold)',
          fontSize: 11, color: '#8A5A00', lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700 }}>QA flag · </span>{q.qa_note}
        </div>
      )}
    </div>
  );
};

export default QuestionBody;
