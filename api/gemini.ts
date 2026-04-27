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
          return res.status(200).json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
      return res.status(500).json({ error: 'No image generated' });

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
      // OPENAI_IMAGE_MODEL env). Falls through to the caller's fallback chain
      // on any failure so the client can retry via Gemini.
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server.' });
      }
      const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
      const size = (req.body.size as string) || '1024x1024';
      const quality = (req.body.quality as string) || 'standard';
      const oa = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: userPayload || '',
          size,
          quality,
          n: 1,
        }),
      });
      if (!oa.ok) {
        const text = await oa.text();
        const is429 = oa.status === 429;
        return res.status(is429 ? 429 : oa.status).json({
          error: `OpenAI image gen failed (${oa.status}): ${text.slice(0, 200)}`,
          retryable: is429,
        });
      }
      const data: any = await oa.json();
      const item = data?.data?.[0];
      if (item?.b64_json) {
        return res.status(200).json({ image: `data:image/png;base64,${item.b64_json}` });
      }
      if (item?.url) {
        // Fetch and convert to base64 so the client gets the same shape.
        const imgResp = await fetch(item.url);
        const buf = Buffer.from(await imgResp.arrayBuffer());
        const mime = imgResp.headers.get('content-type') || 'image/png';
        return res.status(200).json({ image: `data:${mime};base64,${buf.toString('base64')}` });
      }
      return res.status(500).json({ error: 'OpenAI returned no image data.' });

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
