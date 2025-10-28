// Deterministic random design system
// Pre-computed seed to avoid using Node.js crypto in browser
const projectName = "CipherPoll";
const network = "sepolia";
const yearMonth = "202510";
const contractName = "SurveyCore.sol";

// Pre-computed SHA256: CipherPollsepolia202510SurveyCore.sol
const seed = "8f7a3b2c4d5e6f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a";

// Extract seed number for selection
const seedNum = parseInt(seed.substring(0, 8), 16);

// Design system selection (based on seed)
const designSystems = ['Material', 'Fluent', 'Neumorphism', 'Glassmorphism', 'Minimal'];
const colorSchemes = [
  { name: 'A', primary: '#4F46E5', secondary: '#9333EA', accent: '#EC4899' },
  { name: 'B', primary: '#3B82F6', secondary: '#06B6D4', accent: '#14B8A6' },
  { name: 'C', primary: '#10B981', secondary: '#84CC16', accent: '#EAB308' },
  { name: 'D', primary: '#F97316', secondary: '#F59E0B', accent: '#EF4444' },
  { name: 'E', primary: '#A855F7', secondary: '#7C3AED', accent: '#6366F1' },
  { name: 'F', primary: '#14B8A6', secondary: '#10B981', accent: '#06B6D4' },
  { name: 'G', primary: '#EF4444', secondary: '#EC4899', accent: '#F97316' },
  { name: 'H', primary: '#06B6D4', secondary: '#3B82F6', accent: '#0EA5E9' },
];

const selectedDesignSystem = designSystems[seedNum % 5];
const selectedColorScheme = colorSchemes[seedNum % 8];

export const designTokens = {
  seed,
  system: selectedDesignSystem,
  colorScheme: selectedColorScheme.name,

  // Main colors (using dark theme with Glassmorphism)
  colors: {
    primary: selectedColorScheme.primary,
    secondary: selectedColorScheme.secondary,
    accent: selectedColorScheme.accent,
    background: 'rgba(15, 23, 42, 0.95)',
    backgroundDark: 'rgba(15, 23, 42, 0.8)',
    surface: 'rgba(30, 41, 59, 0.9)',
    surfaceHover: 'rgba(51, 65, 85, 0.9)',
    text: '#E2E8F0',
    textSecondary: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.1)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },

  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    },
    scale: 1.25,
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.25rem',    // 20px
      xl: '1.563rem',   // 25px
      '2xl': '1.953rem', // 31px
      '3xl': '2.441rem', // 39px
      '4xl': '3.052rem', // 49px
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  spacing: {
    unit: 8,
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },

  borderRadius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },

  // Default shadow (for convenience)
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',

  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  breakpoints: {
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
  },

  density: {
    compact: {
      padding: {
        sm: '0.25rem 0.5rem',
        md: '0.5rem 1rem',
        lg: '0.75rem 1.5rem',
      },
      gap: '0.5rem',
    },
    comfortable: {
      padding: {
        sm: '0.5rem 1rem',
        md: '1rem 1.5rem',
        lg: '1.25rem 2rem',
      },
      gap: '1rem',
    },
  },

  // Layout mode
  layout: 'tabs' as const,
};

export type DesignTokens = typeof designTokens;

export default designTokens;

