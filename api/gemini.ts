// Vercel Serverless Function (Node.js runtime, 60s timeout on free plan)
// API keys stay server-side, never sent to browser

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  const single = process.env.GEMINI_API_KEY;
  if (single && !keys.includes(single)) keys.unshift(single);
  return keys;
}

let keyIndex = 0;
function getNextKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No GEMINI_API_KEY configured in Vercel env');
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

// Auth check
function checkAuth(req: VercelRequest): string | null {
  const secret = process.env.APP_SECRET;
  if (!secret) return null;
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return 'Unauthorized';
  if (auth.slice(7) !== secret) return 'Invalid access token';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const authError = checkAuth(req);
  if (authError) return res.status(401).json({ error: authError });

  try {
    const { action, model, systemPrompt, userPayload, schema, temperature, tools, imageConfig } = req.body;
    const apiKey = getNextKey();
    const ai = new GoogleGenAI({ apiKey });

    if (action === 'generate') {
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: [{ text: userPayload || '' }],
        config: {
          ...(systemPrompt && { systemInstruction: systemPrompt }),
          ...(schema && { responseMimeType: 'application/json', responseSchema: schema }),
          temperature: temperature ?? 0.2,
          ...(tools && { tools }),
        },
      });
      return res.status(200).json({ text: response.text || '' });

    } else if (action === 'generateImage') {
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userPayload || '' }] },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: imageConfig || { aspectRatio: '4:3' },
        } as any,
      });
      for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return res.status(200).json({
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            provider: 'gemini',
          });
        }
      }
      return res.status(500).json({ error: 'No image generated', provider: 'gemini' });

    } else if (action === 'editImage') {
      const { imageData, imageMimeType, editPrompt } = req.body;
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: imageData, mimeType: imageMimeType } },
            { text: editPrompt },
          ],
        },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio: '4:3' },
        } as any,
      });
      for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return res.status(200).json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
      return res.status(500).json({ error: 'Edit failed' });

    } else if (action === 'generateImageOpenAI') {
      // Primary image-gen path. Uses gpt-image-2 by default (overridable via
      // OPENAI_IMAGE_MODEL env). Returns provider='openai' on success; on any
      // failure returns the error + provider='openai' so the client can decide
      // whether to fall through to Gemini (silent default) or surface the
      // error (when IMAGE_PROVIDER_STRICT=true).
      const strictMode = process.env.IMAGE_PROVIDER_STRICT === 'true';
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        console.warn('[image-gen] OPENAI_API_KEY not configured; client will fall back to Gemini.');
        return res.status(500).json({
          error: strictMode
            ? 'STRICT: OPENAI_API_KEY not configured on server. (IMAGE_PROVIDER_STRICT=true blocks Gemini fallback.)'
            : 'OPENAI_API_KEY not configured on server.',
          provider: 'openai',
        });
      }
      // Default to gpt-image-1 — OpenAI's production image-gen model on
      // /v1/images/generations. gpt-image-2 was documented in some forward-
      // looking blog posts but is not accepted by the public API for most
      // accounts; calling it returns 404 silently and the client falls back
      // to Gemini. Operators who DO have gpt-image-2 access can override
      // with OPENAI_IMAGE_MODEL=gpt-image-2 in Vercel env.
      const openaiModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      // gpt-image-1 only accepts 1024x1024 (square), 1536x1024 (landscape),
      // 1024x1536 (portrait), or 'auto'. The previous '1024x768' returned 400
      // which the silent fallback hid — every image was actually Gemini.
      // 1024x1024 is safest and post-process normalizeToCanvas crops to 4:3.
      const size = (req.body.size as string) || '1024x1024';
      // 'high' is OpenAI's recommended quality for diagrams with small text /
      // multiple labels / dense information panels (cookbook: image-gen
      // prompting guide). Worth the latency for our use case.
      const quality = (req.body.quality as string) || 'high';
      const oa = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          prompt: userPayload || '',
          size,
          quality,
          n: 1,
        }),
      });
      if (!oa.ok) {
        const text = await oa.text();
        const is429 = oa.status === 429;
        const is404 = oa.status === 404;
        // Surface every OpenAI failure to the Vercel function log so operators
        // can diagnose without client-side help.
        console.warn(`[image-gen] OpenAI ${openaiModel} failed: ${oa.status} ${text.slice(0, 200)}`);
        // 404 specifically means the model name isn't recognised on this
        // account / endpoint. Make that diagnosable in the client error.
        const hint = is404
          ? ` (the model "${openaiModel}" was not found on this account; try OPENAI_IMAGE_MODEL=gpt-image-1 in Vercel env)`
          : '';
        return res.status(is429 ? 429 : oa.status).json({
          error: strictMode
            ? `STRICT: OpenAI image gen failed (${oa.status}): ${text.slice(0, 200)}${hint}`
            : `OpenAI image gen failed (${oa.status}): ${text.slice(0, 200)}${hint}`,
          retryable: is429,
          provider: 'openai',
          model: openaiModel,
        });
      }
      const data: any = await oa.json();
      const item = data?.data?.[0];
      if (item?.b64_json) {
        return res.status(200).json({
          image: `data:image/png;base64,${item.b64_json}`,
          provider: 'openai',
          model: openaiModel,
        });
      }
      if (item?.url) {
        // Fetch and convert to base64 so the client gets the same shape.
        const imgResp = await fetch(item.url);
        const buf = Buffer.from(await imgResp.arrayBuffer());
        const mime = imgResp.headers.get('content-type') || 'image/png';
        return res.status(200).json({
          image: `data:${mime};base64,${buf.toString('base64')}`,
          provider: 'openai',
          model: openaiModel,
        });
      }
      console.warn('[image-gen] OpenAI returned no image data; returning 500.');
      return res.status(500).json({ error: 'OpenAI returned no image data.', provider: 'openai' });

    } else if (action === 'imageProviderHealth') {
      // Health probe for the image-gen pipeline. Reports whether each provider
      // is configured and (for OpenAI only) whether the key actually works.
      // Gemini's text key already gets exercised by every other action, so
      // a separate ping here would just be noise.
      const geminiKeys = getApiKeys();
      const openaiKey = process.env.OPENAI_API_KEY;
      const openaiModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
      const strict = process.env.IMAGE_PROVIDER_STRICT === 'true';

      let openaiReachable: boolean | null = null;
      let openaiError: string | undefined;
      if (openaiKey) {
        try {
          // Cheap probe — list available models. No image gen, no tokens charged.
          const probe = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { Authorization: `Bearer ${openaiKey}` },
          });
          openaiReachable = probe.ok;
          if (!probe.ok) {
            const text = await probe.text();
            openaiError = `${probe.status}: ${text.slice(0, 160)}`;
          }
        } catch (e: any) {
          openaiReachable = false;
          openaiError = e?.message?.slice(0, 160) || 'network error';
        }
      }
      return res.status(200).json({
        openai: {
          configured: !!openaiKey,
          model: openaiModel,
          reachable: openaiReachable,
          error: openaiError,
        },
        gemini: {
          configured: geminiKeys.length > 0,
          keyCount: geminiKeys.length,
        },
        strict,
      });

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    const is429 = error?.message?.includes('429') || error?.status === 429;
    return res.status(is429 ? 429 : 500).json({
      error: error.message || 'Server error',
      retryable: is429,
    });
  }
}
