import type { MiniPRD } from '@/lib/ai/agents/idea-agent';

/**
 * Convert a MiniPRD object to markdown format
 */
export function prdToMarkdown(prd: MiniPRD): string {
  const userStories = prd.userStories
    .map((s) => `- As a **${s.asA}**, I want **${s.iWant}**, so that **${s.soThat}**`)
    .join('\n');

  const acceptanceCriteria = prd.acceptanceCriteria
    .map((ac) => `| ${ac.given} | ${ac.when} | ${ac.then} |`)
    .join('\n');

  return `# ${prd.title}

## Problem

${prd.problem}

## Solution

${prd.solution}

## User Stories

${userStories}

## Acceptance Criteria

| Given | When | Then |
|-------|------|------|
${acceptanceCriteria}
`;
}

/**
 * Parse markdown back to MiniPRD structure
 * This is a best-effort parser - user edits may not perfectly match the original structure
 */
export function markdownToPrd(markdown: string): Partial<MiniPRD> {
  const lines = markdown.split('\n');
  const result: Partial<MiniPRD> = {
    userStories: [],
    acceptanceCriteria: [],
  };

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse title (# heading)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      result.title = trimmed.slice(2).trim();
      continue;
    }

    // Track section headers
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).trim().toLowerCase();
      continue;
    }

    // Parse content based on current section
    if (currentSection === 'problem' && trimmed) {
      result.problem = result.problem ? `${result.problem} ${trimmed}` : trimmed;
    } else if (currentSection === 'solution' && trimmed) {
      result.solution = result.solution ? `${result.solution} ${trimmed}` : trimmed;
    } else if (currentSection === 'user stories' && trimmed.startsWith('-')) {
      const story = parseUserStory(trimmed);
      if (story) {
        result.userStories!.push(story);
      }
    } else if (currentSection === 'acceptance criteria' && trimmed.startsWith('|') && !trimmed.includes('Given')) {
      const criteria = parseAcceptanceCriteria(trimmed);
      if (criteria) {
        result.acceptanceCriteria!.push(criteria);
      }
    }
  }

  return result;
}

function parseUserStory(line: string): { asA: string; iWant: string; soThat: string } | null {
  // Pattern: - As a **role**, I want **action**, so that **benefit**
  const match = line.match(/As a \*\*([^*]+)\*\*, I want \*\*([^*]+)\*\*, so that \*\*([^*]+)\*\*/i);
  if (match) {
    return {
      asA: match[1].trim(),
      iWant: match[2].trim(),
      soThat: match[3].trim(),
    };
  }
  return null;
}

function parseAcceptanceCriteria(line: string): { given: string; when: string; then: string } | null {
  // Pattern: | given | when | then |
  const parts = line.split('|').filter((p) => p.trim());
  if (parts.length >= 3) {
    return {
      given: parts[0].trim(),
      when: parts[1].trim(),
      then: parts[2].trim(),
    };
  }
  return null;
}
