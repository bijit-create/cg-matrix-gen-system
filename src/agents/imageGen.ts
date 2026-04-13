// Image Generation — smart routing: AI images, KaTeX math, Canvas charts, SVG geometry

import { generateAgentResponse, generateImageContent, generateSvgContent } from './api';
import { Type } from '@google/genai';

// --- Normalize to 4:3 PNG, minimum 400px ---
export async function normalizeToCanvas(base64DataUrl: string, targetWidth = 800): Promise<{ dataUrl: string; sizeKb: number }> {
  const width = Math.max(400, targetWidth);
  const height = Math.round(width * 3 / 4);

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

// --- Analyze question to decide rendering method ---
export async function analyzeVisualIntent(question: string): Promise<{
  status: string;
  reason: string;
  prompt?: string;
}> {
  try {
    return await generateAgentResponse(
      'Image Analysis',
      `Classify what visual this question needs.

GENERATE_IMAGE: Real-world objects, food, animals, plants, scenarios, diagrams. Write image prompt.
RENDER_MATH: Math equations, fractions, algebra. Write LaTeX expression only.
RENDER_CHART: Data visualization. Write JSON: {"type":"bar"|"pie","title":"...","data":[{"label":"...","value":N}]}
RENDER_TABLE: Tabular data. Write JSON: {"title":"...","headers":["..."],"rows":[["..."]]}
RENDER_NUMBERLINE: Number lines. Write JSON: {"min":N,"max":N,"marks":[{"value":N,"label":"..."}]}
GENERATE_SVG: Precise geometry ONLY (angles, polygons, coordinates).
SKIP: No visual needed.

Question: "${question}"`,
      '{}',
      {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['generate_image', 'render_math', 'render_chart', 'render_table', 'render_numberline', 'generate_svg', 'skip'] },
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

// --- Full pipeline: question → classify → render with the right tool ---
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

    switch (intent.status) {
      case 'render_math': {
        const { renderMathToSvg } = await import('../utils/preciseRenderer');
        rawDataUrl = renderMathToSvg(intent.prompt);
        break;
      }
      case 'render_chart': {
        const parsed = JSON.parse(intent.prompt);
        const { renderBarChart, renderPieChart } = await import('../utils/preciseRenderer');
        rawDataUrl = parsed.type === 'pie'
          ? renderPieChart(parsed.data, parsed.title)
          : renderBarChart(parsed.data, parsed.title);
        break;
      }
      case 'render_table': {
        const parsed = JSON.parse(intent.prompt);
        const { renderTable } = await import('../utils/preciseRenderer');
        rawDataUrl = renderTable(parsed.headers, parsed.rows, parsed.title);
        break;
      }
      case 'render_numberline': {
        const parsed = JSON.parse(intent.prompt);
        const { renderNumberLine } = await import('../utils/preciseRenderer');
        rawDataUrl = renderNumberLine(parsed.min, parsed.max, parsed.marks, parsed.title);
        break;
      }
      case 'generate_svg': {
        rawDataUrl = await generateSvgContent(intent.prompt);
        break;
      }
      default: {
        rawDataUrl = await generateImageContent(intent.prompt);
        break;
      }
    }

    const { dataUrl, sizeKb } = await normalizeToCanvas(rawDataUrl);
    return { status: 'generated', dataUrl, sizeKb };
  } catch (e: any) {
    return { status: 'failed', reason: e.message };
  }
}

// --- Direct prompt → AI image (for option images in picture_mcq) ---
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
