import React from 'react';
import { FileCode2 } from 'lucide-react';

interface ScenarioDecisionLabProps {
  artifactTitle?: string;
  artifactContent?: string;
  highlightLines?: number[];
}

export const ScenarioDecisionLab: React.FC<ScenarioDecisionLabProps> = ({
  artifactTitle = 'artifact-inspection.txt',
  artifactContent = '',
  highlightLines = [],
}) => {
  const lines = artifactContent.split('\n');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Inspect the highlighted lines in the system artifact below before answering.</span>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-slate-800 bg-slate-900/70">
          <FileCode2 size={14} className="text-sky-400 shrink-0" />
          <span className="text-xs font-mono text-slate-200 truncate">{artifactTitle}</span>
        </div>

        <div className="overflow-x-auto py-2.5 text-xs font-mono leading-relaxed">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightLines.includes(lineNumber);
            return (
              <div
                key={lineNumber}
                className={`flex px-3.5 py-0.5 ${
                  isHighlighted ? 'bg-amber-500/10 text-amber-100' : 'text-slate-300'
                }`}
              >
                <span className="w-8 shrink-0 select-none text-right pr-3 tabular-nums text-slate-600">
                  {lineNumber}
                </span>
                <pre className="whitespace-pre">{line || ' '}</pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
