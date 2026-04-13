// Centralized API layer — key rotation, retry, caching, per-agent config

import { GoogleGenAI } from '@google/genai';
import { requestQueue } from '../services/requestQueue';
import { responseCache, hashPrompt } from '../services/responseCache';
import { getAgentConfig } from '../services/agentConfig';

// Payload size guard — prevents token overflow
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
    async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [{ text: up }],
        config: {
          systemInstruction: sp,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: config.temperature,
        },
      });

      if (response.text) return JSON.parse(response.text);
      throw new Error('Empty response from AI model');
    },
    { maxRetries: 3, baseDelay: 2000 }
  );

  // Cache result
  if (config.cacheable) {
    const cacheKey = hashPrompt(systemPrompt, userPayload);
    responseCache.set(cacheKey, result);
  }

  return result;
};

// Grounded search — no JSON schema, returns raw text + metadata
export const generateWithGroundedSearch = async (
  agentName: string,
  systemPrompt: string,
  userPayload: string
): Promise<{ text: string; groundingMetadata: any }> => {
  const config = getAgentConfig(agentName);
  const { systemPrompt: sp, userPayload: up } = fitToWindow(systemPrompt, userPayload);

  return requestQueue.enqueue(
    async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [{ text: up }],
        config: {
          systemInstruction: sp,
          temperature: config.temperature,
          tools: [{ googleSearch: {} }],
        },
      });
      return {
        text: response.text || '',
        groundingMetadata: (response as any).candidates?.[0]?.groundingMetadata || null,
      };
    },
    { maxRetries: 2, baseDelay: 3000 }
  );
};

// Image generation — uses image model, returns base64 data URL
export const generateImageContent = async (
  prompt: string,
  aspectRatio: '4:3' | '1:1' | '16:9' = '4:3'
): Promise<string> => {
  const config = getAgentConfig('Image Generation');

  return requestQueue.enqueue(
    async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio },
        } as any,
      });

      for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      throw new Error('No image generated');
    },
    { maxRetries: 2, baseDelay: 4000 }
  );
};

// Image editing — send existing image + edit prompt
export const editImageContent = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format');
  const config = getAgentConfig('Image Generation');

  return requestQueue.enqueue(
    async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: {
          parts: [
            { inlineData: { data: match![2], mimeType: match![1] } },
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
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      throw new Error('Edit failed');
    },
    { maxRetries: 2, baseDelay: 4000 }
  );
};

// SVG generation — uses text model, returns SVG code as base64 data URL
export const generateSvgContent = async (prompt: string): Promise<string> => {
  const config = getAgentConfig('SVG Generation');

  return requestQueue.enqueue(
    async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: `You are an expert SVG coder. Create a clean, precise SVG diagram.
Rules: Return ONLY raw SVG code. viewBox="0 0 800 600" (4:3). White background. Arial/sans-serif. Clean colors.
Prompt: ${prompt}`,
      });

      let svg = response.text?.trim() || '';
      if (svg.startsWith('```')) svg = svg.replace(/^```(?:svg)?\n?/, '').replace(/\n?```$/, '');
      if (!svg.startsWith('<svg')) throw new Error('Invalid SVG');

      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    },
    { maxRetries: 2, baseDelay: 2000 }
  );
};
