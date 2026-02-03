
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;
const MODEL_ID = "jy46604790/Fake-News-Bert-Detect";

export interface BertAnalysisResult {
  label: string;
  score: number;
}

export const huggingFaceService = {
  async analyzeWithBert(text: string): Promise<BertAnalysisResult[]> {
    if (!HF_API_KEY) {
      console.warn("Hugging Face API Key is missing.");
      return [];
    }

    try {
      const fetchWithRetry = async (retries = 1, delay = 2000): Promise<Response> => {
        const res = await fetch(
          `https://api-inference.huggingface.co/models/${MODEL_ID}`,
          {
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: text }),
          }
        );

        if (res.status === 503 && retries > 0) {
          console.warn(`Hugging Face model is loading (503). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(retries - 1, delay);
        }

        return res;
      };

      const response = await fetchWithRetry();

      if (!response.ok) {
        if (response.status === 503) {
          console.warn("Hugging Face model is still loading after retry. Skipping BERT analysis.");
          return [];
        }
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      // The API typically returns an array of arrays for classification [[{label: 'LABEL_0', score: 0.9}, ...]]
      // or just an array depending on the exact model pipeline.
      // Based on common HF inference API responses for text-classification:
      return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    } catch (error) {
      console.error("Error analyzing with BERT model:", error);
      return [];
    }
  },
};
