import React, { useState, useEffect } from 'react';
import { FileCode2, CheckCircle2, AlertTriangle, Crosshair, Scale } from 'lucide-react';

interface ScenarioDecisionLabProps {
  labId: string;
  artifactTitle?: string;
  artifactContent?: string;
  highlightTargetCount?: number;
  verifiedHighlightLines?: number[];
  scenarioVerified?: boolean;
  decisionTradeoffs?: string[];
  onVerifyLines?: (
    selectedLines: number[]
  ) => Promise<
    | {
        verified: boolean;
        verifiedHighlightLines?: number[];
        lineRationales?: Record<number, string>;
        message: string;
      }
    | undefined
  >;
}

export const ScenarioDecisionLab: React.FC<ScenarioDecisionLabProps> = ({
  labId,
  artifactTitle = 'artifact-inspection.txt',
  artifactContent = '',
  highlightTargetCount = 0,
  verifiedHighlightLines = [],
  scenarioVerified = false,
  decisionTradeoffs = [],
  onVerifyLines,
}) => {
  const lines = artifactContent.split('\n');
  const [selectedLines, setSelectedLines] = useState<number[]>(verifiedHighlightLines);
  const [verifying, setVerifying] = useState(false);
  const [lineRationales, setLineRationales] = useState<Record<number, string> | null>(null);
  const [feedback, setFeedback] = useState<{ verified: boolean; message: string } | null>(
    scenarioVerified
      ? {
          verified: true,
          message: 'Suspicious artifact line(s) confirmed! Proceed to Step 2 below.',
        }
      : null
  );

  useEffect(() => {
    setSelectedLines(verifiedHighlightLines);
    setVerifying(false);
    setLineRationales(null);
    setFeedback(
      scenarioVerified
        ? {
            verified: true,
            message: 'Suspicious artifact line(s) confirmed! Proceed to Step 2 below.',
          }
        : null
    );
  }, [labId, scenarioVerified, verifiedHighlightLines.join(',')]);

  const effectiveTargetCount = highlightTargetCount > 0 ? highlightTargetCount : 0;

  const handleToggleLine = (lineNumber: number) => {
    if (scenarioVerified || verifying || effectiveTargetCount === 0) return;
    if (feedback && !feedback.verified) {
      setFeedback(null);
    }

    setSelectedLines((prev) => {
      if (prev.includes(lineNumber)) {
        return prev.filter((n) => n !== lineNumber);
      }
      if (effectiveTargetCount === 1) {
        return [lineNumber];
      }
      if (prev.length >= effectiveTargetCount) {
        return prev;
      }
      return [...prev, lineNumber].sort((a, b) => a - b);
    });
  };

  const handleVerify = async () => {
    if (!onVerifyLines || verifying || selectedLines.length === 0) return;
    setVerifying(true);
    try {
      const res = await onVerifyLines(selectedLines);
      if (res) {
        if (res.verified && res.lineRationales) {
          setLineRationales(res.lineRationales);
        }
        setFeedback({
          verified: res.verified,
          message: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        verified: false,
        message: err?.message || 'Unable to verify selected artifact lines.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {scenarioVerified || effectiveTargetCount === 0
            ? 'Artifact security indicators verified below.'
            : `Click the ${effectiveTargetCount} suspicious line${
                effectiveTargetCount === 1 ? '' : 's'
              } in the system artifact below, then click "Verify Highlighted Lines".`}
        </span>
        {effectiveTargetCount > 0 && (
          <span className="font-mono tabular-nums text-slate-300">
            Selected {scenarioVerified ? verifiedHighlightLines.length : selectedLines.length} / {effectiveTargetCount}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 size={14} className="text-sky-400 shrink-0" />
            <span className="text-xs font-mono text-slate-200 truncate">{artifactTitle}</span>
          </div>
          {scenarioVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 shrink-0">
              <CheckCircle2 size={13} />
              Verified
            </span>
          )}
        </div>

        <div className="overflow-x-auto py-2.5 text-xs font-mono leading-relaxed">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isVerifiedHighlight =
              scenarioVerified && verifiedHighlightLines.includes(lineNumber);
            const isSelected = !scenarioVerified && selectedLines.includes(lineNumber);
            const clickable = !scenarioVerified && effectiveTargetCount > 0;

            return (
              <button
                key={lineNumber}
                type="button"
                disabled={!clickable}
                onClick={() => handleToggleLine(lineNumber)}
                className={`w-full text-left flex px-3.5 py-0.5 transition-colors border-l-2 ${
                  isVerifiedHighlight
                    ? 'bg-amber-500/15 border-amber-400 text-amber-100'
                    : isSelected
                    ? 'bg-sky-500/15 border-sky-400 text-sky-100'
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

      {!scenarioVerified && effectiveTargetCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={verifying || selectedLines.length === 0}
              onClick={handleVerify}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap"
            >
              <Crosshair size={14} className="text-sky-400" />
              {verifying ? 'Verifying Lines...' : 'Verify Highlighted Lines'}
            </button>
            {selectedLines.length > 0 && !verifying && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLines([]);
                  setFeedback(null);
                }}
                className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed ${
            feedback.verified
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}
        >
          {feedback.verified ? (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Post-verification Line Rationales & Design Tradeoffs */}
      {scenarioVerified && lineRationales && Object.keys(lineRationales).length > 0 && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-4 space-y-2">
          <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>Per-Line Security Rationales</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-200">
            {Object.entries(lineRationales)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([ln, rationale]) => (
                <div key={ln} className="rounded-md bg-slate-950/70 px-3 py-2 leading-relaxed">
                  <span className="font-mono text-amber-300 font-semibold mr-2">Line {ln}:</span>
                  <span>{rationale}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {scenarioVerified && decisionTradeoffs && decisionTradeoffs.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Scale size={14} className="text-sky-400 shrink-0" />
            <span>Operational &amp; Security Tradeoffs</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {decisionTradeoffs.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
