import React from 'react';
import { ShieldCheck, ShieldAlert, ExternalLink, BookOpen } from 'lucide-react';
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
            {result.risk_level} Risk
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {result.reasoning}
      </p>

      {result.sources && result.sources.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Verified Sources
          </h4>
          <div className="space-y-2">
            {result.sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                    {source.title}
                  </span>
                </div>
                {source.url && <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;
