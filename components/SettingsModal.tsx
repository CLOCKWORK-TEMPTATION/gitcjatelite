
import React from 'react';
import { AppSettings, AVAILABLE_MODELS, AiModelId } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
  onClose: () => void;
}

const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button 
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50
            ${checked ? 'bg-primary' : 'bg-input'}
        `}
    >
        <span 
            className={`
                pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform 
                ${checked ? 'translate-x-5' : 'translate-x-0'}
            `}
        />
    </button>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-background w-full max-w-lg rounded-xl border border-border shadow-lg flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
           <h3 className="text-lg font-semibold text-foreground">
             Settings
           </h3>
           <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* Toggles Group */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">Reviewer Mode</label>
                        <p className="text-xs text-muted-foreground">Strict code analysis & security checks.</p>
                    </div>
                    <Switch checked={settings.isReviewerMode} onChange={(c) => onUpdate({...settings, isReviewerMode: c})} />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className={`text-sm font-medium leading-none ${settings.modelId !== 'gemini-3-pro-preview' ? 'opacity-50' : ''}`}>Thinking Mode</label>
                        <p className="text-xs text-muted-foreground">Enables 32k token reasoning budget (Pro Only).</p>
                    </div>
                    <Switch checked={settings.enableThinking} onChange={(c) => settings.modelId === 'gemini-3-pro-preview' && onUpdate({...settings, enableThinking: c})} />
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium leading-none">Speech-to-Text</label>
                        <p className="text-xs text-muted-foreground">Enable microphone input for chat.</p>
                    </div>
                    <Switch checked={settings.enableSpeechToText} onChange={(c) => onUpdate({...settings, enableSpeechToText: c})} />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium leading-none">Text-to-Speech</label>
                        <p className="text-xs text-muted-foreground">Read AI responses aloud automatically.</p>
                    </div>
                    <Switch checked={settings.enableTextToSpeech} onChange={(c) => onUpdate({...settings, enableTextToSpeech: c})} />
                </div>
            </div>
            
            <div className="h-px bg-border" />

            {/* AI Model Selection */}
            <div className="space-y-3">
                <label className="text-sm font-medium leading-none text-foreground">AI Model</label>
                <div className="grid grid-cols-1 gap-2">
                    {AVAILABLE_MODELS.map(model => (
                        <div 
                            key={model.id}
                            onClick={() => onUpdate({...settings, modelId: model.id})}
                            className={`
                                relative flex cursor-pointer rounded-lg border p-4 shadow-sm outline-none transition-all
                                ${settings.modelId === model.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'}
                            `}
                        >
                            <div className="flex flex-1 flex-col">
                                <span className="block text-sm font-medium text-foreground">{model.name}</span>
                                <span className="mt-1 flex items-center text-xs text-muted-foreground">{model.description}</span>
                            </div>
                            {settings.modelId === model.id && (
                                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* GitHub Token */}
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">GitHub Token (Optional)</label>
                <input 
                    type="password"
                    value={settings.githubToken}
                    onChange={(e) => onUpdate({...settings, githubToken: e.target.value})}
                    placeholder="ghp_..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

        </div>
        
        <div className="p-6 border-t border-border bg-muted/20 flex justify-end">
            <button 
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
            >
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
