// Content extraction — uses centralized API for key rotation and retry

import { generateWithGroundedSearch } from '../agents/api';

export async function extractYouTubeContent(url: string): Promise<string> {
  const result = await generateWithGroundedSearch(
    'Content Extractor',
    `Extract educational content from this YouTube video for assessment question generation.
URL: ${url}
Extract: topic, key concepts, facts, definitions, processes, terminology, formulas, examples.
Format as structured educational content. If you cannot access the video, extract from title/description.`,
    JSON.stringify({ url })
  );
  return result.text || 'Could not extract content from video.';
}

export async function extractWebContent(url: string): Promise<string> {
  const result = await generateWithGroundedSearch(
    'Content Extractor',
    `Extract educational content from this webpage for assessment question generation.
URL: ${url}
Extract: key concepts, facts, definitions, processes, formulas, data, examples.
Focus on educational content. Ignore navigation, ads, non-educational content.`,
    JSON.stringify({ url })
  );
  return result.text || 'Could not extract content from webpage.';
}

export function detectUrlType(url: string): 'youtube' | 'website' {
  if (['youtube.com', 'youtu.be', 'youtube-nocookie.com'].some(p => url.includes(p))) return 'youtube';
  return 'website';
}
