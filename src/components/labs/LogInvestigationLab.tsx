import React, { useState, useEffect } from 'react';
import { Search, Flag, CheckCircle2, AlertTriangle, FileSearch } from 'lucide-react';
import { LogEntryItem } from '../../types';
import { apiVerifyLogEntry } from '../../lib/api';

interface LogInvestigationLabProps {
  lessonId: string;
  labId: string;
  contextTitle?: string;
  entries: LogEntryItem[];
  flaggedEntryId: string | null;
  verifiedTargetEntryId?: string | null;
  onFlagEntry: (entryId: string) => void;
  onLogVerified?: (entryId: string, isTarget: boolean, explorationComplete?: boolean) => void;
}

export const LogInvestigationLab: React.FC<LogInvestigationLabProps> = ({
  lessonId,
  labId,
  contextTitle = 'Log & Event Stream',
  entries,
  flaggedEntryId,
  verifiedTargetEntryId = null,
  onFlagEntry,
  onLogVerified,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'ALERT' | 'WARN' | 'INFO'>('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(verifiedTargetEntryId || entries[0]?.id || '');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    entryId: string;
    isTarget: boolean;
    message: string;
  } | null>(
    verifiedTargetEntryId
      ? {
          entryId: verifiedTargetEntryId,
          isTarget: true,
          message: `Event ${verifiedTargetEntryId} confirmed as the suspicious event. Proceed to the challenge question below.`,
        }
      : null
  );
  const [inspectedNotes, setInspectedNotes] = useState<
    Record<string, { note: string; isTarget: boolean }>
  >({});
  const [correlationSummary, setCorrelationSummary] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(verifiedTargetEntryId || entries[0]?.id || '');
    setVerificationResult(
      verifiedTargetEntryId
        ? {
            entryId: verifiedTargetEntryId,
            isTarget: true,
            message: `Event ${verifiedTargetEntryId} confirmed as the suspicious event. Proceed to the challenge question below.`,
          }
        : null
    );
    setInspectedNotes({});
    setCorrelationSummary(null);
    setVerifyError(null);
    setVerifying(false);
  }, [labId, verifiedTargetEntryId]);

  const filteredEntries = entries.filter((entry) => {
    if (severityFilter !== 'ALL' && entry.severity !== severityFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeEntry = entries.find((e) => e.id === selectedId) || filteredEntries[0] || entries[0];

  const handleFlagAndVerify = async (entryId: string) => {
    onFlagEntry(entryId);
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await apiVerifyLogEntry(lessonId, labId, entryId);
      setVerificationResult({
        entryId,
        isTarget: res.isTarget,
        message: res.message,
      });
      if (res.analysisNote) {
        setInspectedNotes((prev) => ({
          ...prev,
          [entryId]: { note: res.analysisNote!, isTarget: res.isTarget },
        }));
      }
      if (res.isTarget && res.correlationSummary) {
        setCorrelationSummary(res.correlationSummary);
      }
      onLogVerified?.(entryId, res.isTarget, res.explorationComplete);
    } catch (err: any) {
      setVerifyError(err?.message || 'Unable to verify flagged log entry.');
    } finally {
      setVerifying(false);
    }
  };

  const getSeverityTextStyle = (sev: LogEntryItem['severity']) => {
    if (sev === 'ALERT') return 'text-rose-400';
    if (sev === 'WARN') return 'text-amber-400';
    return 'text-sky-400';
  };

  const activeNote = activeEntry ? inspectedNotes[activeEntry.id] : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-xs font-medium text-slate-300">{contextTitle}</div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter logs..."
              className="w-full sm:w-44 min-h-[38px] pl-8 pr-2.5 py-1 rounded-md border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5">
            {(['ALL', 'ALERT', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSeverityFilter(lvl)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  severityFilter === lvl
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Rows */}
      <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/70 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">
            No log events match the active filter.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = activeEntry?.id === entry.id;
            const isFlagged = flaggedEntryId === entry.id;
            const isTargetCorrect =
              isFlagged &&
              verificationResult?.entryId === entry.id &&
              verificationResult.isTarget;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className={`w-full text-left px-3.5 py-3 transition-colors flex items-start justify-between gap-3 ${
                  isSelected ? 'bg-slate-900' : 'hover:bg-slate-900/50'
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
                    <span className={`font-semibold ${getSeverityTextStyle(entry.severity)}`}>
                      {entry.severity}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400 tabular-nums">{entry.timestamp}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{entry.source}</span>
                  </div>
                  <div className="text-xs text-slate-200 break-words font-mono">{entry.message}</div>
                </div>

                {isFlagged && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                      isTargetCorrect ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    <Flag size={13} />
                    {isTargetCorrect ? 'Flagged (Verified)' : 'Flagged'}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Selected Event Inspector */}
      {activeEntry && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-xs font-mono text-slate-400">
                Inspecting <span className="text-slate-200">{activeEntry.id}</span> ·{' '}
                {activeEntry.source}
              </div>
              <div className="text-sm font-medium text-slate-100 mt-0.5">{activeEntry.message}</div>
            </div>

            <button
              type="button"
              disabled={verifying}
              onClick={() => handleFlagAndVerify(activeEntry.id)}
              className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 ${
                flaggedEntryId === activeEntry.id
                  ? verificationResult?.entryId === activeEntry.id && verificationResult.isTarget
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              <Flag size={14} />
              {verifying && flaggedEntryId === activeEntry.id
                ? 'Verifying...'
                : flaggedEntryId === activeEntry.id
                ? 'Selected as Suspicious'
                : 'Flag as Suspicious'}
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 rounded-md p-3 border border-slate-800/80">
            {activeEntry.details}
          </p>

          {activeNote && (
            <div
              className={`rounded-md border p-3 text-xs leading-relaxed space-y-1 ${
                activeNote.isTarget
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-950/70 border-slate-700 text-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <FileSearch size={13} className="text-sky-400 shrink-0" />
                <span>Analyst Diagnostic Note</span>
              </div>
              <p>{activeNote.note}</p>
            </div>
          )}

          {verifyError && (
            <div className="flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
          )}

          {flaggedEntryId && verificationResult && verificationResult.entryId === flaggedEntryId && (
            <div className="flex items-start gap-2 text-xs">
              {verificationResult.isTarget ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-300">{verificationResult.message}</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-200">{verificationResult.message}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post-verification Correlation & Timeline Summary */}
      {correlationSummary && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>Correlation &amp; Timeline Summary</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{correlationSummary}</p>
        </div>
      )}
    </div>
  );
};
