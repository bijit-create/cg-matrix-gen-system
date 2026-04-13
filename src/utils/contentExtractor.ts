import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('geminiApiKey');
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export async function extractYouTubeContent(url: string): Promise<string> {
  // Use Gemini with grounded search to extract video content/transcript summary
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract and summarize the educational content from this YouTube video for use in generating assessment questions.

URL: ${url}

Instructions:
1. Identify the video topic, subject, and grade level
2. Extract ALL key concepts, facts, definitions, processes, and examples taught
3. Note any specific terminology, formulas, or procedures demonstrated
4. List the main learning points in order
5. Include any diagrams, experiments, or visual demonstrations described

Format your response as structured educational content that can be used to create assessment questions.
If you cannot access the video content, extract whatever information is available from the video title, description, and metadata.`,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    }
  });

  return response.text || 'Could not extract content from video.';
}

export async function extractWebContent(url: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract the educational content from this webpage for use in generating assessment questions.

URL: ${url}

Instructions:
1. Read the full page content
2. Extract ALL key concepts, facts, definitions, processes, formulas, and examples
3. Preserve specific data points, numbers, and technical terms accurately
4. Note the subject, topic, and approximate grade level
5. Structure the content as clear educational material

Focus on extractable factual content that can be used to create questions. Ignore navigation, ads, and non-educational content.`,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    }
  });

  return response.text || 'Could not extract content from webpage.';
}

export function detectUrlType(url: string): 'youtube' | 'website' {
  const ytPatterns = ['youtube.com', 'youtu.be', 'youtube-nocookie.com'];
  if (ytPatterns.some(p => url.includes(p))) return 'youtube';
  return 'website';
}
