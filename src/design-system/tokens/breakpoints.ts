export const breakpointTokens = {
  xs: '0',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const breakpointValues = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const mediaQueries = {
  xs: '@media (max-width: 639px)',
  sm: '@media (min-width: 640px)',
  md: '@media (min-width: 768px)',
  lg: '@media (min-width: 1024px)',
  xl: '@media (min-width: 1280px)',
  '2xl': '@media (min-width: 1536px)',
  'mobile': '@media (max-width: 767px)',
  'tablet': '@media (min-width: 768px) and (max-width: 1023px)',
  'desktop': '@media (min-width: 1024px)',
  'wide': '@media (min-width: 1280px)',
  'ultrawide': '@media (min-width: 1536px)',
  'print': '@media print',
  'hover': '@media (hover: hover)',
  'no-hover': '@media (hover: none)',
  'dark': '@media (prefers-color-scheme: dark)',
  'light': '@media (prefers-color-scheme: light)',
  'reduced-motion': '@media (prefers-reduced-motion: reduce)',
  'high-contrast': '@media (prefers-contrast: more)',
} as const;

export type BreakpointTokens = typeof breakpointTokens;
export type MediaQueries = typeof mediaQueries;