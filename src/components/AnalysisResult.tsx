import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { NewsAnalysisResult } from '../types';

interface Props {
  result: NewsAnalysisResult;
}

const AnalysisResult: React.FC<Props> = ({ result }) => {
  const good = result.score >= 80;
  const mid = result.score >= 50;
  const color = good ? 'text-emerald-600' : mid ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-4">
      <div className="flex items-center gap-3">
        {good ? <ShieldCheck className={`w-6 h-6 ${color}`} /> : <ShieldAlert className={`w-6 h-6 ${color}`} />}
        <div>
          <div className={`text-2xl font-black ${color}`}>{result.score}% credibility</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            {result.verdict}
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {result.reasoning}
      </p>
    </div>
  );
};

export default AnalysisResult;
