import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Compass,
  Layers,
  Lock,
  Play,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CapstoneProgressMap,
  LearningProfile,
  PracticalLab,
  Tier,
  User,
  UserProgress,
} from '../../types';
import {
  JOURNEY_CAPSTONE_REFERENCES,
  JOURNEY_STAGES,
  PathwayReadinessStatus,
  SPECIALIST_PATHWAYS,
} from '../../data/journeyBlueprint';
import {
  computeAllStageStats,
  computePathwayStats,
  formatEstimatedDuration,
  getGlobalJourneyStats,
  getJourneyRecommendedNext,
} from '../../lib/journeyProgress';
import { indexCurriculumLessons } from '../../lib/curriculumProgress';
import { LEARNING_EXPERIENCE_OPTIONS } from '../../lib/learningProfile';
import { computePersonalizedRecommendations } from '../../lib/learningRecommendations';
import StageCard from './StageCard';
import TopicDetailView from './TopicDetailView';

interface JourneyPageProps {
  curriculum: Tier[];
  labsByLesson: Record<string, PracticalLab>;
  progress: UserProgress;
  capstoneProgress?: CapstoneProgressMap;
  user: User | null;
  learningProfile?: LearningProfile;
  onLaunchLesson: (lessonId: string) => void;
  onOpenCapstones: () => void;
  onSwitchToClassicTiers: () => void;
  onOpenPreferencesModal?: () => void;
  onSkipOnboarding?: () => Promise<void> | void;
  onClearInterests?: () => Promise<void> | void;
  selectedStageId?: string;
  onSelectStageId?: (stageId: string) => void;
}

const READINESS_LABELS: Record<PathwayReadinessStatus, string> = {
  complete: 'Complete Pathway',
  substantially_complete: 'Substantially Complete',
  partially_complete: 'Partially Complete',
  needs_development: 'Cross-Domain Foundation',
};

export default function JourneyPage({
  curriculum,
  labsByLesson,
  progress,
  capstoneProgress = {},
  user,
  learningProfile,
  onLaunchLesson,
  onOpenCapstones,
  onSwitchToClassicTiers,
  onOpenPreferencesModal,
  onSkipOnboarding,
  onClearInterests,
  selectedStageId: externalStageId,
  onSelectStageId,
}: JourneyPageProps) {
  const globalStats = useMemo(
    () => getGlobalJourneyStats(curriculum, progress),
    [curriculum, progress]
  );

  const stageStatsList = useMemo(
    () => computeAllStageStats(curriculum, labsByLesson, progress, capstoneProgress),
    [curriculum, labsByLesson, progress, capstoneProgress]
  );

  const recommendedNext = useMemo(
    () => getJourneyRecommendedNext(curriculum, progress),
    [curriculum, progress]
  );

  const recommendations = useMemo(
    () =>
      computePersonalizedRecommendations(
        learningProfile,
        curriculum,
        progress,
        capstoneProgress
      ),
    [learningProfile, curriculum, progress, capstoneProgress]
  );

  const lessonIndex = useMemo(() => indexCurriculumLessons(curriculum), [curriculum]);

  const defaultExpandedStageId = useMemo(() => {
    if (externalStageId && JOURNEY_STAGES.some((s) => s.id === externalStageId)) {
      return externalStageId;
    }
    const active = stageStatsList.find((s) => s.status === 'in_progress');
    return active?.stage.id || stageStatsList[0]?.stage.id || 'stage-1';
  }, [externalStageId, stageStatsList]);

  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(
    () => new Set([defaultExpandedStageId])
  );
  const [openedTopic, setOpenedTopic] = useState<{ stageId: string; topicId: string } | null>(null);
  const [selectedPathwayId, setSelectedPathwayId] = useState<string | null>(null);

  useEffect(() => {
    if (externalStageId && JOURNEY_STAGES.some((s) => s.id === externalStageId)) {
      setExpandedStageIds((prev) => {
        if (prev.has(externalStageId)) return prev;
        const next = new Set(prev);
        next.add(externalStageId);
        return next;
      });
    }
  }, [externalStageId]);

  const selectedPathwayStats = useMemo(() => {
    if (!selectedPathwayId) return null;
    const pathway = SPECIALIST_PATHWAYS.find((p) => p.id === selectedPathwayId);
    if (!pathway) return null;
    return computePathwayStats(pathway, curriculum, labsByLesson, progress, capstoneProgress);
  }, [selectedPathwayId, curriculum, labsByLesson, progress, capstoneProgress]);

  const highlightedLessonIds = useMemo(() => {
    if (selectedPathwayStats) {
      return new Set(selectedPathwayStats.orderedLessonIds);
    }
    if (recommendations.isPersonalized) {
      return recommendations.highlightedLessonIds;
    }
    return undefined;
  }, [selectedPathwayStats, recommendations]);

  const highlightedTopicIds = useMemo(() => {
    if (selectedPathwayStats && highlightedLessonIds) {
      const topicIds = new Set<string>();
      for (const stage of JOURNEY_STAGES) {
        for (const topic of stage.topics) {
          if (topic.lessonIds.some((id) => highlightedLessonIds.has(id))) {
            topicIds.add(topic.id);
          }
        }
      }
      return topicIds;
    }
    if (recommendations.isPersonalized) {
      return recommendations.recommendedTopicIds;
    }
    return undefined;
  }, [selectedPathwayStats, highlightedLessonIds, recommendations]);

  const activeHighlightStageLabel = selectedPathwayStats ? 'Pathway Focus' : 'Matches Your Interests';
  const activeHighlightLessonLabel = selectedPathwayStats
    ? 'In Selected Pathway'
    : 'Matches Your Interests';

  const primaryActionLesson =
    recommendations.recommendedNextActions[0]
      ? {
          lesson: recommendations.recommendedNextActions[0].lesson,
          stageOrder: recommendations.recommendedNextActions[0].stageOrder,
          topicTitle: recommendations.recommendedNextActions[0].journeyTopicTitle,
          personalized: true,
        }
      : recommendedNext
      ? {
          lesson: recommendedNext.lesson,
          stageOrder: recommendedNext.stageOrder,
          topicTitle: recommendedNext.topicTitle,
          personalized: false,
        }
      : null;

  const showOnboardingInvite =
    Boolean(user) &&
    learningProfile !== undefined &&
    !learningProfile.onboardingCompleted &&
    !recommendations.isPersonalized;

  const experienceOption = LEARNING_EXPERIENCE_OPTIONS.find(
    (o) => o.value === (learningProfile?.experienceLevel || 'beginner')
  );

  const handleToggleStage = (stageId: string) => {
    setExpandedStageIds((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
    if (onSelectStageId) {
      onSelectStageId(stageId);
    }
  };

  const handleExpandAll = () => {
    setExpandedStageIds(new Set(JOURNEY_STAGES.map((s) => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedStageIds(new Set());
  };

  // Empty / loading guard
  if (curriculum.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
        No curriculum modules are currently loaded.
      </div>
    );
  }

  // Level 3: Opened Topic Detail View
  if (openedTopic) {
    const activeStageStats = stageStatsList.find((s) => s.stage.id === openedTopic.stageId);
    const activeTopicStats = activeStageStats?.topicStats.find(
      (t) => t.topic.id === openedTopic.topicId
    );
    if (activeStageStats && activeTopicStats) {
      return (
        <TopicDetailView
          curriculum={curriculum}
          labsByLesson={labsByLesson}
          progress={progress}
          stageStats={activeStageStats}
          topicStats={activeTopicStats}
          onBackToJourney={() => setOpenedTopic(null)}
          onLaunchLesson={onLaunchLesson}
          highlightedLessonIds={highlightedLessonIds}
          highlightLabel={activeHighlightLessonLabel}
        />
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Main Journey Overview Header */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-900/55 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 tabular-nums">
              <span className="text-sky-400 font-medium">Guided 5-Stage Curriculum</span>
              <span aria-hidden="true">·</span>
              <span>
                {globalStats.completedLessons} / {globalStats.totalLessons} lessons completed (
                {globalStats.completionPercent}%)
              </span>
              {!user && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">Guest preview mode</span>
                </>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
              Your Cybersecurity Journey
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Progress smoothly from computer hardware and operating systems through shared core security, domain exploration across all cybersecurity careers, and role-focused specialist pathways.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {primaryActionLesson && (
              <button
                type="button"
                onClick={() => onLaunchLesson(primaryActionLesson.lesson.id)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" />
                Continue Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {onOpenPreferencesModal && (
              <button
                type="button"
                onClick={onOpenPreferencesModal}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
                {recommendations.isPersonalized ? 'Change Interests' : 'Personalize My Path'}
              </button>
            )}

            <button
              type="button"
              onClick={onSwitchToClassicTiers}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              Classic 11 Tiers
            </button>
          </div>
        </div>

        {/* Overall Journey Progress Bar & Next Recommended Target */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                globalStats.completionPercent === 100 ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
              style={{ width: `${globalStats.completionPercent}%` }}
            />
          </div>
          {primaryActionLesson && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {primaryActionLesson.personalized ? 'Recommended next: ' : 'Next up: '}
                <strong className="text-slate-200 font-medium">
                  {primaryActionLesson.lesson.title}
                </strong>{' '}
                (Stage {primaryActionLesson.stageOrder} · {primaryActionLesson.topicTitle})
              </span>
              <span className="tabular-nums">
                {stageStatsList.filter((s) => s.status === 'completed').length} / 5 stages complete
              </span>
            </div>
          )}
        </div>

        {/* Compact Stage Progress Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800/80">
          {stageStatsList.map((s) => {
            const isActive = expandedStageIds.has(s.stage.id);
            return (
              <button
                key={s.stage.id}
                type="button"
                onClick={() => {
                  setExpandedStageIds((prev) => new Set(prev).add(s.stage.id));
                  if (onSelectStageId) onSelectStageId(s.stage.id);
                }}
                className={`min-h-[44px] text-left rounded-lg border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  s.status === 'in_progress'
                    ? 'border-sky-500/40 bg-sky-500/10'
                    : isActive
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
                  <span className={s.status === 'completed' ? 'text-emerald-400' : 'text-sky-400'}>
                    S{s.stage.order}
                  </span>
                  <span className="text-slate-400">{s.corePercent}%</span>
                </div>
                <div className="text-xs font-medium text-slate-200 truncate mt-0.5">
                  {s.stage.shortTitle}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Optional Non-Blocking Onboarding Prompt for Signed-In Learners */}
      {showOnboardingInvite && onOpenPreferencesModal && (
        <section className="rounded-xl border border-sky-500/35 bg-slate-900/55 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <p className="text-xs font-medium text-sky-400">Optional Onboarding</p>
            <h3 className="text-base font-semibold text-slate-100">
              What interests you about cybersecurity?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              You don&apos;t need to choose a career right now. Pick areas that sound interesting and we&apos;ll highlight relevant pathways, topics, and unlocked next steps—or skip and browse freely.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onSkipOnboarding && (
              <button
                type="button"
                onClick={() => void onSkipOnboarding()}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg border border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPreferencesModal}
              className="min-h-[44px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Choose Interests
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Your Interests & Personalized Recommendations Panel */}
      {recommendations.isPersonalized && (
        <section className="rounded-xl border border-sky-500/35 bg-slate-900/55 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 tabular-nums">
                <span className="text-sky-400 font-medium">Your Interests</span>
                {experienceOption && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{experienceOption.label}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  Shared Foundations (Stages 1–3): {recommendations.foundationCompletedCount}/
                  {recommendations.foundationTotalCount} complete
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-100">
                {recommendations.selectedPathways.map((p) => p.title).join(' · ')}
              </h3>

              {learningProfile?.goals && learningProfile.goals.trim() && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Goal: {learningProfile.goals}
                </p>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Stages 1–3 build shared computer, networking, and security skills for every role. All 11 tiers, 76 lessons, and 4 capstones stay accessible—you can change interests anytime.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenPreferencesModal && (
                <button
                  type="button"
                  onClick={onOpenPreferencesModal}
                  className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Change Interests
                </button>
              )}
              {onClearInterests && (
                <button
                  type="button"
                  onClick={() => void onClearInterests()}
                  className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Clear Selections
                </button>
              )}
            </div>
          </div>

          {/* Unlocked Recommended Next Steps */}
          {recommendations.recommendedNextActions.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-200">
                  Recommended Next Steps (Unlocked &amp; Ready)
                </h4>
                <span className="text-xs text-slate-400">
                  Selected strictly from unlocked, uncompleted lessons
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.recommendedNextActions.map((act) => (
                  <div
                    key={act.lesson.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/65 p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 tabular-nums">
                        <span className="font-mono text-sky-400">Stage {act.stageOrder}</span>
                        <span aria-hidden="true">·</span>
                        <span>{act.journeyTopicTitle}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-100">{act.lesson.title}</div>
                      <p className="text-xs text-slate-400 leading-relaxed">{act.reason}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLaunchLesson(act.lesson.id)}
                      className="min-h-[40px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors self-start whitespace-nowrap shrink-0"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Start Lesson
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matching Stage 4/5 Topics & Capstones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
            {recommendations.recommendedTopics.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-200">
                  Recommended Topics in Your Journey
                </h4>
                <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800/80 bg-slate-950/55 overflow-hidden">
                  {recommendations.recommendedTopics.slice(0, 5).map((item) => (
                    <button
                      key={item.topic.id}
                      type="button"
                      onClick={() =>
                        setOpenedTopic({ stageId: item.stageId, topicId: item.topic.id })
                      }
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-900/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-sky-400 shrink-0">{item.topic.code}</span>
                          <span className="font-medium text-slate-100 truncate">
                            {item.topic.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {item.completedCount}/{item.totalCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {recommendations.recommendedCapstones.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Matching Guided Capstones
                    </h4>
                    <button
                      type="button"
                      onClick={onOpenCapstones}
                      className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0"
                    >
                      Open Capstones
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recommendations.recommendedCapstones.map((cap) => (
                      <div
                        key={cap.reference.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/55 p-3 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 tabular-nums">
                          <span className="font-mono text-sky-400">
                            Capstone {cap.reference.code} · {cap.pathwayTitles.join(' & ')}
                          </span>
                          <span
                            className={
                              cap.completed
                                ? 'text-emerald-400 font-medium'
                                : cap.ready
                                ? 'text-sky-300 font-medium'
                                : 'text-amber-300'
                            }
                          >
                            {cap.completed
                              ? 'Completed'
                              : cap.ready
                              ? 'Ready to Attempt'
                              : `${cap.missingPrerequisites.length} prereq remaining`}
                          </span>
                        </div>
                        <div className="font-medium text-slate-100">{cap.reference.title}</div>
                        {!cap.ready && cap.missingPrerequisites.length > 0 && (
                          <p className="text-[11px] text-slate-400">
                            Requires: {cap.missingPrerequisites.map((m) => m.title).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.lockedPathwayTargets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    Upcoming Pathway Modules (Locked Until Prerequisites Complete)
                  </h4>
                  <div className="space-y-1.5">
                    {recommendations.lockedPathwayTargets.slice(0, 3).map((target) => (
                      <div
                        key={target.lesson.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/45 px-3 py-2 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-200 truncate">
                            {target.lesson.title}
                          </span>
                          <span className="text-[11px] font-mono text-amber-300 shrink-0">
                            Stage {target.stageOrder} · Locked
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Requires:{' '}
                          {target.missingPrerequisites.map((p) => p.title).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Specialist Pathways Explorer (Presentation-Layer Discovery across Stages) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Compass className="h-4 w-4 text-sky-400" />
              Specialist Pathways
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a role pathway to preview its foundations, Stage 4 exploration, Stage 5 specialization, capstones, and highlight matching topics below.
            </p>
          </div>
          {selectedPathwayId && (
            <button
              type="button"
              onClick={() => setSelectedPathwayId(null)}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              Clear Pathway Filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {SPECIALIST_PATHWAYS.map((pathway) => {
            const pStats = computePathwayStats(
              pathway,
              curriculum,
              labsByLesson,
              progress,
              capstoneProgress
            );
            const isSelected = selectedPathwayId === pathway.id;
            const isUserInterest = recommendations.highlightedPathwayIds.has(pathway.id);

            return (
              <button
                key={pathway.id}
                type="button"
                onClick={() => setSelectedPathwayId(isSelected ? null : pathway.id)}
                aria-pressed={isSelected}
                className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-slate-100'
                    : isUserInterest
                    ? 'bg-sky-500/10 border-sky-500/50 text-slate-100 hover:border-sky-400'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                <span className="text-xs font-medium">{pathway.title}</span>
                {isUserInterest && (
                  <span className="ml-1.5 text-[11px] font-medium text-sky-300">
                    · Interest
                  </span>
                )}
                <span className="ml-2 text-[11px] font-mono tabular-nums text-slate-400">
                  {pStats.completedLessons}/{pStats.totalLessons}
                </span>
              </button>
            );
          })}
        </div>

        {selectedPathwayStats && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 tabular-nums">
                  <span className="text-sky-400 font-medium">
                    {selectedPathwayStats.pathway.roleTitle}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{READINESS_LABELS[selectedPathwayStats.pathway.readinessStatus]}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedPathwayStats.completedLessons}/{selectedPathwayStats.totalLessons}{' '}
                    pathway lessons ({selectedPathwayStats.percent}%)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatEstimatedDuration(selectedPathwayStats.totalMinutes)} total</span>
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-slate-100">
                  {selectedPathwayStats.pathway.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {selectedPathwayStats.pathway.purpose}
                </p>
              </div>

              {selectedPathwayStats.nextRecommendedLessonId && (
                <button
                  type="button"
                  onClick={() => onLaunchLesson(selectedPathwayStats.nextRecommendedLessonId!)}
                  className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Open Pathway Next Step
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  selectedPathwayStats.percent === 100 ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
                style={{ width: `${selectedPathwayStats.percent}%` }}
              />
            </div>

            {selectedPathwayStats.pathway.authorizedOnlyNotice && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-200 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{selectedPathwayStats.pathway.authorizedOnlyNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-200">
                  Shared Foundations ({selectedPathwayStats.pathway.sharedFoundationLessonIds.length})
                </p>
                <ul className="space-y-1 text-slate-400">
                  {selectedPathwayStats.pathway.sharedFoundationLessonIds.map((id) => (
                    <li key={id} className="truncate">
                      • {lessonIndex.get(id)?.lesson.title || id}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-slate-200">
                  Stage 4 Domain Intro ({selectedPathwayStats.pathway.stage4IntroLessonIds.length})
                </p>
                <ul className="space-y-1 text-slate-400">
                  {selectedPathwayStats.pathway.stage4IntroLessonIds.map((id) => (
                    <li key={id} className="truncate">
                      • {lessonIndex.get(id)?.lesson.title || id}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-slate-200">
                  Stage 5 Advanced ({selectedPathwayStats.pathway.stage5AdvancedLessonIds.length})
                </p>
                {selectedPathwayStats.pathway.stage5AdvancedLessonIds.length > 0 ? (
                  <ul className="space-y-1 text-slate-400">
                    {selectedPathwayStats.pathway.stage5AdvancedLessonIds.map((id) => (
                      <li key={id} className="truncate">
                        • {lessonIndex.get(id)?.lesson.title || id}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 leading-relaxed">
                    Role core concludes via Stage 4 operational modules and Guided Capstone synthesis.
                  </p>
                )}
              </div>
            </div>

            {(selectedPathwayStats.pathway.capstoneIds.length > 0 ||
              selectedPathwayStats.pathway.missingFutureTopics.length > 0) && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 text-slate-400">
                  {selectedPathwayStats.pathway.capstoneIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-slate-300">
                      <Briefcase className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      <span>Capstones:</span>
                      {selectedPathwayStats.pathway.capstoneIds.map((cId) => {
                        const ref = JOURNEY_CAPSTONE_REFERENCES.find((r) => r.id === cId);
                        const done = Boolean(capstoneProgress[cId]?.completedAt);
                        return (
                          <button
                            key={cId}
                            type="button"
                            onClick={onOpenCapstones}
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline underline-offset-2"
                          >
                            {ref ? `Capstone ${ref.code}` : cId}
                            {done && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedPathwayStats.pathway.missingFutureTopics.map((gap) => (
                    <p key={gap} className="text-slate-400">
                      {gap}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Five-Stage Journey Timeline */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100">
            Five-Stage Learning Timeline
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div>
          {stageStatsList.map((stageStats, idx) => (
            <StageCard
              key={stageStats.stage.id}
              stageStats={stageStats}
              isExpanded={expandedStageIds.has(stageStats.stage.id)}
              onToggleExpand={handleToggleStage}
              onSelectTopic={(stageId, topicId) => setOpenedTopic({ stageId, topicId })}
              onLaunchLesson={onLaunchLesson}
              onOpenCapstones={onOpenCapstones}
              capstoneProgress={capstoneProgress}
              highlightedTopicIds={highlightedTopicIds}
              highlightLabel={activeHighlightStageLabel}
              isLastStage={idx === stageStatsList.length - 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

