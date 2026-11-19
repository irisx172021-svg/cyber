import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert, GitBranch, ArrowRight } from 'lucide-react';
import { DiagramExploreItem } from '../../types';

interface InteractiveDiagramLabProps {
  mode: 'components' | 'sequence';
  items: DiagramExploreItem[];
  exploredIds: string[];
  onExploreItem: (itemId: string) => void;
}

export const InteractiveDiagramLab: React.FC<InteractiveDiagramLabProps> = ({
  mode,
  items,
  exploredIds,
  onExploreItem,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  const activeItem = activeIndex >= 0 ? items[activeIndex] || null : null;

  const handleSelectIndex = (idx: number) => {
    setActiveIndex(idx);
    const item = items[idx];
    if (item) {
      onExploreItem(item.id);
    }
  };

  const handleSelectById = (targetId: string) => {
    const idx = items.findIndex((it) => it.id === targetId);
    if (idx >= 0) {
      handleSelectIndex(idx);
    }
  };

  const allExplored = items.every((it) => exploredIds.includes(it.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {mode === 'sequence'
            ? 'Step through each stage in order to inspect how the sequence operates and hands off trust.'
            : 'Select each component below to inspect its role, connections, and security behavior.'}
        </span>
        <span className="font-mono tabular-nums text-slate-300">
          Explored {exploredIds.length} / {items.length}
        </span>
      </div>

      {/* Selector Grid / Stepper */}
      <div
        className={`grid gap-2.5 ${
          items.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : items.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {items.map((item, idx) => {
          const isSelected = idx === activeIndex;
          const isExplored = exploredIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectIndex(idx)}
              className={`min-h-[44px] text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isSelected
                  ? 'bg-slate-800/90 border-sky-500/50 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold leading-snug">{item.label}</span>
                {isExplored && (
                  <CheckCircle2
                    size={15}
                    className={`shrink-0 mt-0.5 ${isSelected ? 'text-sky-400' : 'text-emerald-400'}`}
                  />
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 line-clamp-1">{item.role}</div>
            </button>
          );
        })}
      </div>

      {/* Sequence Step Controls */}
      {mode === 'sequence' && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => handleSelectIndex(Math.max(0, activeIndex - 1))}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <ChevronLeft size={15} />
            Previous Stage
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {activeIndex >= 0 ? `Stage ${activeIndex + 1} of ${items.length}` : `0 of ${items.length} inspected`}
          </span>
          <button
            type="button"
            disabled={activeIndex >= items.length - 1}
            onClick={() => handleSelectIndex(activeIndex < 0 ? 0 : Math.min(items.length - 1, activeIndex + 1))}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            {activeIndex < 0 ? 'Inspect Stage 1' : 'Next Stage'}
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Detailed Inspection Panel */}
      {!activeItem ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:p-5 text-xs text-slate-400">
          Select a component or stage card above to inspect its behavior, system connections, and security role.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">{activeItem.label}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{activeItem.role}</p>
            </div>
            {activeItem.sampleMetric && (
              <span className="text-xs font-mono tabular-nums text-sky-400">
                {activeItem.sampleMetric}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{activeItem.summary}</p>

          <ul className="space-y-1.5 text-xs text-slate-300">
            {activeItem.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>

          {activeItem.connections && activeItem.connections.length > 0 && (
            <div className="pt-3 border-t border-slate-800/70 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <GitBranch size={14} className="text-sky-400 shrink-0" />
                <span>Connected Components &amp; Trust Flow</span>
              </div>
              <div className="space-y-2">
                {activeItem.connections.map((conn, idx) => {
                  const targetItem = items.find((it) => it.id === conn.targetId);
                  return (
                    <div
                      key={`${conn.targetId}-${idx}`}
                      className="rounded-md bg-slate-900/70 px-3 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-200 font-medium">
                          <span>{activeItem.label}</span>
                          <ArrowRight size={12} className="text-sky-400 shrink-0" />
                          <span className="text-sky-300">{targetItem?.label || conn.targetId}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 font-normal">{conn.relationship}</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">{conn.whyItMatters}</p>
                      </div>
                      {targetItem && (
                        <button
                          type="button"
                          onClick={() => handleSelectById(targetItem.id)}
                          className="min-h-[34px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-sky-300 whitespace-nowrap shrink-0 self-start sm:self-center"
                        >
                          Inspect {targetItem.label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/70 flex items-start gap-2.5 text-xs text-slate-300">
            <ShieldAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Security Relevance: </span>
              <span className="text-slate-300">{activeItem.securityRelevance}</span>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Connections Summary once all components are explored */}
      {allExplored && items.some((it) => it.connections && it.connections.length > 0) && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>Architecture Connections Summary</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {items.flatMap((src) =>
              (src.connections || []).map((conn, idx) => {
                const target = items.find((t) => t.id === conn.targetId);
                return (
                  <div
                    key={`${src.id}-${conn.targetId}-${idx}`}
                    className="rounded-md bg-slate-950/60 px-3 py-2 text-slate-300 space-y-0.5"
                  >
                    <div className="font-medium text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span>{src.label}</span>
                      <ArrowRight size={12} className="text-emerald-400 shrink-0" />
                      <span>{target?.label || conn.targetId}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {conn.relationship} — {conn.whyItMatters}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
