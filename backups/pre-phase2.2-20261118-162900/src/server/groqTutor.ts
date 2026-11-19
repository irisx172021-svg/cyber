import Groq from 'groq-sdk';
import { ACADEMY_CURRICULUM } from '../data/curriculum.ts';
import { resolveCanonicalLessonId } from '../data/curriculumMetadata.ts';
import { getPracticalLabById, getPracticalLabForLesson } from '../data/practicalLabs/index.ts';
import { Tier, Topic, Lesson, TutorAction } from '../types';

export type { TutorAction };

export interface LessonContext {
  lesson: Lesson;
  topic: Topic;
  tier: Tier;
}

// Pre-index curriculum lessons for instant server-side lookup
const lessonMap = new Map<string, LessonContext>();

for (const tier of ACADEMY_CURRICULUM) {
  for (const topic of tier.topics) {
    for (const lesson of topic.lessons) {
      lessonMap.set(lesson.id, { lesson, topic, tier });
    }
  }
}

export function getLessonContext(lessonId: string): LessonContext | undefined {
  const canonicalId = resolveCanonicalLessonId(lessonId);
  return lessonMap.get(canonicalId);
}

// In-memory rate limiting: 30 requests per IP per minute
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  clientIp: string,
  maxRequests = 30,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimits.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimits.set(clientIp, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= maxRequests) {
    const resetInSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, remaining: 0, resetInSec };
  }

  record.count += 1;
  const resetInSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
  return { allowed: true, remaining: maxRequests - record.count, resetInSec };
}

/**
 * Extracts explicit learning objectives section from lesson markdown if present.
 */
function extractLearningObjectives(content: string): string {
  const match = content.match(/####\s*Learning Objectives\s*\n([\s\S]*?)(?=\n#{2,4}\s|\n---|$)/i);
  return match ? match[1].trim() : '';
}

/**
 * Action prompt builders tailored for clear, beginner-friendly cybersecurity pedagogy.
 */
export function getActionPrompt(action: TutorAction, userMessage?: string): string {
  const customNote = userMessage?.trim()
    ? `\n\nStudent's specific note / question: "${userMessage.trim()}"`
    : '';

  switch (action) {
    case 'explain_simply':
      return (
        `Explain the core concepts of this lesson (or the concept just discussed) using simple, everyday English. ` +
        `Avoid heavy jargon—whenever you must mention a technical term, define it immediately in plain words. ` +
        `Include one relatable everyday analogy and one short, concrete example so a complete beginner can grasp it easily.${customNote}`
      );

    case 'step_by_step':
      return (
        `Break down how the main mechanism, workflow, or command in this lesson works into clear numbered steps (Step 1, Step 2, Step 3, ...). ` +
        `Explain what happens first, what happens next, and what the final outcome is, in plain beginner-friendly language.${customNote}`
      );

    case 'real_world_example':
      return (
        `Give a realistic, safe, beginner-friendly real-world example showing how this lesson's concept works in a real system ` +
        `(using a fictional environment such as a small company server or lab workstation). ` +
        `Explain the technology in action first, then show both why defenders care about it and how misuse is prevented.${customNote}`
      );

    case 'analogy':
      return (
        `Explain the key concepts of this lesson using a vivid, familiar everyday analogy (such as a physical desk and filing cabinet, a post office, or a building security checkpoint). ` +
        `Clearly map each part of the analogy back to the real technical concept so the student can remember it easily.${customNote}`
      );

    case 'explain_code':
      return (
        `Explain the code or terminal commands from this lesson (or from the student's question) line by line. ` +
        `For each command or code block, clearly explain:\n` +
        `1. What the command/code does in plain English\n` +
        `2. What each important flag or option means\n` +
        `3. What sample output looks like\n` +
        `4. How to read and interpret the key parts of that output\n` +
        `5. What the result means for cybersecurity (defensive checks or potential security risks).${customNote}`
      );

    case 'compare_concepts':
      return (
        `Compare and contrast the main related concepts, components, or tools taught in this lesson using a clean, properly formatted Markdown comparison table. ` +
        `Keep table cells concise and scannable, ensure there is a blank line before and after the table, and follow the table with 2-3 simple takeaways explaining when each concept applies and why the difference matters in cybersecurity.${customNote}`
      );

    case 'hint':
      return (
        `Give the student a helpful, encouraging hint to help them solve the current lesson's terminal lab or knowledge-check concepts on their own. ` +
        `Do NOT give away the complete final answer immediately—point them toward what to look for, which concept or flag applies, and invite them to try.${customNote}`
      );

    case 'test_understanding':
      return (
        `Test the student's understanding of this lesson by asking ONLY ONE clear, beginner-friendly check question right now. ` +
        `Wait for the student to answer—do NOT reveal the answer or ask multiple questions at once. ` +
        `Base the question strictly on concepts covered in the current lesson.${customNote}`
      );

    case 'summarize':
      return (
        `Provide a clean, concise revision summary (cheat sheet) of the important concepts covered in this lesson. ` +
        `Use clear headings and bullet points so the student can review it quickly before taking the lesson quiz. Only include concepts actually present in this lesson.${customNote}`
      );

    case 'continue':
      return (
        `Please continue and complete your previous explanation smoothly from right where you left off. ` +
        `Do not repeat anything you already wrote above—finish the remaining thoughts, examples, or formatting cleanly.${customNote}`
      );

    case 'ask_question':
    default:
      return userMessage?.trim() || 'Please explain the core concepts of this lesson in a beginner-friendly way.';
  }
}

/**
 * Safely merges a continuation chunk onto a partial response without duplicating overlap
 * or breaking fenced code blocks.
 */
function mergeContinuation(partial: string, continuation: string): string {
  const trimmedPartial = partial.trimEnd();
  const trimmedCont = continuation.trimStart();
  if (!trimmedCont) return partial;

  // Check if partial ended mid-word or mid-line vs at a newline
  const needsSpace =
    trimmedPartial.length > 0 &&
    !/[\s\n`*-]$/.test(trimmedPartial) &&
    !/^[.,;:!?)\]\n]/.test(trimmedCont);

  return `${trimmedPartial}${needsSpace ? ' ' : ''}${trimmedCont}`;
}

// Main execution function calling Groq API
export async function executeGroqTutorRequest({
  lessonContext,
  exerciseId,
  action,
  userMessage,
  history = [],
}: {
  lessonContext: LessonContext;
  exerciseId?: string;
  action: TutorAction;
  userMessage?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientIp?: string;
}): Promise<{
  reply: string;
  action: TutorAction;
  lessonId: string;
  lessonTitle: string;
  model: string;
  truncated: boolean;
  finishReason: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_NOT_CONFIGURED');
  }

  // Model selection: read from GROQ_MODEL, defaulting to openai/gpt-oss-120b
  const modelId = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const isReasoningModel =
    modelId.includes('gpt-oss') || modelId.includes('qwen3') || modelId.includes('deepseek-r1');

  const { lesson, topic, tier } = lessonContext;
  const activeLab = (exerciseId ? getPracticalLabById(exerciseId) : undefined) || getPracticalLabForLesson(lesson.id);

  // Preserve full lesson curriculum text (up to 6500 chars; longest lesson is ~4500 chars)
  const sanitizedContent = (lesson.content || '').slice(0, 6500).trim();
  const learningObjectives =
    lesson.learningObjectives && lesson.learningObjectives.length > 0
      ? lesson.learningObjectives.map((obj) => `- ${obj}`).join('\n')
      : extractLearningObjectives(sanitizedContent);
  const prereqSummary =
    lesson.prerequisites && lesson.prerequisites.length > 0
      ? lesson.prerequisites.map((id) => lessonMap.get(id)?.lesson.title || id).join(', ')
      : 'None';

  const quizTopics = (lesson.quiz || [])
    .slice(0, 4)
    .map((q, idx) => `Checkpoint ${idx + 1}: ${q.question}`)
    .join('\n');

  const practicalLabContext = activeLab
    ? `\nACTIVE PRACTICAL LAB EXERCISE CONTEXT:
- Lab ID: ${activeLab.id}
- Lab Title: ${activeLab.title} (${activeLab.kind})
- Objective: ${activeLab.objective}
- Summary: ${activeLab.shortExplanation}
- Expected Outcome: ${activeLab.expectedOutcome}
- Practice Challenge Question: ${activeLab.challenge.prompt}
- Built-in Pedagocial Hint: ${activeLab.challenge.hint}
CRITICAL LAB TUTORING RULE: When helping with this practical exercise (especially when action is "hint" or the student asks about the lab), guide the student step-by-step on what to examine in the Explore section and explain the underlying principle—NEVER immediately spoil or reveal the final multiple-choice answer option unprompted!\n`
    : '';

  const systemPrompt = `You are the CyberFoundations Academy AI Tutor — a patient, encouraging, beginner-friendly cybersecurity instructor.
Teach like a real mentor sitting next to a beginner student, NOT like a dry technical manual or reference encyclopedia.

CURRENT ACTIVE LESSON CONTEXT (Authoritative Curriculum Data):
- Tier: Tier ${tier.number} — ${tier.title} (${tier.description})
- Topic: ${topic.title} (Track: ${topic.category.toUpperCase()})
- Lesson ID: ${lesson.id}
- Lesson Title: ${lesson.title}
- Lesson Description: ${lesson.description}
- Difficulty: ${(lesson.difficulty || 'beginner').toUpperCase()}
- Estimated Duration: ${lesson.duration}${lesson.estimatedMinutes ? ` (${lesson.estimatedMinutes} min)` : ''}
- Required Prerequisites: ${prereqSummary}
${learningObjectives ? `- Learning Objectives:\n${learningObjectives}\n` : ''}${lesson.requiresTerminal ? `- Has Terminal Lab: Yes` : '- Has Terminal Lab: No'}
${lesson.homeworkCommand ? `- Homework Command: \`${lesson.homeworkCommand}\`` : ''}
${lesson.homeworkInstruction ? `- Homework Task: ${lesson.homeworkInstruction}` : ''}
${lesson.homeworkHint ? `- Homework Hint Reference: ${lesson.homeworkHint}` : ''}
${practicalLabContext}
ACTUAL LESSON SYLLABUS CONTENT:
${sanitizedContent}

${quizTopics ? `LESSON KNOWLEDGE CHECKPOINTS (for context — do not spoil quiz answers unprompted):\n${quizTopics}\n` : ''}

CORE TEACHING RULES (MUST FOLLOW):
1. **Beginner-Friendly Structure for Conceptual Questions**:
   When a student asks you to explain a concept or asks "What is..." / "How does..." / "Why...", organize your explanation gently and clearly using these 7 building blocks (skip #7 if it would feel forced or repetitive, or if you are giving a summary/hint):
   - **1. Simple Definition**: Start with one plain-English sentence.
   - **2. What It Actually Means**: Explain the idea in everyday language. Never drop technical jargon without explaining it first!
   - **3. How It Works Step by Step**: Walk through the sequence in numbered steps.
   - **4. Real-World Analogy**: Compare it to something familiar from daily life.
   - **5. Practical Example**: Give a concrete, easy-to-follow example (or safe sample output).
   - **6. Why It Matters in Cybersecurity**: Explain its security relevance clearly, separating **defensive protection** from **attacker misuse**.
   - **7. Quick Check** *(when appropriate)*: End with **one** short, friendly question to help them check their understanding—do NOT turn every reply into a test or ask multiple questions at once.

2. **Strict Curriculum Grounding**:
   - Rely strictly on the actual tier, topic, lesson content, objectives, and lab exercises above.
   - NEVER invent facts about what the lesson covers or claim a topic is in this lesson when it is not.
   - If the student asks about something outside the current lesson, clearly tell them: *"Note: This goes beyond what is covered in the current lesson, so think of this as bonus additional knowledge."* Then still give a clear, safe, beginner-friendly answer.

3. **Safe Cybersecurity & Terminal Teaching**:
   - Always explain the underlying technology before jumping into attacks or defense.
   - Clearly distinguish defensive engineering from offensive misuse.
   - Only use fictional hosts (e.g., \`lab-workstation-01\`), documentation IP ranges (e.g., \`192.0.2.10\`), and safe practice environments.
   - Never run or pretend to execute arbitrary commands on the user's computer. Always explain what a command does before suggesting the student try it in their lab.
   - Whenever explaining a terminal command (such as \`lscpu\`, \`lsblk\`, \`free -h\`, etc.), always explain:
     (a) What the command does,
     (b) What each important flag/option means (or state if none are used),
     (c) What output to expect (with a short realistic example block),
     (d) How to read and interpret the key lines/columns, and
     (e) What the result tells us about security.

4. **Interactive & Supportive Tutoring**:
   - Ask at most ONE question at a time and wait for the student's reply.
   - When the student answers a question, evaluate it accurately and kindly: praise what they got right, explain any mistakes gently without discouraging them, and offer a small hint before giving away the full answer.
   - If the student says they are confused or don't understand, switch to simpler words and a fresh everyday analogy.

5. **Clean Markdown Formatting**:
   - Use standard Markdown headings (\`###\`, \`####\`), numbered lists, bullet lists, inline \`code\`, and fenced code blocks with language tags (\`\`\`bash, \`\`\`text, etc.).
   - When comparing concepts, use clean GitHub-Flavored Markdown tables (\`| Column | Column |\`) with a separator row (\`| --- | --- |\`) and ALWAYS place a blank line before and after tables, lists, headings, and code blocks.
   - Ensure every response is complete and never cuts off mid-sentence or mid-codeblock.`;

  // Keep up to 10 recent messages, preserving full assistant check-questions (up to 2500 chars)
  const safeHistory = (history || [])
    .slice(-10)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.slice(0, 2500)
    }));

  const userPrompt = getActionPrompt(action, userMessage);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...safeHistory,
    { role: 'user', content: userPrompt }
  ];

  const groq = new Groq({
    apiKey,
    timeout: 45000 // 45s timeout for complete, unhurried pedagogical answers
  });

  const buildRequestParams = (
    msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    tokenBudget: number
  ) => {
    const params: any = {
      model: modelId,
      messages: msgs,
      temperature: 0.55,
      max_completion_tokens: tokenBudget,
      top_p: 0.95
    };
    if (isReasoningModel) {
      params.reasoning_effort = 'low';
    }
    return params;
  };

  const completion = await groq.chat.completions.create(buildRequestParams(messages, 3072));
  const choice = completion.choices?.[0];
  let finishReason: string = choice?.finish_reason || 'stop';

  if (finishReason === 'content_filter') {
    throw new Error('GROQ_CONTENT_FILTERED');
  }

  let reply = (choice?.message?.content || '').trim();
  if (!reply) {
    throw new Error('GROQ_EMPTY_RESPONSE');
  }

  let promptTokens = completion.usage?.prompt_tokens || 0;
  let completionTokens = completion.usage?.completion_tokens || 0;
  let totalTokens = completion.usage?.total_tokens || 0;

  // If response hit token length limit, perform one controlled automatic continuation
  if (finishReason === 'length') {
    const continuationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'assistant', content: reply },
      {
        role: 'user',
        content:
          'Your previous response stopped before finishing. Continue seamlessly from the exact point where you stopped to complete the explanation cleanly. Do not repeat anything already written.'
      }
    ];

    try {
      const contCompletion = await groq.chat.completions.create(
        buildRequestParams(continuationMessages, 2048)
      );
      const contChoice = contCompletion.choices?.[0];
      const contContent = (contChoice?.message?.content || '').trim();
      if (contContent) {
        reply = mergeContinuation(reply, contContent);
        finishReason = contChoice?.finish_reason || 'stop';
        promptTokens += contCompletion.usage?.prompt_tokens || 0;
        completionTokens += contCompletion.usage?.completion_tokens || 0;
        totalTokens += contCompletion.usage?.total_tokens || 0;
      }
    } catch {
      // Preserve partial reply and mark truncated=true so the UI can offer Continue
    }
  }

  const truncated = finishReason === 'length';

  return {
    reply,
    action,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    model: completion.model || modelId,
    truncated,
    finishReason,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens
    }
  };
}
