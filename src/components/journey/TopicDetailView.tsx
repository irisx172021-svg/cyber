import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  HelpCircle,
  Lock,
  Play,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { PracticalLab, Tier, UserProgress } from '../../types';
import {
  formatEstimatedDuration,
  JourneyStageProgressStats,
  JourneyTopicProgressStats,
} from '../../lib/journeyProgress';
import {
  getCanonicalCompletedSet,
  getMissingPrerequisites,
  getRecommendedPrerequisiteInfos,
  indexCurriculumLessons,
  isLessonUnlocked,
} from '../../lib/curriculumProgress';

interface TopicDetailViewProps {
  curriculum: Tier[];
  labsByLesson: Record<string, PracticalLab>;
  progress: UserProgress;
  stageStats: JourneyStageProgressStats;
  topicStats: JourneyTopicProgressStats;
  onBackToJourney: () => void;
  onLaunchLesson: (lessonId: string) => void;
  highlightedLessonIds?: Set<string>;
  highlightLabel?: string;
}

const LAB_KIND_LABELS: Record<PracticalLab['kind'], string> = {
  diagram: 'Interactive Diagram',
  terminal: 'Simulated Terminal',
  log_investigation: 'Log Investigation',
  scenario: 'Security Scenario Audit',
};

export default function TopicDetailView({
  curriculum,
  labsByLesson,
  progress,
  stageStats,
  topicStats,
  onBackToJourney,
  onLaunchLesson,
  highlightedLessonIds,
  highlightLabel = 'In Selected Pathway',
}: TopicDetailViewProps) {
  const [expandedObjectivesId, setExpandedObjectivesId] = useState<string | null>(null);

  const lessonIndex = React.useMemo(() => indexCurriculumLessons(curriculum), [curriculum]);
  const completedSet = React.useMemo(
    () => getCanonicalCompletedSet(progress, curriculum),
    [progress, curriculum]
  );
  const completedExerciseSet = React.useMemo(
    () => new Set(progress.completedExerciseIds || []),
    [progress.completedExerciseIds]
  );
  const completedQuizSet = React.useMemo(
    () => new Set(progress.completedQuizLessonIds || []),
    [progress.completedQuizLessonIds]
  );

  const { topic } = topicStats;
  const lessons = topic.lessonIds
    .map((id) => lessonIndex.get(id)?.lesson)
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const nextActivityLesson = React.useMemo(() => {
    for (const l of lessons) {
      if (!completedSet.has(l.id) && isLessonUnlocked(l, progress, curriculum)) {
        return l;
      }
    }
    for (const l of lessons) {
      if (isLessonUnlocked(l, progress, curriculum)) {
        return l;
      }
    }
    return lessons[0] || null;
  }, [lessons, completedSet, progress, curriculum]);

  const nextActivityUnlocked = nextActivityLesson
    ? isLessonUnlocked(nextActivityLesson, progress, curriculum)
    : false;
  const nextActivityMissing =
    nextActivityLesson && !nextActivityUnlocked
      ? getMissingPrerequisites(nextActivityLesson, progress, curriculum)
      : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <button
          type="button"
          onClick={onBackToJourney}
          className="min-h-[44px] sm:min-h-[34px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 hover:text-slate-100 text-slate-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Journey
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" aria-hidden="true" />
        <button
          type="button"
          onClick={onBackToJourney}
          className="hover:text-sky-400 transition-colors text-left"
        >
          Stage {stageStats.stage.order}: {stageStats.stage.title}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" aria-hidden="true" />
        <span className="text-slate-200 font-medium">
          {topic.code} {topic.title}
        </span>
      </nav>

      {/* Topic Header & Next Activity Card */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 tabular-nums">
              <span className="text-sky-400 font-medium">
                Stage {stageStats.stage.order} · Topic {topic.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {topicStats.allCompleted} of {topicStats.allTotal} lessons completed (
                {topicStats.percent}%)
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatEstimatedDuration(topicStats.totalMinutes)} total</span>
              {topic.isOptionalGroup && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">Optional practice track</span>
                </>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
              {topic.title}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">{topic.description}</p>
          </div>

          {nextActivityLesson && (
            <div className="shrink-0">
              {nextActivityUnlocked ? (
                <button
                  type="button"
                  onClick={() => onLaunchLesson(nextActivityLesson.id)}
                  className="w-full lg:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {completedSet.has(nextActivityLesson.id)
                    ? 'Review Topic Lesson'
                    : 'Recommended Next Activity'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                nextActivityMissing[0] && (
                  <button
                    type="button"
                    onClick={() => onLaunchLesson(nextActivityMissing[0].id)}
                    className="w-full lg:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-950/30 hover:bg-amber-950/50 text-amber-200 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap shrink-0"
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    Unlock via {nextActivityMissing[0].title}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                topicStats.status === 'completed' ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
              style={{ width: `${topicStats.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 tabular-nums">
            <span>
              {topicStats.labsDoneCount} / {topicStats.labsTotalCount} practical labs completed
            </span>
            <span>
              {topicStats.remainingMinutes > 0
                ? `${formatEstimatedDuration(topicStats.remainingMinutes)} remaining`
                : 'Topic completed'}
            </span>
          </div>
        </div>

        {/* Outcomes & Prerequisite Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-sky-400" />
              Learning Outcomes
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
              {topic.learningOutcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2">
                  <span className="text-sky-400 mt-0.5" aria-hidden="true">
                    •
                  </span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-slate-200">Prerequisites & Next Steps</h4>
            <p className="text-slate-300 leading-relaxed">{topic.prerequisiteNote}</p>
            <p className="text-slate-400 leading-relaxed">{topic.recommendedNextNote}</p>
            {topic.authorizedLabNotice && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-amber-200 flex items-start gap-2 leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{topic.authorizedLabNotice}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ordered Lessons List */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-100">Lessons in Sequence</h4>
          <span className="text-xs text-slate-400 tabular-nums">
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          </span>
        </div>

        <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-900/35 overflow-hidden">
          {lessons.map((lesson, idx) => {
            const isCompleted = completedSet.has(lesson.id);
            const unlocked = isLessonUnlocked(lesson, progress, curriculum);
            const missingPrereqs = unlocked
              ? []
              : getMissingPrerequisites(lesson, progress, curriculum);
            const recommendedInfos = getRecommendedPrerequisiteInfos(
              lesson,
              progress,
              curriculum
            ).filter((r) => !r.completed);
            const lab = labsByLesson[lesson.id];
            const isLabDone = lab ? completedExerciseSet.has(lab.id) : false;
            const isQuizDone = completedQuizSet.has(lesson.id);
            const objectives = lesson.learningObjectives || [];
            const isObjOpen = expandedObjectivesId === lesson.id;
            const isPathwayMatch = highlightedLessonIds?.has(lesson.id) ?? false;
            const isEarlyStage5Unlocked =
              stageStats.stage.order === 5 && unlocked && !isCompleted && stageStats.status !== 'completed';

            return (
              <div
                key={lesson.id}
                className={`p-4 sm:p-5 space-y-3 transition-colors ${
                  unlocked ? 'hover:bg-slate-900/65' : 'bg-slate-950/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Completed" />
                      ) : unlocked ? (
                        <Play className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-label="Unlocked" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="Locked" />
                      )}
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <h5 className="text-sm sm:text-base font-medium text-slate-100">
                        {lesson.title}
                      </h5>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
                      {lesson.description}
                    </p>

                    {/* Unboxed Clean Metadata Line */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-6 text-xs text-slate-400 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : lesson.duration}
                      </span>
                      {lesson.difficulty && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize text-slate-300">{lesson.difficulty}</span>
                        </>
                      )}
                      {lesson.required === false && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300">Optional</span>
                        </>
                      )}
                      {isPathwayMatch && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-300 font-medium">{highlightLabel}</span>
                        </>
                      )}
                      {isEarlyStage5Unlocked && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-300 font-medium">Prerequisites Met Early</span>
                        </>
                      )}
                    </div>

                    {/* Practical Lab & Quiz Indicators */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs tabular-nums">
                      {lab && (
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            isLabDone ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {LAB_KIND_LABELS[lab.kind]} Lab ({isLabDone ? 'Completed' : `+${lab.xpReward} XP`})
                          </span>
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          isQuizDone ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Quiz ({lesson.quiz.length} questions ·{' '}
                          {isQuizDone ? 'Passed' : `+${lesson.quiz.length * 100} XP`})
                        </span>
                      </span>
                    </div>

                    {/* Missing Prerequisites Links */}
                    {!unlocked && missingPrereqs.length > 0 && (
                      <div className="pl-6 pt-1 flex flex-wrap items-center gap-2 text-xs text-amber-300">
                        <span>Requires completion of:</span>
                        {missingPrereqs.map((prereq) => (
                          <button
                            key={prereq.id}
                            type="button"
                            onClick={() => onLaunchLesson(prereq.id)}
                            className="inline-flex items-center gap-1 text-amber-200 underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                          >
                            {prereq.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {unlocked && recommendedInfos.length > 0 && (
                      <p className="pl-6 text-xs text-slate-400">
                        Recommended before starting (optional):{' '}
                        {recommendedInfos.map((r) => r.title).join(', ')}
                      </p>
                    )}

                    {/* Expandable Learning Objectives */}
                    {objectives.length > 0 && (
                      <div className="pl-6 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedObjectivesId(isObjOpen ? null : lesson.id)
                          }
                          aria-expanded={isObjOpen}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
                        >
                          {isObjOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isObjOpen ? 'Hide' : 'Show'} learning objectives ({objectives.length})
                          </span>
                        </button>
                        {isObjOpen && (
                          <ul className="mt-2 space-y-1 text-xs text-slate-300 leading-relaxed">
                            {objectives.map((obj) => (
                              <li key={obj} className="flex items-start gap-2">
                                <span className="text-sky-400" aria-hidden="true">
                                  •
                                </span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Single Primary Action */}
                  <div className="pl-6 sm:pl-0 shrink-0">
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => onLaunchLesson(lesson.id)}
                        className={`min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0 ${
                          isCompleted
                            ? 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold'
                        }`}
                      >
                        {isCompleted ? 'Review Lesson' : 'Start Lesson'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      missingPrereqs[0] && (
                        <button
                          type="button"
                          onClick={() => onLaunchLesson(missingPrereqs[0].id)}
                          title={`Complete "${missingPrereqs[0].title}" first to unlock`}
                          className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-amber-500/35 bg-amber-950/20 hover:bg-amber-950/40 text-amber-200 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap shrink-0"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Go to Prerequisite
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
