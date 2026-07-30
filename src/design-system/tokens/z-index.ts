export const zIndexTokens = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  topbar: 997,
  sidebar: 996,
  sidebarOverlay: 995,
  configurator: 1100,
  configuratorMask: 1099,
} as const;

export type ZIndexTokens = typeof zIndexTokens;