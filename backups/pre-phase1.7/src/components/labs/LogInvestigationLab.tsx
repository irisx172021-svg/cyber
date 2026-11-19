import React, { useState } from 'react';
import { Search, Flag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LogEntryItem } from '../../types';

interface LogInvestigationLabProps {
  contextTitle?: string;
  entries: LogEntryItem[];
  suspiciousEntryId?: string;
  flaggedEntryId: string | null;
  onFlagEntry: (entryId: string) => void;
}

export const LogInvestigationLab: React.FC<LogInvestigationLabProps> = ({
  contextTitle = 'Log & Event Stream',
  entries,
  suspiciousEntryId,
  flaggedEntryId,
  onFlagEntry,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'ALERT' | 'WARN' | 'INFO'>('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id || '');

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

  const getSeverityTextStyle = (sev: LogEntryItem['severity']) => {
    if (sev === 'ALERT') return 'text-rose-400';
    if (sev === 'WARN') return 'text-amber-400';
    return 'text-sky-400';
  };

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
          <div className="p-4 text-xs text-slate-400 text-center">No log events match the active filter.</div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = activeEntry?.id === entry.id;
            const isFlagged = flaggedEntryId === entry.id;
            const isTargetCorrect = isFlagged && suspiciousEntryId === entry.id;

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
                Inspecting <span className="text-slate-200">{activeEntry.id}</span> · {activeEntry.source}
              </div>
              <div className="text-sm font-medium text-slate-100 mt-0.5">{activeEntry.message}</div>
            </div>

            <button
              type="button"
              onClick={() => onFlagEntry(activeEntry.id)}
              className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                flaggedEntryId === activeEntry.id
                  ? suspiciousEntryId === activeEntry.id
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              <Flag size={14} />
              {flaggedEntryId === activeEntry.id ? 'Selected as Suspicious' : 'Flag as Suspicious'}
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 rounded-md p-3 border border-slate-800/80">
            {activeEntry.details}
          </p>

          {flaggedEntryId && (
            <div className="flex items-start gap-2 text-xs">
              {flaggedEntryId === suspiciousEntryId ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-300">
                    Event <code className="font-mono">{flaggedEntryId}</code> confirmed as the suspicious event. Proceed to the challenge question below.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-200">
                    Event <code className="font-mono">{flaggedEntryId}</code> matches authorized baseline activity. Inspect the remaining records to spot the anomaly.
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
