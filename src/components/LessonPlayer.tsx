import React, { useState, useEffect } from 'react';
import MarkdownRenderer, { slugifyHeading } from './MarkdownRenderer';
import {
  Terminal,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Copy,
  Check,
  FlaskConical,
  Bot,
  Clock,
  RotateCcw,
  Lock,
} from 'lucide-react';
import {
  Tier,
  Lesson,
  UserProgress,
  PracticalLab,
  EngageSubmissionPayload,
  EngageApiResponse,
  QuizQuestionFeedback,
  LabExplorationMap,
  LabExplorationProgress,
} from '../types';
import AiTutorPanel from './AiTutorPanel';
import { PracticalLabHost } from './labs/PracticalLabHost';
import {
  getCanonicalCompletedSet,
  getMissingPrerequisites,
  getNextRecommendedLesson,
  isLessonUnlocked,
} from '../lib/curriculumProgress';
import { ApiError } from '../lib/api';

interface LessonPlayerProps {
  curriculum: Tier[];
  labsByLesson: Record<string, PracticalLab>;
  progress: UserProgress;
  labExploration?: LabExplorationMap;
  onUpdateLabExploration?: (labId: string, state: LabExplorationProgress) => void;
  selectedLessonId: string;
  setSelectedLessonId: (id: string) => void;
  onActiveEngage: (
    engagementType: 'open_lesson' | 'submit_quiz' | 'verify_homework' | 'complete_exercise',
    lessonId: string,
    payload?: EngageSubmissionPayload
  ) => Promise<EngageApiResponse | null>;
  terminalConfigs: Record<string, string>;
  saveTerminalConfig: (moduleId: string, text: string) => void;
  onBackToTracks?: () => void;
}

export default function LessonPlayer({
  curriculum,
  labsByLesson,
  progress,
  labExploration = {},
  onUpdateLabExploration,
  selectedLessonId,
  setSelectedLessonId,
  onActiveEngage,
  terminalConfigs,
  saveTerminalConfig,
  onBackToTracks,
}: LessonPlayerProps) {
  const allLessons = curriculum.reduce<
    { lesson: Lesson; topicTitle: string; tierNumber: number; tierTitle: string }[]
  >((acc, tier) => {
    tier.topics.forEach((topic) => {
      topic.lessons.forEach((lesson) => {
        acc.push({
          lesson,
          topicTitle: topic.title,
          tierNumber: tier.number,
          tierTitle: tier.title,
        });
      });
    });
    return acc;
  }, []);

  const currentIdx = allLessons.findIndex((item) => item.lesson.id === selectedLessonId);
  const activeItem = allLessons[currentIdx >= 0 ? currentIdx : 0];
  const { lesson, topicTitle, tierNumber } = activeItem || {};

  const activeLab = lesson ? labsByLesson[lesson.id] : undefined;
  const requiresTerminal = Boolean(lesson?.requiresTerminal);
  const unlocked = lesson ? isLessonUnlocked(lesson, progress, curriculum) : false;

  const [stageTab, setStageTab] = useState<'learn' | 'lab' | 'quiz'>('learn');
  const [showAiTutor, setShowAiTutor] = useState<boolean>(false);
  const [hintTriggerNonce, setHintTriggerNonce] = useState<number>(0);

  // Local CLI homework verification state
  const [showHomeworkBox, setShowHomeworkBox] = useState<boolean>(false);
  const [pastedOutput, setPastedOutput] = useState<string>('');
  const [verifyingHomework, setVerifyingHomework] = useState<boolean>(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Quiz states (graded server-side)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<Record<string, QuizQuestionFeedback> | null>(
    null
  );
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [quizResultMessage, setQuizResultMessage] = useState<{
    passed: boolean;
    text: string;
  } | null>(null);
  const [quizMisconceptions, setQuizMisconceptions] = useState<{
    hints: string[];
    sections: string[];
  } | null>(null);

  // Reset per-lesson stage and local answers when switching lessons
  useEffect(() => {
    if (lesson) {
      setStageTab('learn');
      setSelectedAnswers({});
      setQuizFeedback(null);
      setSubmittingQuiz(false);
      setQuizResultMessage(null);
      setQuizMisconceptions(null);
      setPastedOutput(terminalConfigs[lesson.id] || '');
      setVerifyingHomework(false);
      setVerifyFeedback(null);
      setShowHomeworkBox(false);
      setCopiedCmd(false);
    }
  }, [selectedLessonId]);

  // Register daily active streak ping ONLY when lesson is unlocked
  useEffect(() => {
    if (lesson?.id && unlocked && onActiveEngage) {
      onActiveEngage('open_lesson', lesson.id).catch(() => {});
    }
  }, [lesson?.id, unlocked]);

  const nextUnlockedItem = React.useMemo(() => {
    if (currentIdx < 0) return null;
    for (let i = currentIdx + 1; i < allLessons.length; i++) {
      if (isLessonUnlocked(allLessons[i].lesson, progress, curriculum)) {
        return allLessons[i];
      }
    }
    const recommended = getNextRecommendedLesson(curriculum, progress);
    if (
      recommended &&
      recommended.lesson.id !== lesson?.id &&
      isLessonUnlocked(recommended.lesson, progress, curriculum)
    ) {
      return recommended;
    }
    return null;
  }, [allLessons, currentIdx, progress, curriculum, lesson?.id]);

  if (!lesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 text-center">
        <XCircle className="h-10 w-10 text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-200">No active lesson selected.</p>
        <p className="text-xs text-slate-400 mt-1">Select a lesson from Curriculum to begin.</p>
      </div>
    );
  }

  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  const isLessonCompleted = completedSet.has(lesson.id);
  const isQuizCompleted = (progress.completedQuizLessonIds || []).includes(lesson.id);
  const isLabCompleted = activeLab
    ? (progress.completedExerciseIds || []).includes(activeLab.id)
    : false;
  const isHomeworkCompleted = (progress.completedHomeworkLessonIds || []).includes(lesson.id);

  const missingPrereqs = unlocked ? [] : getMissingPrerequisites(lesson, progress, curriculum);

  const handleCompleteExercise = (exerciseId: string, selectedOption: number) => {
    return onActiveEngage('complete_exercise', lesson.id, { exerciseId, selectedOption });
  };

  const handleAskTutorHint = (_lab: PracticalLab) => {
    setShowAiTutor(true);
    setHintTriggerNonce((n) => n + 1);
  };

  const jumpToLessonSection = (sectionTitle: string) => {
    setStageTab('learn');
    const slug = slugifyHeading(sectionTitle);
    if (!slug) return;
    setTimeout(() => {
      const target = document.getElementById(`section-${slug}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const homeworkCommand = lesson.homeworkCommand || 'whoami';
  const homeworkInstruction =
    lesson.homeworkInstruction ||
    `Run \`${homeworkCommand}\` in your local terminal or command prompt.`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(homeworkCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleVerifyHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingHomework) return;

    if (!pastedOutput.trim()) {
      setVerifyFeedback({
        success: false,
        message: 'Paste your local terminal output before verifying.',
      });
      return;
    }

    saveTerminalConfig(lesson.id, pastedOutput);
    setVerifyingHomework(true);
    setVerifyFeedback(null);

    try {
      const res = await onActiveEngage('verify_homework', lesson.id, {
        terminalOutput: pastedOutput,
      });
      const xpAwarded = res?.xpAwarded ?? 0;
      setVerifyFeedback({
        success: true,
        message:
          xpAwarded > 0
            ? `Output verified! +${xpAwarded} XP awarded.`
            : 'Local command output verified.',
      });
    } catch (err: any) {
      setVerifyFeedback({
        success: false,
        message: err?.message || 'Terminal output did not match expected verification rules.',
      });
    } finally {
      setVerifyingHomework(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (quizFeedback || submittingQuiz) return;
    if (quizResultMessage && !quizResultMessage.passed) {
      setQuizResultMessage(null);
    }
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const allQuestionsAnswered =
    lesson.quiz.length > 0 && lesson.quiz.every((q) => selectedAnswers[q.id] !== undefined);

  const handleSubmitQuiz = async () => {
    if (!allQuestionsAnswered || submittingQuiz) return;
    setSubmittingQuiz(true);
    setQuizResultMessage(null);
    setQuizMisconceptions(null);

    try {
      const res = await onActiveEngage('submit_quiz', lesson.id, { answers: selectedAnswers });
      setQuizFeedback(res?.questionFeedback || null);
      const scorePercent = res?.scorePercent ?? 100;
      const xpAwarded = res?.xpAwarded ?? 0;
      setQuizResultMessage({
        passed: true,
        text:
          xpAwarded > 0
            ? `Passed (${scorePercent}%)! +${xpAwarded} XP awarded.`
            : `Passed (${scorePercent}%)! Knowledge check verified.`,
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.payload) {
        if (err.payload.questionFeedback) {
          setQuizFeedback(err.payload.questionFeedback as Record<string, QuizQuestionFeedback>);
        }
        const hints = Array.isArray(err.payload.misconceptionHints)
          ? err.payload.misconceptionHints.filter((h: unknown): h is string => typeof h === 'string')
          : [];
        const sections = Array.isArray(err.payload.recommendedSections)
          ? err.payload.recommendedSections.filter((s: unknown): s is string => typeof s === 'string')
          : [];
        if (hints.length > 0 || sections.length > 0) {
          setQuizMisconceptions({ hints, sections });
        }

        const correctCount = err.payload.correctCount;
        const totalQuestions = err.payload.totalQuestions ?? lesson.quiz.length;
        const scorePercent = err.payload.scorePercent;
        const requiredPercent =
          err.payload.requiredPercent ?? lesson.completionRequirements?.minQuizScorePercent ?? 100;

        setQuizResultMessage({
          passed: false,
          text:
            typeof scorePercent === 'number' && typeof correctCount === 'number'
              ? `You scored ${correctCount} / ${totalQuestions} (${scorePercent}%). ${requiredPercent}% is required to complete this check.`
              : err.message,
        });
      } else {
        setQuizResultMessage({
          passed: false,
          text: err?.message || 'Unable to verify quiz submission.',
        });
      }
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizFeedback(null);
    setQuizResultMessage(null);
    setQuizMisconceptions(null);
  };

  const handlePrevLesson = () => {
    if (currentIdx > 0) {
      setSelectedLessonId(allLessons[currentIdx - 1].lesson.id);
    }
  };

  const handleNextLesson = () => {
    if (nextUnlockedItem) {
      setSelectedLessonId(nextUnlockedItem.lesson.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden h-full">
      {/* Compact Header Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToTracks && (
            <button
              type="button"
              onClick={onBackToTracks}
              className="min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-xs text-slate-300 whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Tracks
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span className="text-sky-400 font-medium shrink-0">Tier {tierNumber}</span>
              <span>·</span>
              <span className="truncate">{topicTitle}</span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
              {lesson.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAiTutor((prev) => !prev)}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showAiTutor
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4 text-sky-400" />
            <span>AI Tutor</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={handlePrevLesson}
              disabled={currentIdx <= 0}
              aria-label="Previous Lesson"
              className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-400 px-1 whitespace-nowrap">
              {currentIdx + 1} / {allLessons.length}
            </span>
            <button
              type="button"
              onClick={handleNextLesson}
              disabled={!nextUnlockedItem}
              aria-label="Next Unlocked Lesson"
              title={
                nextUnlockedItem
                  ? `Next unlocked lesson: ${nextUnlockedItem.lesson.title}`
                  : 'Complete prerequisites to unlock upcoming lessons'
              }
              className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Workspace + Optional AI Tutor Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Guided Stage Tabs: Learn | Practice Lab | Knowledge Check (hidden when locked) */}
          {unlocked && (
            <div className="px-4 sm:px-6 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between gap-4 overflow-x-auto shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStageTab('learn')}
                  className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    stageTab === 'learn'
                      ? 'border-sky-400 text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="h-4 w-4 text-sky-400" />
                  <span>Learn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageTab('lab')}
                  className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    stageTab === 'lab'
                      ? 'border-sky-400 text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FlaskConical className="h-4 w-4 text-sky-400" />
                  <span>Practice Lab</span>
                  {isLabCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStageTab('quiz')}
                  className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    stageTab === 'quiz'
                      ? 'border-sky-400 text-slate-100'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="h-4 w-4 text-sky-400" />
                  <span>Knowledge Check</span>
                  {isQuizCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span>{lesson.duration}</span>
              </div>
            </div>
          )}

          {/* Stage Viewport */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            {!unlocked && missingPrereqs.length > 0 ? (
              <div className="max-w-2xl mx-auto rounded-xl border border-amber-500/30 bg-amber-950/15 p-6 sm:p-8 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-100">
                      Prerequisite Required to Unlock
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Complete the required prerequisite lesson{missingPrereqs.length > 1 ? 's' : ''} below before starting <span className="text-slate-100 font-medium">{lesson.title}</span>.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/70">
                  {missingPrereqs.map((prereq) => (
                    <div
                      key={prereq.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">
                          Tier {prereq.tierNumber} · {prereq.topicTitle}
                        </p>
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {prereq.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLessonId(prereq.id)}
                        className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        Go to Prerequisite
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            {/* STAGE 1: LEARN */}
            {stageTab === 'learn' && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-2 border-b border-slate-800/80 pb-5">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
                    {lesson.title}
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {lesson.description}
                  </p>
                </div>

                <MarkdownRenderer content={lesson.content} />

                <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAiTutor(true)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap"
                  >
                    <Bot className="h-4 w-4 text-sky-400" />
                    Ask AI Tutor to Simplify or Explain More
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {activeLab && (
                      <button
                        type="button"
                        onClick={() => setStageTab('lab')}
                        className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        <FlaskConical className="h-4 w-4" />
                        Open Practice Lab (+{activeLab.xpReward} XP)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStageTab('quiz')}
                      className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Knowledge Check
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: PRACTICE LAB */}
            {stageTab === 'lab' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {activeLab ? (
                  <PracticalLabHost
                    lab={activeLab}
                    isCompleted={isLabCompleted}
                    explorationState={labExploration[activeLab.id]}
                    onUpdateLabExploration={onUpdateLabExploration}
                    onCompleteExercise={handleCompleteExercise}
                    onAskTutorHint={handleAskTutorHint}
                    onReviewSection={jumpToLessonSection}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
                    Interactive lab preview is not available for this lesson yet.
                  </div>
                )}

                {/* Optional Real Local Terminal Verification Homework (Preserved for terminal lessons) */}
                {requiresTerminal && (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                          <Terminal className="h-4 w-4 text-sky-400" />
                          <span>Optional Local Machine Verification (+200 XP)</span>
                          {isHomeworkCompleted && (
                            <span className="text-emerald-400 font-normal">· Verified</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          Run the command on your own computer and paste the output below to earn extra hands-on XP.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowHomeworkBox((prev) => !prev)}
                        className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0"
                      >
                        {showHomeworkBox ? 'Hide Local Verification' : 'Verify Local Command'}
                      </button>
                    </div>

                    {showHomeworkBox && (
                      <form onSubmit={handleVerifyHomework} className="space-y-4 pt-3 border-t border-slate-800">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {homeworkInstruction}
                        </p>

                        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 font-mono text-xs text-sky-300">
                          <span className="truncate">$ {homeworkCommand}</span>
                          <button
                            type="button"
                            onClick={handleCopyCommand}
                            className="p-1.5 text-slate-400 hover:text-white rounded"
                            title="Copy command"
                          >
                            {copiedCmd ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        <textarea
                          value={pastedOutput}
                          onChange={(e) => setPastedOutput(e.target.value)}
                          rows={5}
                          placeholder="Paste your terminal command output here..."
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                        />

                        {verifyFeedback && (
                          <div
                            className={`rounded-lg border p-3 text-xs leading-relaxed ${
                              verifyFeedback.success
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {verifyFeedback.message}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={verifyingHomework}
                          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap"
                        >
                          {verifyingHomework ? 'Verifying Output...' : 'Verify Terminal Output'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStageTab('learn')}
                    className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Lesson Reading
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageTab('quiz')}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Continue to Knowledge Check
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: KNOWLEDGE CHECK */}
            {stageTab === 'quiz' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-100">Knowledge Check</h2>
                    <p className="text-xs text-slate-400">
                      Answer all {lesson.quiz.length} questions accurately to complete this lesson and earn{' '}
                      <span className="text-slate-200 font-medium">
                        +{lesson.quiz.length * 100} XP
                      </span>
                      .
                    </p>
                  </div>
                  {(isQuizCompleted || isLessonCompleted) && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 shrink-0">
                      <Award className="h-4 w-4" />
                      Completed
                    </span>
                  )}
                </div>

                <div className="space-y-5">
                  {lesson.quiz.map((q, qIdx) => {
                    const selectedIdx = selectedAnswers[q.id];
                    const fb = quizFeedback ? quizFeedback[q.id] : undefined;
                    const isGraded = Boolean(fb);
                    const isCorrect = Boolean(fb?.correct);

                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4"
                      >
                        <p className="text-sm font-medium text-slate-100 leading-relaxed">
                          <span className="font-mono text-xs text-sky-400 mr-2">
                            Q{qIdx + 1}.
                          </span>
                          {q.question}
                        </p>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedIdx === optIdx;
                            let optionStyle =
                              'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700';

                            if (isGraded && isSelected) {
                              optionStyle = isCorrect
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                                : 'bg-rose-950/30 border-rose-500/40 text-rose-100';
                            } else if (isSelected) {
                              optionStyle =
                                'bg-sky-950/30 border-sky-500/50 text-slate-100';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isGraded || submittingQuiz}
                                onClick={() => handleSelectOption(q.id, optIdx)}
                                className={`w-full min-h-[44px] text-left rounded-lg border px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${optionStyle}`}
                              >
                                <span className="leading-relaxed">{opt}</span>
                                {isGraded && isSelected && isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                )}
                                {isGraded && isSelected && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {isGraded && fb && (
                          <div
                            className={`rounded-lg border p-3.5 text-xs leading-relaxed space-y-1 ${
                              isCorrect
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                                : 'bg-rose-950/20 border-rose-500/30 text-slate-200'
                            }`}
                          >
                            <p
                              className={`font-semibold ${
                                isCorrect ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </p>
                            <p className="text-slate-300">{fb.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!quizFeedback && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!allQuestionsAnswered || submittingQuiz}
                      onClick={handleSubmitQuiz}
                      className="min-h-[44px] px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      {submittingQuiz ? 'Grading Knowledge Check...' : 'Submit Knowledge Check'}
                    </button>
                  </div>
                )}

                {quizResultMessage && (
                  <div className="space-y-4">
                    <div
                      className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        quizResultMessage.passed
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <p className="text-sm text-slate-200">{quizResultMessage.text}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!quizResultMessage.passed && (
                          <button
                            type="button"
                            onClick={handleResetQuiz}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry Quiz
                          </button>
                        )}
                        {quizResultMessage.passed && nextUnlockedItem && (
                          <button
                            type="button"
                            onClick={handleNextLesson}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap"
                          >
                            Next Lesson
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!quizResultMessage.passed &&
                      quizMisconceptions &&
                      (quizMisconceptions.hints.length > 0 || quizMisconceptions.sections.length > 0) && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-5 space-y-3">
                          <div className="space-y-1">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                              Targeted Concept Review
                            </h3>
                            <p className="text-xs text-slate-400">
                              Review these specific concepts from your selected answers before retrying:
                            </p>
                          </div>

                          {quizMisconceptions.hints.length > 0 && (
                            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                              {quizMisconceptions.hints.map((hint, hIdx) => (
                                <li
                                  key={hIdx}
                                  className="flex items-start gap-2 rounded-lg bg-slate-950/60 px-3 py-2.5"
                                >
                                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                                  <span>{hint}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {quizMisconceptions.sections.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {quizMisconceptions.sections.map((section) => (
                                <button
                                  key={section}
                                  type="button"
                                  onClick={() => jumpToLessonSection(section)}
                                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-sky-300 transition-colors"
                                >
                                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                  Review: {section}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>

        {/* Docked AI Tutor Panel (Desktop) */}
        {showAiTutor && (
          <div className="hidden lg:flex w-[420px] xl:w-[460px] h-full shrink-0 border-l border-slate-800">
            <AiTutorPanel
              lesson={lesson}
              topicTitle={topicTitle}
              tierNumber={tierNumber}
              activeExercise={activeLab}
              hintTriggerNonce={hintTriggerNonce}
              isOpen={showAiTutor}
              onClose={() => setShowAiTutor(false)}
              isFloating={false}
            />
          </div>
        )}

        {/* Mobile/Tablet AI Tutor Drawer */}
        {showAiTutor && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950 flex flex-col">
            <AiTutorPanel
              lesson={lesson}
              topicTitle={topicTitle}
              tierNumber={tierNumber}
              activeExercise={activeLab}
              hintTriggerNonce={hintTriggerNonce}
              isOpen={showAiTutor}
              onClose={() => setShowAiTutor(false)}
              isFloating={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
