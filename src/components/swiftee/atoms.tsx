// Swiftee atoms — matches the Claude Design handoff bundle.
// Ported from project/src/atoms.jsx into typed React.

import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export const cx = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(' ');

// ─── Icon (Material Symbols Rounded) ───
export const Icon: React.FC<{
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fill?: boolean;
  className?: string;
}> = ({ name, size = 'md', fill = false, className = '' }) => (
  <span className={cx('mi', `mi-${size}`, fill && 'fill', className)}>{name}</span>
);

// ─── Chip ───
export type ChipKind =
  | 'purple' | 'gold' | 'teal' | 'green' | 'red' | 'rose' | 'grey' | 'outline';

export const Chip: React.FC<{
  kind?: ChipKind;
  sm?: boolean;
  children: ReactNode;
  icon?: string;
}> = ({ kind = 'grey', sm = false, children, icon }) => (
  <span className={cx('sw-chip', `sw-chip-${kind}`, sm && 'sw-chip-sm')}>
    {icon && <Icon name={icon} size="sm" />}
    {children}
  </span>
);

// ─── Btn ───
export type BtnKind = 'primary' | 'gold' | 'ghost' | 'danger-ghost';

export const Btn: React.FC<{
  kind?: BtnKind;
  size?: 'sm';
  icon?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ kind = 'ghost', size, icon, children, onClick, disabled, title, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cx(
      'sw-btn',
      `sw-btn-${kind}`,
      size === 'sm' && 'sw-btn-sm',
      !children && 'sw-btn-icon',
    )}
  >
    {icon && <Icon name={icon} size="sm" />}
    {children}
  </button>
);

// ─── Checkbox ───
export const Checkbox: React.FC<{
  on: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
}> = ({ on, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
    <span
      className={cx('sw-cb', on && 'on')}
      onClick={e => { e.preventDefault(); onChange(!on); }}
    />
    {label && <span style={{ fontSize: 13, color: 'var(--fg-primary)' }}>{label}</span>}
  </label>
);

// ─── Card ───
export const Card: React.FC<{
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  pad?: boolean;
  className?: string;
}> = ({ title, sub, right, children, pad = true, className = '' }) => (
  <div className={cx('sw-card', className)} style={pad ? {} : { padding: 0 }}>
    {(title || right) && (
      <div className="sw-card-h" style={!pad ? { padding: '16px 20px 0', marginBottom: 8 } : {}}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          {sub && <span className="sw-card-h-sub">{sub}</span>}
        </span>
        {right}
      </div>
    )}
    {children}
  </div>
);

// ─── InlineGateBar — thin bar at the bottom of each gate screen ───
export const InlineGateBar: React.FC<{
  onBack?: () => void;
  onApprove: () => void;
  approveLabel?: string;
  disabled?: boolean;
}> = ({ onBack, onApprove, approveLabel, disabled }) => (
  <div
    style={{
      padding: '14px 18px',
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name="gavel" size="md" />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--swiftee-deep)', fontSize: 13 }}>
          SME Gate <Chip kind="gold" sm>Approval required</Chip>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
          Approving moves the run forward. You can still return and edit earlier stages anytime.
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {onBack && <Btn kind="ghost" icon="arrow_back" onClick={onBack}>Back</Btn>}
      <Btn kind="primary" onClick={onApprove} disabled={disabled}>
        {approveLabel || 'Approve & continue'} <Icon name="arrow_forward" size="sm" />
      </Btn>
    </div>
  </div>
);

// ─── HelpPopover — "Why this step?" click-away popover ───
export const HelpPopover: React.FC<{
  label?: string;
  children: ReactNode;
  align?: 'end' | 'start';
}> = ({ label = 'Why this step?', children, align = 'end' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const alignStyle: React.CSSProperties = align === 'end'
    ? { right: 0 }
    : { left: 0 };

  const arrowStyle: React.CSSProperties = align === 'end'
    ? { right: 20 }
    : { left: 20 };

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px 3px 6px',
          borderRadius: 999,
          background: open ? 'var(--bg-tint)' : 'transparent',
          border: `1px solid ${open ? 'var(--border-brand)' : 'var(--border-subtle)'}`,
          color: 'var(--fg-secondary)',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
        }}
      >
        <Icon name="help_outline" size="sm" /> {label}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            ...alignStyle,
            width: 320,
            zIndex: 50,
            background: '#fff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(10,27,57,0.14), 0 0 0 1px rgba(118,36,194,0.05)',
            padding: 16,
            fontSize: 12,
            color: 'var(--fg-secondary)',
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -5,
              ...arrowStyle,
              width: 10,
              height: 10,
              background: '#fff',
              borderTop: '1px solid var(--border-subtle)',
              borderLeft: '1px solid var(--border-subtle)',
              transform: 'rotate(45deg)',
            }}
          />
          {children}
        </div>
      )}
    </span>
  );
};

// ─── Stat — used on cards ───
export const Stat: React.FC<{
  label: string;
  v: ReactNode;
  sub?: string;
}> = ({ label, v, sub }) => (
  <div>
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--fg-muted)', marginBottom: 2,
    }}>{label}</div>
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
      color: 'var(--swiftee-deep)', lineHeight: 1,
    }}>{v}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{sub}</div>}
  </div>
);
