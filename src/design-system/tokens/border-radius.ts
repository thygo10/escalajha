export const borderRadiusTokens = {
  none: '0',
  xs: '4px',
  sm: '6px',
  DEFAULT: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

export const borderRadiusComponent = {
  button: borderRadiusTokens.sm,
  input: borderRadiusTokens.DEFAULT,
  card: borderRadiusTokens.lg,
  modal: borderRadiusTokens.xl,
  badge: borderRadiusTokens.full,
  avatar: borderRadiusTokens.full,
  tooltip: borderRadiusTokens.md,
  dropdown: borderRadiusTokens.lg,
  table: borderRadiusTokens.md,
  tab: borderRadiusTokens.sm,
  progress: borderRadiusTokens.full,
  divider: '0',
} as const;

export type BorderRadiusTokens = typeof borderRadiusTokens;
export type BorderRadiusComponent = typeof borderRadiusComponent;