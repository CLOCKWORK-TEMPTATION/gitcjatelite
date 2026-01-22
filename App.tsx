

import React, { useState, useEffect, useRef } from 'react';
import { Message, AppStatus, RepoInfo, FileNode, AppSettings, YoutubeInfo, FileContent, KnowledgeGraph, Challenge, UserProfile, SubmissionResult, ChatSession, Bookmark, ThemeMode } from './types';
import { parseGithubUrl, fetchRepoDetails, fetchRepoTree, fetchRepoFiles, fetchFileContent } from './services/githubService';
import { fetchUrlContent } from './services/webService';
import { extractVideoId, fetchYoutubeTranscript } from './services/youtubeService';
import { selectLocalDirectory, processLocalFilesForRag, readLocalFileContent } from './services/localFileService';
import { resolvePackageToRepo } from './services/packageService';
import { initializeGemini, startChatSession, sendMessageToGemini } from './services/geminiService';
import { initSemanticService, buildKnowledgeGraph } from './services/semanticService';
import { initSkillForgeService, generateContextualChallenge, evaluateSubmission } from './services/skillForgeService';
import { ragService } from './services/ragService';
import { dbService } from './services/dbService';
import { webContainerService } from './services/webContainerService';
import ChatBubble from './components/ChatBubble';
import Loader from './components/Loader';
import FileSidebar from './components/FileSidebar';
import SettingsModal from './components/SettingsModal';
import MermaidDiagram from './components/MermaidDiagram';
import YouTubePlayer, { YouTubePlayerHandle } from './components/YouTubePlayer';
import GraphView from './components/SemanticCompass/GraphView';
import ChallengeOverlay from './components/SkillForge/ChallengeOverlay';
import SkillTreeWidget from './components/SkillForge/SkillTreeWidget';
import TerminalPanel from './components/CodeExecution/TerminalPanel';
import HistorySidebar from './components/HistorySidebar';
import RepoAnalyzer from './components/RepoAnalyzer';
import ArticleToInfographic from './components/ArticleToInfographic';
import DevStudio from './components/DevStudio';
import QuickTemplates from './components/QuickTemplates';
import SessionStatsWidget from './components/SessionStatsWidget';
import ThemeToggle from './components/ThemeToggle';
import BookmarksSidebar from './components/BookmarksSidebar';

// Icons (Updated styles handled via className in usage)
const GithubIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>);
const GlobeIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const YoutubeIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>);
const FolderIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>);
const PackageIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
const StackOverflowIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.986 21.865v-6.404h2.134V24H1.844v-8.539h2.13v6.404h15.012zM6.111 19.79h12.668v-2.125H6.111v2.125zm.94-5.43l12.151 2.591.473-2.06L7.522 12.3l-.472 2.06zm1.733-5.085l10.95 6.435 1.066-1.839-10.95-6.435-1.066 1.839zm3.118-4.711l8.635 9.323 1.55-1.464-8.635-9.322-1.55 1.463zM14.507.085l-1.91 1.413 5.968 12.307 1.91-1.413L14.507.085z"/></svg>);
const CompassIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>);
const SendIcon = () => (<svg className="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const MenuIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>);
const SearchIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>);
const CloseIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const SettingsIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const DiagramIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>);
const ExportIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);
const ImageIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
const MicIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>);
const HistoryIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const VisualizerIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
const ArticleIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>);
const StudioIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>);

type InputMode = 'github' | 'url' | 'youtube' | 'local' | 'package' | 'stackoverflow';
type ViewMode = 'chat' | 'compass';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [inputMode, setInputMode] = useState<InputMode>('github');
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  
  // Settings with Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      githubToken: '',
      modelId: 'gemini-3-flash-preview',
      isReviewerMode: false,
      enableThinking: false,
      enableSpeechToText: false,
      enableTextToSpeech: false
    };
    try {
        const saved = localStorage.getItem('gitChatSettings');
        if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (e) { console.error("Failed to load settings", e); }
    return defaultSettings;
  });

  useEffect(() => {
    try { localStorage.setItem('gitChatSettings', JSON.stringify(settings)); } catch (e) {}
  }, [settings]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [isDevStudioOpen, setIsDevStudioOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  
  // App State
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [youtubeInfo, setYoutubeInfo] = useState<YoutubeInfo | null>(null);
  const [youtubeTranscript, setYoutubeTranscript] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile>({ totalXp: 0, level: 1, badges: [] });
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [isIgniteLoading, setIsIgniteLoading] = useState(false);

  // Chat State
  const [sessionId, setSessionId] = useState<string>(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // Execution State
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [executedFileName, setExecutedFileName] = useState('');

  // New Feature States
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('gitChatTheme');
      // Validate saved theme is a valid ThemeMode
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      return 'dark';
    } catch { return 'dark'; }
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  // --- Auto-Save Effect ---
  useEffect(() => {
    const save = async () => {
        if (messages.length > 0) {
            // Determine Title
            let title = "New Chat";
            if (repoInfo) title = `${repoInfo.repo}`;
            else if (youtubeInfo) title = youtubeInfo.title;
            else if (docTitle) title = docTitle;
            else {
                const firstUserMsg = messages.find(m => m.role === 'user');
                if (firstUserMsg) title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }

            const session: ChatSession = {
                id: sessionId,
                title,
                messages,
                lastUpdated: Date.now(),
                repoInfo: repoInfo || undefined,
                youtubeInfo: youtubeInfo || undefined,
                docTitle: docTitle || undefined
            };
            
            await dbService.saveChatSession(session);
        }
    };
    
    // Debounce save
    const timeout = setTimeout(save, 1000);
    return () => clearTimeout(timeout);
  }, [messages, sessionId, repoInfo, youtubeInfo, docTitle]);


  useEffect(() => {
    if (!chatSearchQuery && viewMode === 'chat') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatSearchQuery, viewMode]);

  // Theme persistence and application
  useEffect(() => {
    try {
      localStorage.setItem('gitChatTheme', theme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    } catch (e) {}
  }, [theme]);

  // Load bookmarks on mount
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const allBookmarks = await dbService.getAllBookmarks();
        setBookmarks(allBookmarks);
      } catch (e) {
        console.error("Failed to load bookmarks", e);
      }
    };
    loadBookmarks();
  }, []);

  useEffect(() => {
    try {
        const savedProfile = localStorage.getItem('skillForgeProfile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    } catch (e) {}

    const key = process.env.API_KEY;
    if (key) {
      initializeGemini(key);
      initSemanticService(key);
      initSkillForgeService(key);
      dbService.init().catch(e => console.error("Failed to init DB", e));
    } else {
      setStatus(AppStatus.ERROR);
      setStatusMessage("خطأ: مفتاح API غير موجود.");
    }

    // Initialize Speech Recognition
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ar-SA';
        
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
               setInputText(prev => prev + (prev ? ' ' : '') + finalTranscript);
               setIsListening(false);
            }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
    }

  }, []);

  useEffect(() => {
      try { localStorage.setItem('skillForgeProfile', JSON.stringify(userProfile)); } catch (e) {}
  }, [userProfile]);

  const handleRunCode = async (code: string, language: string) => {
    setIsTerminalOpen(true);
    setTerminalOutput([]);
    setIsExecuting(true);
    setExecutedFileName(language === 'ts' || language === 'typescript' ? 'script.ts' : 'script.js');

    try {
        const filename = 'main.js'; // WebContainer runs node, so implies JS. TS usually requires compilation step, but we can treat as JS for snippets if compatible.
        await webContainerService.writeFile(filename, code);
        
        await webContainerService.runNode(filename, (data) => {
            setTerminalOutput(prev => [...prev, data]);
        });
    } catch (error: any) {
        setTerminalOutput(prev => [...prev, `Error: ${error.message}`]);
    } finally {
        setIsExecuting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setUrlInput(val);
      const trimmed = val.trim().toLowerCase();
      if (trimmed.includes('github.com') && inputMode !== 'github') setInputMode('github');
      else if ((trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) && inputMode !== 'youtube') setInputMode('youtube');
      else if ((trimmed.includes('stackoverflow.com') || trimmed.includes('stackexchange.com')) && inputMode !== 'stackoverflow') setInputMode('stackoverflow');
      else if (trimmed.startsWith('http') && !trimmed.includes('github.com') && !trimmed.includes('youtube.com') && inputMode !== 'url') setInputMode('url');
  };

  const handleCancel = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setStatus(AppStatus.IDLE);
      setStatusMessage('');
  };

  const handleExportChat = () => {
      const chatContent = messages.map(m => `**${m.role === 'user' ? 'User' : 'AI'}**: ${m.content}\n`).join('\n---\n\n');
      const blob = new Blob([chatContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleIgniteChallenge = async () => {
      if (status !== AppStatus.READY) return;
      setIsIgniteLoading(true);
      try {
          let context = "";
          let source: any = { type: 'FILE', id: 'unknown' };
          if (youtubeInfo && youtubeTranscript) {
              const currentTime = await playerRef.current?.getCurrentTime() || 0;
              const minutes = Math.floor(currentTime / 60);
              const seconds = Math.floor(currentTime % 60);
              const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              context = youtubeTranscript.slice(0, 2000); // simplified for stability
              source = { type: 'YOUTUBE', id: youtubeInfo.videoId, timestampOrLine: timeString };
          } else if (currentFileContent) {
              context = currentFileContent;
              const filePath = messages.find(m => m.content.includes("محتوى الملف"))?.content.split('\n')[0] || "Active File";
              source = { type: 'FILE', id: filePath, timestampOrLine: 1 };
          } else {
              context = messages.slice(-3).map(m => m.content).join('\n');
              source = { type: 'FILE', id: 'Chat History' };
          }
          const challenge = await generateContextualChallenge(context, source, settings.modelId);
          setActiveChallenge(challenge);
      } catch (error) {
          alert("فشل توليد التحدي.");
      } finally {
          setIsIgniteLoading(false);
      }
  };

  const handleChallengeSubmit = async (submission: string): Promise<SubmissionResult> => {
      if (!activeChallenge) throw new Error("No active challenge");
      const result = await evaluateSubmission(activeChallenge, submission, settings.modelId);
      if (result.isCorrect) {
          setUserProfile(prev => {
              const newXp = prev.totalXp + result.xpEarned;
              return { ...prev, totalXp: newXp, level: Math.floor(newXp / 500) + 1 };
          });
      }
      return result;
  };

  const handleSmartChapters = async () => {
      if (!youtubeInfo) return;
      const prompt = "Please divide this video into logical chapters with start timestamps and a brief summary for each chapter. Format timestamps as [MM:SS].";
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: "قم بتقسيم الفيديو إلى فصول (Chapters).", timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      try {
           // Pass the full transcript as context so Gemini can analyze the structure
           const responseText = await sendMessageToGemini(prompt, youtubeTranscript.slice(0, 75000));
            const modelMsg: Message = { id: Date.now().toString(), role: 'model', content: responseText, timestamp: Date.now() };
            setMessages(prev => [...prev, modelMsg]);
            speakText(responseText);
      } catch (error: any) { console.error(error); }
  };

  // --- Bookmark Handlers ---
  const handleAddBookmark = async (message: Message, note?: string) => {
    // Use crypto.randomUUID() for robust ID generation to avoid collisions
    const bookmarkId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newBookmark: Bookmark = {
      id: bookmarkId,
      messageId: message.id,
      content: message.content.slice(0, 500),
      timestamp: Date.now(),
      sessionId: sessionId,
      note
    };
    
    try {
      await dbService.saveBookmark(newBookmark);
      setBookmarks(prev => [newBookmark, ...prev]);
    } catch (e) {
      console.error("Failed to save bookmark", e);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      await dbService.deleteBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (e) {
      console.error("Failed to delete bookmark", e);
    }
  };

  const handleNavigateToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
    setIsBookmarksOpen(false);
  };

  const isMessageBookmarked = (messageId: string): boolean => {
    return bookmarks.some(b => b.messageId === messageId);
  };

  // --- Quick Template Handler ---
  const handleSelectTemplate = (prompt: string) => {
    setInputText(prompt);
  };

  // --- Reset/New Chat ---
  const handleReset = () => {
    setMessages([]);
    setFileTree([]);
    setKnowledgeGraph(null);
    setRepoInfo(null);
    setDocTitle('');
    setYoutubeInfo(null);
    setCurrentFileContent('');
    ragService.clear();
    setViewMode('chat');
    setSessionId(Date.now().toString());
    
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
  };


  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() && inputMode !== 'local') return;
    
    handleReset();
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        if (inputMode === 'github') await processGithubRepo(urlInput, controller.signal);
        else if (inputMode === 'url' || inputMode === 'stackoverflow') await processDocUrl(urlInput, controller.signal);
        else if (inputMode === 'youtube') await processYoutubeVideo(urlInput, controller.signal);
        else if (inputMode === 'local') await processLocalDirectory(controller.signal);
        else if (inputMode === 'package') await processPackage(urlInput, controller.signal);
    } catch (error: any) {
        if (error.name === 'AbortError') { setStatus(AppStatus.IDLE); return; }
        setStatus(AppStatus.ERROR);
        setStatusMessage(error.message || "حدث خطأ غير متوقع.");
    } finally {
        abortControllerRef.current = null;
    }
  };

  const buildGraphAfterIndexing = async (files: FileContent[], repoName: string, repoIdToSave?: string, infoToSave?: RepoInfo, treeToSave?: FileNode[]) => {
    setStatus(AppStatus.BUILDING_GRAPH);
    setStatusMessage("بناء البوصلة الدلالية (Knowledge Graph)...");
    
    try {
        const graph = await buildKnowledgeGraph(files, repoName, settings.modelId);
        setKnowledgeGraph(graph);

        // Save to DB if requested
        if (repoIdToSave && infoToSave && treeToSave) {
            await dbService.saveRepoData(repoIdToSave, {
                info: infoToSave,
                tree: treeToSave,
                chunks: ragService.getAllChunks(),
                graph: graph
            });
            console.log("Repo persisted to IndexedDB");
        }
    } catch (e) {
        console.error("Graph Build Error", e);
    }
  }

  const processGithubRepo = async (url: string, signal: AbortSignal) => {
    const parsed = parseGithubUrl(url);
    if (!parsed) throw new Error("رابط غير صحيح.");
    
    // 1. Check DB Cache for Repo Data
    const repoId = `${parsed.owner}/${parsed.repo}`;
    setStatus(AppStatus.FETCHING_REPO);
    setStatusMessage("التحقق من البيانات المخزنة...");
    
    try {
        const cached = await dbService.getRepoData(repoId);
        if (cached) {
            console.log("Loaded from cache:", repoId);
            setRepoInfo(cached.info);
            setFileTree(cached.tree);
            setKnowledgeGraph(cached.graph);
            ragService.loadChunks(cached.chunks);
            
            // Reconstruct Initial Context for Chat
            const structureContext = `[RESUMED SESSION]\nRepo: ${cached.info.owner}/${cached.info.repo}\nDescription: ${cached.info.description}`;
            await startChatSession(settings.modelId, structureContext, settings.isReviewerMode, settings.enableThinking);
            
            setStatus(AppStatus.READY);
            const msg = `أهلاً بك مجدداً! تم استرجاع بيانات المستودع **${cached.info.owner}/${cached.info.repo}** من الذاكرة المحلية.`;
            setMessages([{ id: 'init', role: 'model', content: msg, timestamp: Date.now() }]);
            speakText(msg);
            return;
        }
    } catch (e) {
        console.warn("Cache check failed", e);
    }

    // 2. Fetch from Network if not cached
    setStatus(AppStatus.FETCHING_REPO);
    setStatusMessage("جاري الاتصال بـ GitHub...");
    const details = await fetchRepoDetails(parsed.owner, parsed.repo, settings.githubToken, signal);
    if (signal.aborted) return;
    setRepoInfo(details);
    
    const tree = await fetchRepoTree(parsed.owner, parsed.repo, details.defaultBranch, settings.githubToken, signal);
    setFileTree(tree);
    
    setStatus(AppStatus.ANALYZING);
    const files = await fetchRepoFiles(details, tree, settings.githubToken, (msg) => setStatusMessage(msg), signal);
    if (signal.aborted) return;
    
    setStatus(AppStatus.INDEXING);
    await ragService.addDocuments(files, (msg) => setStatusMessage(msg));
    
    // Pass params to save after graph build
    await buildGraphAfterIndexing(files, parsed.repo, repoId, details, tree);
    
    setStatusMessage("جاري تهيئة المحلل الذكي...");
    
    const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md' || f.path.toLowerCase() === 'readme');
    const readmeContext = readmeFile ? `\n\n=== README ===\n${readmeFile.content.slice(0, 3000)}\n============` : '';
    const structureContext = `Repo: ${details.owner}/${details.repo}\nDescription: ${details.description}\nFile Structure (top 200):\n${tree.slice(0, 200).map(n => n.path).join('\n')}${readmeContext}`;
    
    await startChatSession(settings.modelId, structureContext, settings.isReviewerMode, settings.enableThinking);
    setStatus(AppStatus.READY);
    const msg = `أهلاً بك! لقد قمت بتحليل المستودع **${details.owner}/${details.repo}**.`;
    setMessages([{ id: 'init', role: 'model', content: msg, timestamp: Date.now() }]);
    speakText(msg);
  };

  const processPackage = async (query: string, signal: AbortSignal) => {
    setStatus(AppStatus.FETCHING_REPO);
    setStatusMessage(`جاري البحث عن الحزمة ${query}...`);
    const repoUrl = await resolvePackageToRepo(query);
    if (!repoUrl) throw new Error("لم يتم العثور على مستودع GitHub.");
    setStatusMessage(`تم العثور على المستودع: ${repoUrl}`);
    await processGithubRepo(repoUrl, signal);
  };

  const processLocalDirectory = async (signal: AbortSignal) => {
    setStatus(AppStatus.FETCHING_REPO);
    setStatusMessage("جاري قراءة المجلد المحلي...");
    const { name, tree } = await selectLocalDirectory();
    setRepoInfo({ owner: 'Local', repo: name, defaultBranch: 'local', description: 'Local Directory' });
    setFileTree(tree);
    setStatus(AppStatus.ANALYZING);
    const files = await processLocalFilesForRag(tree, (msg) => setStatusMessage(msg));
    setStatus(AppStatus.INDEXING);
    await ragService.addDocuments(files, (msg) => setStatusMessage(msg));
    buildGraphAfterIndexing(files, name);
    setStatusMessage("جاري تهيئة المحلل الذكي...");
    
    // Attempt to find README
    const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md');
    const readmeContext = readmeFile ? `\n\n=== README ===\n${readmeFile.content.slice(0, 3000)}\n============` : '';

    const structureContext = `Local Directory: ${name}\nFile Structure (top 200):\n${tree.slice(0, 200).map(n => n.path).join('\n')}${readmeContext}`;
    await startChatSession(settings.modelId, structureContext, settings.isReviewerMode, settings.enableThinking);
    setStatus(AppStatus.READY);
    const msg = `أهلاً بك! لقد قمت بتحليل المجلد المحلي **"${name}"**.`;
    setMessages([{ id: 'init', role: 'model', content: msg, timestamp: Date.now() }]);
    speakText(msg);
  };

  const processDocUrl = async (url: string, signal: AbortSignal) => {
      setStatus(AppStatus.FETCHING_REPO);
      setStatusMessage("جاري جلب محتوى الصفحة...");
      const { title, content } = await fetchUrlContent(url, signal);
      if (signal.aborted) return;
      setDocTitle(title);
      setStatus(AppStatus.INDEXING);
      await ragService.addDocuments([{ path: url, content }], (msg) => setStatusMessage(msg));
      setStatusMessage("جاري تهيئة المحلل...");
      const context = `Documentation URL: ${url}\nTitle: ${title}\nContent Snippet:\n${content.slice(0, 2000)}`;
      await startChatSession(settings.modelId, context, settings.isReviewerMode, settings.enableThinking);
      setStatus(AppStatus.READY);
      const msg = `أهلاً بك! لقد قمت بقراءة وفهرسة الصفحة **"${title}"**.`;
      setMessages([{ id: 'init', role: 'model', content: msg, timestamp: Date.now() }]);
      speakText(msg);
  };

  const processYoutubeVideo = async (url: string, signal: AbortSignal) => {
      setStatus(AppStatus.FETCHING_REPO);
      setStatusMessage("جاري التحقق من الفيديو...");
      const videoId = extractVideoId(url);
      if (!videoId) throw new Error("رابط غير صحيح.");
      setStatusMessage("جاري جلب النص المفرغ...");
      const { info, transcript } = await fetchYoutubeTranscript(videoId, signal);
      if (signal.aborted) return;
      setYoutubeInfo(info);
      setYoutubeTranscript(transcript);
      setStatus(AppStatus.INDEXING);
      await ragService.addDocuments([{ path: `video-${info.videoId}`, content: transcript }], (msg) => setStatusMessage(msg));
      const context = `Video Title: ${info.title}\nChannel: ${info.channel}`;
      await startChatSession(settings.modelId, context, settings.isReviewerMode, settings.enableThinking);
      setStatus(AppStatus.READY);
      const msg = `أهلاً بك! لقد قمت بقراءة محتوى الفيديو **"${info.title}"**.`;
      setMessages([{ id: 'init', role: 'model', content: msg, timestamp: Date.now() }]);
      speakText(msg);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type });
        };
        reader.readAsDataURL(file);
    }
  };

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        try {
           recognitionRef.current.start();
           setIsListening(true);
        } catch(e) { console.error(e); setIsListening(false); }
    }
  };

  const speakText = (text: string) => {
      if (!settings.enableTextToSpeech) return;
      window.speechSynthesis.cancel();
      // Remove text inside code blocks and special markers for smoother speech
      const clean = text.replace(/```[\s\S]*?```/g, ' [كود برمجي] ')
                        .replace(/`.*?`/g, ' كود ')
                        .replace(/\[.*?\]\(.*?\)/g, ' رابط ')
                        .replace(/[*#_]/g, '')
                        .slice(0, 1000); // Limit length
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'ar-SA';
      window.speechSynthesis.speak(u);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || status !== AppStatus.READY) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText, timestamp: Date.now(), image: selectedImage ? selectedImage.data : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    try {
      let contextText = "";
      if (inputText.trim()) {
          const retrievedChunks = await ragService.retrieve(userMsg.content);
          contextText = retrievedChunks.map(c => `Source: ${c.source}\nContent: ${c.text}`).join('\n\n');
      }
      const responseText = await sendMessageToGemini(userMsg.content, contextText, imageToSend ? imageToSend : undefined);
      const modelMsg: Message = { id: Date.now().toString(), role: 'model', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      speakText(responseText);
    } catch (error: any) {
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `عذراً، حدث خطأ: ${error.message}`, timestamp: Date.now() }]);
    }
  };

  const handleFileClick = async (file: FileNode) => {
    if (viewMode === 'compass') setViewMode('chat');
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'system', content: `جاري قراءة الملف: ${file.path}...`, timestamp: Date.now() }]);
    try {
        let content = '';
        if (file.handle) content = await readLocalFileContent(file.handle);
        else content = await fetchFileContent(file.url, settings.githubToken);
        setCurrentFileContent(content);
        setMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempId);
            return [...filtered, { id: Date.now().toString(), role: 'model', content: `**محتوى الملف: ${file.path}**\n\`\`\`\n${content}\n\`\`\`\n`, timestamp: Date.now() }];
        });
    } catch (e) {
         setMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempId);
            return [...filtered, { id: Date.now().toString(), role: 'system', content: `فشل في قراءة الملف.`, timestamp: Date.now() }];
        });
    }
  };

  const handleRestoreSession = async (session: ChatSession) => {
      // 1. Reset current state
      handleReset();
      setSessionId(session.id);
      
      // 2. Restore Messages
      setMessages(session.messages);
      
      // 3. Restore Context State (Repo/Video info)
      if (session.repoInfo) {
          setRepoInfo(session.repoInfo);
          setInputMode('github');
          // Note: We might need to refetch the tree/graph if not cached in repositories store,
          // but for basic history viewing, just having the info is enough to display the title.
          // Try to load full data from repo cache if available
          const repoId = `${session.repoInfo.owner}/${session.repoInfo.repo}`;
          const cachedRepo = await dbService.getRepoData(repoId);
          if (cachedRepo) {
              setFileTree(cachedRepo.tree);
              setKnowledgeGraph(cachedRepo.graph);
              ragService.loadChunks(cachedRepo.chunks);
          }
      } else if (session.youtubeInfo) {
          setYoutubeInfo(session.youtubeInfo);
          setInputMode('youtube');
      } else if (session.docTitle) {
          setDocTitle(session.docTitle);
          setInputMode('url');
      }

      // 4. Initialize Chat Session with context from last messages
      // We don't have the full original context string easily, but we can restart the session 
      // with a "resumed" context.
      const resumeContext = `[RESUMED SESSION]\nContext: ${session.title}`;
      await startChatSession(settings.modelId, resumeContext, settings.isReviewerMode, settings.enableThinking);
      
      setStatus(AppStatus.READY);
      setIsHistoryOpen(false);
  };

  const displayedMessages = chatSearchQuery.trim() ? messages.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase())) : messages;
  let currentTitle = '';
  if (repoInfo) currentTitle = repoInfo.repo;
  else if (docTitle) currentTitle = docTitle;
  else if (youtubeInfo) currentTitle = youtubeInfo.title;

  return (
    <div className={`flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden ${theme}`} dir="rtl">
      
      {isSettingsOpen && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setIsSettingsOpen(false)} />}
      {isDiagramOpen && fileTree.length > 0 && <MermaidDiagram files={fileTree} onClose={() => setIsDiagramOpen(false)} />}
      {activeChallenge && <ChallengeOverlay challenge={activeChallenge} onClose={() => setActiveChallenge(null)} onSubmit={handleChallengeSubmit} />}
      <RepoAnalyzer isOpen={isVisualizerOpen} onClose={() => setIsVisualizerOpen(false)} githubToken={settings.githubToken} />
      <ArticleToInfographic isOpen={isInfographicOpen} onClose={() => setIsInfographicOpen(false)} />
      
      {/* Bookmarks Sidebar */}
      <BookmarksSidebar
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={handleRemoveBookmark}
        onNavigateToMessage={handleNavigateToMessage}
      />
      
      {/* Dev Studio Component */}
      <DevStudio 
        isOpen={isDevStudioOpen} 
        onClose={() => setIsDevStudioOpen(false)} 
        files={fileTree} 
        repoName={repoInfo?.repo || "Project"} 
      />

      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onSelectSession={handleRestoreSession} 
        currentSessionId={sessionId}
        onNewChat={() => { handleReset(); setIsHistoryOpen(false); setStatus(AppStatus.IDLE); }}
      />

      {/* Code Execution Terminal */}
      {isTerminalOpen && (
          <TerminalPanel 
             output={terminalOutput} 
             isRunning={isExecuting} 
             onClose={() => setIsTerminalOpen(false)} 
             fileName={executedFileName}
          />
      )}

      {/* Modern Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md z-20 sticky top-0">
        <div className="flex items-center gap-4 overflow-hidden">
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-xl hover:bg-secondary text-primary transition-all">
             <HistoryIcon />
          </button>
          
          {/* Bookmarks Button */}
          <button onClick={() => setIsBookmarksOpen(true)} className="p-2 rounded-xl hover:bg-secondary text-yellow-500 transition-all relative" title="الإشارات المرجعية">
             <svg className="w-5 h-5" fill={bookmarks.length > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
             </svg>
             {bookmarks.length > 0 && (
               <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                 {bookmarks.length > 9 ? '9+' : bookmarks.length}
               </span>
             )}
          </button>
          
          <div className="h-6 w-px bg-border mx-1"></div>

          <div className="p-2 rounded-xl bg-secondary text-primary border border-border shadow-sm">
            {inputMode === 'github' ? <GithubIcon /> : inputMode === 'url' ? <GlobeIcon /> : inputMode === 'local' ? <FolderIcon /> : inputMode === 'package' ? <PackageIcon /> : inputMode === 'stackoverflow' ? <StackOverflowIcon /> : <YoutubeIcon />}
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="text-lg font-bold tracking-tight">GitChat <span className="text-primary">Elite</span></h1>
             {status === AppStatus.READY && currentTitle && (
                 <span className="text-xs text-muted-foreground truncate max-w-[200px] font-mono" dir="ltr">{currentTitle}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
             {status === AppStatus.READY && (
                 <>
                    <button onClick={handleIgniteChallenge} disabled={isIgniteLoading} className="group relative flex items-center justify-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all disabled:opacity-50">
                        {isIgniteLoading ? <Loader /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>}
                    </button>

                    <div className="h-6 w-px bg-border mx-1"></div>

                    {(inputMode === 'github' || inputMode === 'local' || inputMode === 'package') && (
                        <div className="flex bg-secondary/50 rounded-lg p-1 border border-border">
                            <button onClick={() => setViewMode('chat')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'chat' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Chat</button>
                            <button onClick={() => setViewMode('compass')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${viewMode === 'compass' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`} disabled={!knowledgeGraph}><CompassIcon /><span>Compass</span></button>
                        </div>
                    )}
                    
                    <button onClick={handleExportChat} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"><ExportIcon /></button>
                    {(inputMode === 'github' || inputMode === 'local' || inputMode === 'package') && (
                        <>
                            <button onClick={() => setIsDiagramOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"><DiagramIcon /></button>
                            <button onClick={() => setIsVisualizerOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"><VisualizerIcon /></button>
                            <button onClick={() => setIsDevStudioOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all" title="Dev Studio"><StudioIcon /></button>
                        </>
                    )}
                    
                    <button onClick={() => setIsInfographicOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all" title="Article to Infographic"><ArticleIcon /></button>

                    <div className={`flex items-center transition-all duration-300 ${isChatSearchOpen ? 'w-48 bg-secondary rounded-lg border border-border' : 'w-8'}`}>
                        {isChatSearchOpen ? (
                             <>
                                <input autoFocus type="text" placeholder="بحث..." className="w-full bg-transparent border-none text-xs px-3 py-2 focus:ring-0 text-foreground placeholder-muted-foreground" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} />
                                <button onClick={() => { setIsChatSearchOpen(false); setChatSearchQuery(''); }} className="p-2 text-muted-foreground hover:text-foreground"><CloseIcon /></button>
                             </>
                        ) : (
                            <button onClick={() => setIsChatSearchOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"><SearchIcon /></button>
                        )}
                    </div>
                    
                    {(inputMode === 'github' || inputMode === 'local' || inputMode === 'package') && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all md:hidden"><MenuIcon /></button>
                    )}
                    
                    {/* Session Stats Widget */}
                    <SessionStatsWidget messages={messages} sessionStartTime={sessionStartTime} />
                 </>
             )}
             
            {/* Theme Toggle */}
            <ThemeToggle theme={theme} onToggle={setTheme} />
            
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"><SettingsIcon /></button>
        </div>
      </header>

      {/* Sidebar */}
      <FileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} files={fileTree} onFileClick={handleFileClick} onShowDiagram={() => setIsDiagramOpen(true)}/>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col relative max-w-5xl mx-auto w-full transition-all duration-300 ${isSidebarOpen ? 'mr-0 md:mr-80' : ''}`}>
        
        {(status === AppStatus.IDLE || status === AppStatus.ERROR || status === AppStatus.FETCHING_REPO || status === AppStatus.ANALYZING || status === AppStatus.INDEXING || status === AppStatus.BUILDING_GRAPH) && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in relative z-10">
            <div className="max-w-2xl w-full space-y-10">
              <div className="space-y-4">
                <h2 className="text-6xl font-bold tracking-tighter text-foreground drop-shadow-sm">
                  GitChat <span className="text-primary">Elite</span>
                </h2>
                <p className="text-muted-foreground text-xl font-light">
                   Intelligent Code Analysis & Video Understanding.
                </p>
              </div>

              <div className="flex flex-wrap p-1 bg-secondary/40 rounded-xl border border-border w-fit mx-auto overflow-hidden justify-center gap-1">
                  {['github', 'package', 'local', 'url', 'stackoverflow', 'youtube'].map((mode) => (
                      <button 
                        key={mode}
                        onClick={() => setInputMode(mode as InputMode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${inputMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                      >
                          {mode}
                      </button>
                  ))}
              </div>

              <form onSubmit={handleStartAnalysis} className="space-y-6 max-w-lg mx-auto">
                <div className="relative group">
                  {inputMode === 'local' ? (
                       <button type="button" onClick={(e) => handleStartAnalysis(e)} className="w-full bg-card hover:bg-secondary/50 text-foreground border border-dashed border-border rounded-xl px-8 py-8 flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/50 group">
                           <div className="p-3 bg-secondary rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors"><FolderIcon /></div>
                           <span className="font-medium">Select Local Directory</span>
                       </button>
                  ) : (
                    <input
                        type="text"
                        value={urlInput}
                        onChange={handleInputChange}
                        placeholder={inputMode === 'github' ? "https://github.com/owner/repo" : inputMode === 'youtube' ? "https://youtube.com/watch?v=..." : "Paste URL here..."}
                        className="w-full bg-background text-foreground placeholder-muted-foreground border border-border rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm text-center font-mono text-sm"
                        dir="ltr"
                        disabled={status !== AppStatus.IDLE && status !== AppStatus.ERROR}
                    />
                  )}
                </div>

                {(status !== AppStatus.IDLE && status !== AppStatus.ERROR) ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader />
                        <span className="text-sm font-medium animate-pulse">{statusMessage}</span>
                    </div>
                ) : (
                    inputMode !== 'local' && (
                        <button type="submit" disabled={!urlInput} className={`w-full text-primary-foreground font-semibold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-base bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <span>Start Analysis</span> <SendIcon />
                        </button>
                    )
                )}
              </form>
               
              {status === AppStatus.ERROR && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive text-sm animate-fade-in text-right mx-auto max-w-lg">
                   <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === AppStatus.READY && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
             {viewMode === 'compass' && knowledgeGraph ? (
                 <GraphView data={knowledgeGraph} />
             ) : (
                 <>
                    {youtubeInfo && (
                        <div className="px-4 py-4 border-b border-border bg-card/50 shrink-0 backdrop-blur-sm">
                            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                                <div className="flex-1"><YouTubePlayer ref={playerRef} videoId={youtubeInfo.videoId} /></div>
                                <div className="flex flex-col justify-center gap-3">
                                    <h3 className="text-sm font-medium text-foreground line-clamp-2">{youtubeInfo.title}</h3>
                                    <button onClick={handleSmartChapters} className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs rounded-md border border-border flex items-center gap-2 transition-all w-fit">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        Smart Chapters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-8 pb-32"> 
                            {displayedMessages.map((msg) => (
                                <ChatBubble 
                                    key={msg.id} 
                                    message={msg} 
                                    onTimestampClick={youtubeInfo ? (sec) => playerRef.current?.seekTo(sec) : undefined}
                                    onRunCode={handleRunCode}
                                    onBookmark={(m) => {
                                      if (isMessageBookmarked(m.id)) {
                                        const bookmark = bookmarks.find(b => b.messageId === m.id);
                                        if (bookmark) handleRemoveBookmark(bookmark.id);
                                      } else {
                                        handleAddBookmark(m);
                                      }
                                    }}
                                    isBookmarked={isMessageBookmarked(msg.id)}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Floating Input Area */}
                    <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
                        <div className="max-w-3xl mx-auto">
                            {/* Quick Templates */}
                            <div className="mb-2">
                              <QuickTemplates 
                                onSelectTemplate={handleSelectTemplate} 
                                isDisabled={status !== AppStatus.READY}
                              />
                            </div>
                            
                            <form onSubmit={handleSendMessage} className="relative flex flex-col bg-background/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/20 rounded-2xl ring-1 ring-white/5 transition-all">
                                {selectedImage && (
                                    <div className="px-4 py-3 border-b border-border flex items-center justify-between animate-fade-in bg-secondary/30 rounded-t-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-black/50 overflow-hidden border border-border"><img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} alt="Selected" className="h-full w-full object-cover" /></div>
                                            <div className="text-xs text-muted-foreground"><div className="text-foreground font-medium">Image Attached</div><div>{selectedImage.mimeType}</div></div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedImage(null)} className="p-1.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground"><CloseIcon /></button>
                                    </div>
                                )}
                                <div className="flex items-center w-full p-2">
                                    <div className="flex items-center gap-1 pl-2">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"><ImageIcon /></button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        {settings.enableSpeechToText && (
                                            <button 
                                                type="button" 
                                                onClick={toggleSpeech} 
                                                className={`p-2 transition-colors rounded-lg hover:bg-secondary ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                <MicIcon />
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setIsChatSearchOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"><SearchIcon /></button>
                                    </div>

                                    <input 
                                        type="text" 
                                        value={inputText} 
                                        onChange={(e) => setInputText(e.target.value)} 
                                        placeholder="Type your message..." 
                                        className="flex-1 bg-transparent text-foreground placeholder-muted-foreground px-4 py-3 focus:outline-none text-sm" 
                                    />
                                    
                                    <button type="submit" disabled={!inputText.trim() && !selectedImage} className={`p-2.5 rounded-lg transition-all text-white bg-primary hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:shadow-none m-1`}><SendIcon /></button>
                                </div>
                            </form>
                        </div>
                    </div>
                 </>
             )}
          </div>
        )}
        
        {status === AppStatus.READY && <SkillTreeWidget profile={userProfile} />}
      </main>
    </div>
  );
};

export default App;
