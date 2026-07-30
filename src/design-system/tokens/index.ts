export * from './colors';
export * from './spacing';
export * from './typography';
export * from './border-radius';
export * from './shadows';
export * from './z-index';
export * from './breakpoints';
export * from './transitions';

import { colorTokens } from './colors';
import { spacingTokens } from './spacing';
import { typographyTokens } from './typography';
import { borderRadiusTokens } from './border-radius';
import { shadowTokens } from './shadows';
import { zIndexTokens } from './z-index';
import { breakpointTokens } from './breakpoints';
import { transitionTokens } from './transitions';

export const allTokens = {
  color: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  borderRadius: borderRadiusTokens,
  shadow: shadowTokens,
  zIndex: zIndexTokens,
  breakpoint: breakpointTokens,
  transition: transitionTokens,
} as const;

export type AllTokens = typeof allTokens;