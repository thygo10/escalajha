export const shadowTokens = {
  0: 'none',
  1: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 1px rgba(0, 0, 0, 0.02)',
  2: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
  3: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.02)',
  4: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
  5: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  focus: '0 0 0 3px rgba(37, 99, 235, 0.12)',
  focusStrong: '0 0 0 3px rgba(37, 99, 235, 0.2)',
} as const;

export const shadowComponent = {
  card: shadowTokens[1],
  cardHover: shadowTokens[2],
  cardActive: shadowTokens[3],
  dropdown: shadowTokens[3],
  modal: shadowTokens[4],
  modalLarge: shadowTokens[5],
  tooltip: shadowTokens[2],
  toast: shadowTokens[3],
  sidebar: '4px 0 20px rgba(0, 0, 0, 0.03)',
  topbar: '0 4px 14px rgba(11, 42, 82, 0.05)',
  button: '0 1px 2px rgba(0, 0, 0, 0.05)',
  buttonHover: '0 4px 12px rgba(11, 42, 82, 0.15)',
  buttonActive: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  inputFocus: shadowTokens.focus,
  avatar: shadowTokens[1],
  badge: 'none',
} as const;

export type ShadowTokens = typeof shadowTokens;
export type ShadowComponent = typeof shadowComponent;