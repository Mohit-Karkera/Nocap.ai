export interface NewsAnalysisResult {
  originalContent: string;
  score: number;
  risk_level: string;
  signals: string[];
  reasoning: string;
  sources?: { title: string; url: string }[];
  timestamp: string;
}

export enum AnalysisType {
  URL = 'url',
  TEXT = 'text'
}

export interface User {
  username: string;
  id: string;
}
