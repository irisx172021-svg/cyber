import React from 'react';
import {
  Flame,
  ArrowRight,
  Clock,
  FlaskConical,
  BookOpen,
  MessageSquare,
  FileEdit,
  Play,
  Briefcase,
} from 'lucide-react';
import {
  User,
  UserProgress,
  Tier,
  CommunityPost,
  LabNote,
  PracticalLab,
  CapstoneProgressMap,
  LearningProfile,
} from '../types';
import {
  computeCurriculumStats,
  getNextRecommendedLesson,
} from '../lib/curriculumProgress';
import {
  computeAllStageStats,
  JourneyStageStatus,
} from '../lib/journeyProgress';
import { computePersonalizedRecommendations } from '../lib/learningRecommendations';

interface DashboardProps {
  user: User;
  progress: UserProgress;
  curriculum: Tier[];
  labsByLesson: Record<string, PracticalLab>;
  capstoneProgress?: CapstoneProgressMap;
  communityPosts: CommunityPost[];
  labNotes: LabNote[];
  setActiveTab: (tab: string) => void;
  setSelectedLessonId: (id: string) => void;
  onSelectTier?: (tierId: string) => void;
  onSelectStage?: (stageId: string) => void;
  onBrowseClassicTiers?: () => void;
  learningProfile?: LearningProfile;
  onOpenPreferencesModal?: () => void;
}

const DASHBOARD_STAGE_STATUS: Record<JourneyStageStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  available: 'Ready',
  locked_preview: 'Preview',
};

export default function Dashboard({
  user,
  progress,
  curriculum,
  labsByLesson,
  capstoneProgress = {},
  communityPosts,
  labNotes,
  setActiveTab,
  setSelectedLessonId,
  onSelectTier,
  onSelectStage,
  onBrowseClassicTiers,
  learningProfile,
  onOpenPreferencesModal,
}: DashboardProps) {
  const completedCapstonesCount = Object.values(capstoneProgress).filter((c) =>
    Boolean(c?.completedAt)
  ).length;
  const stats = computeCurriculumStats(curriculum, progress);
  const stageStatsList = React.useMemo(
    () => computeAllStageStats(curriculum, labsByLesson, progress, capstoneProgress),
    [curriculum, labsByLesson, progress, capstoneProgress]
  );
  const recommendations = React.useMemo(
    () => computePersonalizedRecommendations(learningProfile, curriculum, progress, capstoneProgress),
    [learningProfile, curriculum, progress, capstoneProgress]
  );
  const totalLessons = stats.totalLessons;
  const completedCount = stats.completedLessons;
  const completedLabsCount = (progress.completedExerciseIds || []).length;
  const totalLabsCount = Object.keys(labsByLesson).length;
  const completionPercent = stats.completionPercent;

  // Next unlocked recommended lesson (personalized if interests are set and an unlocked step is available)
  const personalizedTopAction = recommendations.recommendedNextActions[0];
  const nextLessonInfo = getNextRecommendedLesson(curriculum, progress);
  const effectiveNextLesson = personalizedTopAction?.lesson || nextLessonInfo?.lesson;
  const effectiveNextLab = effectiveNextLesson ? labsByLesson[effectiveNextLesson.id] : undefined;

  const handleResume = () => {
    if (effectiveNextLesson) {
      setSelectedLessonId(effectiveNextLesson.id);
      setActiveTab('player');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isStreakCheckedToday = progress.lastActiveDate === todayStr;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-sky-400">Learning Dashboard</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Welcome back, {user.username}
            </h2>
            <p className="text-sm text-slate-400">
              Continue through all {curriculum.length} tiers with interactive practical labs, quizzes, and guided AI tutoring.
            </p>
            {onOpenPreferencesModal && (
              <div className="pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                {recommendations.isPersonalized ? (
                  <>
                    <span className="text-sky-400 font-medium">Your Interests:</span>
                    <span className="text-slate-300">
                      {recommendations.selectedPathways.map((p) => p.title).join(' · ')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={onOpenPreferencesModal}
                      className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                    >
                      Change Interests
                    </button>
                  </>
                ) : (
                  <>
                    <span>Want tailored pathway highlights?</span>
                    <button
                      type="button"
                      onClick={onOpenPreferencesModal}
                      className="text-sky-400 hover:text-sky-300 underline underline-offset-2 font-medium"
                    >
                      Personalize Interests
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs shrink-0">
            <Flame
              className={`h-4 w-4 ${
                isStreakCheckedToday ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span
              className={
                isStreakCheckedToday ? 'text-emerald-300 font-medium' : 'text-slate-300'
              }
            >
              {isStreakCheckedToday
                ? "Today's study streak complete"
                : 'Complete a practical lab or quiz today'}
            </span>
          </div>
        </div>

        {/* Focal Action Card: Continue Learning */}
        {effectiveNextLesson && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span className="text-sky-400 font-medium">
                  {personalizedTopAction ? 'Recommended Next Step' : 'Continue Learning'}
                </span>
                <span>·</span>
                {personalizedTopAction ? (
                  <>
                    <span>
                      Stage {personalizedTopAction.stageOrder}: {personalizedTopAction.stageTitle}
                    </span>
                    <span>·</span>
                    <span>{personalizedTopAction.journeyTopicTitle}</span>
                  </>
                ) : (
                  nextLessonInfo && (
                    <>
                      <span>
                        Tier {nextLessonInfo.tierNumber}: {nextLessonInfo.tierTitle}
                      </span>
                      <span>·</span>
                      <span>{nextLessonInfo.topicTitle}</span>
                    </>
                  )
                )}
              </div>

              <h3 className="text-xl font-semibold text-slate-100 tracking-tight">
                {effectiveNextLesson.title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                {personalizedTopAction ? personalizedTopAction.reason : effectiveNextLesson.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-1 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {effectiveNextLesson.duration}
                </span>
                {effectiveNextLab && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-sky-400" />
                      Practical Lab (+{effectiveNextLab.xpReward} XP)
                    </span>
                  </>
                )}
                <span>·</span>
                <span>Quiz (+{effectiveNextLesson.quiz.length * 100} XP)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResume}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" />
                Continue Learning
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* 4-KPI Summary Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <p className="text-xs text-slate-400">Lessons Completed</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
              {completedCount}{' '}
              <span className="text-sm font-normal text-slate-500">/ {totalLessons}</span>
            </p>
            <p className="text-xs text-emerald-400 tabular-nums">{completionPercent}% overall</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <p className="text-xs text-slate-400">Practical Labs</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
              {completedLabsCount}{' '}
              <span className="text-sm font-normal text-slate-500">/ {totalLabsCount}</span>
            </p>
            <p className="text-xs text-sky-400">Hands-on activities</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <p className="text-xs text-slate-400">Experience</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
              {progress.xp.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">XP</span>
            </p>
            <p className="text-xs text-slate-400">
              Level {user.level} · {user.rank}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <p className="text-xs text-slate-400">Study Streak</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
              {progress.streak}{' '}
              <span className="text-sm font-normal text-slate-500">days</span>
            </p>
            <p className="text-xs text-amber-400">
              {isStreakCheckedToday ? 'Active today' : 'Pending today'}
            </p>
          </div>
        </section>

        {/* 5-Stage Learning Journey Overview */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                5-Stage Cybersecurity Journey
              </h3>
              <p className="text-xs text-slate-400">
                Follow the guided 5-stage sequence or switch to Classic 11 Tiers anytime.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (onBrowseClassicTiers) {
                    onBrowseClassicTiers();
                  } else if (onSelectTier && curriculum[0]) {
                    onSelectTier(curriculum[0].id);
                    setActiveTab('tracks');
                  } else {
                    setActiveTab('tracks');
                  }
                }}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0"
              >
                Classic 11 Tiers
              </button>
              <button
                type="button"
                onClick={() => {
                  const activeStage =
                    stageStatsList.find((s) => s.status === 'in_progress') || stageStatsList[0];
                  if (onSelectStage && activeStage) {
                    onSelectStage(activeStage.stage.id);
                  }
                  setActiveTab('tracks');
                }}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                Open Journey
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stageStatsList.map((s) => (
              <button
                key={s.stage.id}
                type="button"
                onClick={() => {
                  if (onSelectStage) onSelectStage(s.stage.id);
                  setActiveTab('tracks');
                }}
                className={`text-left rounded-xl border p-4 transition-colors space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  s.status === 'in_progress'
                    ? 'border-sky-500/45 bg-slate-900/65 hover:bg-slate-900'
                    : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                  <span className="font-mono text-sky-400">Stage {s.stage.order}</span>
                  <span className="font-mono text-slate-300">
                    {s.coreCompleted}/{s.coreTotal}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-100 truncate">
                  {s.stage.title}
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      s.status === 'completed' ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                    style={{ width: `${s.corePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span
                    className={
                      s.status === 'completed'
                        ? 'text-emerald-400'
                        : s.status === 'in_progress'
                        ? 'text-sky-400'
                        : s.status === 'locked_preview'
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }
                  >
                    {DASHBOARD_STAGE_STATUS[s.status]}
                  </span>
                  <span>{s.corePercent}% core</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Applied Guided Capstones Entry Card */}
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span>Optional Applied Synthesis</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono tabular-nums text-slate-300">
                {completedCapstonesCount} / 4 Capstones Completed
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100">Guided Capstones</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Test your skills across multi-stage SOC triage, web application security review, AWS cloud incidents, and memory/artifact forensics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('capstones')}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 whitespace-nowrap shrink-0 transition-colors"
          >
            Open Capstones
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* Bottom Two-Column Split: Recent Notes & Community */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notes */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-sky-400" />
                Recent Lab Notes
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('scratchpad')}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0"
              >
                Open Scratchpad
              </button>
            </div>

            <div className="divide-y divide-slate-800/70">
              {labNotes.slice(0, 3).map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setActiveTab('scratchpad')}
                  className="w-full text-left py-3 first:pt-0 last:pb-0 hover:text-sky-300 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate">{note.moduleTitle}</span>
                    <span className="tabular-nums shrink-0">
                      {new Date(note.lastSaved).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {note.title || 'Untitled Note'}
                  </div>
                </button>
              ))}
              {labNotes.length === 0 && (
                <p className="text-xs text-slate-400 py-4">
                  No saved notes yet. Open Scratchpad to record commands and findings.
                </p>
              )}
            </div>
          </div>

          {/* Community Discussions */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-400" />
                Community Discussions
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('forum')}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-800/70">
              {communityPosts.slice(0, 3).map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActiveTab('forum')}
                  className="w-full text-left py-3 first:pt-0 last:pb-0 hover:text-sky-300 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>
                      {post.category} · @{post.author}
                    </span>
                    <span className="tabular-nums shrink-0">{post.upvotes} upvotes</span>
                  </div>
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {post.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
