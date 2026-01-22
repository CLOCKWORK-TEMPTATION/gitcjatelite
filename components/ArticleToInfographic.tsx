
import React, { useState } from 'react';
import { InfographicStyle, VisualLanguage, InfographicResult, Citation } from '../types';
import { generateArticleInfographic } from '../services/geminiService';
import Loader from './Loader';

interface ArticleToInfographicProps {
  isOpen: boolean;
  onClose: () => void;
}

const ArticleToInfographic: React.FC<ArticleToInfographicProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [style, setStyle] = useState<InfographicStyle>('Modern Editorial');
  const [language, setLanguage] = useState<VisualLanguage>('English');
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Results & History
  const [history, setHistory] = useState<InfographicResult[]>([]);
  const [currentResult, setCurrentResult] = useState<InfographicResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoadingStage("Initializing...");

    try {
        const { imageData, citations, summary } = await generateArticleInfographic(
            url, 
            style, 
            language, 
            (stage) => setLoadingStage(stage)
        );

        // Simple title extraction from URL for history
        let title = "Article Infographic";
        try { title = new URL(url).hostname; } catch(e) {}

        const newResult: InfographicResult = {
            id: Date.now().toString(),
            imageUrl: imageData,
            citations: citations,
            originalUrl: url,
            title: title,
            style: style,
            date: Date.now()
        };

        setHistory(prev => [newResult, ...prev]);
        setCurrentResult(newResult);

    } catch (err: any) {
        setError(err.message || "Failed to generate infographic.");
    } finally {
        setLoadingStage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left" dir="ltr">
      <div className="bg-[#12141a] w-full max-w-6xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Left Panel: Controls */}
        <div className="w-full md:w-96 p-6 bg-[#0d0f14] border-r border-white/5 overflow-y-auto flex flex-col shrink-0">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                Info<span className="text-pink-500">Artist</span>
            </h2>
            <p className="text-xs text-gray-500 mb-6">Turn Articles into Infographics with Search & Vision</p>

            <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Article URL</label>
                    <input 
                        type="url" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/article" 
                        className="w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Artistic Style</label>
                    <select 
                        value={style}
                        onChange={(e) => setStyle(e.target.value as InfographicStyle)}
                        className="w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="Modern Editorial">Modern Editorial</option>
                        <option value="Fun & Playful">Fun & Playful</option>
                        <option value="Dark Mode Tech">Dark Mode Tech</option>
                        <option value="Minimalist">Minimalist</option>
                        <option value="Sketch Note">Sketch Note</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Output Language</label>
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as VisualLanguage)}
                        className="w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="English">English</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Chinese">Chinese</option>
                    </select>
                </div>

                <button 
                    type="submit" 
                    disabled={!!loadingStage || !url}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-lg shadow-lg shadow-pink-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {loadingStage ? <Loader /> : 'Generate Infographic'}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    {error}
                </div>
            )}

            {/* History List */}
            {history.length > 0 && (
                <div className="mt-8 flex-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Designs</h3>
                    <div className="space-y-2">
                        {history.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setCurrentResult(item)}
                                className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${currentResult?.id === item.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 h-10 rounded bg-black/50 overflow-hidden shrink-0">
                                    <img src={`data:image/png;base64,${item.imageUrl}`} className="w-full h-full object-cover" alt="thumb" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-white truncate">{item.title}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{item.style}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right Panel: Display */}
        <div className="flex-1 bg-[#050508] relative flex flex-col p-8 overflow-y-auto custom-scrollbar">
            {!currentResult && !loadingStage ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm">Paste an article URL to visualize it.</p>
                </div>
            ) : loadingStage ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin"></div>
                    </div>
                    <p className="text-sm text-pink-400 animate-pulse font-mono">{loadingStage}</p>
                </div>
            ) : currentResult && (
                <div className="w-full flex flex-col items-center gap-8">
                     {/* Image Display */}
                     <div className="w-full max-w-2xl bg-[#0a0a0c] rounded-xl overflow-hidden border border-white/5 shadow-2xl group relative">
                         <img 
                            src={`data:image/png;base64,${currentResult.imageUrl}`} 
                            alt="Infographic" 
                            className="w-full h-auto object-contain" 
                         />
                         <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <a 
                                href={`data:image/png;base64,${currentResult.imageUrl}`}
                                download="infographic.png"
                                className="px-4 py-2 bg-black/70 backdrop-blur text-white text-xs font-medium rounded hover:bg-black transition-colors"
                             >
                                Download PNG
                             </a>
                         </div>
                     </div>

                     {/* Citations Grid */}
                     {currentResult.citations.length > 0 && (
                        <div className="w-full max-w-4xl">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                                Sources & Citations
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {currentResult.citations.map((citation, idx) => (
                                    <a 
                                        key={idx} 
                                        href={citation.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-3 rounded-lg bg-[#1c1f26] border border-white/5 hover:border-pink-500/30 hover:bg-[#252830] transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1 rounded bg-pink-500/10 text-pink-500 group-hover:text-pink-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-medium text-white truncate group-hover:text-pink-200" title={citation.title}>
                                                    {citation.title || "Unknown Source"}
                                                </h4>
                                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{new URL(citation.uri).hostname}</p>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ArticleToInfographic;
