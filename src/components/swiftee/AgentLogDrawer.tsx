// AgentLogDrawer — fixed-bottom collapsible drawer showing orchestrator events.
// Ported from project/src/atoms.jsx AgentLog (32px collapsed / 220px open).

import React, { useEffect, useRef, useState } from 'react';

export interface LogLine {
  /** time string, e.g. "14:21:10" */
  t?: string;
  /** agent name */
  a: string;
  /** message */
  m: string;
}

export const AgentLogDrawer: React.FC<{
  lines: LogLine[];
  defaultOpen?: boolean;
  /** CSS left offset (px). Use when the drawer needs to clear a sidebar. */
  leftOffset?: number;
}> = ({ lines, defaultOpen = false, leftOffset = 0 }) => {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const last = lines[lines.length - 1];

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [open, lines.length]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: leftOffset,
        right: 0,
        height: open ? 220 : 32,
        background: 'var(--swiftee-deep)',
        color: '#EEDCFC',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        lineHeight: 1.5,
        zIndex: 20,
        borderTop: '1px solid var(--blueberry-1400)',
        transition: 'height 240ms var(--ease-out)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: open ? '0 -12px 40px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          flexShrink: 0,
          height: 32,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--teal-300)',
            boxShadow: '0 0 8px var(--teal-300)',
          }}
        />
        <span
          style={{
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: 10,
          }}
        >
          Agent Log
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
          {lines.length} events
        </span>
        {!open && last && (
          <span
            style={{
              color: 'rgba(255,255,255,0.55)',
              marginLeft: 14,
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            · {last.a} — {last.m}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}
        >
          {open ? 'Collapse ↓' : 'Expand ↑'}
        </span>
      </div>
      <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '72px 150px 1fr',
              gap: 12,
              padding: '2px 0',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{l.t}</span>
            <span style={{ color: 'var(--swiftee-gold)', fontWeight: 700 }}>{l.a}</span>
            <span style={{ color: '#EEDCFC' }}>{l.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentLogDrawer;
