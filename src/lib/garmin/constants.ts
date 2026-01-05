// Garmin API Constants

// Detect if we're in development mode (browser) or production (native app)
const isDev = typeof window !== 'undefined' && import.meta.env.DEV;

// Use proxy in development to avoid CORS, direct URLs in production (native)
export const GARMIN_BASE_URL = isDev ? '/api/garmin' : 'https://connect.garmin.com';
export const GARMIN_SSO_URL = isDev ? '/api/garmin-sso' : 'https://sso.garmin.com';
export const GARMIN_MODERN_PROXY = `${GARMIN_BASE_URL}/modern/proxy`;

export const WELLNESS_ENDPOINTS = {
  SLEEP_DATA: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailySleepData/${date}`,
  STRESS_DATA: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailyStress/${date}`,
  ALL_DAY_STRESS: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/daily/stress/${date}`,
  HEART_RATE: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailyHeartRate/${date}`,
  RESTING_HR: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/daily/restingHeartRate/${date}`,
  BODY_BATTERY: (startDate: string, endDate: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/bodyBattery/reports/daily?startDate=${startDate}&endDate=${endDate}`,
  DAILY_SUMMARY: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailySummaryChart/${date}`,
  RESPIRATION: (date: string) => `${GARMIN_MODERN_PROXY}/wellness-service/wellness/daily/respiration/${date}`,
};

export const HRV_ENDPOINTS = {
  HRV_DATA: (date: string) => `${GARMIN_MODERN_PROXY}/hrv-service/hrv/${date}`,
};

export const USER_SUMMARY_ENDPOINTS = {
  HYDRATION: (date: string) => `${GARMIN_MODERN_PROXY}/usersummary-service/hydration/allData/${date}`,
  USER_SUMMARY: (date: string) => `${GARMIN_MODERN_PROXY}/usersummary-service/usersummary/daily/${date}`,
  SPO2: (date: string) => `${GARMIN_MODERN_PROXY}/usersummary-service/wellness/daily/spo2/${date}`,
};

export const TRAINING_ENDPOINTS = {
  TRAINING_READINESS: (date: string) => `${GARMIN_MODERN_PROXY}/metrics-service/metrics/trainingreadiness/${date}`,
};

export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 120,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 1,
};

export const SESSION_CONFIG = {
  TOKEN_LIFETIME_HOURS: 24,
  PREFERENCES_KEY_TOKENS: 'garmin_tokens',
  PREFERENCES_KEY_PROFILE: 'garmin_profile',
  PREFERENCES_KEY_LAST_SYNC: 'garmin_last_sync',
};

export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Ungültige E-Mail oder Passwort',
  SESSION_EXPIRED: 'Sitzung abgelaufen. Bitte erneut anmelden.',
  RATE_LIMIT_EXCEEDED: 'Rate Limit überschritten. Bitte später versuchen.',
  NETWORK_ERROR: 'Netzwerkfehler. Bitte Verbindung prüfen.',
  FEATURE_UNAVAILABLE: 'Feature nicht verfügbar oder nicht aktiviert',
  MFA_REQUIRED: 'Zwei-Faktor-Authentifizierung erforderlich',
  UNAUTHORIZED: 'Nicht autorisiert. Bitte erneut anmelden.',
};
