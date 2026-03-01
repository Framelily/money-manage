export const theme = {
  colors: {
    primary: '#7C3AED',
    primaryLight: '#8B5CF6',
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
    body: "'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif",
  },
} as const;

export type AppTheme = typeof theme;
