import { execSync } from 'node:child_process';

export function runGit(args) {
  return execSync(`git ${args}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function tryGit(args) {
  try {
    return runGit(args);
  } catch {
    return '';
  }
}

export function resolveBaseRef() {
  const candidates = [];

  if (process.env.GITHUB_BASE_REF) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
    candidates.push(process.env.GITHUB_BASE_REF);
  }

  if (process.env.BASE_REF) candidates.push(process.env.BASE_REF);
  candidates.push('origin/master', 'master', 'HEAD~1');

  for (const candidate of candidates) {
    if (tryGit(`rev-parse --verify ${candidate}`)) return candidate;
  }

  return '';
}

export function diffNameOnly({ baseRef, diffFilter = 'ACMR' } = {}) {
  const base = baseRef ?? resolveBaseRef();
  if (!base) return [];

  const outputs = [
    tryGit(`diff --name-only --diff-filter=${diffFilter} ${base}...HEAD`),
    tryGit(`diff --name-only --diff-filter=${diffFilter} HEAD`),
    tryGit('ls-files --others --exclude-standard'),
  ];

  return Array.from(
    new Set(
      outputs
        .flatMap((output) => output.split(/\r?\n/))
        .map((file) => file.replaceAll('\\', '/'))
        .filter(Boolean),
    ),
  );
}
