/** @type {import('tailwindcss').Config} */
const materialColor = (token) => `rgb(var(${token}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
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
        sm: '0.375rem',
        md: 'var(--md-sys-shape-corner-extra-small)',
        lg: 'var(--md-sys-shape-corner-small)',
        full: '9999px',
      },
      boxShadow: {
        subtle: 'var(--shadow-level-1)',
        'red-glow': '0 4px 14px rgb(var(--md-sys-color-primary) / 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'count-up': 'count-up 0.8s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'count-up': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1400px',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
