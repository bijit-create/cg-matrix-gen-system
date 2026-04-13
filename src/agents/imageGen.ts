// Image Generation — uses centralized API layer for key rotation, retry, and concurrency

import { generateAgentResponse, generateImageContent, generateSvgContent, editImageContent } from './api';
import { Type } from '@google/genai';

// --- Normalize any image to 800x600 PNG (4:3) ---
// Normalize to 4:3, minimum 400px wide
export async function normalizeToCanvas(base64DataUrl: string, targetWidth = 800): Promise<{ dataUrl: string; sizeKb: number }> {
  const width = Math.max(400, targetWidth);
  const height = Math.round(width * 3 / 4); // 4:3 aspect ratio

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No 2d context');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      const dataUrl = canvas.toDataURL('image/png');
      resolve({ dataUrl, sizeKb: Math.round((dataUrl.length * 0.75) / 1024) });
    };
    img.onerror = () => reject('Failed to load image');
    img.src = base64DataUrl;
  });
}

// --- Analyze question to decide image type ---
export async function analyzeVisualIntent(question: string): Promise<{
  status: 'generate_image' | 'generate_svg' | 'skip';
  reason: string;
  prompt?: string;
}> {
  try {
    return await generateAgentResponse(
      'Image Analysis',
      `Analyze this question and decide how to create a visual support image.

GENERATE_IMAGE (prefer this): For real-world objects, food items, animals, plants, people, scenarios, diagrams, flowcharts. Write a prompt for a clear, colorful, realistic illustration — white background, educational style, no text in image, child-friendly.
GENERATE_SVG (only for math): For precise geometry (angles, shapes, coordinates), number lines, mathematical equations, data tables, graphs. Write SVG description.
SKIP: If the question is purely text-based and no visual adds value.

Question: "${question}"`,
      '{}',
      {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['generate_image', 'generate_svg', 'skip'] },
          reason: { type: Type.STRING },
          prompt: { type: Type.STRING }
        },
        required: ['status', 'reason']
      }
    );
  } catch {
    return { status: 'skip', reason: 'Analysis failed' };
  }
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
      rawDataUrl = await generateSvgContent(intent.prompt);
    } else {
      rawDataUrl = await generateImageContent(intent.prompt);
    }
    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}

// --- Direct prompt → image (for option images etc.) ---
export async function generateFromPrompt(prompt: string): Promise<{
  status: 'generated' | 'failed';
  dataUrl?: string;
  sizeKb?: number;
  reason?: string;
}> {
  try {
    const rawDataUrl = await generateImageContent(prompt);
    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    try {
      const svgUrl = await generateSvgContent(prompt);
      const { dataUrl, sizeKb } = await normalizeToCanvas(svgUrl);
      return { status: 'generated', dataUrl, sizeKb };
    } catch {
      return { status: 'failed', reason: e.message };
    }
  }
}

// --- Edit existing image ---
export async function editImage(base64Image: string, editPrompt: string): Promise<{
  status: 'generated' | 'failed';
  dataUrl?: string;
  sizeKb?: number;
  reason?: string;
}> {
  try {
    const rawDataUrl = await editImageContent(base64Image, editPrompt);
    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}
