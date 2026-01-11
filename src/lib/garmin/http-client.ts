// Garmin HTTP Client Wrapper
// Nutzt @capacitor-community/http für CORS Bypass auf Android
// Fallback auf fetch() für Web-Development

import { CapacitorHttp } from '@capacitor/core';
import type { HttpOptions, HttpResponse } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { DEFAULT_HEADERS, RATE_LIMIT, SESSION_CONFIG } from './constants';
import { garminAuth } from './auth';
import { db } from '../db';

export interface GarminHttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface GarminHttpError {
  status: number;
  message: string;
  endpoint: string;
  isAuthError: boolean;
}

// Rate Limiting State
let requestCount = 0;
let lastResetTime = Date.now();
// Note: requestQueue and isProcessingQueue reserved for future queueing implementation

/**
 * Logs API request to database for debugging
 */
async function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  error?: string
): Promise<void> {
  try {
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level: error ? 'error' : 'info',
      message: `[Garmin API] ${method} ${url} - ${status} (${duration}ms)${error ? ` - ${error}` : ''}`,
      context: JSON.stringify({ method, url, status, duration, error }),
    });
  } catch (e) {
    console.error('Failed to log request:', e);
  }
}

/**
 * Reset rate limit counter every minute
 */
function checkRateLimitReset(): void {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    requestCount = 0;
    lastResetTime = now;
  }
}

/**
 * Wait if rate limit is exceeded
 */
async function waitForRateLimit(): Promise<void> {
  checkRateLimitReset();
  if (requestCount >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const waitTime = 60000 - (Date.now() - lastResetTime) + 100;
    console.log(`Rate limit reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    lastResetTime = Date.now();
  }
  requestCount++;
}

/**
 * Get stored OAuth tokens (including token secrets)
 * Returns GarminAuthTokens-compatible structure
 */
async function getStoredTokens(): Promise<{
  oauth1Token?: string;
  oauth1Secret?: string;
  oauth2Token?: string;
} | null> {
  try {
    const result = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS });
    if (result.value) {
      const tokens = JSON.parse(result.value);

      // Parse oauth1Token (it's a JSON string containing oauth_token and oauth_token_secret)
      let oauth1Token: string | undefined;
      let oauth1Secret: string | undefined;

      if (tokens.oauth1Token) {
        try {
          const oauth1Data = JSON.parse(tokens.oauth1Token);
          oauth1Token = oauth1Data.oauth_token;
          oauth1Secret = oauth1Data.oauth_token_secret;
        } catch (e) {
          // Fallback: If not a JSON string, use as-is (backwards compatibility)
          oauth1Token = tokens.oauth1Token;
        }
      }

      return {
        oauth1Token: oauth1Token,
        oauth1Secret: oauth1Secret,
        oauth2Token: tokens.oauth2Token,
      };
    }
  } catch (error) {
    console.error('Failed to get stored tokens:', error);
  }
  return null;
}

/**
 * Build authorization headers
 * IMPORTANT: Garth uses OAuth2 Bearer token for Connect API requests, NOT OAuth1!
 * OAuth1 is only used for token exchange/refresh operations in auth.ts
 * See garth http.py: headers["Authorization"] = str(self.oauth2_token) for api=True
 */
async function buildAuthHeaders(
  method: string,
  url: string,
  _queryParams?: Record<string, string>
): Promise<Record<string, string>> {
  const tokens = await getStoredTokens();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  // Use OAuth2 Bearer token for API requests (this is what garth does!)
  if (tokens?.oauth2Token) {
    headers['Authorization'] = `Bearer ${tokens.oauth2Token}`;
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[HTTP Client] Using OAuth2 Bearer token for ${method} ${url.substring(0, 80)}`
    });
  } else {
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `[HTTP Client] No OAuth2 token available for ${method} ${url.substring(0, 80)}`
    });
  }

  return headers;
}

/**
 * Check if error is an authentication error
 */
function isAuthenticationError(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Execute HTTP request using native HTTP on mobile, fetch on web
 */
async function executeRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
  customHeaders?: Record<string, string>
): Promise<GarminHttpResponse<T>> {
  const startTime = Date.now();

  // Build headers with OAuth2 Bearer token
  const headers = {
    ...(await buildAuthHeaders(method, url)),
    ...customHeaders,
  };

  try {
    await waitForRateLimit();

    let response: HttpResponse;

    // Use native HTTP on mobile platforms (CORS bypass)
    if (Capacitor.isNativePlatform()) {
      const options: HttpOptions = {
        url,
        method,
        headers,
        data: data ? JSON.stringify(data) : undefined,
        connectTimeout: 30000,
        readTimeout: 30000,
      };
      response = await CapacitorHttp.request(options);
    } else {
      // Use fetch on web (for development)
      const fetchOptions: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      };

      const fetchResponse = await fetch(url, fetchOptions);
      let responseData: T;

      const contentType = fetchResponse.headers.get('content-type');
      const responseText = await fetchResponse.text();

      // Try to parse as JSON if content-type indicates JSON or if it looks like JSON
      if (contentType?.includes('application/json') ||
        (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
        try {
          responseData = JSON.parse(responseText) as T;
        } catch (e) {
          // If parsing fails, return as text
          responseData = responseText as unknown as T;
        }
      } else {
        // Non-JSON response (likely HTML error page)
        responseData = responseText as unknown as T;
      }

      response = {
        status: fetchResponse.status,
        data: responseData,
        headers: Object.fromEntries(fetchResponse.headers.entries()),
        url: fetchResponse.url,
      };
    }

    const duration = Date.now() - startTime;
    await logRequest(method, url, response.status, duration);

    if (response.status >= 400) {
      throw {
        status: response.status,
        message: `HTTP ${response.status}: ${response.data || 'Request failed'}`,
        endpoint: url,
        isAuthError: isAuthenticationError(response.status),
      } as GarminHttpError;
    }

    return {
      data: response.data as T,
      status: response.status,
      headers: response.headers || {},
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const garminError = error as GarminHttpError;

    await logRequest(
      method,
      url,
      garminError.status || 0,
      duration,
      garminError.message || String(error)
    );

    throw error;
  }
}

/**
 * Execute request with automatic retry on auth errors
 * Implements token refresh when OAuth2 token expires
 */
async function executeWithRetry<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
  customHeaders?: Record<string, string>,
  retryCount = 0
): Promise<GarminHttpResponse<T>> {
  try {
    const response = await executeRequest<T>(method, url, data, customHeaders);

    // Check if response is HTML (auth failure that returned 200)
    const responseData = response.data as unknown;
    if (typeof responseData === 'string' && responseData.trim().startsWith('<!DOCTYPE html>')) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[HTTP Client] Got HTML instead of JSON for ${url.substring(0, 80)} - likely auth failure`
      });

      // Treat as auth error and try to refresh
      if (retryCount < RATE_LIMIT.MAX_RETRIES) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `[HTTP Client] Attempting token refresh after HTML response...`
        });

        const refreshed = await garminAuth.refreshSession();
        if (refreshed) {
          await db.logs.add({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[HTTP Client] Token refresh successful, retrying request...`
          });

          await new Promise(resolve =>
            setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS)
          );

          return executeWithRetry<T>(method, url, data, customHeaders, retryCount + 1);
        }
      }
    }

    return response;
  } catch (error) {
    const garminError = error as GarminHttpError;

    // Retry once on auth errors (token might have expired)
    if (garminError.isAuthError && retryCount < RATE_LIMIT.MAX_RETRIES) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[HTTP Client] Auth error (${garminError.status}) on ${url.substring(0, 80)}, attempting refresh...`
      });

      // Try to refresh the session using OAuth1 token
      const refreshed = await garminAuth.refreshSession();
      if (refreshed) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `[HTTP Client] Token refresh successful, retrying request...`
        });

        await new Promise(resolve =>
          setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS)
        );

        return executeWithRetry<T>(method, url, data, customHeaders, retryCount + 1);
      } else {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `[HTTP Client] Token refresh failed, cannot retry request`
        });
      }
    }

    throw error;
  }
}

/**
 * Garmin HTTP Client Class
 */
export class GarminHttpClient {
  /**
   * GET request
   */
  async get<T>(url: string, headers?: Record<string, string>): Promise<GarminHttpResponse<T>> {
    return executeWithRetry<T>('GET', url, undefined, headers);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, headers?: Record<string, string>): Promise<GarminHttpResponse<T>> {
    return executeWithRetry<T>('POST', url, data, headers);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, headers?: Record<string, string>): Promise<GarminHttpResponse<T>> {
    return executeWithRetry<T>('PUT', url, data, headers);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, headers?: Record<string, string>): Promise<GarminHttpResponse<T>> {
    return executeWithRetry<T>('DELETE', url, undefined, headers);
  }

  /**
   * Check if we can make requests (tokens exist)
   */
  async canMakeRequests(): Promise<boolean> {
    const tokens = await getStoredTokens();
    // Check for correct token property names from GarminAuthTokens interface
    return !!(tokens?.oauth1Token && tokens?.oauth2Token);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetIn: number } {
    checkRateLimitReset();
    return {
      remaining: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE - requestCount,
      resetIn: Math.max(0, 60000 - (Date.now() - lastResetTime)),
    };
  }
}

// Singleton instance
export const garminHttp = new GarminHttpClient();
