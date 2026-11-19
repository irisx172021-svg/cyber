import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Play,
  FlaskConical,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Tier, UserProgress, User, PracticalLab } from '../types';
import {
  getCanonicalCompletedSet,
  getMissingPrerequisites,
  getRecommendedPrerequisiteInfos,
  isLessonUnlocked,
} from '../lib/curriculumProgress';

interface TracksProps {
  curriculum: Tier[];
  labsByLesson: Record<string, PracticalLab>;
  progress: UserProgress;
  setActiveTab: (tab: string) => void;
  setSelectedLessonId: (id: string) => void;
  user: User | null;
  onLoginRequired: () => void;
  selectedTierId?: string;
  onSelectTierId?: (tierId: string) => void;
}

export default function Tracks({
  curriculum,
  labsByLesson,
  progress,
  setActiveTab,
  setSelectedLessonId,
  user,
  onLoginRequired,
  selectedTierId: controlledTierId,
  onSelectTierId,
}: TracksProps) {
  const [internalTierId, setInternalTierId] = useState<string>(controlledTierId || 'tier-1');

  useEffect(() => {
    if (controlledTierId) {
      setInternalTierId(controlledTierId);
    }
  }, [controlledTierId]);

  const selectedTierId = controlledTierId || internalTierId;
  const setSelectedTierId = (id: string) => {
    setInternalTierId(id);
    if (onSelectTierId) onSelectTierId(id);
  };

  const activeTier = curriculum.find((tier) => tier.id === selectedTierId) || curriculum[0];

  if (!activeTier) {
    return null;
  }

  const handleLessonLaunch = (lessonId: string) => {
    if (!user) {
      onLoginRequired();
      return;
    }
    setSelectedLessonId(lessonId);
    setActiveTab('player');
  };

  const completedSet = getCanonicalCompletedSet(progress, curriculum);

  const getTierCompletion = (tier: Tier) => {
    let total = 0;
    let completed = 0;
    tier.topics.forEach((topic) => {
      topic.lessons.forEach((lesson) => {
        total++;
        if (completedSet.has(lesson.id)) {
          completed++;
        }
      });
    });
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const activeStats = getTierCompletion(activeTier);
  const completedExercises = progress.completedExerciseIds || [];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-5 space-y-1">
          <p className="text-xs font-medium text-sky-400">Academy Curriculum</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Learning Tracks
          </h2>
          <p className="text-sm text-slate-400">
            Explore all {curriculum.length} tiers—from computer & networking foundations through defense, offense, cloud, reverse engineering, and career readiness.
          </p>
        </div>

        {/* Compact Horizontal Tier Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {curriculum.map((tier) => {
            const isSelected = activeTier.id === tier.id;
            const { completed, total } = getTierCompletion(tier);
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg border text-left transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 border-sky-500/50 text-slate-100'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className={isSelected ? 'text-sky-400' : 'text-slate-500'}>
                    T{tier.number}
                  </span>
                  <span>{tier.title}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {completed}/{total}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Tier Overview & Topics */}
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-6 space-y-6">
          <div className="space-y-3 border-b border-slate-800/80 pb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-sky-400">Tier {activeTier.number}</p>
                <h3 className="text-xl font-semibold text-slate-100 mt-0.5">
                  {activeTier.title}
                </h3>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-400">
                {activeStats.completed} / {activeStats.total} lessons ({activeStats.percent}%)
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{activeTier.description}</p>

            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeStats.percent === 100 ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
                style={{ width: `${activeStats.percent}%` }}
              />
            </div>
          </div>

          {/* Topics & Lessons */}
          <div className="space-y-8">
            {activeTier.topics.map((topic, topicIdx) => (
              <div key={topic.id} className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-200">
                    <span className="font-mono text-sky-400 mr-2">
                      {String(topicIdx + 1).padStart(2, '0')}.
                    </span>
                    {topic.title}
                  </h4>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {topic.lessons.length} lessons
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                  {topic.lessons.map((lesson) => {
                    const isCompleted = completedSet.has(lesson.id);
                    const unlocked = isLessonUnlocked(lesson, progress, curriculum);
                    const missingPrereqs = unlocked
                      ? []
                      : getMissingPrerequisites(lesson, progress, curriculum);
                    const recommendedInfos = getRecommendedPrerequisiteInfos(
                      lesson,
                      progress,
                      curriculum
                    );
                    const pendingRecommended = recommendedInfos.filter((r) => !r.completed);
                    const lab = labsByLesson[lesson.id];
                    const isLabDone = lab ? completedExercises.includes(lab.id) : false;

                    return (
                      <div
                        key={lesson.id}
                        className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          unlocked ? 'hover:bg-slate-900/50' : 'bg-slate-950/80 opacity-85'
                        }`}
                      >
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : unlocked ? (
                              <Play className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            )}
                            <h5 className="text-sm font-medium text-slate-100">
                              {lesson.title}
                            </h5>
                            {lesson.required === false && (
                              <span className="text-[11px] font-mono text-slate-400 border border-slate-800 rounded px-1.5 py-0.5">
                                Optional
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed pl-6">
                            {lesson.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-6 text-xs text-slate-500 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.duration}
                            </span>
                            {lesson.difficulty && (
                              <>
                                <span>·</span>
                                <span className="capitalize text-slate-400">{lesson.difficulty}</span>
                              </>
                            )}
                            {lab && (
                              <>
                                <span>·</span>
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    isLabDone ? 'text-emerald-400' : 'text-sky-400'
                                  }`}
                                >
                                  <FlaskConical className="h-3 w-3" />
                                  {isLabDone ? 'Practice Lab Done' : `Practice Lab (+${lab.xpReward} XP)`}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>Quiz (+{lesson.quiz.length * 100} XP)</span>
                          </div>

                          {!unlocked && missingPrereqs.length > 0 && (
                            <p className="pl-6 text-xs text-amber-300/90 leading-relaxed">
                              Locked · Missing prerequisite{missingPrereqs.length > 1 ? 's' : ''}:{' '}
                              {missingPrereqs.map((p) => p.title).join(', ')}
                            </p>
                          )}

                          {unlocked && pendingRecommended.length > 0 && (
                            <p className="pl-6 text-xs text-slate-500 leading-relaxed">
                              Recommended first (optional):{' '}
                              {pendingRecommended.map((r) => r.title).join(', ')}
                            </p>
                          )}
                        </div>

                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => handleLessonLaunch(lesson.id)}
                            className={`min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                              isCompleted
                                ? 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold'
                            }`}
                          >
                            {isCompleted ? 'Review Lesson' : 'Start Lesson'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLessonLaunch(missingPrereqs[0].id)}
                            title={`Complete "${missingPrereqs[0].title}" first to unlock this lesson`}
                            className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Unlock via Prerequisite
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
