import React, { useState } from 'react';
import Markdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

/**
 * Normalizes Markdown text before parsing so GFM tables, lists, and code blocks
 * render reliably even if an LLM omits blank lines around tables or leaves a fence unclosed.
 */
export function normalizeMarkdown(raw: string): string {
  if (!raw) return '';

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let inFence = false;
  let fenceChar = '';

  const isTableSeparator = (line: string) =>
    /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line) ||
    /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);

  const looksLikeTableRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.includes('|') && !trimmed.startsWith('>') && !trimmed.startsWith('#');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track fenced code blocks (``` or ~~~)
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar && trimmed.length >= 3 && /^[`~]+\s*$/.test(trimmed)) {
        inFence = false;
        fenceChar = '';
      }
      output.push(line);
      continue;
    }

    if (!inFence) {
      // Ensure a blank line precedes a Markdown table header row so remark-gfm always parses it
      const nextLine = lines[i + 1];
      if (
        nextLine !== undefined &&
        looksLikeTableRow(line) &&
        isTableSeparator(nextLine)
      ) {
        const prevLine = output[output.length - 1];
        if (prevLine !== undefined && prevLine.trim() !== '' && !looksLikeTableRow(prevLine)) {
          output.push('');
        }
      }

      // Ensure a blank line follows a table before normal non-table text
      if (
        i > 0 &&
        output.length > 0 &&
        trimmed !== '' &&
        !looksLikeTableRow(line) &&
        looksLikeTableRow(output[output.length - 1]) &&
        output[output.length - 1].trim().startsWith('|')
      ) {
        output.push('');
      }
    }

    output.push(line);
  }

  // Safely close any unclosed code fence (e.g. if a stream or token budget stopped mid-block)
  if (inFence) {
    output.push(fenceChar.repeat(3));
  }

  return output.join('\n');
}

function extractTextFromChildren(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromChildren(node.props.children);
  }
  return '';
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const cleanCode = code.replace(/\n$/, '');
  const normalizedLang = (language || '').toLowerCase();

  let highlightedHtml: string | null = null;
  if (normalizedLang && normalizedLang !== 'text' && normalizedLang !== 'plaintext' && normalizedLang !== 'output' && normalizedLang !== 'console') {
    try {
      if (hljs.getLanguage(normalizedLang)) {
        highlightedHtml = hljs.highlight(cleanCode, {
          language: normalizedLang,
          ignoreIllegals: true,
        }).value;
      }
    } catch {
      highlightedHtml = null;
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 w-full max-w-full rounded-lg border border-slate-800 bg-slate-950/95 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/90 text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-cyan-400/90 font-semibold">
          <Terminal className="h-3 w-3" />
          {normalizedLang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="w-full overflow-x-auto p-3">
        <pre className="m-0 p-0 bg-transparent text-[11.5px] leading-relaxed font-mono text-slate-200 whitespace-pre">
          {highlightedHtml ? (
            <code
              className={`hljs language-${normalizedLang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <code className="font-mono text-slate-200">{cleanCode}</code>
          )}
        </pre>
      </div>
    </div>
  );
}

export default function MarkdownRenderer({
  content,
  className = '',
  compact = false,
}: MarkdownRendererProps) {
  const normalized = normalizeMarkdown(content);

  const components: Components = {
    h1: ({ children }) => (
      <h1
        className={`${
          compact ? 'text-base mt-3 mb-2' : 'text-lg mt-5 mb-2.5'
        } font-bold text-white tracking-tight border-b border-slate-800 pb-1.5 first:mt-0`}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={`${
          compact ? 'text-sm mt-3.5 mb-1.5' : 'text-base mt-5 mb-2'
        } font-bold text-cyan-300 tracking-tight border-b border-slate-800/70 pb-1 first:mt-0`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={`${
          compact ? 'text-[13px] mt-3 mb-1.5' : 'text-sm mt-4 mb-1.5'
        } font-bold text-white tracking-tight first:mt-0`}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={`${
          compact ? 'text-xs mt-2.5 mb-1' : 'text-[13px] mt-3.5 mb-1.5'
        } font-bold text-emerald-300 tracking-tight first:mt-0`}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-xs font-semibold text-slate-200 mt-2 mb-1 first:mt-0">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-xs font-semibold text-slate-400 mt-2 mb-1 first:mt-0">
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p className={`${compact ? 'my-2' : 'my-2.5'} text-slate-200 leading-relaxed first:mt-0 last:mb-0 break-words`}>
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 pl-5 list-disc space-y-1.5 text-slate-200 marker:text-cyan-400">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 pl-5 list-decimal space-y-1.5 text-slate-200 marker:text-cyan-400 marker:font-mono marker:font-semibold">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-0.5 [&>p]:my-1 [&>ul]:mt-1.5 [&>ol]:mt-1.5">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-slate-300">{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-2 border-cyan-500/70 bg-cyan-500/5 px-3.5 py-2 rounded-r-lg text-slate-300 italic [&>p]:my-1">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-4 border-slate-800" />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 break-all"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="my-3 w-full max-w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 shadow-sm">
        <table className="w-full min-w-[380px] border-collapse text-left text-[11.5px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-900/95 border-b border-slate-700/80 text-cyan-300 font-mono uppercase tracking-wider text-[10.5px]">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-800/80 text-slate-200">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-800/35 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 font-semibold whitespace-nowrap border-r border-slate-800/70 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 align-top leading-relaxed border-r border-slate-800/50 last:border-r-0">
        {children}
      </td>
    ),
    pre: ({ children }) => {
      if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(children)) {
        const classNameProp = children.props.className || '';
        const langMatch = /language-([a-zA-Z0-9_-]+)/.exec(classNameProp);
        const language = langMatch ? langMatch[1] : '';
        const rawCode = extractTextFromChildren(children.props.children);
        return <CodeBlock language={language} code={rawCode} />;
      }
      const fallbackCode = extractTextFromChildren(children);
      return <CodeBlock language="" code={fallbackCode} />;
    },
    code: ({ className: codeClassName, children }) => {
      // Inline code (block code is intercepted by `pre` above)
      return (
        <code
          className={`px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 border border-slate-700/70 text-cyan-300 font-mono text-[0.9em] break-words ${
            codeClassName || ''
          }`}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className={`markdown-body w-full max-w-full min-w-0 ${compact ? 'text-xs' : 'text-[13px]'} leading-relaxed ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {normalized}
      </Markdown>
    </div>
  );
}
