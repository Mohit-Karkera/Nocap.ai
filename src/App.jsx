import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  ShieldAlert,
  History,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Quote,
  Clock,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Trash2,
  X,
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { AnalysisType } from './types';
import AnalysisResult from './components/AnalysisResult';
import Auth from './components/Auth';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(AnalysisType.URL);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // load user
  useEffect(() => {
    const savedUser = localStorage.getItem('nocap_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // load history for this user
  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`nocap_history_${user.username}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([]);
      }
    }
  }, [user]);

  const handleLogin = (username) => {
    const newUser = { username, id: Math.random().toString(36).substr(2, 9) };
    setUser(newUser);
    localStorage.setItem('nocap_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setResult(null);
    setHistory([]);
    localStorage.removeItem('nocap_user');
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await geminiService.analyzeNews(inputValue);
      setResult(data);
      const newHistory = [data, ...history].slice(0, 15);
      setHistory(newHistory);
      if (user) {
        localStorage.setItem(
          `nocap_history_${user.username}`,
          JSON.stringify(newHistory)
        );
      }
    } catch (err) {
      console.error('FULL ERROR:', err);
      setError(err?.message || 'Something broke badly');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    if (
      user &&
      window.confirm('Are you sure you want to clear your entire analysis vault?')
    ) {
      setHistory([]);
      localStorage.removeItem(`nocap_history_${user.username}`);
    }
  };

  const deleteHistoryItem = (e, index) => {
    e.stopPropagation();
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    if (user) {
      localStorage.setItem(
        `nocap_history_${user.username}`,
        JSON.stringify(newHistory)
      );
    }
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // This wrapper is what you can adjust for web vs popup
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-4xl flex flex-col bg-slate-50">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setResult(null)}
            >
              <div className="bg-slate-900 p-2 rounded-xl shadow-lg transition-transform active:scale-95">
                <Quote className="w-5 h-5 text-indigo-400 fill-indigo-400" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter select-none">
                NoCap<span className="text-indigo-600">.ai</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Active Agent
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {user.username}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-100 hidden sm:block" />
              <button
                onClick={handleLogout}
                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all border border-transparent hover:border-rose-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 space-y-12">
          {/* Welcome Back / Hero */}
          {!result && !isAnalyzing && (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 mb-2 uppercase tracking-wide">
                <UserIcon className="w-3 h-3" /> Ready, {user.username}
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1] sm:text-6xl">
                Truth Detection <br />
                <span className="text-indigo-600">Reimagined.</span>
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium leading-relaxed">
                Scan links, claims, or articles. No bias. No BS. Just the facts.
              </p>
            </div>
          )}

          {/* Input Panel */}
          <div className="bg-white p-2.5 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 transition-all hover:shadow-indigo-200/50">
            <div className="flex p-1.5 bg-slate-50 rounded-[1.8rem] mb-3">
              <button
                onClick={() => setActiveTab(AnalysisType.URL)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
                  activeTab === AnalysisType.URL
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Search className="w-4 h-4" /> Analyze Link
              </button>
              <button
                onClick={() => setActiveTab(AnalysisType.TEXT)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
                  activeTab === AnalysisType.TEXT
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4" /> Paste Claim
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="relative group">
              {activeTab === AnalysisType.URL ? (
                <div className="relative">
                  <input
                    type="url"
                    placeholder="Paste news article URL here..."
                    className="w-full pl-8 pr-36 py-6 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-xl font-bold"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <textarea
                  placeholder="Paste the statement or article snippet..."
                  className="w-full p-8 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none min-h-[160px] resize-none text-xl font-bold"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                />
              )}

              <button
                type="submit"
                disabled={isAnalyzing}
                className={`absolute right-4 bottom-4 sm:top-1/2 sm:-translate-y-1/2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 group ${
                  isAnalyzing ? 'cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Scanning</span>
                  </>
                ) : (
                  <>
                    <span>Verify</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Area */}
          <div className="space-y-12">
            {error && (
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600">
                <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                <p className="font-bold text-sm">{error}</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-24 space-y-8">
                <div className="relative">
                  <div className="w-32 h-32 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    Deep Scrutiny in Progress
                  </h3>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto">
                    Cross-referencing claims with trusted news databases and live
                    Google data...
                  </p>
                </div>
              </div>
            )}

            {result && !isAnalyzing && (
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Analysis Report
                  </h3>
                  <button
                    onClick={() => {
                      setResult(null);
                      setInputValue('');
                    }}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
                  >
                    New Scan
                  </button>
                </div>
                <AnalysisResult result={result} />
              </div>
            )}

            {!result && !isAnalyzing && (
              <div className="space-y-8">
                {history.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <History className="w-4 h-4" /> Recent Analyses Vault
                      </h3>
                      <button
                        onClick={clearHistory}
                        className="text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Vault
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {history.map((h, i) => (
                        <div
                          key={i}
                          className="group relative flex items-stretch p-0 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-200 transition-all text-left shadow-sm hover:shadow-indigo-100 overflow-hidden cursor-pointer"
                          onClick={() => setResult(h)}
                        >
                          <div
                            className={
                              'w-2 ' +
                              (h.score >= 80
                                ? 'bg-emerald-500'
                                : h.score >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500')
                            }
                          />
                          <div className="flex-1 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div
                                  className={
                                    'p-1.5 rounded-lg ' +
                                    (h.originalContent.startsWith('http')
                                      ? 'bg-indigo-50 text-indigo-600'
                                      : 'bg-slate-100 text-slate-600')
                                  }
                                >
                                  {h.originalContent.startsWith('http') ? (
                                    <Search className="w-3.5 h-3.5" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {new Date(h.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  • {new Date(h.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 line-clamp-2 text-sm leading-relaxed pr-4">
                                {h.originalContent}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <div
                                  className={
                                    'text-xl font-black tracking-tighter ' +
                                    (h.score >= 80
                                      ? 'text-emerald-600'
                                      : h.score >= 50
                                      ? 'text-amber-600'
                                      : 'text-rose-600')
                                  }
                                >
                                  {h.score}%
                                </div>
                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                  CREDIBILITY
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={(e) => deleteHistoryItem(e, i)}
                                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Delete entry"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-24 flex flex-col items-center text-center space-y-5 opacity-40">
                    <div className="p-6 bg-slate-100 rounded-full">
                      <ShieldCheck className="w-12 h-12 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-600 uppercase tracking-tighter">
                        Your Vault is Empty
                      </h3>
                      <p className="text-slate-400 font-medium max-w-xs">
                        Drop a link or claim above to begin building your truth
                        database.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100 py-16 px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-slate-300" />
              <span className="text-lg font-black tracking-tighter text-slate-400">
                NoCap<span className="text-slate-300">.ai</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors">
                API Docs
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
