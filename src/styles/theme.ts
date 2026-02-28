export const theme = {
  colors: {
    primary: '#4f46e5',
    primaryLight: '#818cf8',
    income: '#10b981',
    incomeBg: '#ecfdf5',
    expense: '#ef4444',
    expenseBg: '#fef2f2',
    debt: '#f59e0b',
    debtBg: '#fffbeb',
    people: '#8b5cf6',
    peopleBg: '#f5f3ff',
    analysis: '#3b82f6',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    bgPage: '#f9fafb',
    bgCard: '#ffffff',
    border: '#e5e7eb',
  },
  fonts: {
    body: "'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif",
  },
} as const;

export type AppTheme = typeof theme;
