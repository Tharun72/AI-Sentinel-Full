export type AppearancePreference = 'light' | 'dark' | 'system';

export interface UiPreferences {
  appearance: AppearancePreference;
  notificationsEnabled: boolean;
}

const STORAGE_KEY = 'ai-sentinel-ui-preferences';
const DEFAULT_PREFERENCES: UiPreferences = { appearance: 'system', notificationsEnabled: true };
let sessionDisplayName: string | null = null;
let systemAppearanceListenerRegistered = false;

export function getSessionDisplayName(serverDisplayName: string): string { return sessionDisplayName ?? serverDisplayName; }
export function setSessionDisplayName(displayName: string | null): void { sessionDisplayName = displayName; }

function isPreferences(value: unknown): value is UiPreferences {
  return typeof value === 'object' && value !== null
    && 'appearance' in value
    && ((value as UiPreferences).appearance === 'light' || (value as UiPreferences).appearance === 'dark' || (value as UiPreferences).appearance === 'system')
    && typeof (value as UiPreferences).notificationsEnabled === 'boolean';
}

export function getUiPreferences(): UiPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isPreferences(value) ? value : DEFAULT_PREFERENCES;
  } catch { return DEFAULT_PREFERENCES; }
}

export function applyAppearance(appearance: AppearancePreference): void {
  if (!systemAppearanceListenerRegistered) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (document.documentElement.dataset.appearance === 'system') applyAppearance('system');
    });
    systemAppearanceListenerRegistered = true;
  }
  const resolved = appearance === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance;
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.resolvedAppearance = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function saveUiPreferences(preferences: UiPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  applyAppearance(preferences.appearance);
}
