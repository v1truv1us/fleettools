import { ReviewVerdict } from './types.js';

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function parseVerdict(raw: string): ReviewVerdict | null {
  try {
    const value = JSON.parse(extractJson(raw));
    const keys = Object.keys(value).sort().join(',');
    if (keys !== 'issues,lens,round,status') return null;
    if (value.status !== 'pass' && value.status !== 'issues') return null;
    if (!Number.isInteger(value.round) || value.round < 1) return null;
    if (!['ambiguity', 'security-perf', 'maintainability', 'custom'].includes(value.lens)) return null;
    if (!Array.isArray(value.issues)) return null;
    for (const issue of value.issues) {
      const issueKeys = Object.keys(issue).sort().join(',');
      if (issueKeys !== 'description,severity' && issueKeys !== 'description,location,severity') return null;
      if (!['high', 'medium', 'low'].includes(issue.severity) || typeof issue.description !== 'string') return null;
      if ('location' in issue && typeof issue.location !== 'string') return null;
    }
    return value as ReviewVerdict;
  } catch {
    return null;
  }
}
