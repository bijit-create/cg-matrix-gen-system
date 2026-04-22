// ExportHero — gradient success card shown after a pipeline run completes.
// Ported from project/src/screens_generate.jsx ScreenExport.

import React from 'react';
import type { ReactNode } from 'react';
import { Icon, Stat } from './atoms';

export const ExportHero: React.FC<{
  itemCount: number;
  title?: string;
  subtitle?: string;
  stats?: { label: string; v: ReactNode; sub?: string }[];
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}> = ({ itemCount, title, subtitle, stats, primary, secondary }) => (
  <div style={{ padding: 40, maxWidth: 720, margin: '40px auto' }}>
    <div
      style={{
        padding: 36,
        borderRadius: 20,
        background: 'linear-gradient(135deg, var(--swiftee-deep), var(--blueberry-1200))',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(255,186,0,0.2)',
          color: 'var(--swiftee-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Icon name="verified" size="xl" />
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--swiftee-gold)',
          marginBottom: 8,
          fontFamily: 'var(--font-display)',
        }}
      >
        Run complete
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: 10,
        }}
      >
        {itemCount} {itemCount === 1 ? 'item' : 'items'} banked
      </div>
      {(title || subtitle) && (
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 24, fontFamily: 'var(--font-body)' }}>
          {title}
          {title && subtitle && <br />}
          {subtitle}
        </div>
      )}
      {(primary || secondary) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {primary && (
            <button
              onClick={primary.onClick}
              className="sw-btn sw-btn-gold"
            >
              {primary.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="sw-btn"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
            >
              {secondary.label} <Icon name="arrow_forward" size="sm" />
            </button>
          )}
        </div>
      )}
    </div>
    {stats && stats.length > 0 && (
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              background: '#fff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
            }}
          >
            <Stat label={s.label} v={s.v} sub={s.sub} />
          </div>
        ))}
      </div>
    )}
  </div>
);

export default ExportHero;
