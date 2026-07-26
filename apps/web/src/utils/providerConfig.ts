import type { CardProvider, InstallmentPlan } from '@/types';

/** Known provider tag colors (Ant Design preset color names) */
const TAG_COLORS: Record<string, string> = {
  KTC: 'red',
  UOB: 'blue',
  SHOPEE: 'orange',
};

/** Known provider chart colors (hex) */
const CHART_COLORS: Record<string, string> = {
  KTC: '#ef4444',
  UOB: '#3b82f6',
  SHOPEE: '#f97316',
};

/** Known provider display labels */
const LABELS: Record<string, string> = {
  KTC: 'KTC',
  UOB: 'UOB',
  SHOPEE: 'Shopee PayLater',
};

/** Fallback palette for dynamically added providers */
const FALLBACK_TAG_COLORS = ['purple', 'cyan', 'green', 'magenta', 'geekblue', 'lime', 'gold', 'volcano'];
const FALLBACK_CHART_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#ec4899', '#6366f1', '#84cc16', '#eab308', '#f97316'];

let dynamicIndex = 0;
const assignedFallback: Record<string, number> = {};

function getFallbackIndex(provider: CardProvider): number {
  if (!(provider in assignedFallback)) {
    assignedFallback[provider] = dynamicIndex++;
  }
  return assignedFallback[provider] % FALLBACK_TAG_COLORS.length;
}

/** Map hex → Ant Design preset tag color name; returns hex if no match */
const HEX_TO_ANTD_PRESET: Record<string, string> = {
  '#ef4444': 'red',
  '#f87171': 'red',
  '#3b82f6': 'blue',
  '#60a5fa': 'blue',
  '#f97316': 'orange',
  '#fb923c': 'orange',
  '#06b6d4': 'cyan',
  '#22c55e': 'green',
  '#ec4899': 'magenta',
  '#6366f1': 'geekblue',
  '#84cc16': 'lime',
  '#eab308': 'gold',
  '#f43f5e': 'volcano',
};

export function hexToAntdPreset(hex: string): string {
  return HEX_TO_ANTD_PRESET[hex.toLowerCase()] ?? hex;
}

export function getProviderTagColor(provider: CardProvider, colorOverride?: string): string {
  if (colorOverride) return hexToAntdPreset(colorOverride);
  return TAG_COLORS[provider] ?? FALLBACK_TAG_COLORS[getFallbackIndex(provider)];
}

export function getProviderChartColor(provider: CardProvider, colorOverride?: string): string {
  if (colorOverride) return colorOverride;
  return CHART_COLORS[provider] ?? FALLBACK_CHART_COLORS[getFallbackIndex(provider)];
}

export function getProviderLabel(provider: CardProvider): string {
  return LABELS[provider] ?? provider;
}

/** Build a provider→color map from plan data (uses first plan's color for each provider) */
export function buildProviderColorMap(plans: InstallmentPlan[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const plan of plans) {
    if (plan.providerColor && !(plan.provider in map)) {
      map[plan.provider] = plan.providerColor;
    }
  }
  return map;
}
