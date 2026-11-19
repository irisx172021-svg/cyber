import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileCode2,
  Crosshair,
  AlertTriangle,
  XCircle,
  BookOpen,
  ClipboardCheck,
  Award,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import {
  CapstoneProject,
  CapstoneProgressMap,
  CapstoneStageCheckResponse,
  CapstoneSubmitResponse,
  Tier,
  User,
  UserProgress,
} from '../types';
import {
  apiGetCapstones,
  apiSubmitCapstoneReport,
  apiSubmitCapstoneStageCheck,
  apiVerifyCapstoneEvidence,
} from '../lib/api';
import { getCanonicalCompletedSet } from '../lib/curriculumProgress';

interface CapstonesProps {
  curriculum: Tier[];
  user: User;
  progress: UserProgress;
  capstoneProgress: CapstoneProgressMap;
  onCapstoneStateUpdate: (payload: {
    user?: User;
    progress?: UserProgress;
    capstoneProgress?: CapstoneProgressMap;
  }) => void;
  onOpenLesson: (lessonId: string) => void;
}

export default function Capstones({
  curriculum,
  progress,
  capstoneProgress,
  onCapstoneStateUpdate,
  onOpenLesson,
}: CapstonesProps) {
  const [capstones, setCapstones] = useState<CapstoneProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCapstoneId, setSelectedCapstoneId] = useState<string>('capstone-soc-investigation');
  const [activeStageId, setActiveStageId] = useState<string>('');

  const [selectedLinesByArtifact, setSelectedLinesByArtifact] = useState<Record<string, number[]>>({});
  const [verifyingArtifactId, setVerifyingArtifactId] = useState<string | null>(null);
  const [evidenceMessages, setEvidenceMessages] = useState<
    Record<string, { verified: boolean; message: string }>
  >({});

  const [selectedStageOption, setSelectedStageOption] = useState<Record<string, number>>({});
  const [submittingStageCheck, setSubmittingStageCheck] = useState<boolean>(false);
  const [stageCheckFeedback, setStageCheckFeedback] = useState<
    Record<string, CapstoneStageCheckResponse>
  >({});
  const [stageCheckError, setStageCheckError] = useState<string | null>(null);

  const [reportSectionsByCapstone, setReportSectionsByCapstone] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportOutcome, setReportOutcome] = useState<Record<string, CapstoneSubmitResponse>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    apiGetCapstones()
      .then((res) => {
        if (!active) return;
        const list = res.capstones || [];
        setCapstones(list);
        if (list.length > 0) {
          setSelectedCapstoneId((prev) =>
            list.some((c) => c.id === prev) ? prev : list[0].id
          );
        }
        if (res.capstoneProgress) {
          onCapstoneStateUpdate({ capstoneProgress: res.capstoneProgress });
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || 'Unable to load Guided Capstones.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const lessonMetaMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string; tierNumber: number; topicTitle: string }>();
    for (const tier of curriculum) {
      for (const topic of tier.topics) {
        for (const lesson of topic.lessons) {
          map.set(lesson.id, {
            id: lesson.id,
            title: lesson.title,
            tierNumber: tier.number,
            topicTitle: topic.title,
          });
        }
      }
    }
    return map;
  }, [curriculum]);

  const completedLessonSet = useMemo(
    () => getCanonicalCompletedSet(progress, curriculum),
    [progress, curriculum]
  );

  const activeCapstone = useMemo(
    () => capstones.find((c) => c.id === selectedCapstoneId) || capstones[0] || null,
    [capstones, selectedCapstoneId]
  );

  const activeProgress = activeCapstone ? capstoneProgress[activeCapstone.id] : undefined;

  useEffect(() => {
    if (!activeCapstone) return;
    const preferredStage =
      activeProgress?.currentStageId &&
      activeCapstone.stages.some((s) => s.id === activeProgress.currentStageId)
        ? activeProgress.currentStageId
        : activeCapstone.stages[0]?.id || '';
    setActiveStageId(preferredStage);
    setStageCheckError(null);
    setReportError(null);
  }, [activeCapstone?.id]);

  // Hydrate deliverable editor from persisted submission once available
  useEffect(() => {
    if (!activeCapstone) return;
    if (activeProgress?.lastSubmissionSections) {
      setReportSectionsByCapstone((prev) => {
        if (prev[activeCapstone.id]) return prev;
        return {
          ...prev,
          [activeCapstone.id]: { ...activeProgress.lastSubmissionSections },
        };
      });
    }
  }, [activeCapstone?.id, activeProgress?.lastSubmissionSections]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-400 bg-slate-950">
        Loading Guided Capstones...
      </div>
    );
  }

  if (loadError || !activeCapstone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center bg-slate-950">
        <p className="text-sm text-rose-300">{loadError || 'Capstones unavailable.'}</p>
      </div>
    );
  }

  const missingPrereqs = activeCapstone.prerequisiteLessonIds.filter(
    (id) => !completedLessonSet.has(id)
  );
  const isUnlocked = missingPrereqs.length === 0;

  const activeStage =
    activeCapstone.stages.find((s) => s.id === activeStageId) || activeCapstone.stages[0];

  const allStagesComplete = activeCapstone.stages.every((st) => {
    const stProg = activeProgress?.stages?.[st.id];
    return Boolean(stProg?.evidenceVerified && stProg?.knowledgeCheckPassed);
  });

  const currentSections = reportSectionsByCapstone[activeCapstone.id] || {};
  const totalSectionChars = activeCapstone.deliverableTemplate.sections.reduce(
    (sum, sec) => sum + (currentSections[sec.key] || '').trim().length,
    0
  );

  const activeReportOutcome = reportOutcome[activeCapstone.id];
  const rubricBreakdown =
    activeReportOutcome?.rubricBreakdown || activeProgress?.rubricBreakdown || null;
  const unlockedWalkthrough =
    activeReportOutcome?.detailedSolutionExplanation ||
    activeProgress?.detailedSolutionExplanation ||
    null;
  const isCapstonePassed = Boolean(activeProgress?.completedAt || activeReportOutcome?.passed);

  const handleToggleArtifactLine = (artifactId: string, lineNumber: number, targetCount: number) => {
    if (!isUnlocked || verifyingArtifactId === artifactId) return;
    setEvidenceMessages((prev) => {
      if (!prev[artifactId] || prev[artifactId].verified) return prev;
      const next = { ...prev };
      delete next[artifactId];
      return next;
    });
    setSelectedLinesByArtifact((prev) => {
      const existing = prev[artifactId] || [];
      if (existing.includes(lineNumber)) {
        return { ...prev, [artifactId]: existing.filter((n) => n !== lineNumber) };
      }
      if (targetCount === 1) {
        return { ...prev, [artifactId]: [lineNumber] };
      }
      if (targetCount > 0 && existing.length >= targetCount) {
        return prev;
      }
      return { ...prev, [artifactId]: [...existing, lineNumber].sort((a, b) => a - b) };
    });
  };

  const handleVerifyEvidence = async (artifactId: string) => {
    if (!activeStage || !isUnlocked) return;
    const selected = selectedLinesByArtifact[artifactId] || [];
    if (selected.length === 0) return;

    setVerifyingArtifactId(artifactId);
    try {
      const res = await apiVerifyCapstoneEvidence(
        activeCapstone.id,
        activeStage.id,
        artifactId,
        selected
      );
      setEvidenceMessages((prev) => ({
        ...prev,
        [artifactId]: { verified: res.verified, message: res.message },
      }));
      onCapstoneStateUpdate({
        user: res.user,
        progress: res.progress,
        capstoneProgress: {
          ...capstoneProgress,
          [activeCapstone.id]: res.capstoneProgress,
        },
      });
    } catch (err: any) {
      setEvidenceMessages((prev) => ({
        ...prev,
        [artifactId]: {
          verified: false,
          message: err?.message || 'Unable to verify selected artifact lines.',
        },
      }));
    } finally {
      setVerifyingArtifactId(null);
    }
  };

  const handleSubmitStageCheck = async () => {
    if (!activeStage || !isUnlocked || submittingStageCheck) return;
    const chosen = selectedStageOption[activeStage.id];
    if (typeof chosen !== 'number') return;

    setSubmittingStageCheck(true);
    setStageCheckError(null);
    try {
      const res = await apiSubmitCapstoneStageCheck(activeCapstone.id, activeStage.id, chosen);
      setStageCheckFeedback((prev) => ({
        ...prev,
        [activeStage.id]: res,
      }));
      onCapstoneStateUpdate({
        user: res.user,
        progress: res.progress,
        capstoneProgress: {
          ...capstoneProgress,
          [activeCapstone.id]: res.capstoneProgress,
        },
      });
    } catch (err: any) {
      setStageCheckError(err?.message || 'Unable to submit stage knowledge check.');
    } finally {
      setSubmittingStageCheck(false);
    }
  };

  const handleSectionChange = (key: string, value: string) => {
    setReportError(null);
    setReportSectionsByCapstone((prev) => ({
      ...prev,
      [activeCapstone.id]: {
        ...(prev[activeCapstone.id] || {}),
        [key]: value,
      },
    }));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked || !allStagesComplete || submittingReport) return;
    setSubmittingReport(true);
    setReportError(null);
    try {
      const payload: Record<string, string> = {};
      for (const sec of activeCapstone.deliverableTemplate.sections) {
        payload[sec.key] = currentSections[sec.key] || '';
      }
      const res = await apiSubmitCapstoneReport(activeCapstone.id, payload);
      setReportOutcome((prev) => ({
        ...prev,
        [activeCapstone.id]: res,
      }));
      onCapstoneStateUpdate({
        user: res.user,
        progress: res.progress,
        capstoneProgress: {
          ...capstoneProgress,
          [activeCapstone.id]: res.capstoneProgress,
        },
      });
    } catch (err: any) {
      setReportError(err?.message || 'Unable to evaluate final capstone deliverable.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const activeStageProgress = activeStage ? activeProgress?.stages?.[activeStage.id] : undefined;
  const activeStageFeedback = activeStage ? stageCheckFeedback[activeStage.id] : undefined;
  const completedCapstonesCount = capstones.filter((c) => Boolean(capstoneProgress[c.id]?.completedAt)).length;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Optional Applied Synthesis
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Guided Capstones
            </h2>
            <p className="text-sm text-slate-400">
              Multi-stage real-world investigations combining defensive triage, code review, cloud logs, and incident reporting.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-300 shrink-0">
            Completed {completedCapstonesCount} / {capstones.length}
          </div>
        </div>

        {/* Capstone Selector Grid (4 Capstones) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {capstones.map((cap) => {
            const isSelected = cap.id === activeCapstone.id;
            const capProg = capstoneProgress[cap.id];
            const capDone = Boolean(capProg?.completedAt);
            const capLocked = cap.prerequisiteLessonIds.some((id) => !completedLessonSet.has(id));
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setSelectedCapstoneId(cap.id)}
                className={`min-h-[84px] text-left rounded-xl border p-4 transition-colors space-y-2 ${
                  isSelected
                    ? 'bg-slate-900 border-sky-500/60 text-slate-100'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-sky-400 font-semibold">Capstone {cap.code}</span>
                  {capDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : capLocked ? (
                    <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <span className="text-slate-400">+{cap.xpReward} XP</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">
                  {cap.title}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {cap.difficulty} · ~{cap.estimatedMinutes} min
                </div>
              </button>
            );
          })}
        </div>

        {/* Component 1 & 2 & 3: Overview, Objectives, Prerequisites & Recommended Lessons */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span className="text-sky-400 font-medium">Capstone {activeCapstone.code}</span>
                <span>·</span>
                <span>{activeCapstone.roleTitle}</span>
                <span>·</span>
                <span className="capitalize">{activeCapstone.difficulty}</span>
                <span>·</span>
                <span className="font-mono tabular-nums">+{activeCapstone.xpReward} XP deliverable bonus</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-100">{activeCapstone.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {activeCapstone.scenarioOverview}
              </p>
            </div>
            {isCapstonePassed && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/25 text-xs font-semibold text-emerald-300 shrink-0">
                <Award className="h-4 w-4 text-emerald-400" />
                Passed ({activeProgress?.reportScore ?? activeReportOutcome?.score}/
                {activeProgress?.maxReportScore ?? activeReportOutcome?.maxScore})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Learning Objectives */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Investigation Objectives
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeCapstone.objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prerequisites & Recommended Lessons */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Required Prerequisites
                </h4>
                <div className="space-y-1.5">
                  {activeCapstone.prerequisiteLessonIds.map((lessonId) => {
                    const meta = lessonMetaMap.get(lessonId);
                    const done = completedLessonSet.has(lessonId);
                    return (
                      <div
                        key={lessonId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate text-slate-200">
                            {meta ? `Tier ${meta.tierNumber} · ${meta.title}` : lessonId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenLesson(lessonId)}
                          className="text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap shrink-0"
                        >
                          Open Lesson
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeCapstone.recommendedLessonIds.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recommended Prep Lessons
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCapstone.recommendedLessonIds.map((lessonId) => {
                      const meta = lessonMetaMap.get(lessonId);
                      return (
                        <button
                          key={lessonId}
                          type="button"
                          onClick={() => onOpenLesson(lessonId)}
                          className="min-h-[34px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-800 bg-slate-950/70 hover:bg-slate-800 text-xs text-slate-300"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          <span>{meta?.title || lessonId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Component 4: Background Briefing */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Background Briefing
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {activeCapstone.backgroundBriefing}
            </p>
          </div>

          {!isUnlocked && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3 text-xs text-amber-200">
              <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">
                  Complete the {missingPrereqs.length} missing prerequisite lesson
                  {missingPrereqs.length === 1 ? '' : 's'} above to unlock interactive evidence verification and reporting.
                </p>
                <p className="text-amber-200/80 mt-1">
                  You can preview the briefing and investigation outline right now, then click any prerequisite &ldquo;Open Lesson&rdquo; button above to complete it.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Components 5, 6, 7: Multi-Stage Investigation Workspace (supports free stage revisiting) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Guided Investigation Stages
              </h3>
              <p className="text-xs text-slate-400">
                Work stage by stage or click any stage tab below to revisit earlier findings anytime.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-300">
              {
                activeCapstone.stages.filter(
                  (s) =>
                    activeProgress?.stages?.[s.id]?.evidenceVerified &&
                    activeProgress?.stages?.[s.id]?.knowledgeCheckPassed
                ).length
              }{' '}
              / {activeCapstone.stages.length} Stages Complete
            </span>
          </div>

          {/* Stage Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {activeCapstone.stages.map((stage) => {
              const stProg = activeProgress?.stages?.[stage.id];
              const stageDone = Boolean(stProg?.evidenceVerified && stProg?.knowledgeCheckPassed);
              const isActive = activeStage?.id === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    setActiveStageId(stage.id);
                    setStageCheckError(null);
                  }}
                  className={`min-h-[56px] text-left rounded-lg border px-3.5 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-slate-800 border-sky-500/60 text-slate-100'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-sky-400">Stage {stage.order}</span>
                    {stageDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : stProg?.evidenceVerified ? (
                      <span className="text-amber-300">Evidence OK</span>
                    ) : (
                      <span className="text-slate-500">+{stage.xpReward} XP</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold mt-1 line-clamp-1">{stage.title}</div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Body */}
          {activeStage && (
            <div className="space-y-5 pt-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">
                    Stage {activeStage.order}: {activeStage.title}
                  </h4>
                  <span className="text-xs font-mono text-sky-400">+{activeStage.xpReward} XP</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-200">Objective: </span>
                  {activeStage.objective}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{activeStage.guidance}</p>
                <p className="text-xs text-sky-200/90 leading-relaxed pt-1">
                  <span className="font-semibold">Task: </span>
                  {activeStage.practicalTaskPrompt}
                </p>
              </div>

              {/* Evidence Artifacts for Active Stage */}
              <div className="space-y-4">
                {activeStage.evidenceArtifactIds.map((artId) => {
                  const artifact = activeCapstone.evidenceArtifacts.find((a) => a.id === artId);
                  if (!artifact) return null;
                  const lines = artifact.content.split('\n');
                  const targetCount = artifact.targetLineCount || 0;
                  const selected = selectedLinesByArtifact[artifact.id] || [];
                  const alreadyVerified = Boolean(
                    activeStageProgress?.verifiedEvidenceIds?.includes(artifact.id)
                  );
                  const evMsg = evidenceMessages[artifact.id];

                  return (
                    <div key={artifact.id} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200">{artifact.title}</span>
                          <p className="text-slate-400 mt-0.5">{artifact.summary}</p>
                        </div>
                        {targetCount > 0 && (
                          <span className="font-mono tabular-nums text-slate-300 shrink-0">
                            {alreadyVerified
                              ? 'Evidence Verified'
                              : `Selected ${selected.length} / ${targetCount} lines`}
                          </span>
                        )}
                      </div>

                      {artifact.evidenceHints && artifact.evidenceHints.length > 0 && (
                        <div className="rounded-md bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs text-slate-400 flex items-start gap-2">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{artifact.evidenceHints.join(' · ')}</span>
                        </div>
                      )}

                      <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-900/70 text-xs font-mono">
                          <span className="flex items-center gap-2 text-slate-200">
                            <FileCode2 className="h-3.5 w-3.5 text-sky-400" />
                            {artifact.title}
                          </span>
                          {alreadyVerified && (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto py-2.5 text-xs font-mono leading-relaxed">
                          {lines.map((line, idx) => {
                            const lineNumber = idx + 1;
                            const isSelected = selected.includes(lineNumber);
                            const clickable = isUnlocked && !alreadyVerified && targetCount > 0;
                            return (
                              <button
                                key={lineNumber}
                                type="button"
                                disabled={!clickable}
                                onClick={() =>
                                  handleToggleArtifactLine(artifact.id, lineNumber, targetCount)
                                }
                                className={`w-full text-left flex px-3.5 py-0.5 border-l-2 transition-colors ${
                                  isSelected
                                    ? alreadyVerified
                                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                                      : 'bg-sky-500/15 border-sky-400 text-sky-100'
                                    : clickable
                                    ? 'border-transparent text-slate-300 hover:bg-slate-900/90 cursor-pointer'
                                    : 'border-transparent text-slate-300 cursor-default'
                                }`}
                              >
                                <span className="w-8 shrink-0 select-none text-right pr-3 tabular-nums text-slate-500">
                                  {lineNumber}
                                </span>
                                <pre className="whitespace-pre">{line || ' '}</pre>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!alreadyVerified && targetCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={
                              !isUnlocked ||
                              verifyingArtifactId === artifact.id ||
                              selected.length !== targetCount
                            }
                            onClick={() => handleVerifyEvidence(artifact.id)}
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-medium text-slate-100"
                          >
                            <Crosshair className="h-3.5 w-3.5 text-sky-400" />
                            {verifyingArtifactId === artifact.id
                              ? 'Verifying Evidence...'
                              : `Verify ${targetCount} Selected Evidence Line${targetCount === 1 ? '' : 's'}`}
                          </button>
                        </div>
                      )}

                      {evMsg && (
                        <div
                          className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                            evMsg.verified
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          }`}
                        >
                          {evMsg.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <span>{evMsg.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stage Knowledge Check */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">
                    Stage {activeStage.order} Knowledge Check
                  </h4>
                  {activeStageProgress?.knowledgeCheckPassed && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Stage Passed
                    </span>
                  )}
                </div>

                {!activeStageProgress?.evidenceVerified && (
                  <div className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                    <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Verify the suspicious line(s) in the evidence artifact above to unlock this stage check.
                    </span>
                  </div>
                )}

                <p className="text-sm text-slate-200 leading-relaxed">
                  {activeStage.knowledgeCheck.prompt}
                </p>

                <div className="space-y-2">
                  {activeStage.knowledgeCheck.options.map((opt, idx) => {
                    const isSelected = selectedStageOption[activeStage.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isUnlocked || !activeStageProgress?.evidenceVerified || submittingStageCheck}
                        onClick={() => {
                          setSelectedStageOption((prev) => ({
                            ...prev,
                            [activeStage.id]: idx,
                          }));
                          setStageCheckError(null);
                        }}
                        className={`w-full min-h-[44px] text-left rounded-lg border px-4 py-3 text-sm transition-colors flex items-start gap-3 disabled:opacity-50 ${
                          isSelected
                            ? 'bg-sky-950/30 border-sky-500/50 text-slate-100'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-mono text-xs text-slate-400 mt-0.5 shrink-0">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={
                      !isUnlocked ||
                      !activeStageProgress?.evidenceVerified ||
                      submittingStageCheck ||
                      selectedStageOption[activeStage.id] === undefined
                    }
                    onClick={handleSubmitStageCheck}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-semibold transition-colors"
                  >
                    {submittingStageCheck ? 'Verifying...' : 'Verify Stage Conclusion'}
                  </button>

                  {activeStage.knowledgeCheck.reviewLessonId && (
                    <button
                      type="button"
                      onClick={() => onOpenLesson(activeStage.knowledgeCheck.reviewLessonId!)}
                      className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Review Related Lesson
                    </button>
                  )}
                </div>

                {stageCheckError && (
                  <div className="text-xs text-rose-300">{stageCheckError}</div>
                )}

                {activeStageFeedback && (
                  <div
                    className={`rounded-lg border p-3.5 space-y-1.5 text-xs ${
                      activeStageFeedback.correct
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : activeStageFeedback.selectedReasoningStatus === 'partially_correct'
                        ? 'bg-amber-950/20 border-amber-500/35 text-amber-200'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {activeStageFeedback.correct ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>
                            Stage verified!{' '}
                            {activeStageFeedback.xpAwarded > 0
                              ? `+${activeStageFeedback.xpAwarded} XP awarded.`
                              : ''}
                          </span>
                        </>
                      ) : activeStageFeedback.selectedReasoningStatus === 'partially_correct' ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <span>Partially sound reasoning — refine your conclusion</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-400" />
                          <span>Misconception check</span>
                        </>
                      )}
                    </div>
                    <p className="leading-relaxed">
                      {activeStageFeedback.correct
                        ? activeStageFeedback.explanation
                        : activeStageFeedback.misconceptionFeedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Components 8, 9, 10: Submission Requirements, Deliverable Report Form & Rubric Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubmitReport}
            className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-5"
          >
            <div className="space-y-1.5 border-b border-slate-800/80 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-sky-400" />
                  {activeCapstone.deliverableTemplate.title}
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {totalSectionChars} / {activeCapstone.deliverableTemplate.minimumCharacters} chars min
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeCapstone.deliverableTemplate.instructions}
              </p>
            </div>

            {!allStagesComplete && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-xs text-slate-300">
                <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Complete all {activeCapstone.stages.length} investigation stages above before submitting your final report.
                </span>
              </div>
            )}

            <div className="space-y-4">
              {activeCapstone.deliverableTemplate.sections.map((sec) => (
                <div key={sec.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    {sec.label}
                  </label>
                  <p className="text-xs text-slate-400">{sec.prompt}</p>
                  <textarea
                    rows={4}
                    value={currentSections[sec.key] || ''}
                    onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                    placeholder={sec.placeholder}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            {reportError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
                {reportError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={!isUnlocked || !allStagesComplete || submittingReport}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-semibold transition-colors"
              >
                {submittingReport
                  ? 'Evaluating Deliverable...'
                  : activeProgress?.reportSubmitted
                  ? 'Resubmit Deliverable'
                  : 'Submit Capstone Deliverable'}
              </button>
              {activeProgress?.reportScore !== undefined && (
                <span className="text-xs font-mono tabular-nums text-slate-300">
                  Latest Score: {activeProgress.reportScore} / {activeProgress.maxReportScore}
                </span>
              )}
            </div>
          </form>

          {/* Requirements & Rubric Column */}
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Submission Requirements
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {activeCapstone.submissionRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Evaluation Rubric (Pass ≥ 70%)
              </h4>
              <div className="space-y-2.5">
                {activeCapstone.rubricCriteria.map((rc) => {
                  const graded = rubricBreakdown?.find((b) => b.criterionId === rc.id);
                  return (
                    <div
                      key={rc.id}
                      className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-slate-100">
                        <span>{rc.label}</span>
                        <span className="font-mono tabular-nums text-sky-400">
                          {graded ? `${graded.pointsEarned} / ${graded.maxPoints}` : `${rc.maxPoints} pts`}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        {graded ? graded.feedback : rc.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Component 11: Detailed Solution Walkthrough (Unlocked strictly on server pass) */}
        {unlockedWalkthrough && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 sm:p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Detailed Reference Solution Walkthrough</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {unlockedWalkthrough}
            </p>
          </section>
        )}

        {/* Component 12: Reflection Prompts & Recommended Next Lessons */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reflection Prompts
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
              {activeCapstone.reflectionPrompts.map((prompt, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recommended Next Lessons
            </h4>
            <div className="space-y-2">
              {activeCapstone.recommendedNextLessonIds.map((lessonId) => {
                const meta = lessonMetaMap.get(lessonId);
                return (
                  <button
                    key={lessonId}
                    type="button"
                    onClick={() => onOpenLesson(lessonId)}
                    className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 hover:bg-slate-900 px-3.5 py-2.5 text-left text-xs transition-colors"
                  >
                    <span className="font-medium text-slate-200 truncate">
                      {meta ? `Tier ${meta.tierNumber} · ${meta.title}` : lessonId}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
