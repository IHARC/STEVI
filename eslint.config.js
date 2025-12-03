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
      'stevi/heading-needs-text-class': 'error',
    },
  },
];

export default steviConfig;
