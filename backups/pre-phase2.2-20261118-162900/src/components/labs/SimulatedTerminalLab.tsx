import React, { useState, useRef, useEffect } from 'react';
import { Terminal, CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { TerminalCommandSimulation } from '../../types';

interface SimulatedTerminalLabProps {
  promptPrefix?: string;
  commands: TerminalCommandSimulation[];
  requiredCommands?: string[];
  executedCommands: string[];
  onExecuteCommand: (canonicalCommand: string) => void;
}

interface HistoryLine {
  id: string;
  input: string;
  matched?: TerminalCommandSimulation;
  errorText?: string;
}

export const SimulatedTerminalLab: React.FC<SimulatedTerminalLabProps> = ({
  promptPrefix = 'student@lab:~$ ',
  commands,
  requiredCommands = [],
  executedCommands,
  onExecuteCommand,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const runSimulatedCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    if (trimmed === 'help') {
      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          input: trimmed,
          matched: {
            command: 'help',
            description: 'Available simulated commands for this lab',
            flagsSummary: 'Click any starter command above or type it below',
            output: commands.map((c) => `  ${c.command}`).join('\n'),
            interpretation: 'Run each required mission command to observe the real output and interpretation.',
          },
        },
      ]);
      setInputVal('');
      return;
    }

    const normalized = trimmed.toLowerCase();
    const match = commands.find((cmd) => {
      if (cmd.command.toLowerCase() === normalized) return true;
      if (cmd.aliases?.some((alias) => normalized === alias.toLowerCase() || normalized.startsWith(alias.toLowerCase()))) {
        return true;
      }
      return false;
    });

    if (match) {
      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          input: trimmed,
          matched: match,
        },
      ]);
      onExecuteCommand(match.command);
    } else {
      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          input: trimmed,
          errorText: `Unrecognized command in this simulated sandbox. Try one of the lab commands above (or type "help").`,
        },
      ]);
    }
    setInputVal('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSimulatedCommand(inputVal);
  };

  const targetCommands = requiredCommands.length > 0 ? requiredCommands : commands.map((c) => c.command);
  const completedRequiredCount = targetCommands.filter((c) => executedCommands.includes(c)).length;

  return (
    <div className="space-y-4">
      {/* Mission Checklist & Quick Commands */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>Run the simulated commands below (click to autofill & execute, or type manually).</span>
          <span className="font-mono tabular-nums text-slate-300">
            Tasks {completedRequiredCount} / {targetCommands.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {commands.map((cmd) => {
            const done = executedCommands.includes(cmd.command);
            return (
              <div
                key={cmd.command}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 ${
                  done
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Terminal size={14} className="text-slate-400 shrink-0" />
                    )}
                    <code className="text-xs font-mono text-slate-100 break-all">{cmd.command}</code>
                  </div>
                  <p className="text-xs text-slate-400 pl-5">{cmd.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runSimulatedCommand(cmd.command)}
                  className="min-h-[44px] sm:min-h-[34px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play size={12} />
                  {done ? 'Run Again' : 'Run Command'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Terminal Window */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-900/80">
          <span className="text-xs font-mono text-slate-400">Simulated Sandbox Shell</span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>

        <div
          ref={scrollRef}
          className="p-3.5 max-h-80 overflow-y-auto font-mono text-xs space-y-3"
        >
          {history.length === 0 ? (
            <div className="text-slate-500">
              Ready. Click &quot;Run Command&quot; above or type a command and press Enter.
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="space-y-1.5">
                <div className="text-slate-200 break-all">
                  <span className="text-sky-400">{promptPrefix}</span>
                  <span>{entry.input}</span>
                </div>
                {entry.errorText ? (
                  <div className="text-amber-300 pl-2">{entry.errorText}</div>
                ) : entry.matched ? (
                  <div className="space-y-2 pl-2 border-l border-slate-800">
                    <pre className="text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                      {entry.matched.output}
                    </pre>
                    <div className="text-[11px] font-sans text-slate-400 space-y-0.5 pt-1">
                      <div>
                        <span className="font-semibold text-slate-300">Flags / Syntax: </span>
                        {entry.matched.flagsSummary}
                      </div>
                      <div>
                        <span className="font-semibold text-sky-300">Interpretation: </span>
                        {entry.matched.interpretation}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3.5 py-2.5 border-t border-slate-800 bg-slate-900/40"
        >
          <span className="font-mono text-xs text-sky-400 shrink-0 hidden sm:inline">{promptPrefix}</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type command or 'help'..."
            className="flex-1 min-w-0 bg-transparent text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none min-h-[36px]"
          />
          <button
            type="submit"
            className="min-h-[40px] px-3 py-1.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-medium text-sky-300 whitespace-nowrap shrink-0"
          >
            Execute
          </button>
        </form>
      </div>
    </div>
  );
};
