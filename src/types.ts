export enum AnalysisType {
  URL = 'url',
  TEXT = 'text',
}

export interface NewsAnalysisResult {
  originalContent: string;
  score: number;
  verdict: string;
  reasoning: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
}
