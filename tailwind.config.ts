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
      fontSize: {
        xs: [
          'var(--md-sys-typescale-label-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-label-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-label-small-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        sm: [
          'var(--md-sys-typescale-body-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        base: [
          'var(--md-sys-typescale-body-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        lg: [
          'var(--md-sys-typescale-title-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-small-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        xl: [
          'var(--md-sys-typescale-title-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        '2xl': [
          'var(--md-sys-typescale-title-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        '3xl': [
          'var(--md-sys-typescale-headline-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-small-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        '4xl': [
          'var(--md-sys-typescale-headline-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        '5xl': [
          'var(--md-sys-typescale-headline-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-large-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        '6xl': [
          'var(--md-sys-typescale-display-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-small-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        '7xl': [
          'var(--md-sys-typescale-display-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        '8xl': [
          'var(--md-sys-typescale-display-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-large-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'display-lg': [
          'var(--md-sys-typescale-display-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-large-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'display-md': [
          'var(--md-sys-typescale-display-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'display-sm': [
          'var(--md-sys-typescale-display-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-display-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-display-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-display-small-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'headline-lg': [
          'var(--md-sys-typescale-headline-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-large-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'headline-md': [
          'var(--md-sys-typescale-headline-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'headline-sm': [
          'var(--md-sys-typescale-headline-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-headline-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-headline-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-headline-small-weight)',
            fontFamily: 'var(--md-sys-typescale-headline-font)',
          },
        ],
        'title-lg': [
          'var(--md-sys-typescale-title-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'title-md': [
          'var(--md-sys-typescale-title-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'title-sm': [
          'var(--md-sys-typescale-title-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-title-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-title-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-title-small-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'body-lg': [
          'var(--md-sys-typescale-body-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'body-lg': [
          'var(--md-sys-typescale-body-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'body-md': [
          'var(--md-sys-typescale-body-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'body-sm': [
          'var(--md-sys-typescale-body-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-body-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-body-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-body-small-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'label-lg': [
          'var(--md-sys-typescale-label-large-size)',
          {
            lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
            letterSpacing: 'var(--md-sys-typescale-label-large-tracking)',
            fontWeight: 'var(--md-sys-typescale-label-large-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'label-md': [
          'var(--md-sys-typescale-label-medium-size)',
          {
            lineHeight: 'var(--md-sys-typescale-label-medium-line-height)',
            letterSpacing: 'var(--md-sys-typescale-label-medium-tracking)',
            fontWeight: 'var(--md-sys-typescale-label-medium-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
        'label-sm': [
          'var(--md-sys-typescale-label-small-size)',
          {
            lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
            letterSpacing: 'var(--md-sys-typescale-label-small-tracking)',
            fontWeight: 'var(--md-sys-typescale-label-small-weight)',
            fontFamily: 'var(--md-sys-typescale-body-font)',
          },
        ],
      },
      spacing: {
        '0.5': 'calc(var(--md-sys-spacing-2xs) / 2)',
        '1': 'var(--md-sys-spacing-2xs)',
        '1.5': 'calc(var(--md-sys-spacing-xs) - (var(--md-sys-spacing-2xs) / 2))',
        '2': 'var(--md-sys-spacing-xs)',
        '2.5': 'calc(var(--md-sys-spacing-sm) - (var(--md-sys-spacing-2xs) / 2))',
        '3': 'var(--md-sys-spacing-sm)',
        '3.5': 'calc(var(--md-sys-spacing-md) - (var(--md-sys-spacing-2xs) / 2))',
        '4': 'var(--md-sys-spacing-md)',
        '5': 'calc(var(--md-sys-spacing-xl) - var(--md-sys-spacing-sm))',
        '6': 'var(--md-sys-spacing-lg)',
        '8': 'var(--md-sys-spacing-xl)',
        '9': 'calc(var(--md-sys-spacing-3xl) - var(--md-sys-spacing-sm))',
        '10': 'var(--md-sys-spacing-2xl)',
        '12': 'var(--md-sys-spacing-3xl)',
        '16': 'var(--md-sys-spacing-4xl)',
        'space-2xs': 'var(--md-sys-spacing-2xs)',
        'space-xs': 'var(--md-sys-spacing-xs)',
        'space-sm': 'var(--md-sys-spacing-sm)',
        'space-md': 'var(--md-sys-spacing-md)',
        'space-lg': 'var(--md-sys-spacing-lg)',
        'space-xl': 'var(--md-sys-spacing-xl)',
        'space-2xl': 'var(--md-sys-spacing-2xl)',
        'space-3xl': 'var(--md-sys-spacing-3xl)',
        'space-4xl': 'var(--md-sys-spacing-4xl)',
      },
      maxWidth: {
        page: 'min(100%, var(--md-sys-layout-max-width))',
      },
      boxShadow: {
        'level-1': 'var(--shadow-level-1)',
        'level-2': 'var(--shadow-level-2)',
      },
      fontFamily: {
        heading: ['var(--md-ref-typeface-brand)', 'Roboto Flex', 'Roboto', 'system-ui', 'sans-serif'],
        body: ['var(--md-ref-typeface-plain)', 'Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': 'var(--md-sys-shape-corner-extra-large)',
        '2xl': 'var(--md-sys-shape-corner-large)',
        xl: 'var(--md-sys-shape-corner-medium)',
        lg: 'var(--md-sys-shape-corner-small)',
        md: 'var(--md-sys-shape-corner-extra-small)',
        sm: 'calc(var(--md-sys-shape-corner-extra-small) - 0.125rem)',
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
