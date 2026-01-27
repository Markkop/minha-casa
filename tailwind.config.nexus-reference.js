module.exports = {
  darkMode: ['class'],
  mode: 'jit',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Color variations with opacity
    'shadow-salmon',
    'shadow-lightBlue',
    'shadow-green',
    'shadow-primary',
    'bg-lightBlue/50',
    'bg-salmon/50',
    'bg-green/50',
    'bg-primary/50',
    'bg-offWhite/50',
    'bg-offWhite',
    'bg-primary',
    'bg-secondary',
    'bg-tertiary',
    'bg-quaternary',
    'text-[#E2C52D]',
    'text-greenLink',
    // Dynamic height classes
    'h-[100px]',
    'h-[200px]',
    'h-[300px]',
    'h-[400px]',
    'h-[500px]',
    'h-[600px]',
    'h-[700px]',
    'h-[800px]',
    'h-[900px]',
    'h-[1000px]',
    'max-h-[100px]',
    'max-h-[200px]',
    'max-h-[300px]',
    'max-h-[400px]',
    'max-h-[500px]',
    'max-h-[600px]',
    'max-h-[700px]',
    'max-h-[800px]',
    'max-h-[900px]',
    'max-h-[1000px]',
  ],
  theme: {
    extend: {
      colors: {
        // Project's custom color palette based on dark mode design
        primary: '#C5FF01', // Lime Green - main brand color
        secondary: '#C6CEC5', // Pale Gray Green
        gray: '#676767', // Medium Gray
        middleGray: '#323232', // Dark Gray
        middleGray50: '#161616', // Very Dark Gray
        ashGray: '#c4cec4', // Pale Gray Green
        dimGray: '#636A70', // Slate Gray
        fadedGray: '#4C4C4C', // Dark Gray
        davysGray: '#595C58', // Dark Olive Gray
        cadetGray: '#9BA1A5', // Light Gray Blue
        brightGrey: '#53545A', // Dark Slate Gray
        darkGrey: '#1f1f1f', // Very Dark Gray
        jetGray: '#2C2C2C', // Very Dark Gray
        jetBlack: '#272827', // Very Dark Gray
        charcoalGray: '#454141', // Dark Brownish Gray
        battleshipGrey: '#979696', // Light Gray
        seasalt: '#F8F8F8', // Very Light Gray
        silver: '#AAAAAA', // Light Gray
        platinum: '#D9D9D9', // Light Gray
        raisinBlack: '#1A1C23', // Dark Midnight Blue
        eerieBlack: '#242424', // Very Dark Gray
        blue: '#273058', // Navy Blue
        white: '#FFFFFF', // White
        black: '#000000', // Black
        notFound: '#1D1F28', // Dark Slate Blue
        salmon: '#FF8A59', // Coral
        lightBlue: '#94b0ff', // Light Blue
        green: '#00F773', // Bright Mint
        greenLink: '#84CD17', // Lime Green
        tooltipBg: '#3d4451', // Slate Gray
        tooltipText: '#FFFFFF', // White
        other: '#151822', // Dark Midnight Blue
        footer: '#BBBCBE', // Light Gray Blue
        offWhite: '#EDEDED', // Very Light Gray
        yellow: '#f3cb53', // Yellow

        // Additional colors for compatibility
        background: '#FFFFFF',
        darkPrimary: '#7D9900',
      },
      fontFamily: {
        primary: ['TempelGrotesk', 'sans-serif'],
        primaryCondensed: ['TempelGrotesk-SemiCondensed', 'sans-serif'],
        secondary: ['FraktionSans', 'sans-serif'],
        secondaryBlack: ['FraktionSansBlack', 'sans-serif'],
        mono: ['FraktionSans', 'monospace'],
      },
      fontSize: {
        // Added extra-small steps for PDF/print layouts
        '4xs': ['0.375rem', { lineHeight: '0.5rem' }], // 6px
        '3xs': ['0.5rem', { lineHeight: '0.75rem' }], // 8px
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
        '5xl': ['3rem', { lineHeight: '1' }], // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }], // 72px
        '8xl': ['6rem', { lineHeight: '1' }], // 96px
        '9xl': ['8rem', { lineHeight: '1' }], // 128px
      },
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bump: 'bump 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bump: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
        144: '36rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.12)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.16)',
        hard: '0 8px 32px rgba(0, 0, 0, 0.24)',
        primary: '0 0 20px rgba(197, 255, 1, 0.3)',
        'primary-lg': '0 0 40px rgba(197, 255, 1, 0.4)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['disabled', 'active'],
      textColor: ['disabled', 'active'],
      borderColor: ['disabled', 'active'],
      opacity: ['disabled'],
      cursor: ['disabled'],
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
}
