import { NewsAnalysisResult } from '../types';
import { BertAnalysisResult } from './huggingFaceService';

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
  async analyzeNews(input: string, bertResults?: BertAnalysisResult[]): Promise<NewsAnalysisResult> {
    let promptContext = "";
    if (bertResults && bertResults.length > 0) {
      const formattedBert = bertResults.map(b => `${b.label}: ${(b.score * 100).toFixed(2)}%`).join(", ");
      promptContext = `\n[ADDITIONAL CONTEXT FROM BERT FAKE NEWS DETECTOR]\nThe following are confidence scores from a specialized BERT model designed to detect fake news. Use this as a signal, but prioritize your own logical reasoning and knowledge base. If the BERT model indicates high probability of "Fake" or "Real", consider it in your final verdict.\nBERT SCORES: ${formattedBert}\n`;
    }

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Current Date: " + new Date().toISOString() + "\n" + SYSTEM_PROMPT + promptContext + '\nInput:\n' + input }] }],
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
