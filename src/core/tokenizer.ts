import type { TokenDiff } from './types';

const TOKEN_RE =
  /(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?)|([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)|("(?:[^"\\]|\\.)*")|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(<>|>=|<=|[+\-*/^&=<>,;()!:%])|(\s+)/g;

export function tokenizeFormula(formula: string): string[] {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const re = new RegExp(TOKEN_RE.source, 'g');

  while ((match = re.exec(formula)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(formula.slice(lastIndex, match.index));
    }
    const token = match[0].trim();
    if (token) tokens.push(token);
    lastIndex = re.lastIndex;
  }

  if (lastIndex < formula.length) {
    const remaining = formula.slice(lastIndex).trim();
    if (remaining) tokens.push(remaining);
  }

  return tokens;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

export function diffFormulaTokens(oldFormula: string, newFormula: string): TokenDiff[] {
  const oldTokens = tokenizeFormula(oldFormula);
  const newTokens = tokenizeFormula(newFormula);
  const dp = lcsTable(oldTokens, newTokens);

  const result: TokenDiff[] = [];
  let i = oldTokens.length;
  let j = newTokens.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      result.push({ token: oldTokens[i - 1], type: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ token: newTokens[j - 1], type: 'added' });
      j--;
    } else {
      result.push({ token: oldTokens[i - 1], type: 'removed' });
      i--;
    }
  }

  return result.reverse();
}
