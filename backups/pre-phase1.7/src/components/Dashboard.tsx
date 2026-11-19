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
} from 'lucide-react';
import { User, UserProgress, Tier, CommunityPost, LabNote } from '../types';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../data/practicalLabs';
import {
  computeCurriculumStats,
  getCanonicalCompletedSet,
  getNextRecommendedLesson,
} from '../lib/curriculumProgress';

interface DashboardProps {
  user: User;
  progress: UserProgress;
  curriculum: Tier[];
  communityPosts: CommunityPost[];
  labNotes: LabNote[];
  setActiveTab: (tab: string) => void;
  setSelectedLessonId: (id: string) => void;
  onSelectTier?: (tierId: string) => void;
}

export default function Dashboard({
  user,
  progress,
  curriculum,
  communityPosts,
  labNotes,
  setActiveTab,
  setSelectedLessonId,
  onSelectTier,
}: DashboardProps) {
  const stats = computeCurriculumStats(curriculum, progress);
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  const totalLessons = stats.totalLessons;
  const completedCount = stats.completedLessons;
  const completedLabsCount = (progress.completedExerciseIds || []).length;
  const totalLabsCount = ALL_PRACTICAL_LABS.length;
  const completionPercent = stats.completionPercent;

  // Next unlocked recommended lesson
  const nextLessonInfo = getNextRecommendedLesson(curriculum, progress);
  const nextLab = nextLessonInfo ? getPracticalLabForLesson(nextLessonInfo.lesson.id) : undefined;

  const handleResume = () => {
    if (nextLessonInfo) {
      setSelectedLessonId(nextLessonInfo.lesson.id);
      setActiveTab('player');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isStreakCheckedToday = progress.lastActiveDate === todayStr;

  const getTierStats = (tier: Tier) => {
    let total = 0;
    let done = 0;
    tier.topics.forEach((topic) => {
      topic.lessons.forEach((lesson) => {
        total++;
        if (completedSet.has(lesson.id)) done++;
      });
    });
    return {
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  };

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
        {nextLessonInfo && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span className="text-sky-400 font-medium">Continue Learning</span>
                <span>·</span>
                <span>
                  Tier {nextLessonInfo.tierNumber}: {nextLessonInfo.tierTitle}
                </span>
                <span>·</span>
                <span>{nextLessonInfo.topicTitle}</span>
              </div>

              <h3 className="text-xl font-semibold text-slate-100 tracking-tight">
                {nextLessonInfo.lesson.title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                {nextLessonInfo.lesson.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-1 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {nextLessonInfo.lesson.duration}
                </span>
                {nextLab && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-sky-400" />
                      Practical Lab (+{nextLab.xpReward} XP)
                    </span>
                  </>
                )}
                <span>·</span>
                <span>Quiz (+{nextLessonInfo.lesson.quiz.length * 100} XP)</span>
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

        {/* Tier Progress Overview (All 11 Tiers) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100">Curriculum Progress</h3>
            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Browse All Tiers
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {curriculum.map((tier) => {
              const stats = getTierStats(tier);
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    if (onSelectTier) onSelectTier(tier.id);
                    setActiveTab('tracks');
                  }}
                  className="text-left rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700 p-4 transition-colors space-y-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-mono text-slate-400">Tier {tier.number}</span>
                    <span className="text-xs font-mono tabular-nums text-slate-300">
                      {stats.done}/{stats.total}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {tier.title}
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.percent === 100 ? 'bg-emerald-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
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
