// Vercel Edge Function — proxies Gemini API calls
// API keys stay server-side, never sent to browser

import { GoogleGenAI } from '@google/genai';

// Use Node.js serverless runtime (60s timeout on free, 300s on Pro)
// Edge runtime has only 30s which is too short for LLM calls
export const maxDuration = 60;

// Multiple keys for rotation — set in Vercel Environment Variables
function getApiKeys(): string[] {
  const keys: string[] = [];
  // Support GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... up to 10
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  // Also check the single GEMINI_API_KEY
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

// --- Auth: Bearer token check ---
// Set APP_SECRET in Vercel Environment Variables (any strong password)
function checkAuth(req: Request): Response | null {
  const secret = process.env.APP_SECRET;
  if (!secret) return null; // no secret configured = auth disabled (dev mode)

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Set access token in app.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const token = authHeader.slice(7);
  if (token !== secret) {
    return new Response(JSON.stringify({ error: 'Invalid access token.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return null; // auth passed
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }

  // Check auth
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { action, model, systemPrompt, userPayload, schema, temperature, tools, imageConfig } = body;

    const apiKey = getNextKey();
    const ai = new GoogleGenAI({ apiKey });

    if (action === 'generate') {
      // Structured JSON response
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
      return new Response(JSON.stringify({ text: response.text || '' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    } else if (action === 'generateImage') {
      // Image generation
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-preview-image-generation',
        contents: { parts: [{ text: userPayload || '' }] },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: imageConfig || { aspectRatio: '4:3' },
        } as any,
      });

      // Extract image
      for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return new Response(JSON.stringify({
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      return new Response(JSON.stringify({ error: 'No image generated' }), { status: 500 });

    } else if (action === 'editImage') {
      // Image editing
      const { imageData, imageMimeType, editPrompt } = body;
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-preview-image-generation',
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
          return new Response(JSON.stringify({
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      return new Response(JSON.stringify({ error: 'Edit failed' }), { status: 500 });

    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
    }
  } catch (error: any) {
    const is429 = error?.message?.includes('429') || error?.status === 429;
    return new Response(
      JSON.stringify({ error: error.message || 'Server error', retryable: is429 }),
      { status: is429 ? 429 : 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
