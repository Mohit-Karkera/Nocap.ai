import { NewsAnalysisResult } from '../types';
import { BertAnalysisResult } from './huggingFaceService';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are a credibility assessment assistant.

You do NOT verify facts.
You do NOT claim truth or falsehood.
You evaluate whether the given text shows characteristics commonly associated with misinformation.

Analyze based on:
- Writing tone
- Emotional manipulation
- Evidence and sourcing
- Logical consistency
- Sensationalism

The source URL is provided only as contextual metadata.

Respond ONLY in valid JSON using this schema:

{
  "credibility_score": number (0-100),
  "risk_level": "Low" | "Medium" | "High",
  "signals": [string, string, ...],
  "summary_reasoning": string
}

Do not include markdown.
Do not include explanations outside JSON.
`;

export const geminiService = {
  async analyzeNews(input: string, url: string = '', bertResults?: BertAnalysisResult[]): Promise<NewsAnalysisResult> {
    let promptContext = "";

    // Add BERT context if available
    if (bertResults && bertResults.length > 0) {
      const formattedBert = bertResults.map(b => `${b.label}: ${(b.score * 100).toFixed(2)}%`).join(", ");
      promptContext = `\n[ADDITIONAL CONTEXT FROM BERT FAKE NEWS DETECTOR]\nThe following are confidence scores from a specialized BERT model designed to detect fake news. Use this as a signal, but prioritize your own logical reasoning and knowledge base. If the BERT model indicates high probability of "Fake" or "Real", consider it in your final verdict.\nBERT SCORES: ${formattedBert}\n`;
    }

    const prompt = `Source URL: ${url}\n\nText to analyze:\n${input}\n\nIMPORTANT: If this text appears to be news or makes factual claims that could be misinformation, please perform a real-time search to verify its credibility against recent and credible sources.${promptContext}`;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Current Date: " + new Date().toISOString() + "\n" + SYSTEM_PROMPT + '\nInput:\n' + prompt }] }],
              generationConfig: { response_mime_type: 'application/json' }
            })
          }
        );

        if (res.status === 429) {
          // Rate limited - wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!res.ok) {
          throw new Error(`Gemini error ${res.status}`);
        }

        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(raw);

        return {
          originalContent: input,
          score: parsed.credibility_score,
          risk_level: parsed.risk_level,
          signals: parsed.signals,
          reasoning: parsed.summary_reasoning,
          timestamp: new Date().toISOString(),
        } as NewsAnalysisResult;

      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }
};
