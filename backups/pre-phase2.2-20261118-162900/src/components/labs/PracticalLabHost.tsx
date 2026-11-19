import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  Bot,
  FlaskConical,
} from 'lucide-react';
import { EngageApiResponse, PracticalLab } from '../../types';
import { InteractiveDiagramLab } from './InteractiveDiagramLab';
import { SimulatedTerminalLab } from './SimulatedTerminalLab';
import { LogInvestigationLab } from './LogInvestigationLab';
import { ScenarioDecisionLab } from './ScenarioDecisionLab';

interface PracticalLabHostProps {
  lab: PracticalLab;
  isCompleted: boolean;
  onCompleteExercise: (exerciseId: string, selectedOption: number) => Promise<EngageApiResponse | null>;
  onAskTutorHint: (lab: PracticalLab) => void;
}

export const PracticalLabHost: React.FC<PracticalLabHostProps> = ({
  lab,
  isCompleted,
  onCompleteExercise,
  onAskTutorHint,
}) => {
  const [exploredIds, setExploredIds] = useState<string[]>([]);
  const [executedCommands, setExecutedCommands] = useState<string[]>([]);
  const [flaggedEntryId, setFlaggedEntryId] = useState<string | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<{
    selectedIndex: number;
    correct: boolean;
    message: string;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Reset interactive local state when switching lessons
  useEffect(() => {
    setExploredIds(lab.diagramItems?.[0] ? [lab.diagramItems[0].id] : []);
    setExecutedCommands([]);
    setFlaggedEntryId(null);
    setSelectedOption(null);
    setSubmitting(false);
    setVerifyOutcome(null);
    setShowHint(false);
  }, [lab.id]);

  const handleExploreItem = (itemId: string) => {
    setExploredIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
  };

  const handleExecuteCommand = (canonicalCommand: string) => {
    setExecutedCommands((prev) => (prev.includes(canonicalCommand) ? prev : [...prev, canonicalCommand]));
  };

  const handleCheckAnswer = async () => {
    if (selectedOption === null || submitting) return;
    const chosen = selectedOption;
    setSubmitting(true);
    try {
      const res = await onCompleteExercise(lab.id, chosen);
      setVerifyOutcome({
        selectedIndex: chosen,
        correct: true,
        message:
          res?.explanation ||
          'Practical lab challenge verified. Great job applying the concept!',
      });
    } catch (err: any) {
      setVerifyOutcome({
        selectedIndex: chosen,
        correct: false,
        message:
          err?.message ||
          'Check the Explore section above or click "Show Hint" before selecting another option.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isCorrect = Boolean(verifyOutcome?.correct);

  const kindLabel =
    lab.kind === 'diagram'
      ? 'Interactive Architecture Explorer'
      : lab.kind === 'terminal'
      ? 'Simulated Command Lab'
      : lab.kind === 'log_investigation'
      ? 'Log & Alert Investigation'
      : 'Security Audit Scenario';

  return (
    <div className="space-y-6">
      {/* 1. Header & Objective */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium">
                <FlaskConical size={14} />
                {kindLabel}
              </span>
              <span>·</span>
              <span className="font-mono tabular-nums">Optional +{lab.xpReward} XP</span>
              {isCompleted && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 size={13} />
                    Completed
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100">{lab.title}</h2>
          </div>

          <button
            type="button"
            onClick={() => onAskTutorHint(lab)}
            className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Bot size={14} className="text-sky-400" />
            Ask AI Tutor for Hint
          </button>
        </div>

        {/* Part 1: Objective & Part 2: Short Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Target size={13} className="text-sky-400" />
              Objective
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{lab.objective}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              How This Works
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{lab.shortExplanation}</p>
          </div>
        </div>
      </div>

      {/* Part 3: Explore Stage (Interactive Workspace) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-slate-100">Step 1 · Explore</h3>
          <span className="text-xs text-slate-400">{lab.expectedOutcome}</span>
        </div>

        {lab.kind === 'diagram' && lab.diagramItems && (
          <InteractiveDiagramLab
            mode={lab.diagramMode || 'components'}
            items={lab.diagramItems}
            exploredIds={exploredIds}
            onExploreItem={handleExploreItem}
          />
        )}

        {lab.kind === 'terminal' && lab.terminalCommands && (
          <SimulatedTerminalLab
            promptPrefix={lab.terminalPromptPrefix}
            commands={lab.terminalCommands}
            requiredCommands={lab.requiredCommands}
            executedCommands={executedCommands}
            onExecuteCommand={handleExecuteCommand}
          />
        )}

        {lab.kind === 'log_investigation' && lab.logEntries && (
          <LogInvestigationLab
            lessonId={lab.lessonId}
            labId={lab.id}
            contextTitle={lab.logContextTitle}
            entries={lab.logEntries}
            flaggedEntryId={flaggedEntryId}
            onFlagEntry={setFlaggedEntryId}
          />
        )}

        {lab.kind === 'scenario' && (
          <ScenarioDecisionLab
            artifactTitle={lab.artifactTitle}
            artifactContent={lab.artifactContent}
            highlightLines={lab.artifactHighlightLines}
          />
        )}
      </div>

      {/* Part 4, 5, 6: Apply Stage + Server-Verified Feedback + Explanation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Step 2 · Apply & Verify</h3>
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Lightbulb size={14} className="text-amber-400" />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {lab.challenge.prompt}
        </p>

        {showHint && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-200 leading-relaxed">
            <span className="font-semibold">Hint: </span>
            {lab.challenge.hint}
          </div>
        )}

        <div className="space-y-2">
          {lab.challenge.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isOptionCorrect =
              verifyOutcome !== null &&
              verifyOutcome.selectedIndex === idx &&
              verifyOutcome.correct;
            const isOptionWrong =
              verifyOutcome !== null &&
              verifyOutcome.selectedIndex === idx &&
              !verifyOutcome.correct;

            let optionClasses =
              'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900';
            if (isOptionCorrect) {
              optionClasses = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100';
            } else if (isOptionWrong) {
              optionClasses = 'bg-rose-950/30 border-rose-500/40 text-rose-100';
            } else if (isSelected) {
              optionClasses = 'bg-sky-950/30 border-sky-500/50 text-slate-100';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSelectedOption(idx);
                  if (verifyOutcome) setVerifyOutcome(null);
                }}
                className={`w-full min-h-[44px] text-left rounded-lg border px-4 py-3 text-sm transition-colors flex items-start gap-3 ${optionClasses}`}
              >
                <span className="font-mono text-xs text-slate-400 mt-0.5 shrink-0">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={selectedOption === null || submitting}
            onClick={handleCheckAnswer}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {submitting ? 'Verifying...' : 'Check Answer'}
          </button>

          {isCompleted && (
            <span className="text-xs font-medium text-emerald-400">
              Bonus +{lab.xpReward} XP already recorded for this lab
            </span>
          )}
        </div>

        {/* Part 5 & 6: Instant Server-Verified Feedback + Explanation */}
        {verifyOutcome && (
          <div
            className={`rounded-lg border p-4 space-y-2 ${
              isCorrect
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">
                    Correct! {isCompleted ? 'Lab verified.' : `+${lab.xpReward} XP awarded.`}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-rose-400 shrink-0" />
                  <span className="text-rose-300">Not quite — review the hint and try again.</span>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {verifyOutcome.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
