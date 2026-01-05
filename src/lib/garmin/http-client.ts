// Garmin HTTP Client Wrapper
// Nutzt @capacitor-community/http für CORS Bypass auf Android
// Fallback auf fetch() für Web-Development

import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { DEFAULT_HEADERS, RATE_LIMIT, SESSION_CONFIG } from './constants';
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
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

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
 * Get stored OAuth tokens
 */
async function getStoredTokens(): Promise<{ oauth1?: string; oauth2?: string } | null> {
  try {
    const result = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS });
    if (result.value) {
      const tokens = JSON.parse(result.value);
      return {
        oauth1: tokens.oauth1Token,
        oauth2: tokens.oauth2Token,
      };
    }
  } catch (error) {
    console.error('Failed to get stored tokens:', error);
  }
  return null;
}

/**
 * Build authorization headers from stored tokens
 */
async function buildAuthHeaders(): Promise<Record<string, string>> {
  const tokens = await getStoredTokens();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  
  if (tokens?.oauth2) {
    headers['Authorization'] = `Bearer ${tokens.oauth2}`;
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
  const headers = {
    ...(await buildAuthHeaders()),
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
      if (contentType?.includes('application/json')) {
        responseData = await fetchResponse.json();
      } else {
        responseData = (await fetchResponse.text()) as unknown as T;
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
 */
async function executeWithRetry<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
  customHeaders?: Record<string, string>,
  retryCount = 0
): Promise<GarminHttpResponse<T>> {
  try {
    return await executeRequest<T>(method, url, data, customHeaders);
  } catch (error) {
    const garminError = error as GarminHttpError;
    
    // Retry once on auth errors (token might have expired)
    if (garminError.isAuthError && retryCount < RATE_LIMIT.MAX_RETRIES) {
      console.log(`Auth error on ${url}, attempting refresh...`);
      
      // TODO: Implement token refresh here
      // await refreshToken();
      
      // Wait before retry
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS)
      );
      
      return executeWithRetry<T>(method, url, data, customHeaders, retryCount + 1);
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
    return !!(tokens?.oauth1 && tokens?.oauth2);
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
