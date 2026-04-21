// Swiftee Pipeline Stepper — horizontal 8-step indicator with gate badges
import React from 'react';
import { Icon, cx } from './atoms';

export interface PipelineStep {
  id: string;
  name: string;
  kind: 'step' | 'gate';
  gateLabel?: string;
}

export const RAIL_STEPS: PipelineStep[] = [
  { id: 'intake',    name: 'Intake',        kind: 'step' },
  { id: 'subskills', name: 'Subskills',     kind: 'gate', gateLabel: 'G1' },
  { id: 'scope',     name: 'Scope',         kind: 'gate', gateLabel: 'G2' },
  { id: 'matrix',    name: 'Hess Matrix',   kind: 'gate', gateLabel: 'G3a' },
  { id: 'miscon',    name: 'Misconceptions',kind: 'gate', gateLabel: 'G3b' },
  { id: 'generate',  name: 'Generate',      kind: 'step' },
  { id: 'review',    name: 'Final Set',     kind: 'gate', gateLabel: 'G4' },
  { id: 'export',    name: 'Export',        kind: 'step' },
];

export interface RunMeta {
  id?: string;
  title?: string;
  grade?: string;
  skillCode?: string;
}

export const PipelineStepper: React.FC<{
  current: string;
  done: string[];
  onJump?: (id: string) => void;
  run?: RunMeta;
  steps?: PipelineStep[];
}> = ({ current, done, onJump, run, steps = RAIL_STEPS }) => {
  const doneSet = new Set(done);
  const currentIdx = steps.findIndex(s => s.id === current);

  return (
    <div className="pipeline-bar">
      {run && (
        <div className="pipeline-run">
          {run.id && <span className="pipeline-run-id">{run.id}</span>}
          {run.title && <span className="pipeline-run-title">{run.title}</span>}
          {(run.grade || run.skillCode) && (
            <span className="pipeline-run-meta">
              {run.grade && `· ${run.grade}`} {run.skillCode && `· ${run.skillCode}`}
            </span>
          )}
        </div>
      )}
      <div className="pipeline-steps">
        {steps.map((s, i) => {
          const isDone = doneSet.has(s.id);
          const isActive = s.id === current;
          const isLocked = !isDone && !isActive && i > currentIdx;
          const clickable = !isLocked && !!onJump;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && <div className={cx('pipeline-conn', isDone && 'done')} />}
              <button
                className={cx(
                  'pipeline-step',
                  s.kind === 'gate' && 'gate',
                  isDone && 'done',
                  isActive && 'active',
                  isLocked && 'locked',
                )}
                disabled={!clickable}
                onClick={() => clickable && onJump?.(s.id)}
                title={s.kind === 'gate' ? `${s.name} · SME gate ${s.gateLabel}` : s.name}
              >
                <span className="pipeline-node">
                  {isDone ? <Icon name="check" size="sm" /> : i + 1}
                </span>
                <span className="pipeline-label">
                  {s.name}{s.kind === 'gate' ? ` · ${s.gateLabel}` : ''}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
