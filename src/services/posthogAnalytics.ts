import posthog from 'posthog-js/dist/module.no-external';
import type { PostHogConfig } from 'posthog-js/dist/module.no-external';
import packageJson from '../../package.json';

type PostHogAnalyticsConfig = {
  posthogKey: string;
  posthogHost: string;
};

const ANALYTICS_CONFIG_PATH = '/analytics.config.json';
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const LEGACY_INSTALL_ID_STORAGE_KEY = 'orion.analytics.installId';

let appOpenedTracked = false;
let sdkInitialized = false;
let configPromise: Promise<PostHogAnalyticsConfig | null> | null = null;

const parseAnalyticsConfig = (value: unknown): PostHogAnalyticsConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const config = value as Record<string, unknown>;
  const posthogKey = typeof config.posthogKey === 'string' ? config.posthogKey.trim() : '';
  const posthogHost =
    typeof config.posthogHost === 'string' && config.posthogHost.trim()
      ? config.posthogHost.trim()
      : DEFAULT_POSTHOG_HOST;

  if (!posthogKey) {
    return null;
  }

  return { posthogKey, posthogHost };
};

const loadAnalyticsConfig = async () => {
  if (!configPromise) {
    configPromise = fetch(ANALYTICS_CONFIG_PATH, {
      cache: 'no-store',
      credentials: 'omit',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return parseAnalyticsConfig(await response.json());
      })
      .catch((error) => {
        console.warn('[Analytics] Could not load analytics config:', error);
        return null;
      });
  }

  return configPromise;
};

const getOperatingSystem = () => {
  if (typeof navigator === 'undefined') {
    return 'Unknown';
  }

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  const userAgent = navigator.userAgent ?? '';
  const value = `${platform} ${userAgent}`.toLowerCase();

  if (value.includes('linux')) return 'Linux';
  if (value.includes('windows') || value.includes('win32') || value.includes('win64')) {
    return 'Windows';
  }

  return 'Unknown';
};

const getCommonEventProperties = () => {
  const operatingSystem = getOperatingSystem();

  return {
    $app_version: packageJson.version,
    $browser: 'Tauri WebView',
    $device_type: 'Desktop',
    $lib: 'orion-tauri',
    $lib_version: packageJson.version,
    $os: operatingSystem,
    app_name: 'Orion',
    app_version: packageJson.version,
    build_mode: import.meta.env.MODE,
    operating_system: operatingSystem,
    platform: 'tauri',
  };
};

const clearLegacyInstallId = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LEGACY_INSTALL_ID_STORAGE_KEY);
  } catch (error) {
    console.warn('[Analytics] Could not clear legacy local analytics id:', error);
  }
};

export const isPostHogConfigured = async () => Boolean(await loadAnalyticsConfig());

export const disablePostHogAnalytics = () => {
  appOpenedTracked = false;
  clearLegacyInstallId();

  if (sdkInitialized) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
};

const initializePostHog = async () => {
  const config = await loadAnalyticsConfig();
  if (!config) {
    return false;
  }

  if (!sdkInitialized) {
    posthog.init(config.posthogKey, {
      api_host: config.posthogHost,
      autocapture: false,
      capture_pageleave: true,
      capture_pageview: true,
      cross_subdomain_cookie: false,
      defaults: '2026-05-30',
      disable_external_dependency_loading: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_surveys_automatic_display: true,
      mask_all_element_attributes: true,
      mask_all_text: true,
      opt_out_capturing_by_default: false,
      persistence: 'localStorage',
      person_profiles: 'never',
      loaded: (instance) => {
        instance.register(getCommonEventProperties());
      },
    } satisfies Partial<PostHogConfig>);

    sdkInitialized = true;
  }

  posthog.opt_in_capturing();
  posthog.register(getCommonEventProperties());
  return true;
};

export const trackAppOpened = async () => {
  if (appOpenedTracked) {
    return;
  }

  const initialized = await initializePostHog();
  if (!initialized) {
    return;
  }

  appOpenedTracked = true;
  posthog.capture('app_opened', getCommonEventProperties());
};
