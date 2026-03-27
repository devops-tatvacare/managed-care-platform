// Design System Tokens for EMPI Platform
// Adapted from health-app design tokens to match current project's design scheme

export const SIZING = {
  input: {
    minHeight: '2.5rem', // 40px
    maxHeight: '6rem',   // 96px (approximately 4 lines of text)
  },
  button: {
    height: '2.5rem',    // 40px
    heightSm: '2rem',    // 32px
    heightLg: '3rem',    // 48px
  },
  icon: {
    sm: '1rem',          // 16px
    md: '1.25rem',       // 20px
    lg: '1.5rem',        // 24px
  },
  spacing: {
    xs: '0.25rem',       // 4px
    sm: '0.5rem',        // 8px
    md: '0.75rem',       // 12px
    lg: '1rem',          // 16px
    xl: '1.5rem',        // 24px
    '2xl': '2rem',       // 32px
  },
  radius: {
    sm: '0.25rem',       // 4px
    md: '0.5rem',        // 8px - matches CSS custom property --radius
    lg: '0.75rem',       // 12px
    xl: '1rem',          // 16px
    full: '9999px',
  }
};

export const COLORS = {
  // Primary brand colors (matches globals.css)
  brand: {
    primary: 'hsl(var(--brand-primary))',
    on: 'hsl(var(--brand-on))',
  },
  // Text colors
  text: {
    primary: 'hsl(var(--text-100))',
    secondary: 'hsl(var(--text-80))',
    muted: 'hsl(var(--text-10))',
  },
  // Background colors
  background: {
    primary: 'hsl(var(--bg-100))',
    secondary: 'hsl(var(--bg-10))',
    muted: 'hsl(var(--muted))',
  },
  // Border colors
  border: {
    default: 'hsl(var(--border))',
    stroke: 'hsl(var(--stroke-grey))',
  },
  // Status colors
  status: {
    success: 'hsl(var(--success))',
    danger: 'hsl(var(--danger))',
    warning: 'hsl(var(--warning))',
    info: 'hsl(var(--info))',
  }
};

export const TYPOGRAPHY = {
  fontFamily: {
    default: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
  },
  fontSize: {
    xs: '0.75rem',       // 12px
    sm: '0.875rem',      // 14px
    base: '1rem',        // 16px
    lg: '1.125rem',      // 18px
    xl: '1.25rem',       // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

export const ANIMATION = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  }
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

// Utility function to get design system classes
export const getDesignSystemClasses = (variant: string) => {
  const classMap: Record<string, string> = {
    // Text variants
    'ds-text-primary': `text-[${COLORS.text.primary}]`,
    'ds-text-secondary': `text-[${COLORS.text.secondary}]`,
    'ds-text-muted': `text-[${COLORS.text.muted}]`,
    'ds-text-sm': `text-sm`,
    'ds-text-base': `text-base`,
    'ds-text-lg': `text-lg`,
    
    // Background variants
    'ds-bg-primary': `bg-[${COLORS.background.primary}]`,
    'ds-bg-secondary': `bg-[${COLORS.background.secondary}]`,
    'ds-bg-muted': `bg-[${COLORS.background.muted}]`,
    
    // Border variants
    'ds-border': `border border-[${COLORS.border.default}]`,
    'ds-border-stroke': `border border-[${COLORS.border.stroke}]`,
    
    // Padding variants
    'ds-p-sm': `p-[${SIZING.spacing.sm}]`,
    'ds-p-md': `p-[${SIZING.spacing.md}]`,
    'ds-p-lg': `p-[${SIZING.spacing.lg}]`,
    
    // Radius variants
    'ds-rounded-sm': `rounded-[${SIZING.radius.sm}]`,
    'ds-rounded-md': `rounded-[${SIZING.radius.md}]`,
    'ds-rounded-lg': `rounded-[${SIZING.radius.lg}]`,
  };
  
  return classMap[variant] || variant;
};