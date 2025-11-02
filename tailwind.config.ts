import type { Config } from 'tailwindcss';
import animatePlugin from 'tailwindcss-animate';

const materialColor = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/styles/**/*.{ts,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: materialColor('--md-sys-color-outline'),
        input: materialColor('--md-sys-color-outline'),
        ring: materialColor('--md-sys-color-primary'),
        background: materialColor('--md-sys-color-surface'),
        foreground: materialColor('--md-sys-color-on-surface'),
        card: {
          DEFAULT: materialColor('--md-sys-color-surface-container-high'),
          foreground: materialColor('--md-sys-color-on-surface'),
        },
        popover: {
          DEFAULT: materialColor('--md-sys-color-surface-container-high'),
          foreground: materialColor('--md-sys-color-on-surface'),
        },
        primary: {
          DEFAULT: materialColor('--md-sys-color-primary'),
          foreground: materialColor('--md-sys-color-on-primary'),
        },
        secondary: {
          DEFAULT: materialColor('--md-sys-color-secondary'),
          foreground: materialColor('--md-sys-color-on-secondary'),
        },
        destructive: {
          DEFAULT: materialColor('--md-sys-color-error'),
          foreground: materialColor('--md-sys-color-on-error'),
        },
        muted: {
          DEFAULT: materialColor('--md-sys-color-surface-variant'),
          foreground: materialColor('--md-sys-color-on-surface-variant'),
        },
        accent: {
          DEFAULT: materialColor('--md-sys-color-secondary-container'),
          foreground: materialColor('--md-sys-color-on-secondary-container'),
        },
        'accent-variant': {
          DEFAULT: materialColor('--md-sys-color-tertiary-container'),
          foreground: materialColor('--md-sys-color-on-tertiary-container'),
        },
        warning: {
          DEFAULT: materialColor('--md-sys-color-primary-container'),
          foreground: materialColor('--md-sys-color-on-primary-container'),
        },
        info: {
          DEFAULT: materialColor('--md-sys-color-secondary-container'),
          foreground: materialColor('--md-sys-color-on-secondary-container'),
        },
        brand: materialColor('--md-sys-color-primary'),
        'brand-strong': materialColor('--md-sys-color-primary-container'),
        'brand-soft': materialColor('--md-sys-color-primary-container'),
        'primary-dark': materialColor('--md-sys-color-primary'),
        'on-primary': materialColor('--md-sys-color-on-primary'),
        'primary-container': materialColor('--md-sys-color-primary-container'),
        'on-primary-container': materialColor('--md-sys-color-on-primary-container'),
        'primary-foreground': materialColor('--md-sys-color-on-primary'),
        'secondary-container': materialColor('--md-sys-color-secondary-container'),
        'on-secondary-container': materialColor('--md-sys-color-on-secondary-container'),
        'secondary-foreground': materialColor('--md-sys-color-on-secondary'),
        tertiary: materialColor('--md-sys-color-tertiary'),
        'on-tertiary': materialColor('--md-sys-color-on-tertiary'),
        'tertiary-container': materialColor('--md-sys-color-tertiary-container'),
        'on-tertiary-container': materialColor('--md-sys-color-on-tertiary-container'),
        'tertiary-foreground': materialColor('--md-sys-color-on-tertiary'),
        error: materialColor('--md-sys-color-error'),
        'on-error': materialColor('--md-sys-color-on-error'),
        'error-container': materialColor('--md-sys-color-error-container'),
        'on-error-container': materialColor('--md-sys-color-on-error-container'),
        'error-foreground': materialColor('--md-sys-color-on-error'),
        'on-background': materialColor('--md-sys-color-on-background'),
        surface: materialColor('--md-sys-color-surface'),
        'surface-dim': materialColor('--md-sys-color-surface-dim'),
        'surface-bright': materialColor('--md-sys-color-surface-bright'),
        'surface-container-lowest': materialColor('--md-sys-color-surface-container-lowest'),
        'surface-container-low': materialColor('--md-sys-color-surface-container-low'),
        'surface-container': materialColor('--md-sys-color-surface-container'),
        'surface-container-high': materialColor('--md-sys-color-surface-container-high'),
        'surface-container-highest': materialColor('--md-sys-color-surface-container-highest'),
        'surface-variant': materialColor('--md-sys-color-surface-variant'),
        'on-surface': materialColor('--md-sys-color-on-surface'),
        'on-surface-variant': materialColor('--md-sys-color-on-surface-variant'),
        'inverse-surface': materialColor('--md-sys-color-inverse-surface'),
        'inverse-on-surface': materialColor('--md-sys-color-inverse-on-surface'),
        'inverse-primary': materialColor('--md-sys-color-inverse-primary'),
        outline: materialColor('--md-sys-color-outline'),
        'outline-variant': materialColor('--md-sys-color-outline-variant'),
        scrim: materialColor('--md-sys-color-scrim'),
        shadow: materialColor('--md-sys-color-shadow'),
        'neutral-black': 'rgb(18 13 13 / <alpha-value>)',
        'neutral-white': 'rgb(255 255 255 / <alpha-value>)',
        'neutral-gray': 'rgb(200 192 192 / <alpha-value>)',
      },
      fontFamily: {
        heading: ['Roboto Flex', 'Roboto', 'system-ui', 'sans-serif'],
        body: ['Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--md-sys-shape-corner-small)',
        md: 'var(--md-sys-shape-corner-extra-small)',
        sm: '0.375rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
