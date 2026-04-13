import { GoogleGenAI, Type } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('geminiApiKey');
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

// --- Retry with exponential backoff (handles 429 rate limits) ---
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 4000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      const wait = isRateLimit ? delay * 2 : delay;
      await new Promise(r => setTimeout(r, wait));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

// --- Normalize any image to 800x600 PNG (4:3) ---
export async function normalizeToCanvas(base64DataUrl: string): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No 2d context');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);

      // Scale image to fit within 800x600 maintaining aspect ratio
      const scale = Math.min(800 / img.width, 600 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (800 - w) / 2;
      const y = (600 - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      const dataUrl = canvas.toDataURL('image/png');
      const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
      resolve({ dataUrl, sizeKb });
    };
    img.onerror = () => reject('Failed to load image');
    img.src = base64DataUrl;
  });
}

// --- Step 1: Analyze question to decide image type ---
export async function analyzeVisualIntent(question: string): Promise<{
  status: 'generate_image' | 'generate_svg' | 'skip';
  reason: string;
  prompt?: string;
}> {
  try {
    const result = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this educational question and decide how to create a visual support image.

GENERATE_IMAGE: For diagrams, flowcharts, illustrations of real-world objects, food items, animals, plants, scenarios. The image should SHOW the problem visually — not solve it. Include "?" or blank boxes where the answer goes.
GENERATE_SVG: For geometry (angles, shapes), precise graphs, mathematical equations, number lines, tables, data charts.
SKIP: For pure text/recall, simple definitions, or when no visual adds value.

If GENERATE_IMAGE, write a prompt starting with "A simple flat vector educational diagram..." — minimalist, white background, bold labels, 4:3 aspect ratio, child-friendly, include "?" marks. Use Indian context where relevant.
If GENERATE_SVG, describe the SVG needed — viewBox="0 0 800 600", white background, Arial font, clean colors.

Question: "${question}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['generate_image', 'generate_svg', 'skip'] },
              reason: { type: Type.STRING },
              prompt: { type: Type.STRING }
            },
            required: ['status', 'reason']
          }
        }
      });
      if (response.text) return JSON.parse(response.text);
      return { status: 'skip', reason: 'Empty response' };
    });
    return result;
  } catch {
    return { status: 'skip', reason: 'Analysis failed' };
  }
}

// --- Step 2a: Generate AI image (4:3 aspect ratio) ---
export async function generateImage(prompt: string): Promise<string> {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-image-generation',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '4:3' }
    }
  }));

  for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image generated');
}

// --- Step 2b: Generate SVG (800x600, 4:3) ---
export async function generateSvg(prompt: string): Promise<string> {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are an expert SVG coder. Create a clean, precise SVG diagram.

Rules:
- Return ONLY raw SVG code — no markdown, no wrapping
- viewBox="0 0 800 600" (4:3 aspect ratio)
- White background rectangle as first element
- Clean modern colors, readable stroke widths
- Arial/sans-serif fonts, 16-24px for labels
- Include text labels, measurements, "?" marks where needed
- Child-friendly, simple, educational style

Prompt: ${prompt}`,
  }));

  let svg = response.text?.trim() || '';
  if (svg.startsWith('```')) svg = svg.replace(/^```(?:svg)?\n?/, '').replace(/\n?```$/, '');
  if (!svg.startsWith('<svg')) throw new Error('Invalid SVG');

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// --- Step 3: Edit existing image with a prompt ---
export async function editImage(base64Image: string, editPrompt: string): Promise<string> {
  const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format');

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-image-generation',
    contents: {
      parts: [
        { inlineData: { data: match[2], mimeType: match[1] } },
        { text: editPrompt }
      ]
    },
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '4:3' }
    }
  }));

  for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error('Edit failed');
}

// --- Full pipeline: question → analyze → generate → normalize ---
export async function generateQuestionImage(question: string): Promise<{
  status: 'generated' | 'skipped' | 'failed';
  dataUrl?: string;
  sizeKb?: number;
  reason?: string;
}> {
  const intent = await analyzeVisualIntent(question);

  if (intent.status === 'skip' || !intent.prompt) {
    return { status: 'skipped', reason: intent.reason };
  }

  try {
    let rawDataUrl: string;

    if (intent.status === 'generate_svg') {
      rawDataUrl = await generateSvg(intent.prompt);
    } else {
      rawDataUrl = await generateImage(intent.prompt);
    }

    // Normalize to 800x600 PNG
    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}

// --- Generate image from a direct prompt (for option images, etc.) ---
export async function generateFromPrompt(prompt: string): Promise<{
  status: 'generated' | 'failed';
  dataUrl?: string;
  sizeKb?: number;
  reason?: string;
}> {
  try {
    const rawDataUrl = await generateImage(prompt);
    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    // Fallback to SVG
    try {
      const svgUrl = await generateSvg(prompt);
      const { dataUrl, sizeKb } = await normalizeToCanvas(svgUrl);
      return { status: 'generated', dataUrl, sizeKb };
    } catch {
      return { status: 'failed', reason: e.message };
    }
  }
}
