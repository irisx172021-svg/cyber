import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Code,
  Scale,
  ListOrdered,
  Layers,
  Compass,
  FileText,
  Cpu,
  X,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Lesson, PracticalLab, TutorAction, TutorMessage, TutorRequest } from '../types';
import { apiAskTutor, apiGetTutorStatus } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

interface AiTutorPanelProps {
  lesson: Lesson;
  topicTitle: string;
  tierNumber: number;
  activeExercise?: PracticalLab;
  hintTriggerNonce?: number;
  isOpen: boolean;
  onClose?: () => void;
  isFloating?: boolean;
}

interface ActionConfig {
  id: TutorAction;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const TUTOR_ACTIONS: ActionConfig[] = [
  {
    id: 'explain_simply',
    label: 'Explain More Simply',
    shortLabel: 'Simplify',
    icon: Lightbulb,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    description: 'Easier words, zero jargon, and a relatable everyday example'
  },
  {
    id: 'step_by_step',
    label: 'Explain Step by Step',
    shortLabel: 'Step by Step',
    icon: ListOrdered,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
    description: 'Numbered breakdown of how the process works from start to finish'
  },
  {
    id: 'real_world_example',
    label: 'Give a Real-World Example',
    shortLabel: 'Real Example',
    icon: Compass,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
    description: 'See where and how this concept is used in real systems'
  },
  {
    id: 'analogy',
    label: 'Use an Analogy',
    shortLabel: 'Analogy',
    icon: Layers,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20',
    description: 'Compare the concept to something familiar from everyday life'
  },
  {
    id: 'explain_code',
    label: 'Explain the Code',
    shortLabel: 'Explain Code',
    icon: Code,
    color: 'text-sky-300 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
    description: 'Line-by-line code & command breakdown with expected output'
  },
  {
    id: 'compare_concepts',
    label: 'Compare Concepts',
    shortLabel: 'Compare',
    icon: Scale,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
    description: 'Side-by-side comparison table of key lesson concepts'
  },
  {
    id: 'hint',
    label: 'Give Me a Hint',
    shortLabel: 'Hint',
    icon: HelpCircle,
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    description: 'Gentle nudge for the practical lab or quiz without spoiling the answer'
  },
  {
    id: 'test_understanding',
    label: 'Test My Understanding',
    shortLabel: 'Quiz Me',
    icon: BookOpen,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20',
    description: 'One interactive check question at a time with feedback'
  },
  {
    id: 'summarize',
    label: 'Summarize This Lesson',
    shortLabel: 'Summary',
    icon: FileText,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20',
    description: 'Concise revision summary of the important concepts'
  }
];

export default function AiTutorPanel({
  lesson,
  topicTitle,
  tierNumber,
  activeExercise,
  hintTriggerNonce,
  isOpen,
  onClose,
  isFloating = false
}: AiTutorPanelProps) {
  // Store chat history indexed per lesson ID so switching lessons updates context cleanly
  const [conversations, setConversations] = useState<Record<string, TutorMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [loadingLessonIds, setLoadingLessonIds] = useState<Record<string, boolean>>({});
  const [lastFailedByLesson, setLastFailedByLesson] = useState<Record<string, TutorRequest | null>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{ configured: boolean; provider: string; model: string }>({
    configured: true,
    provider: 'groq',
    model: 'openai/gpt-oss-120b'
  });
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastHandledHintNonce = useRef<number>(0);

  const currentMessages = conversations[lesson.id] || [];
  const isLoading = !!loadingLessonIds[lesson.id];
  const lastFailedRequest = lastFailedByLesson[lesson.id] || null;

  // Check tutor backend status on mount
  useEffect(() => {
    apiGetTutorStatus()
      .then(res => setStatusInfo(res))
      .catch(() => {
        // Fallback gracefully
      });
  }, []);

  // Reset transient UI confirmation when switching lessons
  useEffect(() => {
    setConfirmClear(false);
  }, [lesson.id]);

  // Scroll to bottom when new messages arrive for the active lesson
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length, isLoading, isOpen, activeTab, lesson.id]);

  // Execute request to Groq backend scoped to the requesting lesson ID
  const handleSendRequest = async (action: TutorAction, customMessage?: string) => {
    const targetLessonId = lesson.id;
    if (loadingLessonIds[targetLessonId]) return;

    const textToSend = customMessage !== undefined ? customMessage : inputText;
    if (action === 'ask_question' && !textToSend.trim()) return;

    setLoadingLessonIds(prev => ({ ...prev, [targetLessonId]: true }));
    setLastFailedByLesson(prev => ({ ...prev, [targetLessonId]: null }));

    const actionLabel = TUTOR_ACTIONS.find(a => a.id === action)?.label;
    const userMsgContent =
      action === 'continue'
        ? 'Please continue your explanation.'
        : textToSend.trim() || actionLabel || 'Explain this lesson.';

    const existingLessonMessages = conversations[targetLessonId] || [];

    const newUserMsg: TutorMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userMsgContent,
      action,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => ({
      ...prev,
      [targetLessonId]: [...(prev[targetLessonId] || []), newUserMsg]
    }));

    if (customMessage === undefined || action === 'ask_question') {
      setInputText('');
    }
    setActiveTab('chat');

    // Only include valid user/assistant turns in conversation history (exclude system error alerts)
    const cleanHistory = existingLessonMessages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.error)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const requestPayload: TutorRequest = {
      lessonId: targetLessonId,
      exerciseId: activeExercise?.id,
      action,
      message: textToSend.trim() || undefined,
      history: cleanHistory
    };

    try {
      const response = await apiAskTutor(requestPayload);

      if (!response.reply || !response.reply.trim()) {
        throw new Error('The AI tutor returned an empty response. Please retry.');
      }

      const assistantMsg: TutorMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        action: response.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: response.model,
        truncated: response.truncated,
        finishReason: response.finishReason
      };

      setConversations(prev => ({
        ...prev,
        [targetLessonId]: [...(prev[targetLessonId] || []), assistantMsg]
      }));
      setLastFailedByLesson(prev => ({ ...prev, [targetLessonId]: null }));
    } catch (err: any) {
      console.error('Groq AI Tutor error:', err);
      const errText = err?.message || 'Failed to reach AI tutor engine.';
      setLastFailedByLesson(prev => ({ ...prev, [targetLessonId]: requestPayload }));

      const errorMsg: TutorMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: errText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
      };

      setConversations(prev => ({
        ...prev,
        [targetLessonId]: [...(prev[targetLessonId] || []), errorMsg]
      }));
    } finally {
      setLoadingLessonIds(prev => ({ ...prev, [targetLessonId]: false }));
    }
  };

  const handleRetry = () => {
    if (lastFailedRequest && !isLoading) {
      handleSendRequest(lastFailedRequest.action, lastFailedRequest.message);
    }
  };

  const handleClearChat = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    setConversations(prev => ({
      ...prev,
      [lesson.id]: []
    }));
    setLastFailedByLesson(prev => ({ ...prev, [lesson.id]: null }));
    setConfirmClear(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputText.trim()) {
        handleSendRequest('ask_question', inputText);
      }
    }
  };

  // Trigger a guided hint automatically when requested from PracticalLabHost
  useEffect(() => {
    if (isOpen && hintTriggerNonce && hintTriggerNonce !== lastHandledHintNonce.current) {
      lastHandledHintNonce.current = hintTriggerNonce;
      if (activeExercise && !isLoading) {
        handleSendRequest(
          'hint',
          `Can you give me a gentle hint for the "${activeExercise.title}" lab without giving away the answer?`
        );
      }
    }
  }, [isOpen, hintTriggerNonce]);

  if (!isOpen) return null;

  const shortModelName = statusInfo.model.replace(/^[^/]+\//, '');

  return (
    <div
      className={`flex flex-col bg-slate-950 border-l border-slate-800 transition-all duration-300 z-30 min-w-0 ${
        isFloating
          ? 'fixed inset-y-0 right-0 w-full sm:w-[480px] shadow-2xl shadow-cyan-950/40'
          : 'h-full w-full'
      }`}
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-semibold text-slate-100">
                CyberFoundations AI Tutor
              </h4>
              <span
                className="text-[11px] font-mono text-sky-400 whitespace-nowrap"
                title={`Active model: ${statusInfo.model}`}
              >
                · {shortModelName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[210px] sm:max-w-[290px]">
              {lesson.title}
              {activeExercise ? ` · ${activeExercise.title}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentMessages.length > 0 && (
            <button
              onClick={handleClearChat}
              title={confirmClear ? 'Click again to confirm clearing conversation' : 'Clear conversation'}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-colors ${
                confirmClear
                  ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                  : 'text-slate-400 hover:text-red-400 hover:bg-slate-800/80'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmClear && <span>Clear?</span>}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              title="Close tutor panel"
              aria-label="Close tutor panel"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Module Bar */}
      <div className="px-4 py-2 border-b border-slate-800/70 bg-slate-900/30 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="text-blue-400 font-semibold shrink-0">Tier {tierNumber}</span>
          <span>•</span>
          <span className="text-slate-300 truncate">{topicTitle}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Chat ({currentMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'actions'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Actions (9)
          </button>
        </div>
      </div>

      {/* Unconfigured Warning Alert */}
      {!statusInfo.configured && (
        <div className="m-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1 shrink-0">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>GROQ_API_KEY NOT CONFIGURED</span>
          </div>
          <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
            Set your <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">GROQ_API_KEY</code> in server environment variables or <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">.env</code> to activate live tutor responses.
          </p>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'actions' ? (
        /* Action Prompts Selection Grid */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-w-0">
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Guided Learning Actions
            </h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Choose how you want the Groq AI Tutor ({statusInfo.model}) to help you learn <strong className="text-slate-200">"{lesson.title}"</strong>:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {TUTOR_ACTIONS.map(action => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  disabled={isLoading}
                  onClick={() => handleSendRequest(action.id)}
                  className={`p-3 rounded-lg border text-left transition-all group flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
                >
                  <div className="p-1.5 rounded bg-slate-950/60 shrink-0 mt-0.5">
                    <ActionIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">
                        {action.label}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Chat Feed View */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
          {currentMessages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-4 text-slate-400">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-semibold text-slate-100">CyberFoundations AI Tutor Ready</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Ask any question about <strong className="text-slate-200">{lesson.title}</strong>
                  {activeExercise ? ` or the "${activeExercise.title}" practice lab` : ''} in plain English, or pick a quick learning action below.
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="w-full pt-2 space-y-2">
                <span className="text-[11px] font-medium text-slate-500 block">
                  Quick Learning Actions
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {TUTOR_ACTIONS.slice(0, 6).map(act => (
                    <button
                      key={act.id}
                      onClick={() => handleSendRequest(act.id)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-sky-500/40 hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <act.icon className="h-3.5 w-3.5 text-sky-400" />
                      {act.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Message List */
            currentMessages.map(msg => {
              if (msg.role === 'system') {
                return (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" /> Tutor Connection Error
                      </span>
                      {lastFailedRequest && (
                        <button
                          onClick={handleRetry}
                          disabled={isLoading}
                          className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" /> Retry
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-1.5 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender metadata label */}
                  <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
                    <span className={isUser ? 'text-sky-400 font-medium' : 'text-emerald-400 font-medium'}>
                      {isUser ? 'You' : 'AI Tutor'}
                    </span>
                    {msg.action && (
                      <span className="text-slate-500">
                        · {TUTOR_ACTIONS.find(a => a.id === msg.action)?.shortLabel || msg.action.replace('_', ' ')}
                      </span>
                    )}
                    <span className="tabular-nums">· {msg.timestamp}</span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`rounded-xl p-3.5 text-xs leading-relaxed relative group min-w-0 overflow-hidden ${
                      isUser
                        ? 'max-w-[90%] bg-blue-600/15 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                        : 'w-full max-w-[96%] bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                    }`}
                  >
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy response"
                        className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800/90 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all z-10"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap font-sans break-words">{msg.content}</p>
                    ) : (
                      <div className="pr-5 min-w-0">
                        <MarkdownRenderer content={msg.content} compact />
                        {msg.truncated && (
                          <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-amber-300">
                              Explanation paused at token limit.
                            </span>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleSendRequest('continue', 'Please continue.')}
                              className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                            >
                              <span>Continue Explanation</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-cyan-400">
                <Sparkles className="h-3 w-3 animate-spin" />
                <span>Preparing Beginner-Friendly Explanation...</span>
              </div>
              <div className="rounded-xl rounded-tl-sm p-3.5 bg-slate-900/90 border border-cyan-500/30 text-slate-400 text-xs flex items-center gap-3 font-mono animate-pulse">
                <div className="flex space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[11px]">Querying {shortModelName} on Groq...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick Action Chips Bar (above input in chat mode) */}
      {activeTab === 'chat' && (
        <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
            Actions:
          </span>
          {TUTOR_ACTIONS.map(action => (
            <button
              key={action.id}
              disabled={isLoading}
              onClick={() => handleSendRequest(action.id)}
              title={action.description}
              className="px-2 py-0.5 rounded text-[10px] font-mono shrink-0 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all disabled:opacity-40"
            >
              {action.shortLabel}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!isLoading && inputText.trim()) {
              handleSendRequest('ask_question', inputText);
            }
          }}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 focus-within:border-cyan-500 rounded-lg p-2 transition-all">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1000}
              placeholder={`Ask about "${lesson.title}" (Shift+Enter for new line)...`}
              disabled={isLoading}
              className="flex-1 bg-transparent text-slate-100 text-xs font-sans placeholder-slate-600 border-none outline-none resize-none focus:ring-0 leading-relaxed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95 shadow-md shadow-cyan-600/20"
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Enter</kbd> send •{' '}
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Shift+Enter</kbd> new line
            </span>
            <span>{inputText.length} / 1000</span>
          </div>
        </form>
      </div>
    </div>
  );
}
