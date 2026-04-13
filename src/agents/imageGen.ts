import { GoogleGenAI, Type } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('geminiApiKey');
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      const actualDelay = isRateLimit ? delay * 2 : delay;
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export interface ImageResult {
  status: 'generated' | 'svg' | 'skipped' | 'failed';
  dataUrl?: string;
  reason?: string;
}

export async function analyzeVisualIntent(question: string): Promise<{
  status: 'generate_image' | 'generate_svg' | 'skip';
  reason: string;
  image_prompt?: string;
  svg_prompt?: string;
}> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this educational question and decide if a visual image would help students understand it.

Rules:
- GENERATE_IMAGE: For questions where a diagram, flowchart, illustration, or picture of real-world objects helps represent the problem. Good for: science processes, real-world math scenarios, comparisons, data representation.
- GENERATE_SVG: For geometry (angles, shapes, coordinates), precise graphs, mathematical equations/expressions, number lines, or tables.
- SKIP: For pure text/recall questions, simple definitions, basic arithmetic without visual context, or when an image adds no value.

If GENERATE_IMAGE, write a detailed image prompt:
- Start with "A simple flat vector educational diagram of..."
- Style: minimalist, solid white background, clear bold text, child-friendly
- Include labels, numbers, and "?" marks where appropriate
- Use Indian context where relevant (rupees symbol ₹, Indian names, local items)
- DO NOT show the answer in the image
- Keep text in simple English

If GENERATE_SVG, write an SVG prompt:
- Describe exact shapes, coordinates, labels needed
- Clean responsive SVG, white background, 4:3 aspect ratio
- Use sans-serif fonts, clear colors

Question: "${question}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['generate_image', 'generate_svg', 'skip'] },
            reason: { type: Type.STRING },
            image_prompt: { type: Type.STRING },
            svg_prompt: { type: Type.STRING }
          },
          required: ['status', 'reason']
        }
      }
    }));

    if (response.text) return JSON.parse(response.text);
    return { status: 'skip', reason: 'Empty response' };
  } catch {
    return { status: 'skip', reason: 'Analysis failed' };
  }
}

export async function generateImage(prompt: string): Promise<ImageResult> {
  try {
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
        return {
          status: 'generated',
          dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        };
      }
    }
    return { status: 'failed', reason: 'No image in response' };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}

export async function generateSvg(prompt: string): Promise<ImageResult> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert SVG coder. Create a clean, responsive SVG diagram.

Rules:
- Return ONLY valid SVG code, no markdown wrapping
- Use viewBox="0 0 800 600" (4:3 aspect ratio)
- White background, clean modern colors
- Use Arial/sans-serif fonts, clear labels
- Include text, measurements, and "?" where needed
- Child-friendly, simple design

Prompt: ${prompt}`,
    }));

    let svgCode = response.text?.trim() || '';
    if (svgCode.startsWith('```svg')) svgCode = svgCode.replace(/^```svg\n?/, '').replace(/\n?```$/, '');
    else if (svgCode.startsWith('```')) svgCode = svgCode.replace(/^```\n?/, '').replace(/\n?```$/, '');

    if (!svgCode.startsWith('<svg')) {
      return { status: 'failed', reason: 'Invalid SVG generated' };
    }

    const base64Svg = btoa(unescape(encodeURIComponent(svgCode)));
    return {
      status: 'svg',
      dataUrl: `data:image/svg+xml;base64,${base64Svg}`
    };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}

export async function generateQuestionImage(question: string): Promise<ImageResult> {
  const intent = await analyzeVisualIntent(question);

  if (intent.status === 'skip') {
    return { status: 'skipped', reason: intent.reason };
  }

  if (intent.status === 'generate_svg' && intent.svg_prompt) {
    return await generateSvg(intent.svg_prompt);
  }

  if (intent.status === 'generate_image' && intent.image_prompt) {
    return await generateImage(intent.image_prompt);
  }

  return { status: 'skipped', reason: 'No prompt generated' };
}
