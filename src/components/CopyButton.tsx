// CopyButton — small inline icon button that writes either text or an image
// data-URL to the system clipboard.
//
// LaTeX: pass the RAW string (with \( ... \) / \[ ... \] delimiters intact)
// as `text`. The Latex renderer is for display only; the source we want on
// the clipboard is the original delimited string so the receiving system
// (CMS / authoring tool / chat) can re-render it.
//
// Image: pass a data: URL as `imageDataUrl`. We fetch it as a Blob and write
// as a ClipboardItem in the matching MIME (typically image/png). Falls back
// silently on browsers that don't expose the Clipboard.write API.

import React, { useState } from 'react';
import { Icon } from './swiftee/atoms';

export interface CopyButtonProps {
  /** Text to copy. Pass the raw source (LaTeX delimiters intact) — NOT a rendered string. */
  text?: string;
  /** Image data: URL (image/png recommended). */
  imageDataUrl?: string;
  /** Visible label next to the icon. Defaults to no label (icon-only). */
  label?: string;
  /** Hover tooltip override. */
  title?: string;
  /** Compact variants reduce padding for inline placement next to fields. */
  variant?: 'inline' | 'pill';
  /** Optional onClick for analytics / parent-state hooks. Fires AFTER the copy. */
  onCopied?: () => void;
}

async function copyImage(dataUrl: string): Promise<void> {
  if (!dataUrl) throw new Error('No image data URL');
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  // Some browsers don't accept image/svg+xml in ClipboardItem — convert via
  // canvas to PNG when needed. The bank pipeline already runs everything
  // through normalizeToCanvas which writes PNG, so this branch is rare.
  if (blob.type === 'image/svg+xml') {
    const png = await svgBlobToPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    return;
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

function svgBlobToPng(svgBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const w = img.width || 800;
      const h = img.height || 600;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('No 2d context')); }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(b => {
        URL.revokeObjectURL(url);
        b ? resolve(b) : reject(new Error('toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
    img.src = url;
  });
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text, imageDataUrl, label, title, variant = 'inline', onCopied,
}) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      if (imageDataUrl) {
        await copyImage(imageDataUrl);
      } else if (typeof text === 'string' && text.length > 0) {
        await navigator.clipboard.writeText(text);
      } else {
        return;
      }
      setState('copied');
      onCopied?.();
      setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      setState('failed');
      setTimeout(() => setState('idle'), 1800);
    }
  };

  const isPill = variant === 'pill';
  const padding = isPill ? '4px 8px' : '2px 6px';
  const fontSize = isPill ? 11 : 10;
  const colour = state === 'copied' ? 'var(--green-400, #27a55b)'
    : state === 'failed' ? '#C8573B'
    : 'var(--fg-secondary, #6b6b76)';
  const bg = state === 'copied' ? 'rgba(39, 165, 91, 0.08)'
    : state === 'failed' ? 'rgba(200, 87, 59, 0.08)'
    : 'transparent';
  const border = state === 'copied' ? '1px solid rgba(39, 165, 91, 0.4)'
    : state === 'failed' ? '1px solid rgba(200, 87, 59, 0.4)'
    : '1px solid var(--border-subtle, #e0e0e6)';
  const iconName = state === 'copied' ? 'check'
    : state === 'failed' ? 'error_outline'
    : (imageDataUrl ? 'image' : 'content_copy');
  const visibleLabel = state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : label;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || (imageDataUrl ? 'Copy image to clipboard (PNG)' : 'Copy text to clipboard (LaTeX preserved)')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding, fontSize, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: colour, background: bg, border, borderRadius: 6,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'color 120ms, background 120ms, border-color 120ms',
        lineHeight: 1,
      }}
    >
      <Icon name={iconName} size="sm" />
      {visibleLabel && <span>{visibleLabel}</span>}
    </button>
  );
};

export default CopyButton;
