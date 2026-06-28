import { GoogleGenerativeAI } from '@google/generative-ai';

const globalForGemini = globalThis as unknown as { gemini: GoogleGenerativeAI };

export const gemini = globalForGemini.gemini ?? new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

if (process.env.NODE_ENV !== 'production') globalForGemini.gemini = gemini;

export async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();

  // Extract JSON robustly
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const clean = fenced ? fenced[1].trim() : (() => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    return start !== -1 && end > start ? text.slice(start, end + 1) : text.trim();
  })();

  return JSON.parse(clean) as T;
}
