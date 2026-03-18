import { useCallback } from 'react';
import { useAppStore } from '../store';
import type { DiffResult } from '../core/types';
import { getImpactChain } from '../core/dependencyGraph';

const API_KEY_STORAGE = 'exceldiff-api-key';

export function getStoredAPIKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredAPIKey(key: string) {
  try {
    localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    // localStorage unavailable
  }
}

function buildPrompt(diffResult: DiffResult): string {
  const lines: string[] = [
    `You are analyzing changes between two Excel files: "${diffResult.fileAName}" (before) and "${diffResult.fileBName}" (after).`,
    '',
    'Here are the changes:',
    '',
  ];

  for (const sheet of diffResult.sheets) {
    if (!sheet.hasChanges) continue;
    lines.push(`## Sheet: ${sheet.name} (${sheet.status})`);
    lines.push(`Changes: +${sheet.counts.add} added, -${sheet.counts.rem} removed, ~${sheet.counts.mod} modified`);
    lines.push('');

    const changedCells = sheet.rows.filter((r) => r.type !== 'same');
    for (const cell of changedCells.slice(0, 50)) {
      const parts = [`  ${cell.address}: ${cell.type.toUpperCase()}`];
      if (cell.changeKind) parts.push(`(${cell.changeKind})`);
      if (cell.oldValue !== null) parts.push(`was: ${cell.oldValue}`);
      if (cell.newValue !== null) parts.push(`now: ${cell.newValue}`);
      if (cell.oldFormula) parts.push(`old formula: =${cell.oldFormula}`);
      if (cell.newFormula) parts.push(`new formula: =${cell.newFormula}`);

      // Add impact info for changed cells
      const impact = getImpactChain(diffResult.dependencyGraph, sheet.name, cell.address);
      if (impact.direct.length > 0) {
        parts.push(`affects: ${impact.direct.map((d) => d.address).join(', ')}`);
      }

      lines.push(parts.join(' | '));
    }
    if (changedCells.length > 50) {
      lines.push(`  ... and ${changedCells.length - 50} more changes`);
    }
    lines.push('');
  }

  lines.push('');
  lines.push('Write a 2-3 sentence plain-English summary of what changed between these two model versions. Focus on the business meaning, not just listing cells. If you can identify assumption changes and their downstream impact, highlight those. Be specific about numbers and percentages where possible. Write as if explaining to a finance professional reviewing this model update.');

  return lines.join('\n');
}

export function useAISummary() {
  const diffResult = useAppStore((s) => s.diffResult);
  const setAISummary = useAppStore((s) => s.setAISummary);

  const generateSummary = useCallback(
    async (apiKey: string) => {
      if (!diffResult) return;

      setAISummary({ status: 'loading', text: null });

      try {
        const prompt = buildPrompt(diffResult);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          if (response.status === 401) {
            throw new Error('Invalid API key. Check your Anthropic API key and try again.');
          }
          throw new Error(`API error ${response.status}: ${errText.slice(0, 100)}`);
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text;
        if (!text) {
          throw new Error('Empty response from API.');
        }

        setAISummary({ status: 'done', text });
      } catch (err: any) {
        setAISummary({ status: 'error', text: err?.message || 'Failed to generate summary.' });
      }
    },
    [diffResult, setAISummary],
  );

  return { generateSummary };
}
