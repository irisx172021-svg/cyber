import {
  DiagramConnection,
  DiagramExploreItem,
  Lesson,
  LogEntryItem,
  PracticalLab,
  Question,
} from '../types';

function extractLessonH4Headings(content: string): string[] {
  return (content || '')
    .split('\n')
    .filter((line) => line.startsWith('#### '))
    .map((line) => line.replace(/^####\s+/, '').trim())
    .filter(Boolean);
}

const SECTION_KEYWORDS: Array<{ match: RegExp; prefer: RegExp[] }> = [
  {
    match: /example|command|config|yaml|json|sql|grep|nmap|wireshark|burp|volatility|sysmon|aws|azure|gcp|docker|kube/i,
    prefer: [/examples/i, /how it works/i, /core explanation/i],
  },
  {
    match: /mistake|avoid|insecure|fail|risk|attack|bypass|expos|weak|danger|wrong|vulnerab/i,
    prefer: [/common mistakes/i, /security relevance/i, /why it matters/i],
  },
  {
    match: /secur|defen|harden|cia|aaa|least privilege|mitig|remediat|protect|zero trust|mfa|tls|encrypt/i,
    prefer: [/security relevance/i, /core explanation/i, /key takeaways/i],
  },
  {
    match: /how|step|order|flow|stage|lifecycle|handshake|phase|process|packet/i,
    prefer: [/how it works/i, /core explanation/i],
  },
  {
    match: /career|cert|soc|compliance|gdpr|hipaa|pci|nist|iso|ctf|interview|portfolio/i,
    prefer: [/real-world context/i, /key takeaways/i, /core explanation/i],
  },
];

export function selectBestReviewSection(
  lessonContent: string | undefined,
  promptText: string
): string {
  const headings = extractLessonH4Headings(lessonContent || '');
  if (headings.length === 0) return 'Core Explanation';

  for (const rule of SECTION_KEYWORDS) {
    if (rule.match.test(promptText)) {
      for (const p of rule.prefer) {
        const hit = headings.find((h) => p.test(h));
        if (hit) return hit;
      }
    }
  }

  return (
    headings.find((h) => /core explanation/i.test(h)) ||
    headings.find((h) => /how it works/i.test(h)) ||
    headings[0]
  );
}

function summarizeChoiceEssence(optionText: string): string {
  const cleaned = optionText
    .replace(/^(yes|no|only if|always|never)\s*[—–-]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const clause = cleaned.split(/[.;—]/)[0].trim();
  return clause.length > 96 ? `${clause.slice(0, 93).trim()}...` : clause;
}

function diagnoseMisconceptionPattern(
  chosenOption: string,
  questionPrompt: string,
  reviewSection: string
): { feedback: string; partiallySound: boolean } {
  const optLower = chosenOption.toLowerCase();
  const qLower = questionPrompt.toLowerCase();
  const essence = summarizeChoiceEssence(chosenOption);

  // Detect fundamental misconception patterns cleanly without revealing answer keys
  if (/\b(always|every|100%|all)\b/.test(optLower) && /\b(automatically|guarantees?|immune|cryptographically verified|impossible)\b/.test(optLower)) {
    return {
      partiallySound: false,
      feedback: `Over-generalization risk ("${essence}"): security controls rarely provide automatic or blanket guarantees across all states. Re-check the exact trust boundary in "${reviewSection}".`,
    };
  }
  if (/\b(disable|remove|turn off|chmod 777|skip|ignore|delete|cleartext|plain-text|protocol 1)\b/.test(optLower) && !/\bprevent|block|avoid\b/.test(optLower)) {
    return {
      partiallySound: false,
      feedback: `Weakening/destructive trap ("${essence}"): disabling visibility, encryption, or least-privilege boundaries increases exposure rather than fixing the root cause.`,
    };
  }
  if (/\b(encrypts?|encrypted)\b/.test(optLower) && /\b(ram|cache|ssd|encoding|base64|chmod|regex|cors|dns)\b/.test(optLower)) {
    return {
      partiallySound: false,
      feedback: `Term confusion ("${essence}"): encoding, file permissions, or transport isolation do not provide encryption or substitute for the mechanism asked here.`,
    };
  }
  if (/\b(ui|frontend|client-side|browser|localstorage|rename)\b/.test(optLower) && /\b(auth|sql|permission|branch|secret|protect)\b/.test(optLower)) {
    return {
      partiallySound: false,
      feedback: `Client/surface boundary confusion ("${essence}"): controls performed only in the UI or by renaming assets do not enforce security on server state or history.`,
    };
  }

  // Check if option shares domain terms meaningfully (nuanced partial reasoning vs unrelated distractor)
  const promptWords = new Set(
    qLower
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
  );
  const optWords = optLower
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const overlapCount = optWords.filter((w) => promptWords.has(w)).length;

  if (overlapCount >= 2) {
    return {
      partiallySound: true,
      feedback: `Adjacent concept ("${essence}"): you spotted related domain terminology, but this choice misplaces where enforcement, scope, or causality actually happens. Review "${reviewSection}".`,
    };
  }

  return {
    partiallySound: false,
    feedback: `Mechanism mismatch ("${essence}"): verify what component actually performs this role and what boundary changes in "${reviewSection}".`,
  };
}

export function buildQuestionFeedbackMetadata(
  question: Question,
  lessonContent?: string
): Pick<Question, 'optionFeedback' | 'partialCreditIndices' | 'reviewSection'> {
  const reviewSection = question.reviewSection || selectBestReviewSection(lessonContent, question.question);
  if (question.optionFeedback && question.optionFeedback.length === question.options.length) {
    return {
      optionFeedback: question.optionFeedback,
      partialCreditIndices: question.partialCreditIndices,
      reviewSection,
    };
  }

  const partialCreditIndices: number[] = [];
  const optionFeedback = question.options.map((opt, idx) => {
    if (idx === question.correctOption) {
      return question.explanation || 'Correct! This accurately reflects the underlying mechanism and security boundary.';
    }
    const diagnosed = diagnoseMisconceptionPattern(opt, question.question, reviewSection);
    if (diagnosed.partiallySound && partialCreditIndices.length < 2) {
      partialCreditIndices.push(idx);
    }
    return diagnosed.feedback;
  });

  return {
    optionFeedback,
    partialCreditIndices,
    reviewSection,
  };
}

function buildDiagramConnectionsForLab(lab: PracticalLab): DiagramExploreItem[] {
  const items = lab.diagramItems || [];
  if (items.length === 0) return items;
  const isSeq = lab.diagramMode === 'sequence';

  return items.map((item, idx) => {
    if (item.connections && item.connections.length > 0) {
      return item;
    }

    const connections: DiagramConnection[] = [];
    if (isSeq) {
      if (idx + 1 < items.length) {
        const next = items[idx + 1];
        connections.push({
          targetId: next.id,
          relationship: `Next Stage -> ${next.label}`,
          whyItMatters: `Hands validated state forward to ${next.role}; ${next.securityRelevance}`,
        });
      } else if (items.length > 1) {
        const prev = items[0];
        connections.push({
          targetId: prev.id,
          relationship: `Feedback Loop -> ${prev.label}`,
          whyItMatters: `Closes telemetry/verification back to ${prev.role}; ${prev.securityRelevance}`,
        });
      }
      if (idx > 0) {
        const prev = items[idx - 1];
        connections.push({
          targetId: prev.id,
          relationship: `Depends on <- ${prev.label}`,
          whyItMatters: `Relies on upstream integrity from ${prev.role}: ${prev.summary.split('.')[0]}.`,
        });
      }
    } else {
      const next = items[(idx + 1) % items.length];
      if (next && next.id !== item.id) {
        connections.push({
          targetId: next.id,
          relationship: `Coupled with -> ${next.label}`,
          whyItMatters: `Shares runtime or trust boundary with ${next.role}; ${next.securityRelevance}`,
        });
      }
      if (items.length >= 3) {
        const peer = items[(idx + 2) % items.length];
        if (peer && peer.id !== item.id && peer.id !== next.id) {
          connections.push({
            targetId: peer.id,
            relationship: `Defense Layer <-> ${peer.label}`,
            whyItMatters: `Reinforces isolation alongside ${peer.role}: ${peer.securityRelevance}`,
          });
        }
      }
    }

    return {
      ...item,
      connections,
    };
  });
}

function buildScenarioRationales(lab: PracticalLab): Record<number, string> {
  if (lab.artifactLineRationales && Object.keys(lab.artifactLineRationales).length > 0) {
    return lab.artifactLineRationales;
  }
  const lines = (lab.artifactContent || '').split('\n');
  const highlights = lab.artifactHighlightLines || [];
  const rationales: Record<number, string> = {};
  const explFirstSentence = (lab.challenge.explanation || lab.expectedOutcome || '').split(/(?<=[.!?])\s+/)[0];

  for (const ln of highlights) {
    const lineText = (lines[ln - 1] || '').trim();
    const snippet = lineText.length > 90 ? `${lineText.slice(0, 87)}...` : lineText;
    rationales[ln] = `Line ${ln} (\`${snippet}\`): ${explFirstSentence || 'Directly introduces the security weakness examined in this artifact.'}`;
  }
  return rationales;
}

function buildScenarioTradeoffs(lab: PracticalLab): string[] {
  if (lab.decisionTradeoffs && lab.decisionTradeoffs.length > 0) {
    return lab.decisionTradeoffs;
  }
  const explanationClause = (lab.challenge.explanation || '').trim();
  return [
    `Operational Tradeoff (${lab.title}): Tightening this control closes direct exposure immediately, but always stage verification tests so authorized workflows are not disrupted.`,
    explanationClause
      ? `Engineering Takeaway: ${explanationClause}`
      : `Verification Standard: Validate both positive functional paths and negative unauthorized requests after modifying ${lab.artifactTitle || 'the configuration'}.`,
  ];
}

function enrichLogEntryNotes(entries: LogEntryItem[], lab: PracticalLab): LogEntryItem[] {
  return entries.map((entry) => {
    if (entry.analysisNote) return entry;
    return {
      ...entry,
      analysisNote: entry.isSuspicious
        ? `TRUE POSITIVE (${entry.source}): ${entry.details}`
        : `Authorized Baseline (${entry.source}): ${entry.details} Consistent with normal operations around ${entry.timestamp}.`,
    };
  });
}

export function enhanceSinglePracticalLab(
  lab: PracticalLab,
  lessonById?: Map<string, Lesson>
): PracticalLab {
  const lesson = lessonById?.get(lab.lessonId);
  const reviewSection =
    lab.challenge.reviewSection ||
    selectBestReviewSection(lesson?.content, `${lab.title} ${lab.challenge.prompt}`);

  const partialCreditIndices = [...(lab.challenge.partialCreditIndices || [])];
  const optionFeedback =
    lab.challenge.optionFeedback && lab.challenge.optionFeedback.length === lab.challenge.options.length
      ? lab.challenge.optionFeedback
      : lab.challenge.options.map((opt, idx) => {
          if (idx === lab.challenge.correctIndex) {
            return lab.challenge.explanation || 'Correct! This accurately resolves the lab scenario.';
          }
          const diagnosed = diagnoseMisconceptionPattern(opt, lab.challenge.prompt, reviewSection);
          if (diagnosed.partiallySound && partialCreditIndices.length < 2) {
            partialCreditIndices.push(idx);
          }
          return diagnosed.feedback;
        });

  const enriched: PracticalLab = {
    ...lab,
    challenge: {
      ...lab.challenge,
      optionFeedback,
      partialCreditIndices,
      reviewSection,
    },
  };

  if (lab.kind === 'diagram' && lab.diagramItems) {
    enriched.diagramItems = buildDiagramConnectionsForLab(lab);
  }

  if (lab.kind === 'log_investigation' && lab.logEntries) {
    enriched.logEntries = enrichLogEntryNotes(lab.logEntries, lab);
    if (!enriched.correlationSummary) {
      enriched.correlationSummary = `Investigation Correlation: Correlating ${lab.suspiciousEntryId} against the surrounding baseline records isolates the high-signal anomaly.`;
    }
  }

  if (lab.kind === 'scenario') {
    enriched.artifactLineRationales = buildScenarioRationales(lab);
    enriched.decisionTradeoffs = buildScenarioTradeoffs(lab);
  }

  return enriched;
}
