import { NewsAnalysisResult } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are a fact-checking engine.
Return strict JSON:
{
  "originalContent": "...",
  "score": 0-100,
  "verdict": "Likely true | Likely false | Unclear",
  "reasoning": "...",
  "timestamp": "ISO string"
}
`;

export const geminiService = {
  async analyzeNews(input: string): Promise<NewsAnalysisResult> {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SYSTEM_PROMPT + '\nInput:\n' + input }] }],
          generationConfig: { response_mime_type: 'application/json' }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}`);
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(raw);

    return {
      ...parsed,
      originalContent: input,
      timestamp: parsed.timestamp || new Date().toISOString(),
    } as NewsAnalysisResult;
  }
};
