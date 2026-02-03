import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    Loader2,
    ExternalLink,
    Info,
    AlertTriangle,
    CheckCircle2,
    MousePointer2,
    LayoutDashboard
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { NewsAnalysisResult } from './types';

const PopupApp: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<NewsAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ username: string; id: string } | null>(null);

    // Load user from localStorage
    useEffect(() => {
        const savedUser = localStorage.getItem('nocap_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    // Check for pending selection on mount
    useEffect(() => {
        chrome.storage.local.get(['pending_selection'], (result) => {
            if (result.pending_selection && typeof result.pending_selection === 'string') {
                // Auto-analyze the selection
                analyzeSelection(result.pending_selection);
                // Clear the pending selection
                chrome.storage.local.remove('pending_selection');
            }
        });
    }, []);

    const analyzeSelection = async (text: string) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const data = await geminiService.analyzeNews(text, '');
            setResult(data);

            // Save to vault history if user is logged in
            if (user) {
                const savedHistory = localStorage.getItem(`nocap_history_${user.username}`);
                const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
                const newHistory = [data, ...currentHistory].slice(0, 15);
                localStorage.setItem(`nocap_history_${user.username}`, JSON.stringify(newHistory));
            }
        } catch (err: any) {
            console.error("Selection Analysis Error:", err);
            setError(err?.message || "Failed to analyze selection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleVerify = async () => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            // 1. Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error("No active tab found");

            // 2. Scrape content via content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
            if (!response || !response.text) {
                throw new Error("Could not extract enough text from this page.");
            }

            const data = await geminiService.analyzeNews(response.text, response.url);
            setResult(data);

            // Save to vault history if user is logged in
            if (user) {
                const savedHistory = localStorage.getItem(`nocap_history_${user.username}`);
                const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
                const newHistory = [data, ...currentHistory].slice(0, 15);
                localStorage.setItem(`nocap_history_${user.username}`, JSON.stringify(newHistory));
            }
        } catch (err: any) {
            console.error("Popup Error:", err);
            if (err?.message?.includes('Could not establish connection')) {
                setError("Please refresh the page and try again. The extension needs a fresh start on this tab.");
            } else {
                setError(err?.message || "Failed to analyze page.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleStartSelection = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error("No active tab found");

            await chrome.tabs.sendMessage(tab.id, { action: 'start-selection' });
            window.close(); // Close popup so user can see the page
        } catch (err: any) {
            console.error("Selection Error:", err);
            setError("Failed to start selection. Please refresh the page and try again.");
        }
    };

    const openDashboard = () => {
        if (!user) {
            window.open('http://localhost:5173', '_blank');
            return;
        }

        const savedHistory = localStorage.getItem(`nocap_history_${user.username}`);
        let params = '';

        if (savedHistory) {
            try {
                // Determine what to pass - for now pass everything but maybe limit size if needed
                params = `?history=${encodeURIComponent(savedHistory)}`;
            } catch (e) {
                console.error("Failed to encode history", e);
            }
        }

        window.open(`http://localhost:5173${params}`, '_blank');
    };

    const openWebsite = () => {
        if (result) {
            // Pass complete result data to the website
            const dataToPass = {
                score: result.score,
                risk_level: result.risk_level,
                signals: result.signals,
                reasoning: result.reasoning,
                url: result.originalContent.startsWith('http') ? result.originalContent : '',
                timestamp: result.timestamp // Include timestamp for vault history
            };

            const encodedData = encodeURIComponent(JSON.stringify(dataToPass));
            const websiteUrl = `http://localhost:5173/?data=${encodedData}`;
            window.open(websiteUrl, '_blank');
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'High': return 'text-rose-600 bg-rose-50 border-rose-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'Low': return <CheckCircle2 className="w-4 h-4" />;
            case 'Medium': return <Info className="w-4 h-4" />;
            case 'High': return <AlertTriangle className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="w-[280px] p-4 flex flex-col gap-4 font-sans antialiased text-slate-900">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-slate-900 p-1.5 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                </div>
                <h1 className="text-xl font-bold tracking-normal">NoCap</h1>
            </div>

            {!result && !isAnalyzing && (
                <div className="flex flex-col gap-3 py-4">
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                        Verify the credibility of this article.
                    </p>
                    <button
                        onClick={handleVerify}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
                    >
                        Verify Credibility
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleStartSelection}
                            className="bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <MousePointer2 className="w-4 h-4" />
                            Scan Area
                        </button>
                        <button
                            onClick={openDashboard}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                    </div>
                </div>
            )}

            {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 ">Analyzing article...</p>
                </div>
            )}

            {error && !isAnalyzing && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600">
                    <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-bold leading-tight">{error}</p>
                </div>
            )}

            {result && !isAnalyzing && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Score Section */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Credibility Score</span>
                        <div className="relative flex items-center justify-center w-24 h-24">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="48" cy="48" r="40"
                                    stroke="currentColor" strokeWidth="8" fill="transparent"
                                    className="text-slate-50"
                                />
                                <circle
                                    cx="48" cy="48" r="40"
                                    stroke="currentColor" strokeWidth="8" fill="transparent"
                                    strokeDasharray={251.2}
                                    strokeDashoffset={251.2 * (1 - result.score / 100)}
                                    className={`${result.score >= 80 ? 'text-emerald-500' :
                                        result.score >= 50 ? 'text-amber-500' :
                                            'text-rose-500'
                                        } transition-all duration-1000 ease-out`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-2xl font-bold">{result.score}%</span>
                        </div>
                    </div>

                    {/* Risk Level */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${getRiskColor(result.risk_level)}`}>
                        <div className="flex items-center gap-2">
                            {getRiskIcon(result.risk_level)}
                            <span className="text-xs font-bold ">Risk Level</span>
                        </div>
                        <span className="text-sm font-bold">{result.risk_level}</span>
                    </div>

                    {/* Key Signals */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Key Signals</span>
                        <ul className="flex flex-col gap-1.5">
                            {result.signals.slice(0, 5).map((signal, i) => (
                                <li key={i} className="text-[11px] font-medium text-slate-600 flex items-start gap-2 leading-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                                    {signal}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={openWebsite}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
                    >
                        View Reasoning <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default PopupApp;
