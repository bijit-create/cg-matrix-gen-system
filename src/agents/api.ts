// Frontend API layer — calls Vercel Edge Function proxy (no API keys in browser)

import { requestQueue } from '../services/requestQueue';
import { responseCache, hashPrompt } from '../services/responseCache';
import { getAgentConfig } from '../services/agentConfig';

const API_URL = '/api/gemini';

// Payload size guard
function fitToWindow(systemPrompt: string, userPayload: string, maxChars = 180000): { systemPrompt: string; userPayload: string } {
  const total = systemPrompt.length + userPayload.length;
  if (total <= maxChars) return { systemPrompt, userPayload };
  const available = maxChars - systemPrompt.length;
  if (available > 1000) {
    return { systemPrompt, userPayload: userPayload.slice(0, available) + '\n[TRUNCATED]' };
  }
  return {
    systemPrompt: systemPrompt.slice(0, maxChars * 0.3) + '\n[TRUNCATED]',
    userPayload: userPayload.slice(0, maxChars * 0.7) + '\n[TRUNCATED]',
  };
}

async function callProxy(body: any): Promise<any> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const error = new Error(err.error || `API error ${res.status}`);
    (error as any).status = res.status;
    (error as any).retryable = err.retryable || res.status === 429;
    throw error;
  }

  return res.json();
}

// Main structured JSON response — used by all agents
export const generateAgentResponse = async (
  agentName: string,
  systemPrompt: string,
  userPayload: string,
  schema?: any
): Promise<any> => {
  const config = getAgentConfig(agentName);

  // Check cache
  if (config.cacheable) {
    const cacheKey = hashPrompt(systemPrompt, userPayload);
    const cached = responseCache.get(cacheKey);
    if (cached !== null) return cached;
  }

  const { systemPrompt: sp, userPayload: up } = fitToWindow(systemPrompt, userPayload);

  const result = await requestQueue.enqueue<any>(
    async () => {
      const response = await callProxy({
        action: 'generate',
        model: config.model,
        systemPrompt: sp,
        userPayload: up,
        schema,
        temperature: config.temperature,
      });
      if (response.text) return JSON.parse(response.text);
      throw new Error('Empty response');
    },
    { maxRetries: 3, baseDelay: 2000 }
  );

  if (config.cacheable) {
    const cacheKey = hashPrompt(systemPrompt, userPayload);
    responseCache.set(cacheKey, result);
  }

  return result;
};

// Grounded search — no JSON schema, returns raw text
export const generateWithGroundedSearch = async (
  agentName: string,
  systemPrompt: string,
  userPayload: string
): Promise<{ text: string; groundingMetadata: any }> => {
  const config = getAgentConfig(agentName);
  const { systemPrompt: sp, userPayload: up } = fitToWindow(systemPrompt, userPayload);

  return requestQueue.enqueue(
    async () => {
      const response = await callProxy({
        action: 'generate',
        model: config.model,
        systemPrompt: sp,
        userPayload: up,
        temperature: config.temperature,
        tools: [{ googleSearch: {} }],
      });
      return { text: response.text || '', groundingMetadata: null };
    },
    { maxRetries: 2, baseDelay: 3000 }
  );
};

// Image generation
export const generateImageContent = async (prompt: string): Promise<string> => {
  return requestQueue.enqueue(
    async () => {
      const response = await callProxy({
        action: 'generateImage',
        userPayload: prompt,
      });
      if (response.image) return response.image;
      throw new Error('No image');
    },
    { maxRetries: 2, baseDelay: 4000 }
  );
};

// Image editing
export const editImageContent = async (base64Image: string, editPrompt: string): Promise<string> => {
  const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format');

  return requestQueue.enqueue(
    async () => {
      const response = await callProxy({
        action: 'editImage',
        imageData: match![2],
        imageMimeType: match![1],
        editPrompt,
      });
      if (response.image) return response.image;
      throw new Error('Edit failed');
    },
    { maxRetries: 2, baseDelay: 4000 }
  );
};

// SVG generation (uses text model via proxy)
export const generateSvgContent = async (prompt: string): Promise<string> => {
  return requestQueue.enqueue(
    async () => {
      const response = await callProxy({
        action: 'generate',
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are an expert SVG coder. Return ONLY raw SVG code. viewBox="0 0 800 600". White bg. Arial font. Clean colors.',
        userPayload: prompt,
        temperature: 0.2,
      });
      let svg = (response.text || '').trim();
      if (svg.startsWith('```')) svg = svg.replace(/^```(?:svg)?\n?/, '').replace(/\n?```$/, '');
      if (!svg.startsWith('<svg')) throw new Error('Invalid SVG');
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    },
    { maxRetries: 2, baseDelay: 2000 }
  );
};
