import { NewsAnalysisResult } from '../types';
import { BertAnalysisResult } from './huggingFaceService';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are the Meta-Reviewer for a Hybrid Misinformation Detection System.

Your goal is to synthesize two signals into a final credibility assessment:
1. Signal A: Statistical Logic (BERT Classifier) - scans for patterns typical of fake news.
2. Signal B: Semantic Logic (Your Analysis) - scans for logical fallacies, emotional manipulation, and factual inconsistencies.

PROTOCOL:
- If Signal A is High Confidence (>85%) and matches your analysis -> significantly boost confidence.
- If signals DISAGREE -> verify strictly against logic and facts. Explicitly mention the disagreement in the reasoning (e.g. "Classifier flagged this, but content is satire...").

Respond ONLY in valid JSON:
{
  "credibility_score": number (0-100),
  "risk_level": "Low" | "Medium" | "High",
  "signals": [string],
  "summary_reasoning": string (MUST mention "Hybrid analysis" or "Ensemble verdict"),
  "sources": [{ "title": string, "url": string }] (List 1-3 trusted authorities or the source URL itself if valid)
}
`;

export const geminiService = {
  async analyzeNews(input: string, url: string = '', bertResults?: BertAnalysisResult[]): Promise<NewsAnalysisResult> {
    if (!API_KEY) {
      console.error("Gemini API Key is missing. Check .env.local");
      throw new Error("Configuration Error: Gemini API Key is missing.");
    }

    let promptContext = "";

    // Add BERT context if available
    if (bertResults && bertResults.length > 0) {
      // Find the highest confidence score
      const topResult = bertResults.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      const confidence = (topResult.score * 100).toFixed(1);

      promptContext = `\n[SIGNAL A: STATISTICAL CLASSIFIER REPORT]\nModel: BERT-Fake-News-Detector\nVerdict: ${topResult.label}\nConfidence: ${confidence}%\n\nINSTRUCTION: Incorporate this statistical signal into your final hybrid verdict. If confidence is high (>90%), give it significant weight.\n`;
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
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!raw) {
          throw new Error("Empty response from Gemini");
        }

        // SANITIZATION: Remove markdown code blocks if present
        raw = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

        try {
          const parsed = JSON.parse(raw);

          return {
            originalContent: input,
            score: parsed.credibility_score,
            risk_level: parsed.risk_level,
            signals: parsed.signals,
            reasoning: parsed.summary_reasoning,
            sources: parsed.sources || [],
            timestamp: new Date().toISOString(),
          } as NewsAnalysisResult;
        } catch (parseErr) {
          console.error("Failed to parse JSON from Gemini:", raw);
          throw new Error("Invalid format received from AI analysis. Please try again.");
        }

      } catch (err: any) {
        lastError = err;
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }
};
