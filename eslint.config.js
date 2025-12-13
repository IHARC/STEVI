import nextConfig from 'eslint-config-next';

const headingNeedsTextClass = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require tokenized text utility on h1–h6 elements to avoid UA/default sizes',
    },
    schema: [],
    messages: {
      missing: 'Headings (h1–h6) must include a tokenized text class (e.g. text-title-md).',
    },
  },
  create(context) {
    const source = context.getSourceCode();
    return {
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type !== 'JSXIdentifier') return;
        if (!/^h[1-6]$/.test(name.name)) return;

        const classAttr = node.attributes.find(
          (attr) => attr.type === 'JSXAttribute' && attr.name?.name === 'className',
        );
        if (!classAttr || !classAttr.value) {
          context.report({ node, messageId: 'missing' });
          return;
        }

        const text = source.getText(classAttr.value);
        if (!text.includes('text-')) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

const legacyRestrictedImports = [
  {
    group: ['@/components/ui-legacy/*', '@/styles/main.css', '@/lib/state-layer'],
    message: 'Legacy UI has been removed. Use shadcn/ui primitives from "@/components/ui".',
  },
];

const clientImportBoundaries = [
  ...legacyRestrictedImports,
  {
    group: ['@workspace/*', '@/components/workspace/*', '**/components/workspace/**'],
    message: 'Client shell cannot import operations components. Move shared pieces to components/shared.',
  },
];

const workspaceImportBoundaries = [
  ...legacyRestrictedImports,
  {
    group: ['@client/*', '@/components/client/*', '**/components/client/**'],
    message: 'Operations shell cannot import client components. Move shared pieces to components/shared.',
  },
];

const steviConfig = [
  {
    ignores: [
      '.next/**',
      'deployment/**',
      'node-app/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      stevi: {
        rules: {
          'heading-needs-text-class': headingNeedsTextClass,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/incompatible-library': 'off',
      'stevi/heading-needs-text-class': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: legacyRestrictedImports,
        },
      ],
    },
  },
  {
    files: ['src/app/(client)/**/*.{ts,tsx}', 'src/components/client/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: clientImportBoundaries,
        },
      ],
    },
  },
  {
    files: ['src/app/(ops)/**/*.{ts,tsx}', 'src/components/workspace/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: workspaceImportBoundaries,
        },
      ],
    },
  },
  {
    files: ['src/components/workspace/shells/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...workspaceImportBoundaries,
            {
              group: ['@shared/providers/portal-request-context', 'next/headers'],
              message:
                'Shell components must not derive layout decisions from request headers/server path inference; use client pathname (usePathname) + shared helpers instead.',
            },
          ],
        },
      ],
    },
  },
];

export default steviConfig;
