// Top-level banner that pings the image-provider health check once on mount
// and shows a strip telling the SME whether OpenAI gpt-image-1 is actually
// being used (green) or falling through to Gemini (amber).
//
// Lives at the app root, ABOVE the tab routing, so the truth is visible no
// matter which tab the user lands on. The 0-requests-on-the-OpenAI-dashboard
// mystery in earlier sessions was caused by silent fallback; this banner
// makes the silent case impossible to miss — but it stays a single line so
// it never crowds out the workspace. Full diagnostics sit behind "Details",
// and both states are dismissible (remembered for the session).

import React, { useEffect, useState } from 'react';
import { Icon } from './swiftee/atoms';
import { checkImageProviderHealth, type ImageProviderHealth } from '../agents/api';

const DISMISS_KEY = 'providerBannerDismissed';

export const ProviderHealthBanner: React.FC = () => {
  const [health, setHealth] = useState<ImageProviderHealth | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkImageProviderHealth()
      .then(h => { if (!cancelled) setHealth(h); })
      .catch(() => {
        if (!cancelled) setHealth({
          openai: { configured: false, model: 'unknown', reachable: false, error: 'health check failed' },
          gemini: { configured: false, keyCount: 0 },
          strict: false,
        });
      });
    return () => { cancelled = true; };
  }, []);

  if (!health || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const openaiOk = health.openai.configured && health.openai.reachable === true;
  const openaiMissing = !health.openai.configured;

  const palette = openaiOk
    ? { bg: 'var(--success-tint)', border: 'var(--green-400)', text: 'var(--success-text)' }
    : { bg: 'var(--warning-tint)', border: 'var(--warning)', text: 'var(--warning-text)' };

  const headline = openaiOk
    ? <><b>OpenAI {health.openai.model} active</b> — new images render via OpenAI; Gemini stays as fallback.</>
    : <><b>OpenAI image-gen inactive</b> — images will use the Gemini fallback.</>;

  const detail = openaiOk
    ? <>Generated images get an "OpenAI" chip; a "Show prompt" button on each image lets you copy the exact prompt sent.</>
    : <>
        {openaiMissing
          ? <>The <code>OPENAI_API_KEY</code> environment variable is not set on the server. Add it in your Vercel project's Environment Variables (Production + Preview), then redeploy. </>
          : <>OpenAI is configured but unreachable: <code>{health.openai.error || 'unknown error'}</code>. Common causes: expired key, billing limit, model name not enabled on your account. </>}
        Until fixed, expect Gemini's typical failure modes: misspelled labels, unsolicited answer-marker overlays, and stock-photo style on what should be diagrams.
      </>;

  return (
    <div style={{
      padding: '6px 16px', background: palette.bg,
      borderBottom: `1px solid ${palette.border}`,
      color: palette.text, fontSize: 12, lineHeight: 1.45,
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={openaiOk ? 'check_circle' : 'warning'} size="sm" />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {headline}
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'inherit', fontSize: 11, fontWeight: 700, padding: '2px 4px',
            textDecoration: 'underline', flexShrink: 0,
          }}
        >
          {expanded ? 'Hide details' : 'Details'}
        </button>
        <button
          onClick={dismiss}
          title="Dismiss for this session"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'inherit', display: 'inline-flex', alignItems: 'center',
            padding: 2, flexShrink: 0,
          }}
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '6px 0 4px 24px', maxWidth: 860 }}>{detail}</div>
      )}
    </div>
  );
};

export default ProviderHealthBanner;
