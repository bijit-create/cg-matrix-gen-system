// Top-level banner that pings the image-provider health check once on mount
// and shows a persistent strip telling the SME whether OpenAI gpt-image-1 is
// actually being used (green) or falling through to Gemini (red).
//
// Lives at the app root, ABOVE the tab routing, so the truth is visible no
// matter which tab the user lands on. The 0-requests-on-the-OpenAI-dashboard
// mystery in earlier sessions was caused by silent fallback; this banner
// makes the silent case impossible to miss.

import React, { useEffect, useState } from 'react';
import { Icon } from './swiftee/atoms';
import { checkImageProviderHealth, type ImageProviderHealth } from '../agents/api';

export const ProviderHealthBanner: React.FC = () => {
  const [health, setHealth] = useState<ImageProviderHealth | null>(null);
  const [dismissedGreen, setDismissedGreen] = useState(false);

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

  if (!health) return null;

  const openaiOk = health.openai.configured && health.openai.reachable === true;
  const openaiMissing = !health.openai.configured;
  const openaiBroken = health.openai.configured && health.openai.reachable === false;

  if (openaiOk && dismissedGreen) return null;

  if (openaiOk) {
    return (
      <div style={{
        padding: '8px 16px', background: '#E8F7EE', borderBottom: '1px solid #6FBE8C',
        color: '#1F5C32', fontSize: 12, fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="check_circle" size="sm" />
        <span style={{ flex: 1 }}>
          <b>OpenAI {health.openai.model} is active</b> — new images render via OpenAI (Gemini stays as fallback). Generated images get an "OpenAI" chip; a "Show prompt" button on each image lets you copy the exact prompt sent.
        </span>
        <button
          onClick={() => setDismissedGreen(true)}
          title="Dismiss"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#1F5C32', display: 'inline-flex', alignItems: 'center',
            padding: 2,
          }}
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
    );
  }

  // Red banner for both "key missing" and "key configured but unreachable".
  return (
    <div style={{
      padding: '12px 16px', background: '#FFF4E5',
      borderBottom: '2px solid #C8573B',
      color: '#7A2E18', fontSize: 13, lineHeight: 1.5,
      fontFamily: 'var(--font-body)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <Icon name="warning" size="md" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          OpenAI image-gen is NOT active — every image will be rendered by Gemini fallback
        </div>
        <div>
          {openaiMissing ? (
            <>The <code>OPENAI_API_KEY</code> environment variable is not set on the Vercel server. Add it in your Vercel project's Environment Variables (Production + Preview), then redeploy.</>
          ) : openaiBroken ? (
            <>OpenAI is configured but unreachable: <code>{health.openai.error || 'unknown error'}</code>. Common causes: expired key, billing limit, model name not enabled on your account.</>
          ) : null}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#5A220F' }}>
          Until this is fixed, expect Gemini's typical failure modes: misspelled labels (ESOHAPUS / GALLBALLDER), unsolicited red-circle "X" answer-marker overlays, and stock-photo style on what should be diagrams.
        </div>
      </div>
    </div>
  );
};

export default ProviderHealthBanner;
