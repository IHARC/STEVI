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

function walkFiles(dir, predicate) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(next, predicate));
      continue;
    }
    if (!predicate(next)) continue;
    results.push(next);
  }
  return results;
}

// Guardrail: avoid "invisible columns" caused by server-side path inference
// diverging from client routing. The inbox column must only be defined in a
// client component that gates on usePathname().
const allowedInboxColumnFiles = new Set([
  path.join(repoRoot, 'src/components/workspace/shells/ops-main-grid.tsx'),
]);
const allowedInboxPanelImporters = new Set([
  path.join(repoRoot, 'src/components/workspace/shells/ops-main-grid.tsx'),
  path.join(repoRoot, 'src/components/shared/layout/inbox-panel.tsx'),
]);

const srcRoot = path.join(repoRoot, 'src');
const sourceFiles = walkFiles(srcRoot, (filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'));

for (const fullPath of sourceFiles) {
  const rel = path.relative(repoRoot, fullPath);
  const source = fs.readFileSync(fullPath, 'utf8');

  if (source.includes("from '@shared/providers/portal-request-context'") && !rel.startsWith('src/app/')) {
    failures.push({ file: rel, rule: 'portal-request-context import outside src/app' });
  }

  if (source.includes("from '@shared/layout/inbox-panel'") && !allowedInboxPanelImporters.has(fullPath)) {
    failures.push({ file: rel, rule: 'InboxPanel imported outside OpsMainGrid' });
  }

  if (source.includes('xl:grid-cols-[minmax(0,1fr)_22rem]') && !allowedInboxColumnFiles.has(fullPath)) {
    failures.push({ file: rel, rule: 'Inbox column grid defined outside OpsMainGrid' });
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
