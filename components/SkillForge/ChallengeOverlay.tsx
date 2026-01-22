
import React, { useState, useEffect } from 'react';
import { Challenge, SubmissionResult } from '../../types';
import hljs from 'highlight.js';
import Loader from '../Loader';

interface ChallengeOverlayProps {
  challenge: Challenge;
  onClose: () => void;
  onSubmit: (submission: string) => Promise<SubmissionResult>;
}

const ChallengeOverlay: React.FC<ChallengeOverlayProps> = ({ challenge, onClose, onSubmit }) => {
  const [code, setCode] = useState(challenge.startingSnippet || '');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    // Highlight code blocks in description
    document.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el as HTMLElement);
    });
  }, [challenge]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let submission = '';
    
    if (challenge.type === 'QUIZ') {
        if (selectedOption === null) return;
        submission = challenge.options ? challenge.options[selectedOption] : '';
    } else {
        submission = code;
    }

    try {
        const res = await onSubmit(submission);
        setResult(res);
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-base w-full max-w-5xl h-[85vh] rounded-2xl border border-border-subtle shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 p-2 bg-surface hover:bg-elevated-2 rounded-full text-text-secondary hover:text-white transition-colors"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Left Panel: Task Info */}
        <div className="w-full md:w-1/3 p-6 bg-elevated-2 border-b md:border-b-0 md:border-l border-border-subtle overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    challenge.difficulty === 'Novice' ? 'bg-secondary/20 text-secondary' :
                    challenge.difficulty === 'Intermediate' ? 'bg-warning/20 text-warning' :
                    'bg-error/20 text-error'
                }`}>
                    {challenge.difficulty}
                </span>
                <span className="text-xs text-text-secondary bg-base px-2 py-1 rounded">+{challenge.xpPoints} XP</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{challenge.question}</h2>
            
            <div className="prose prose-invert prose-sm text-text-secondary mb-6">
                <p>{challenge.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
                {challenge.relatedTags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 rounded-full border border-border-subtle text-tertiary">
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Result Card */}
            {result && (
                <div className={`mt-8 p-4 rounded-xl border ${result.isCorrect ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'} animate-slide-up`}>
                    <div className="flex items-center gap-2 mb-2">
                        {result.isCorrect ? (
                             <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                             <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <h3 className={`font-bold ${result.isCorrect ? 'text-success' : 'text-error'}`}>
                            {result.isCorrect ? 'إجابة صحيحة!' : 'حاول مرة أخرى'}
                        </h3>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{result.feedback}</p>
                    <p className="text-xs text-slate-400 bg-black/20 p-2 rounded">{result.explanation}</p>
                    {result.isCorrect && (
                         <div className="mt-3 text-center">
                            <span className="text-tertiary font-bold text-lg">+{result.xpEarned} XP</span>
                         </div>
                    )}
                </div>
            )}
        </div>

        {/* Right Panel: Workspace */}
        <div className="flex-1 p-6 flex flex-col bg-base">
            {challenge.type === 'QUIZ' ? (
                <div className="flex-1 flex flex-col justify-center space-y-4 max-w-xl mx-auto w-full">
                    {challenge.options?.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => !result && setSelectedOption(idx)}
                            disabled={!!result}
                            className={`p-4 rounded-xl border text-right transition-all text-sm font-medium ${
                                selectedOption === idx 
                                ? 'bg-primary border-primary text-white shadow-lg shadow-glow-primary' 
                                : 'bg-surface border-border-subtle text-text-secondary hover:bg-elevated-2'
                            } ${!!result && idx === selectedOption && !result.isCorrect ? 'bg-error border-error' : ''}
                              ${!!result && idx === selectedOption && result.isCorrect ? 'bg-success border-success' : ''}
                            `}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-text-secondary font-mono">Solution.ts</span>
                        <span className="text-[10px] text-slate-500">TypeScript Editor</span>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={!!result && result.isCorrect}
                        className="flex-1 w-full bg-[#050508] text-white font-mono text-sm p-4 rounded-xl border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
                        spellCheck={false}
                    />
                </div>
            )}

            <div className="mt-6 flex justify-end">
                {!result?.isCorrect && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (challenge.type === 'QUIZ' && selectedOption === null)}
                        className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader /> : (
                            <>
                                <span>تحقق من الحل</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </>
                        )}
                    </button>
                )}
                {result?.isCorrect && (
                     <button
                     onClick={onClose}
                     className="px-8 py-3 bg-surface hover:bg-elevated-2 text-white font-bold rounded-xl border border-border-subtle transition-all"
                 >
                     إغلاق
                 </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeOverlay;
