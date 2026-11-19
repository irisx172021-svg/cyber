import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  Bot,
  FlaskConical,
  Lock,
} from 'lucide-react';
import {
  EngageApiResponse,
  LabExplorationProgress,
  PracticalLab,
} from '../../types';
import { apiExploreLab } from '../../lib/api';
import { InteractiveDiagramLab } from './InteractiveDiagramLab';
import { SimulatedTerminalLab } from './SimulatedTerminalLab';
import { LogInvestigationLab } from './LogInvestigationLab';
import { ScenarioDecisionLab } from './ScenarioDecisionLab';

interface PracticalLabHostProps {
  lab: PracticalLab;
  isCompleted: boolean;
  explorationState?: LabExplorationProgress;
  onUpdateLabExploration?: (labId: string, state: LabExplorationProgress) => void;
  onCompleteExercise: (exerciseId: string, selectedOption: number) => Promise<EngageApiResponse | null>;
  onAskTutorHint: (lab: PracticalLab) => void;
}

function getRequiredDiagramCountClient(lab: PracticalLab): number {
  const count = lab.diagramItems?.length || 0;
  if (count === 0) return 0;
  const match = /at least (\d+)/i.exec(lab.expectedOutcome || '');
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, count);
    }
  }
  return count;
}

export const PracticalLabHost: React.FC<PracticalLabHostProps> = ({
  lab,
  isCompleted,
  explorationState,
  onUpdateLabExploration,
  onCompleteExercise,
  onAskTutorHint,
}) => {
  const [exploredIds, setExploredIds] = useState<string[]>(
    explorationState?.exploredDiagramIds || []
  );
  const [executedCommands, setExecutedCommands] = useState<string[]>(
    explorationState?.executedTerminalCommands || []
  );
  const [flaggedEntryId, setFlaggedEntryId] = useState<string | null>(
    explorationState?.verifiedLogEntryId || null
  );
  const [logTargetVerified, setLogTargetVerified] = useState<boolean>(
    Boolean(explorationState?.logTargetVerified)
  );
  const [scenarioVerified, setScenarioVerified] = useState<boolean>(
    Boolean(explorationState?.scenarioVerified)
  );
  const [verifiedHighlightLines, setVerifiedHighlightLines] = useState<number[]>(
    explorationState?.verifiedHighlightLines || []
  );

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<{
    selectedIndex: number;
    correct: boolean;
    message: string;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Sync local interactive state from server-hydrated explorationState when switching labs
  useEffect(() => {
    setExploredIds(explorationState?.exploredDiagramIds || []);
    setExecutedCommands(explorationState?.executedTerminalCommands || []);
    setFlaggedEntryId(explorationState?.verifiedLogEntryId || null);
    setLogTargetVerified(Boolean(explorationState?.logTargetVerified));
    setScenarioVerified(Boolean(explorationState?.scenarioVerified));
    setVerifiedHighlightLines(explorationState?.verifiedHighlightLines || []);
    setSelectedOption(null);
    setSubmitting(false);
    setVerifyOutcome(null);
    setShowHint(false);
  }, [lab.id]);

  // Also absorb late hydration updates (e.g., auth/me refresh) for active lab
  useEffect(() => {
    if (!explorationState) return;
    if (explorationState.exploredDiagramIds) {
      setExploredIds(explorationState.exploredDiagramIds);
    }
    if (explorationState.executedTerminalCommands) {
      setExecutedCommands(explorationState.executedTerminalCommands);
    }
    if (explorationState.logTargetVerified) {
      setLogTargetVerified(true);
      if (explorationState.verifiedLogEntryId) {
        setFlaggedEntryId(explorationState.verifiedLogEntryId);
      }
    }
    if (explorationState.scenarioVerified) {
      setScenarioVerified(true);
      if (explorationState.verifiedHighlightLines) {
        setVerifiedHighlightLines(explorationState.verifiedHighlightLines);
      }
    }
  }, [explorationState]);

  const handleExploreItem = (itemId: string) => {
    setExploredIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    apiExploreLab(lab.lessonId, lab.id, 'explore_diagram_item', { itemId })
      .then((res) => {
        if (res.exploration.exploredDiagramIds) {
          setExploredIds(res.exploration.exploredDiagramIds);
        }
        onUpdateLabExploration?.(lab.id, res.exploration);
      })
      .catch((err) => {
        console.error('Failed to persist diagram exploration', err);
      });
  };

  const handleExecuteCommand = async (rawCommand: string) => {
    const res = await apiExploreLab(lab.lessonId, lab.id, 'execute_terminal_command', {
      command: rawCommand,
    });
    if (res.exploration.executedTerminalCommands) {
      setExecutedCommands(res.exploration.executedTerminalCommands);
    }
    onUpdateLabExploration?.(lab.id, res.exploration);
    return res.commandResult;
  };

  const handleLogVerified = (
    entryId: string,
    isTarget: boolean,
    explorationComplete?: boolean
  ) => {
    if (!isTarget) return;
    setLogTargetVerified(true);
    setFlaggedEntryId(entryId);
    onUpdateLabExploration?.(lab.id, {
      ...(explorationState || {}),
      logTargetVerified: true,
      verifiedLogEntryId: entryId,
      explorationComplete: explorationComplete ?? true,
    });
  };

  const handleVerifyScenarioLines = async (selectedLines: number[]) => {
    const res = await apiExploreLab(lab.lessonId, lab.id, 'verify_scenario_lines', {
      selectedLines,
    });
    if (res.scenarioResult?.verified) {
      setScenarioVerified(true);
      if (res.scenarioResult.verifiedHighlightLines) {
        setVerifiedHighlightLines(res.scenarioResult.verifiedHighlightLines);
      }
    }
    onUpdateLabExploration?.(lab.id, res.exploration);
    return res.scenarioResult;
  };

  const requiredDiagramCount = getRequiredDiagramCountClient(lab);
  const targetTerminalCommands =
    lab.requiredCommands && lab.requiredCommands.length > 0
      ? lab.requiredCommands
      : (lab.terminalCommands || []).map((c) => c.command);

  const step1Complete = React.useMemo(() => {
    if (isCompleted || explorationState?.explorationComplete) {
      return true;
    }
    if (lab.kind === 'diagram') {
      return requiredDiagramCount === 0 || exploredIds.length >= requiredDiagramCount;
    }
    if (lab.kind === 'terminal') {
      return targetTerminalCommands.every((cmd) => executedCommands.includes(cmd));
    }
    if (lab.kind === 'log_investigation') {
      return logTargetVerified;
    }
    if (lab.kind === 'scenario') {
      return scenarioVerified || (lab.highlightTargetCount ?? 0) === 0;
    }
    return true;
  }, [
    isCompleted,
    explorationState?.explorationComplete,
    lab.kind,
    lab.highlightTargetCount,
    requiredDiagramCount,
    exploredIds,
    targetTerminalCommands,
    executedCommands,
    logTargetVerified,
    scenarioVerified,
  ]);

  const step1RemainingHint = React.useMemo(() => {
    if (step1Complete) return null;
    if (lab.kind === 'diagram') {
      return `Inspect at least ${requiredDiagramCount} component/stage card${
        requiredDiagramCount === 1 ? '' : 's'
      } in Step 1 (${exploredIds.length}/${requiredDiagramCount} explored) to unlock verification.`;
    }
    if (lab.kind === 'terminal') {
      const done = targetTerminalCommands.filter((c) => executedCommands.includes(c)).length;
      return `Run all ${targetTerminalCommands.length} required sandbox commands in Step 1 (${done}/${targetTerminalCommands.length} completed) to unlock verification.`;
    }
    if (lab.kind === 'log_investigation') {
      return 'Flag the suspicious log entry in Step 1 to unlock verification.';
    }
    if (lab.kind === 'scenario') {
      const n = lab.highlightTargetCount || 1;
      return `Select and verify the ${n} suspicious line${n === 1 ? '' : 's'} in Step 1 to unlock verification.`;
    }
    return 'Complete Step 1 above to unlock verification.';
  }, [
    step1Complete,
    lab.kind,
    lab.highlightTargetCount,
    requiredDiagramCount,
    exploredIds.length,
    targetTerminalCommands,
    executedCommands,
  ]);

  const handleCheckAnswer = async () => {
    if (selectedOption === null || submitting || !step1Complete) return;
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
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Step 1 · Explore</span>
            {step1Complete && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 size={14} />
                Complete
              </span>
            )}
          </h3>
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
            verifiedTargetEntryId={logTargetVerified ? flaggedEntryId : null}
            onFlagEntry={setFlaggedEntryId}
            onLogVerified={handleLogVerified}
          />
        )}

        {lab.kind === 'scenario' && (
          <ScenarioDecisionLab
            labId={lab.id}
            artifactTitle={lab.artifactTitle}
            artifactContent={lab.artifactContent}
            highlightTargetCount={lab.highlightTargetCount}
            verifiedHighlightLines={verifiedHighlightLines}
            scenarioVerified={scenarioVerified}
            onVerifyLines={handleVerifyScenarioLines}
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

        {step1RemainingHint && (
          <div className="flex items-start gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-300">
            <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>{step1RemainingHint}</span>
          </div>
        )}

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
            disabled={selectedOption === null || submitting || !step1Complete}
            onClick={handleCheckAnswer}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {submitting ? 'Verifying...' : !step1Complete ? 'Complete Step 1 First' : 'Check Answer'}
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
