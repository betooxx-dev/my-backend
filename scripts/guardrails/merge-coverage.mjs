import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import istanbulCoverage from 'istanbul-lib-coverage';

const { createCoverageMap } = istanbulCoverage;

const root = process.cwd();
const inputs = [
  path.join(root, 'coverage', 'unit', 'coverage-final.json'),
  path.join(root, 'coverage', 'e2e', 'coverage-final.json'),
];
const output = path.join(root, 'coverage', 'coverage-final.json');
const merged = createCoverageMap({});

for (const input of inputs) {
  try {
    merged.merge(JSON.parse(readFileSync(input, 'utf8')));
  } catch (error) {
    console.error(`[coverage:merge] Cannot read ${path.relative(root, input)}.`);
    if (error instanceof Error) console.error(error.message);
    process.exit(1);
  }
}

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(merged.toJSON())}\n`, 'utf8');
console.log(
  `[coverage:merge] OK: merged ${inputs.length} reports into coverage/coverage-final.json.`,
);
