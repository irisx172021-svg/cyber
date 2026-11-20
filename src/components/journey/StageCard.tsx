import React from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  FlaskConical,
  Lock,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { CapstoneProgressMap } from '../../types';
import { JOURNEY_CAPSTONE_REFERENCES } from '../../data/journeyBlueprint';
import {
  formatEstimatedDuration,
  JourneyStageProgressStats,
  JourneyStageStatus,
  JourneyTopicProgressStats,
} from '../../lib/journeyProgress';

interface StageCardProps {
  stageStats: JourneyStageProgressStats;
  isExpanded: boolean;
  onToggleExpand: (stageId: string) => void;
  onSelectTopic: (stageId: string, topicId: string) => void;
  onLaunchLesson: (lessonId: string) => void;
  onOpenCapstones?: () => void;
  capstoneProgress?: CapstoneProgressMap;
  highlightedTopicIds?: Set<string>;
  highlightLabel?: string;
  isLastStage?: boolean;
}

const STATUS_DISPLAY: Record<
  JourneyStageStatus,
  { label: string; textClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  completed: {
    label: 'Completed',
    textClass: 'text-emerald-400',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'In Progress',
    textClass: 'text-sky-400',
    icon: Play,
  },
  available: {
    label: 'Ready to Explore',
    textClass: 'text-slate-200',
    icon: Compass,
  },
  locked_preview: {
    label: 'Upcoming Preview',
    textClass: 'text-amber-300',
    icon: Eye,
  },
};

export default function StageCard({
  stageStats,
  isExpanded,
  onToggleExpand,
  onSelectTopic,
  onLaunchLesson,
  onOpenCapstones,
  capstoneProgress = {},
  highlightedTopicIds,
  highlightLabel = 'Pathway Focus',
  isLastStage = false,
}: StageCardProps) {
  const { stage, status } = stageStats;
  const statusMeta = STATUS_DISPLAY[status];
  const StatusIcon = statusMeta.icon;
  const panelId = `stage-panel-${stage.id}`;
  const stageCapstones = JOURNEY_CAPSTONE_REFERENCES.filter((c) => c.stageId === stage.id);

  const hasHighlightedTopic = stage.topics.some((t) => highlightedTopicIds?.has(t.id));

  const renderTopicStatusText = (t: JourneyTopicProgressStats) => {
    if (t.status === 'completed') return 'Completed';
    if (t.status === 'in_progress') return 'In Progress';
    if (t.status === 'available') return `${t.unlockedCount} unlocked`;
    return 'Preview Only';
  };

  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Vertical Timeline Spine */}
      <div className="hidden sm:flex flex-col items-center shrink-0 pt-6" aria-hidden="true">
        <div
          className={`h-9 w-9 rounded-full border flex items-center justify-center font-mono text-xs font-semibold tabular-nums transition-colors ${
            status === 'completed'
              ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
              : status === 'in_progress'
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : status === 'available'
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-slate-950 border-slate-800 text-slate-500'
          }`}
        >
          {status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : stage.order}
        </div>
        {!isLastStage && <div className="w-px flex-1 bg-slate-800/80 my-2" />}
      </div>

      {/* Stage Container (Single Elevation) */}
      <article
        className={`flex-1 rounded-xl border transition-colors ${
          status === 'in_progress'
            ? 'border-sky-500/45 bg-slate-900/60'
            : hasHighlightedTopic
            ? 'border-sky-500/35 bg-slate-900/50'
            : 'border-slate-800/85 bg-slate-900/40'
        } ${!isLastStage ? 'mb-5' : ''}`}
      >
        {/* Expand/Collapse Trigger Header */}
        <button
          type="button"
          onClick={() => onToggleExpand(stage.id)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="w-full text-left p-5 sm:p-6 flex flex-col gap-3 rounded-xl hover:bg-slate-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              {/* Unboxed Kicker & Real Status Metadata */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
                <span className="font-mono text-sky-400 font-medium">
                  Stage {stage.order} of 5
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className={`inline-flex items-center gap-1 font-medium ${statusMeta.textClass}`}>
                  <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                  {statusMeta.label}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-300">
                  {stageStats.coreCompleted}/{stageStats.coreTotal} core lessons
                  {stageStats.optionalTotal > 0 ? ` (+${stageStats.optionalTotal} optional)` : ''}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  {stageStats.remainingMinutes > 0
                    ? `${formatEstimatedDuration(stageStats.remainingMinutes)} left`
                    : `${formatEstimatedDuration(stageStats.totalMinutes)} complete`}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-100">
                {stage.title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {stage.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 pt-1">
              <span className="text-xs font-mono tabular-nums text-slate-300 hidden sm:inline">
                {stageStats.corePercent}%
              </span>
              <span className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 text-slate-300">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            </div>
          </div>

          {/* Subtle Progress Bar */}
          <div className="h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === 'completed' ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
              style={{ width: `${stageStats.corePercent}%` }}
            />
          </div>

          {/* Collapsed Upcoming Topic Preview */}
          {!isExpanded && (
            <p className="text-xs text-slate-400 leading-relaxed">
              Topics: {stage.topics.map((t) => `${t.code} ${t.title}`).join(' · ')}
            </p>
          )}
        </button>

        {/* Expanded Stage Body */}
        {isExpanded && (
          <div
            id={panelId}
            className="px-5 pb-6 sm:px-6 pt-2 border-t border-slate-800/80 space-y-6"
          >
            {/* Purpose & Outcomes Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-200">Stage Purpose</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {stage.purpose}
                </p>

                <div className="pt-2 space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-200">Prerequisites</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {stage.prerequisiteExplanation}
                  </p>
                  {status === 'locked_preview' &&
                    stageStats.nextMissingPrerequisites.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-amber-300">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>Preview mode active. Unlock via:</span>
                        {stageStats.nextMissingPrerequisites.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onLaunchLesson(p.id)}
                            className="text-amber-200 underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-200">
                  By completing this stage, you will understand:
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {stage.learningOutcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80 shrink-0 mt-1" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Topic List */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-200">
                  Topics in Stage {stage.order}
                </h4>
                <span className="text-xs text-slate-400 tabular-nums">
                  {stage.topics.length} {stage.topics.length === 1 ? 'topic' : 'topics'}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                {stageStats.topicStats.map((tStats) => {
                  const isHighlighted = highlightedTopicIds?.has(tStats.topic.id) ?? false;
                  return (
                    <button
                      key={tStats.topic.id}
                      type="button"
                      onClick={() => onSelectTopic(stage.id, tStats.topic.id)}
                      className={`w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 ${
                        isHighlighted
                          ? 'bg-sky-500/10 hover:bg-sky-500/15'
                          : 'hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono text-xs text-sky-400 tabular-nums">
                            {tStats.topic.code}
                          </span>
                          <span className="text-sm font-medium text-slate-100">
                            {tStats.topic.title}
                          </span>
                          {tStats.topic.isOptionalGroup && (
                            <span className="text-xs text-slate-400">(Optional)</span>
                          )}
                          {isHighlighted && (
                            <span className="text-xs text-sky-300 font-medium">
                              · {highlightLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {tStats.topic.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 tabular-nums pt-0.5">
                          <span
                            className={
                              tStats.status === 'completed'
                                ? 'text-emerald-400 font-medium'
                                : tStats.status === 'locked_preview'
                                ? 'text-amber-300'
                                : 'text-slate-300'
                            }
                          >
                            {renderTopicStatusText(tStats)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {tStats.allCompleted}/{tStats.allTotal} lessons ({tStats.percent}%)
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <FlaskConical className="h-3 w-3 text-sky-400" />
                            {tStats.labsDoneCount}/{tStats.labsTotalCount} labs
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatEstimatedDuration(tStats.totalMinutes)}</span>
                          {tStats.topic.authorizedLabNotice && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <ShieldAlert className="h-3 w-3" />
                                Authorized Lab Scope
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                          <div
                            className={`h-full rounded-full ${
                              tStats.status === 'completed' ? 'bg-emerald-400' : 'bg-sky-400'
                            }`}
                            style={{ width: `${tStats.percent}%` }}
                          />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 whitespace-nowrap shrink-0">
                          Open Topic
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Capstone Synthesis Projects */}
            {stageCapstones.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-sky-400" />
                    Applied Guided Capstones
                  </h4>
                  {onOpenCapstones && (
                    <button
                      type="button"
                      onClick={onOpenCapstones}
                      className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      Open Capstones Workspace
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stageCapstones.map((cap) => {
                    const capDone = Boolean(capstoneProgress[cap.id]?.completedAt);
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={onOpenCapstones}
                        className="text-left rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-900 hover:border-slate-700 p-3.5 space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                          <span className="font-mono text-sky-400">Capstone {cap.code}</span>
                          <span className={capDone ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                            {capDone ? 'Completed' : 'Multi-Stage Project'}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-slate-100">
                          {cap.title}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{cap.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
