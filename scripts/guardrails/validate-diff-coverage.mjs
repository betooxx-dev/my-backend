import { readFileSync } from 'node:fs';
import path from 'node:path';

import { resolveBaseRef, tryGit } from './_git.mjs';

const THRESHOLD = Number(process.env.DIFF_COVERAGE_THRESHOLD ?? 85);
const coveragePath = path.resolve('coverage/coverage-final.json');
const baseRef = resolveBaseRef();

function readCoverage() {
  try {
    return JSON.parse(readFileSync(coveragePath, 'utf8'));
  } catch {
    console.error(
      '[validate:diff-coverage] Missing coverage/coverage-final.json. Run "npm run test:cov" first.',
    );
    process.exit(1);
  }
}

function changedLinesByFile() {
  if (!baseRef) return new Map();

  const diff = [
    tryGit(`diff --unified=0 ${baseRef}...HEAD -- src`),
    tryGit('diff --unified=0 HEAD -- src'),
  ]
    .filter(Boolean)
    .join('\n');
  const files = new Map();
  let currentFile = '';

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length).replaceAll('\\', '/');
      if (!currentFile.endsWith('.ts') || currentFile.endsWith('.spec.ts')) {
        currentFile = '';
        continue;
      }
      if (!files.has(currentFile)) files.set(currentFile, new Set());
      continue;
    }

    if (!currentFile || !line.startsWith('@@')) continue;

    const match = /\+(\d+)(?:,(\d+))?/.exec(line);
    if (!match) continue;

    const start = Number(match[1]);
    const count = Number(match[2] ?? 1);
    const lines = files.get(currentFile);

    for (let offset = 0; offset < count; offset++) {
      lines.add(start + offset);
    }
  }

  const untracked = tryGit('ls-files --others --exclude-standard -- src')
    .split(/\r?\n/)
    .map((file) => file.replaceAll('\\', '/'))
    .filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
    );

  for (const file of untracked) {
    const lines = readFileSync(path.resolve(file), 'utf8').split(/\r?\n/);
    files.set(
      file,
      new Set(lines.map((_, index) => index + 1)),
    );
  }

  return files;
}

function normalizeCoverageFile(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll('\\', '/');
}

const changedLines = changedLinesByFile();

if (changedLines.size === 0) {
  console.log('[validate:diff-coverage] OK: no changed source lines to check.');
  process.exit(0);
}

const coverage = readCoverage();
const coverageByFile = new Map(
  Object.entries(coverage).map(([filePath, fileCoverage]) => [
    normalizeCoverageFile(filePath),
    fileCoverage,
  ]),
);

let covered = 0;
let coverable = 0;
const missing = [];

for (const [file, lines] of changedLines.entries()) {
  const fileCoverage = coverageByFile.get(file);
  if (!fileCoverage) {
    for (const line of lines) missing.push({ file, line, reason: 'no coverage file' });
    continue;
  }

  const statementMap = fileCoverage.statementMap ?? {};
  const statementHits = fileCoverage.s ?? {};

  for (const line of lines) {
    const statementIds = Object.entries(statementMap)
      .filter(([, statement]) => {
        const start = statement.start?.line;
        const end = statement.end?.line;
        return typeof start === 'number' && typeof end === 'number' && line >= start && line <= end;
      })
      .map(([id]) => id);

    if (statementIds.length === 0) continue;

    coverable += 1;
    const isCovered = statementIds.some((id) => Number(statementHits[id] ?? 0) > 0);
    if (isCovered) covered += 1;
    else missing.push({ file, line, reason: 'uncovered' });
  }
}

if (coverable === 0) {
  console.log('[validate:diff-coverage] OK: changed lines contain no coverable statements.');
  process.exit(0);
}

const percentage = (covered / coverable) * 100;

if (percentage < THRESHOLD) {
  console.error(
    `[validate:diff-coverage] ${percentage.toFixed(2)}% changed-line coverage is below ${THRESHOLD}%.`,
  );
  for (const item of missing.slice(0, 25)) {
    console.error(`  - ${item.file}:${item.line} (${item.reason})`);
  }
  if (missing.length > 25) console.error(`  - ...and ${missing.length - 25} more`);
  process.exit(1);
}

console.log(
  `[validate:diff-coverage] OK: ${percentage.toFixed(2)}% changed-line coverage (${covered}/${coverable}).`,
);
