import { GoogleGenAI } from '@google/genai';

// In a real production Netlify app, you'll need an Edge Function or serverless backend for this
// to hide the API key. For this local MVP, we use the VITE_ prefix.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('geminiApiKey');

if (!apiKey) {
  console.warn('API Key not found in env VITE_GEMINI_API_KEY or localStorage. Agents will fail.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const generateAgentResponse = async (systemPrompt: string, userPayload: string, schema?: any) => {
  if (!apiKey && !localStorage.getItem('geminiApiKey')) {
    throw new Error('API Key missing. Please provide VITE_GEMINI_API_KEY in .env');
  }

  const model = 'gemini-2.5-flash';

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: [
            { text: userPayload }
        ],
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.1,
        }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty response from AI model");
  } catch (error) {
    console.error("Agent Execution Error:", error);
    throw error;
  }
};

export const generateWithGroundedSearch = async (systemPrompt: string, userPayload: string) => {
  if (!apiKey && !localStorage.getItem('geminiApiKey')) {
    throw new Error('API Key missing. Please provide VITE_GEMINI_API_KEY in .env');
  }

  const model = 'gemini-2.5-flash';

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: [
            { text: userPayload }
        ],
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            tools: [{ googleSearch: {} }],
        }
    });

    return {
      text: response.text || '',
      groundingMetadata: (response as any).candidates?.[0]?.groundingMetadata || null
    };
  } catch (error) {
    console.error("Grounded Search Error:", error);
    throw error;
  }
};
