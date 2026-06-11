import type { ConversationTurn } from "./build-chat-prompt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Section {
  heading: string;
  content: string;
}

export interface ScoredSection extends Section {
  score: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_K = 4;
const SCORE_THRESHOLD = 0.08;
const MAX_SECTION_CHARS = 2000;
const MAX_OUTPUT_CHARS = 6000;

/**
 * Common Spanish and English stopwords that carry no topical signal.
 * Tokens shorter than 3 characters are dropped before this list is consulted.
 */
const STOPWORDS = new Set([
  // Spanish
  "que", "una", "uno", "los", "las", "del", "por", "con", "para",
  "como", "más", "mas", "pero", "sus", "les", "bien", "sin", "sobre",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "hay", "ser", "fue", "son", "han", "has", "era", "siendo",
  "todo", "todos", "toda", "todas", "poco", "cada", "algo",
  "cuando", "donde", "quien", "cuyo", "cuyos",
  "solo", "aun", "muy", "tal", "vez", "asi",
  "porque", "aunque", "mientras", "durante", "entre",
  "puede", "pueden", "debe", "deben", "hacer", "haber",
  "parte", "traves", "demas",
  // English
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "has", "had", "was", "were", "this", "that", "with", "from",
  "they", "will", "have", "been", "when", "who", "one", "what",
  "more", "also", "into", "its", "than", "then", "their", "there",
  "about", "which", "would", "should", "could", "how", "some",
  "after", "before", "other", "such", "your",
]);

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/** Remove common Spanish diacritics (lowercase already applied by caller). */
function removeAccents(text: string): string {
  return text
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/ñ/g, "n");
}

/** Convert text to a set of meaningful tokens. */
function tokenize(text: string): Set<string> {
  const normalised = removeAccents(text.toLowerCase());
  // Remove punctuation but keep digits and letters
  const cleaned = normalised.replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter((t) => {
    if (t.length < 3) return false;
    if (STOPWORDS.has(t)) return false;
    return true;
  });
  return new Set(tokens);
}

// ---------------------------------------------------------------------------
// Section splitting
// ---------------------------------------------------------------------------

/**
 * Split a compiled markdown string into sections using heading lines
 * (#, ##, ###, ####) as boundaries.
 *
 * - Content before the first heading is placed under "Introducción".
 * - Each section is trimmed.
 * - Sections larger than MAX_SECTION_CHARS are split on paragraph breaks.
 * - Empty sections are discarded.
 */
export function splitMarkdownIntoSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const raw: Array<{ heading: string; lines: string[] }> = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = /^(#{1,4})\s+(.+)/.exec(line);
    if (headingMatch) {
      if (current) raw.push(current);
      current = { heading: headingMatch[2].trim(), lines: [] };
    } else {
      if (!current) {
        current = { heading: "Introducción", lines: [] };
      }
      current.lines.push(line);
    }
  }
  if (current) raw.push(current);

  const sections: Section[] = [];

  for (const raw_section of raw) {
    const content = raw_section.lines.join("\n").trim();
    if (!content) continue;

    if (content.length <= MAX_SECTION_CHARS) {
      sections.push({ heading: raw_section.heading, content });
      continue;
    }

    // Split large sections on paragraph breaks
    const paragraphs = content.split(/\n{2,}/);
    let chunk = "";
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if (chunk.length + para.length + 2 > MAX_SECTION_CHARS && chunk) {
        sections.push({
          heading:
            chunkIndex === 0
              ? raw_section.heading
              : `${raw_section.heading} (cont. ${chunkIndex})`,
          content: chunk.trim(),
        });
        chunkIndex++;
        chunk = para;
      } else {
        chunk = chunk ? `${chunk}\n\n${para}` : para;
      }
    }
    if (chunk.trim()) {
      sections.push({
        heading:
          chunkIndex === 0
            ? raw_section.heading
            : `${raw_section.heading} (cont. ${chunkIndex})`,
        content: chunk.trim(),
      });
    }
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a single section against a set of query tokens.
 *
 * Score = (number of query tokens present in section content) / (total query tokens)
 * Bonus: +0.15 if at least one query token appears in the section heading.
 */
function scoreSection(section: Section, queryTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0;

  const sectionTokens = tokenize(section.content);
  const headingTokens = tokenize(section.heading);

  let matchCount = 0;
  for (const token of queryTokens) {
    if (sectionTokens.has(token)) matchCount++;
  }

  const baseScore = matchCount / queryTokens.size;

  // Heading bonus
  let headingBonus = 0;
  for (const token of queryTokens) {
    if (headingTokens.has(token)) {
      headingBonus = 0.15;
      break;
    }
  }

  return baseScore + headingBonus;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

/**
 * Build the query text from: current message + last assistant message (if any)
 * + last 2 user turns (to capture follow-up context).
 */
function buildQueryText(
  studentMessage: string,
  conversationHistory: ConversationTurn[]
): string {
  const parts: string[] = [studentMessage];

  // Last assistant message provides the topic context the student is following up on
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === "assistant") {
      parts.push(conversationHistory[i].content);
      break;
    }
  }

  // Last 2 user turns provide additional follow-up context
  let userCount = 0;
  for (let i = conversationHistory.length - 1; i >= 0 && userCount < 2; i--) {
    if (conversationHistory[i].role === "user") {
      parts.push(conversationHistory[i].content);
      userCount++;
    }
  }

  return parts.join(" ");
}

/**
 * Format retrieved sections for injection into the chat prompt.
 * Total output is capped at MAX_OUTPUT_CHARS.
 */
export function formatRetrievedSectionsForPrompt(
  sections: ScoredSection[]
): string {
  const blocks: string[] = [];
  let totalChars = 0;

  for (const section of sections) {
    const block = `### ${section.heading}\n\n${section.content}`;
    if (totalChars + block.length > MAX_OUTPUT_CHARS) break;
    blocks.push(block);
    totalChars += block.length;
  }

  return blocks.join("\n\n---\n\n");
}

/**
 * Main retrieval entry point.
 *
 * Returns:
 * - `found: true`  + top-K scored sections above threshold + formatted string
 * - `found: false` + empty arrays/string when no section passes the threshold
 */
export function retrieveRelevantCourseSections(params: {
  compiledMarkdown: string;
  studentMessage: string;
  conversationHistory: ConversationTurn[];
}): { sections: ScoredSection[]; found: boolean; contextString: string } {
  const { compiledMarkdown, studentMessage, conversationHistory } = params;

  const sections = splitMarkdownIntoSections(compiledMarkdown);
  if (sections.length === 0) {
    return { sections: [], found: false, contextString: "" };
  }

  const queryText = buildQueryText(studentMessage, conversationHistory);
  const queryTokens = tokenize(queryText);

  // Continuation bypass: if this is a follow-up in an established conversation
  // but the current message has very few tokens (e.g. "¿Y luego?", "¿Ejemplo?"),
  // we skip the hard threshold to avoid false refusals on legitimate follow-ups.
  // Instead, we score all sections and return top-K by score regardless of threshold.
  const isContinuationQuery =
    conversationHistory.length > 0 && studentMessage.length < 60 && queryTokens.size < 3;

  if (queryTokens.size === 0 && !isContinuationQuery) {
    return { sections: [], found: false, contextString: "" };
  }

  const scored: ScoredSection[] = sections
    .map((s) => ({ ...s, score: scoreSection(s, queryTokens) }))
    .filter((s) => (isContinuationQuery ? true : s.score >= SCORE_THRESHOLD))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  if (scored.length === 0) {
    return { sections: [], found: false, contextString: "" };
  }

  const contextString = formatRetrievedSectionsForPrompt(scored);
  return { sections: scored, found: true, contextString };
}
