#!/usr/bin/env node

/**
 * Guardrail: shell-level layout components must not introduce centered/max-width
 * containers, which can silently cap content across the ops/client app.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

const targets = [
  'src/components/workspace/shells/app-shell.tsx',
  'src/components/client/client-shell.tsx',
  'src/components/shared/layout/settings-shell.tsx',
];

const forbiddenPatterns = [
  { name: 'Tailwind container class', pattern: /\bcontainer\b/ },
  { name: 'Centered auto margins', pattern: /\bmx-auto\b/ },
  // Allow max-w-none but forbid any other max-w-* usage at shell level.
  { name: 'Max-width caps', pattern: /\bmax-w-(?!none)\S+\b/ },
];

const failures = [];

for (const target of targets) {
  const fullPath = path.join(repoRoot, target);
  const source = fs.readFileSync(fullPath, 'utf8');

  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(source)) {
      failures.push({ file: target, rule: rule.name });
    }
  }
}

if (failures.length) {
  console.error('❌ Shell width guardrail failed.');
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.rule}`);
  }
  console.error(
    '\nRemove centered/max-width constraints from shell-level layout components. ' +
      'Use page-level wrappers (e.g., FormPageShell) for intentional width caps.',
  );
  process.exit(1);
}

console.log('✅ Shell width guardrail passed.');

