// Garmin Authentication Service
// Implementiert OAuth1/OAuth2 Flow basierend auf python-garminconnect (garth)

import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import type { HttpOptions } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { SESSION_CONFIG, DEFAULT_HEADERS, ERROR_MESSAGES, GARMIN_SSO_URL, GARMIN_API_URL } from './constants';
import type { GarminAuthTokens, GarminProfile, GarminLoginResponse, GarminMFAState } from './types';
import { db } from '../db';

// Garmin SSO URLs - use proxy in dev mode
const SSO_URL = `${GARMIN_SSO_URL}/sso`;
const SSO_SIGNIN_URL = `${SSO_URL}/signin`;
const SSO_MFA_URL = `${SSO_URL}/verifyMFA/loginEnterMfaCode`;
const SSO_EMBED_URL = `${SSO_URL}/embed`;

// Real Garmin URLs for params (not proxied)
// These are used in URL parameters sent to Garmin, must be real URLs
const REAL_SSO_URL = 'https://sso.garmin.com/sso';
const REAL_SSO_EMBED_URL = `${REAL_SSO_URL}/embed`;

// OAuth URLs (from garth/python-garminconnect)
const OAUTH_BASE_URL = 'https://connectapi.garmin.com/oauth-service/oauth';

// OAuth Consumer Credentials - fetched from Garmin's public endpoint (same as garth)
// Use proxy in dev mode to avoid CORS
const isDev = typeof window !== 'undefined' && import.meta.env.DEV;
const OAUTH_CONSUMER_URL = isDev
  ? '/api/oauth-consumer'
  : 'https://thegarth.s3.amazonaws.com/oauth_consumer.json';
let OAUTH_CONSUMER: { consumer_key: string; consumer_secret: string } | null = null;

interface OAuth1TokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  mfa_token?: string;
  mfa_expiration_timestamp?: string;
}

interface OAuth2TokenResponse {
  scope: string;
  jti: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
}

/**
 * Log authentication events
 */
async function logAuth(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
  const fullMessage = `[Garmin Auth] ${message}`;

  // Always log to browser console
  if (level === 'error') {
    console.error(fullMessage);
  } else if (level === 'warn') {
    console.warn(fullMessage);
  } else {
    console.log(fullMessage);
  }

  // Also save to DB for persistent logging
  try {
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level,
      message: fullMessage,
    });
  } catch (e) {
    console.error('Failed to save log to DB:', e);
  }
}

/**
 * Execute HTTP request (native or fetch based on platform)
 */
async function httpRequest<T>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: string,
  headers?: Record<string, string>,
  followRedirects = false
): Promise<{ data: T; status: number; headers: Record<string, string> }> {
  const defaultHeaders = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  if (Capacitor.isNativePlatform()) {
    const options: HttpOptions = {
      url,
      method,
      headers: defaultHeaders,
      data: body,
      connectTimeout: 30000,
      readTimeout: 30000,
    };

    const response = await CapacitorHttp.request(options);
    return {
      data: response.data as T,
      status: response.status,
      headers: response.headers || {},
    };
  } else {
    const fetchResponse = await fetch(url, {
      method,
      headers: defaultHeaders,
      body,
      credentials: 'include',
      redirect: followRedirects ? 'follow' : 'manual',
    });

    let data: T;
    const contentType = fetchResponse.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await fetchResponse.json();
    } else {
      data = (await fetchResponse.text()) as unknown as T;
    }

    return {
      data,
      status: fetchResponse.status,
      headers: Object.fromEntries(fetchResponse.headers.entries()),
    };
  }
}

/**
 * Load OAuth consumer credentials (same source as garth library)
 */
async function getOAuthConsumer(): Promise<{ consumer_key: string; consumer_secret: string }> {
  if (OAUTH_CONSUMER) {
    return OAUTH_CONSUMER;
  }

  await logAuth('Fetching OAuth consumer credentials...');
  const response = await httpRequest<{ consumer_key: string; consumer_secret: string }>(
    OAUTH_CONSUMER_URL,
    'GET'
  );
  OAUTH_CONSUMER = response.data;
  await logAuth(`Got OAuth consumer: ${OAUTH_CONSUMER.consumer_key.substring(0, 8)}...`);
  return OAUTH_CONSUMER;
}

/**
 * Generate OAuth1 signature base string
 */
export function generateOAuth1BaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
}

/**
 * Generate OAuth1 signature using HMAC-SHA1
 */
export async function generateOAuth1Signature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> {
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Use Web Crypto API for HMAC-SHA1
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);

  // Convert to base64
  return btoa(String.fromCharCode(...signatureArray));
}

/**
 * Generate OAuth1 nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build OAuth1 Authorization header
 */
export async function buildOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token?: string,
  tokenSecret?: string,
  extraParams?: Record<string, string>
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0',
  };

  if (token) {
    oauthParams.oauth_token = token;
  }

  // Combine with extra params for signature
  const allParams = { ...oauthParams, ...extraParams };

  // Generate signature
  const baseString = generateOAuth1BaseString(method, url, allParams);
  const signature = await generateOAuth1Signature(baseString, consumerSecret, tokenSecret || '');
  oauthParams.oauth_signature = signature;

  // Build header
  const headerParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

/**
 * Extract CSRF token from SSO HTML page
 */
function extractCSRFToken(html: string): string | null {
  // Try multiple patterns as Garmin changes their HTML sometimes
  const patterns = [
    /name="_csrf"\s+value="([^"]+)"/,
    /name='_csrf'\s+value='([^']+)'/,
    /"_csrf":\s*"([^"]+)"/,
    /csrf['"]\s*:\s*['"]([^'"]+)['"]/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Parse SSO response from HTML or JSON
 */
function parseSSORespsonse(html: string): { ticket?: string; error?: string; csrf?: string } {
  // Look for service ticket in response (success case)
  // Check multiple possible formats for the ticket
  const ticketPatterns = [
    /ticket=([A-Za-z0-9\-_]+)/,
    /"serviceTicket"\s*:\s*"([^"]+)"/,
    /service_ticket['"]\s*:\s*['"]([^'"]+)['"]/i,
  ];

  for (const pattern of ticketPatterns) {
    const ticketMatch = html.match(pattern);
    if (ticketMatch) {
      console.log('[parseSSO] Found ticket:', ticketMatch[1].substring(0, 10) + '...');
      return { ticket: ticketMatch[1] };
    }
  }

  // Extract CSRF token from HTML form using helper
  const csrf = extractCSRFToken(html) || undefined;

  // Look for specific error messages - be very specific to avoid false positives
  const errorPatterns = [
    // Look for error spans/divs with actual error text, but exclude generic containers
    /<span[^>]*class="[^"]*status-error[^"]*"[^>]*>([^<]+)<\/span>/i,
    /<p[^>]*class="[^"]*error-message[^"]*"[^>]*>([^<]+)<\/p>/i,
    /<div[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)<\/div>/i,
    /"errorMessage"\s*:\s*"([^"]+)"/,
    /"error"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of errorPatterns) {
    const errorMatch = html.match(pattern);
    if (errorMatch) {
      const errorText = errorMatch[1].trim();
      // Skip empty, generic messages, or messages that are just technical codes
      if (errorText && errorText.length > 5 && !errorText.startsWith('error') && !errorText.match(/^[A-Z_]+$/)) {
        console.log('[parseSSO] Found error message:', errorText);
        return { error: errorText, csrf };
      }
    }
  }

  // Check for invalid credentials message in page content
  const lowerHtml = html.toLowerCase();
  if ((lowerHtml.includes('credentials') || lowerHtml.includes('kennwort') || lowerHtml.includes('passwort') || lowerHtml.includes('e-mail')) &&
    (lowerHtml.includes('invalid') || lowerHtml.includes('incorrect') || lowerHtml.includes('falsch') || lowerHtml.includes('ungültig'))) {
    console.log('[parseSSO] Detected invalid credentials from page content');
    return { error: 'INVALID_CREDENTIALS', csrf };
  }

  // Check for locked account
  if (lowerHtml.includes('locked') || lowerHtml.includes('gesperrt')) {
    console.log('[parseSSO] Detected account locked');
    return { error: 'ACCOUNT_LOCKED', csrf };
  }

  // Check for MFA CODE ENTRY page FIRST (has enterMfaCode.js)
  // This page appears AFTER 2FA is enabled and user needs to enter the code
  if (html.includes('enterMfaCode.js') ||
    html.includes('mfa-code') ||
    html.includes('verify-mfa-code-form') ||
    html.includes('loginEnterMfaCode')) {
    console.log('[parseSSO] MFA code entry required');
    return { error: 'MFA_REQUIRED', csrf };
  }

  // Check for MFA SETUP page (user needs to enable 2FA first)
  // This page appears when 2FA is NOT yet enabled
  if (html.includes('<title>MFA required</title>') ||
    html.includes('<title>MFA Required</title>') ||
    lowerHtml.includes('<title>mfa required</title>')) {

    // Key indicators for SETUP page: "setup-mfa-required-form", "einrichten"
    if (html.includes('setup-mfa-required-form') ||
      html.includes('setupMfaRequiredView') ||
      html.includes('einrichten') ||
      html.includes('set up') ||
      html.includes('Ohne die Einrichtung')) {
      console.log('[parseSSO] MFA setup required');
      return { error: 'MFA_SETUP_REQUIRED', csrf };
    }

    // Fallback to MFA code entry if we can't distinguish
    console.log('[parseSSO] MFA required (fallback)');
    return { error: 'MFA_REQUIRED', csrf };
  }

  console.log('[parseSSO] No ticket or error found. HTML length:', html.length);
  console.log('[parseSSO] HTML snippet:', html.substring(0, 500).replace(/[\n\r\t]+/g, ' '));
  return { csrf };
}

export class GarminAuthService {
  private tokens: GarminAuthTokens | null = null;
  private profile: GarminProfile | null = null;
  private mfaState: GarminMFAState | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.loadStoredSession();
  }

  /**
   * Load session from Preferences
   */
  private async loadStoredSession(): Promise<void> {
    try {
      const [tokensResult, profileResult] = await Promise.all([
        Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS }),
        Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE }),
      ]);

      if (tokensResult.value) {
        const stored = JSON.parse(tokensResult.value);
        this.tokens = {
          oauth1Token: stored.oauth1Token,
          oauth2Token: stored.oauth2Token,
        };
        if (stored.expiry) {
          this.tokenExpiry = new Date(stored.expiry);
        }
      }

      if (profileResult.value) {
        this.profile = JSON.parse(profileResult.value);
      }

      await logAuth('Session loaded from storage');
    } catch (error) {
      await logAuth(`Failed to load session: ${error}`, 'error');
    }
  }

  /**
   * Save session to Preferences
   */
  private async saveSession(): Promise<void> {
    try {
      if (this.tokens) {
        const tokenData = {
          ...this.tokens,
          expiry: this.tokenExpiry?.toISOString(),
        };
        await Preferences.set({
          key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS,
          value: JSON.stringify(tokenData),
        });
      }

      if (this.profile) {
        await Preferences.set({
          key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE,
          value: JSON.stringify(this.profile),
        });
      }

      await logAuth('Session saved to storage');
    } catch (error) {
      await logAuth(`Failed to save session: ${error}`, 'error');
    }
  }

  /**
   * Clear session from Preferences
   */
  private async clearSession(): Promise<void> {
    this.tokens = null;
    this.profile = null;
    this.mfaState = null;
    this.tokenExpiry = null;

    await Promise.all([
      Preferences.remove({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS }),
      Preferences.remove({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE }),
      Preferences.remove({ key: SESSION_CONFIG.PREFERENCES_KEY_LAST_SYNC }),
    ]);

    await logAuth('Session cleared');
  }

  /**
   * Step 1: Initiate SSO login
   * Based on garth's login implementation - MUST follow exact flow:
   * 1. GET /sso/embed to set cookies
   * 2. GET /sso/signin to get CSRF token
   * 3. POST /sso/signin with credentials
   */
  private async initiateSSO(email: string, password: string): Promise<{ ticket: string } | { mfaRequired: true; clientState: string }> {
    await logAuth(`Initiating SSO login for ${email.split('@')[0]}@...`);

    // URLs exactly as garth defines them
    const SSO = REAL_SSO_URL;  // https://sso.garmin.com/sso
    const SSO_EMBED = `${SSO}/embed`;  // https://sso.garmin.com/sso/embed

    // Step 0: First hit /sso/embed to set cookies (CRITICAL - garth does this!)
    const embedParams = new URLSearchParams({
      id: 'gauth-widget',
      embedWidget: 'true',
      gauthHost: SSO,  // Note: gauthHost is SSO (without /embed) here
    });

    const embedUrl = `${SSO_EMBED_URL}?${embedParams.toString()}`;
    await logAuth(`Step 0: Setting cookies via embed: ${embedUrl.substring(0, 80)}...`);

    try {
      await httpRequest<string>(embedUrl, 'GET');
      await logAuth('Embed cookies set successfully');
    } catch (e) {
      await logAuth(`Warning: embed request failed (may not be critical): ${e}`, 'warn');
    }

    // Signin params - gauthHost here is SSO_EMBED (with /embed)
    const signinParams = new URLSearchParams({
      id: 'gauth-widget',
      embedWidget: 'true',
      gauthHost: SSO_EMBED,
      service: SSO_EMBED,
      source: SSO_EMBED,
      redirectAfterAccountLoginUrl: SSO_EMBED,
      redirectAfterAccountCreationUrl: SSO_EMBED,
    });

    // Step 1: GET /sso/signin to get CSRF token
    const signinUrl = `${SSO_SIGNIN_URL}?${signinParams.toString()}`;
    await logAuth(`Step 1: Fetching signin page for CSRF: ${signinUrl.substring(0, 80)}...`);

    const csrfResponse = await httpRequest<string>(
      signinUrl,
      'GET',
      undefined,
      {
        'Referer': embedUrl,
      }
    );
    await logAuth(`Signin page response status: ${csrfResponse.status}`);

    // Extract CSRF token from the page
    const csrf = extractCSRFToken(csrfResponse.data);

    if (!csrf) {
      await logAuth('Could not extract CSRF token from signin page', 'error');
      await logAuth(`Response snippet: ${csrfResponse.data.substring(0, 500)}`, 'error');
      throw new Error('Login fehlgeschlagen: CSRF Token nicht gefunden');
    }

    await logAuth(`CSRF token extracted: ${csrf.substring(0, 10)}...`);

    // Step 2: POST login credentials
    const loginBody = new URLSearchParams({
      username: email,
      password: password,
      embed: 'true',
      _csrf: csrf,
    });

    await logAuth('Step 2: Submitting login credentials...');

    const loginResponse = await httpRequest<string>(
      signinUrl,
      'POST',
      loginBody.toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://sso.garmin.com',
        'Referer': signinUrl,
      }
    );

    await logAuth(`Login response status: ${loginResponse.status}`);
    const responseLength = loginResponse.data?.length || 0;
    await logAuth(`Response length: ${responseLength} chars`);

    // Get the page title (garth uses this to check status)
    const titleMatch = loginResponse.data.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : 'unknown';
    await logAuth(`Page title: "${pageTitle}"`);

    // Check for success - garth checks if title == "Success"
    if (pageTitle === 'Success') {
      // Extract ticket from response using garth's pattern
      const ticketMatch = loginResponse.data.match(/embed\?ticket=([^"]+)"/);
      if (ticketMatch) {
        await logAuth(`Success! Ticket found: ${ticketMatch[1].substring(0, 10)}...`);
        return { ticket: ticketMatch[1] };
      }
      await logAuth('Success page but no ticket found!', 'error');
      await logAuth(`Response: ${loginResponse.data.substring(0, 1000)}`, 'error');
    }

    // Check for MFA
    if (pageTitle.includes('MFA') || loginResponse.data.includes('verifyMFA')) {
      await logAuth('MFA required');

      // Get fresh CSRF from MFA page
      const mfaCsrf = extractCSRFToken(loginResponse.data) || csrf;

      this.mfaState = {
        clientState: mfaCsrf,
        requiresMFA: true,
        email: email,
        signinParams: signinParams.toString(),
      };
      return { mfaRequired: true, clientState: mfaCsrf };
    }

    // Log response preview for debugging
    const snippet = loginResponse.data.substring(0, 500).replace(/[\n\r\t]+/g, ' ');
    await logAuth(`Response preview: ${snippet}`);

    // Check for redirect with ticket in headers
    if (loginResponse.headers) {
      const location = loginResponse.headers['location'] || loginResponse.headers['Location'];
      if (location) {
        await logAuth(`Redirect location: ${location}`);
        const ticketInRedirect = location.match(/ticket=([A-Za-z0-9\-_]+)/);
        if (ticketInRedirect) {
          await logAuth(`Found ticket in redirect: ${ticketInRedirect[1].substring(0, 10)}...`);
          return { ticket: ticketInRedirect[1] };
        }
      }
    }

    // Try to find ticket in response body (fallback patterns)
    const ticketPatterns = [
      /embed\?ticket=([^"]+)"/,
      /ticket=([A-Za-z0-9\-_]+)/,
      /"serviceTicket"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of ticketPatterns) {
      const match = loginResponse.data.match(pattern);
      if (match) {
        await logAuth(`Found ticket with pattern: ${match[1].substring(0, 10)}...`);
        return { ticket: match[1] };
      }
    }

    // Parse for errors
    const parsed = parseSSORespsonse(loginResponse.data);

    if (parsed.error === 'MFA_SETUP_REQUIRED') {
      await logAuth('MFA SETUP required - user must enable 2FA on Garmin website first', 'error');
      throw new Error('MFA_SETUP_REQUIRED');
    }

    if (parsed.error === 'MFA_REQUIRED') {
      const mfaCsrf = parsed.csrf || extractCSRFToken(loginResponse.data) || csrf;
      this.mfaState = {
        clientState: mfaCsrf,
        requiresMFA: true,
        email: email,
        signinParams: signinParams.toString(),
      };
      return { mfaRequired: true, clientState: mfaCsrf };
    }

    if (parsed.error) {
      await logAuth(`Login error: ${parsed.error}`, 'error');
      if (parsed.error === 'INVALID_CREDENTIALS') {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }
      if (parsed.error === 'ACCOUNT_LOCKED') {
        throw new Error('Konto gesperrt. Bitte versuche es später erneut.');
      }
      throw new Error(parsed.error);
    }

    if (parsed.ticket) {
      await logAuth(`Service ticket received: ${parsed.ticket.substring(0, 10)}...`);
      return { ticket: parsed.ticket };
    }

    // Nothing worked - throw with page title info
    await logAuth(`Login failed. Page title: "${pageTitle}"`, 'error');
    await logAuth(`Full response: ${loginResponse.data.substring(0, 2000)}`, 'error');
    throw new Error(`Login fehlgeschlagen: ${pageTitle}`);
  }

  /**
   * Step 2a: Exchange service ticket for OAuth1 token
   * Based on garth's get_oauth1_token implementation
   */
  private async getOAuth1Token(ticket: string): Promise<OAuth1TokenResponse> {
    await logAuth('Step 2a: Getting OAuth1 token from ticket');

    const consumer = await getOAuthConsumer();
    // IMPORTANT: Use REAL SSO embed URL (not proxy) - Garmin validates this
    const loginUrl = REAL_SSO_EMBED_URL;  // https://sso.garmin.com/sso/embed
    const baseUrl = `${OAUTH_BASE_URL}/preauthorized`;

    // Query parameters that will be in the URL AND need to be in signature
    const queryParams: Record<string, string> = {
      'ticket': ticket,
      'login-url': loginUrl,
      'accepts-mfa-tokens': 'true',
    };

    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const fullUrl = `${baseUrl}?${queryString}`;

    await logAuth(`OAuth1 base URL: ${baseUrl}`);
    await logAuth(`OAuth1 full URL: ${fullUrl.substring(0, 100)}...`);

    // Build OAuth1 signed request - IMPORTANT: Include query params in signature!
    const authHeader = await buildOAuth1Header(
      'GET',
      baseUrl,  // Use base URL without query params for signature base
      consumer.consumer_key,
      consumer.consumer_secret,
      undefined,  // No token yet
      undefined,  // No token secret yet
      queryParams  // Include query params in signature calculation!
    );

    await logAuth('Sending OAuth1 preauthorized request...');

    const response = await httpRequest<string>(
      fullUrl,
      'GET',
      undefined,
      {
        'Authorization': authHeader,
        'User-Agent': 'com.garmin.android.apps.connectmobile',
      }
    );

    await logAuth(`OAuth1 response status: ${response.status}`);
    await logAuth(`OAuth1 response: ${response.data?.substring(0, 200)}`);

    if (response.status !== 200) {
      // Log more details for debugging
      await logAuth(`OAuth1 FAILED! Status: ${response.status}`, 'error');
      await logAuth(`Response body: ${response.data?.substring(0, 500)}`, 'error');
      throw new Error(`OAuth1 token request failed with status ${response.status}`);
    }

    // Parse URL-encoded response (oauth_token=xxx&oauth_token_secret=yyy)
    const params = new URLSearchParams(response.data);
    const oauth1Token: OAuth1TokenResponse = {
      oauth_token: params.get('oauth_token') || '',
      oauth_token_secret: params.get('oauth_token_secret') || '',
      mfa_token: params.get('mfa_token') || undefined,
      mfa_expiration_timestamp: params.get('mfa_expiration_timestamp') || undefined,
    };

    if (!oauth1Token.oauth_token || !oauth1Token.oauth_token_secret) {
      await logAuth(`Missing OAuth1 tokens. Response: ${response.data}`, 'error');
      throw new Error('Failed to obtain OAuth1 token');
    }

    await logAuth(`OAuth1 token received: ${oauth1Token.oauth_token.substring(0, 10)}...`);
    return oauth1Token;
  }

  /**
   * Step 2b: Exchange OAuth1 token for OAuth2 token
   * Based on garth's exchange implementation
   */
  private async exchangeOAuth1ForOAuth2(oauth1: OAuth1TokenResponse): Promise<OAuth2TokenResponse> {
    await logAuth('Step 2b: Exchanging OAuth1 for OAuth2 token');

    const consumer = await getOAuthConsumer();
    const url = `${OAUTH_BASE_URL}/exchange/user/2.0`;

    // Build body with mfa_token if present
    const bodyParams: Record<string, string> = {};
    if (oauth1.mfa_token) {
      bodyParams.mfa_token = oauth1.mfa_token;
    }
    const body = new URLSearchParams(bodyParams).toString();

    // Build OAuth1 signed request with token
    const authHeader = await buildOAuth1Header(
      'POST',
      url,
      consumer.consumer_key,
      consumer.consumer_secret,
      oauth1.oauth_token,
      oauth1.oauth_token_secret,
      bodyParams
    );

    await logAuth('Sending OAuth2 exchange request...');

    const response = await httpRequest<OAuth2TokenResponse>(
      url,
      'POST',
      body || undefined,
      {
        'Authorization': authHeader,
        'User-Agent': 'com.garmin.android.apps.connectmobile',
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    await logAuth(`OAuth2 response status: ${response.status}`);

    if (response.status !== 200) {
      const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      await logAuth(`OAuth2 exchange failed: ${errorText}`, 'error');
      throw new Error(`OAuth2 exchange failed with status ${response.status}`);
    }

    const oauth2 = response.data;
    if (!oauth2.access_token) {
      await logAuth(`No access_token in OAuth2 response: ${JSON.stringify(oauth2)}`, 'error');
      throw new Error('OAuth2 exchange failed: No access token received');
    }

    await logAuth(`OAuth2 token received: ${oauth2.access_token.substring(0, 10)}...`);
    return oauth2;
  }

  /**
   * Step 2: Exchange service ticket for OAuth tokens (combined flow)
   */
  private async exchangeTicket(ticket: string): Promise<GarminAuthTokens> {
    await logAuth('Exchanging service ticket for OAuth tokens (garth flow)');

    // Step 2a: Get OAuth1 token from ticket
    const oauth1 = await this.getOAuth1Token(ticket);

    // Step 2b: Exchange OAuth1 for OAuth2
    const oauth2 = await this.exchangeOAuth1ForOAuth2(oauth1);

    // Calculate token expiry
    const expiresIn = oauth2.expires_in || 3600;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Store both tokens - we need OAuth1 for refresh later
    return {
      oauth1Token: JSON.stringify(oauth1), // Store full OAuth1 token for later refresh
      oauth2Token: oauth2.access_token,
    };
  }

  /**
   * Step 3: Get user profile
   * IMPORTANT: displayName is critical for API endpoints - must be the actual Garmin username
   */
  private async fetchProfile(): Promise<GarminProfile> {
    await logAuth('Fetching user profile');

    // Use connectapi.garmin.com for API requests (not connect.garmin.com/modern/proxy)
    const profileUrl = `${GARMIN_API_URL}/userprofile-service/socialProfile`;

    try {
      const response = await httpRequest<{
        displayName?: string;
        fullName?: string;
        userName?: string;
        profileId?: number;
        id?: number;
      }>(
        profileUrl,
        'GET',
        undefined,
        {
          'Authorization': `Bearer ${this.tokens?.oauth2Token}`,
        }
      );

      // Log raw profile response for debugging
      await logAuth(`Profile response: ${JSON.stringify(response.data).substring(0, 500)}`);

      // displayName is CRITICAL - it's used in API endpoint URLs
      // It should be the actual Garmin username, not a generic fallback
      const displayName = response.data.displayName || response.data.userName;

      if (!displayName || displayName === 'user' || displayName === 'User') {
        await logAuth('WARNING: displayName is missing or generic!', 'warn');
        await logAuth('This will cause API endpoints to fail. Check profile response.', 'warn');
      } else {
        await logAuth(`Got displayName: ${displayName}`);
      }

      return {
        displayName: displayName || '',  // Don't use 'User' fallback - empty is safer
        fullName: response.data.fullName || '',
        email: '',
      };
    } catch (error) {
      await logAuth(`Failed to fetch profile: ${error}`, 'error');
      // Return empty profile rather than generic fallback
      return {
        displayName: '',
        fullName: '',
        email: '',
      };
    }
  }

  /**
   * Main login method
   */
  async login(email: string, password: string): Promise<GarminLoginResponse> {
    try {
      await logAuth('Starting login process');

      // Step 1: SSO Login
      const ssoResult = await this.initiateSSO(email, password);

      if ('mfaRequired' in ssoResult) {
        await logAuth('MFA required', 'warn');
        throw new Error('MFA_REQUIRED');
      }

      // Step 2: Exchange ticket for tokens
      this.tokens = await this.exchangeTicket(ssoResult.ticket);

      // Step 3: Get profile
      this.profile = await this.fetchProfile();
      this.profile.email = email;

      // Save session
      await this.saveSession();

      await logAuth('Login successful');

      return {
        tokens: this.tokens,
        profile: this.profile,
      };
    } catch (error) {
      await logAuth(`Login failed: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Complete MFA login
   * Based on garth library's handle_mfa implementation
   */
  async completeMFA(mfaCode: string): Promise<GarminLoginResponse> {
    if (!this.mfaState) {
      throw new Error('No MFA session active');
    }

    await logAuth(`Completing MFA verification with code length: ${mfaCode.length}`);
    await logAuth(`Using CSRF: ${this.mfaState.clientState?.substring(0, 10)}...`);

    // Use stored signin params from original login, or build new ones
    let signinParamsString = this.mfaState.signinParams;
    if (!signinParamsString) {
      // Build SSO_EMBED params matching garth's implementation
      // Use REAL URLs in params (not proxy paths)
      const signinParams = new URLSearchParams({
        id: 'gauth-widget',
        embedWidget: 'true',
        gauthHost: REAL_SSO_EMBED_URL,
        service: REAL_SSO_EMBED_URL,
        source: REAL_SSO_EMBED_URL,
        redirectAfterAccountLoginUrl: REAL_SSO_EMBED_URL,
        redirectAfterAccountCreationUrl: REAL_SSO_EMBED_URL,
      });
      signinParamsString = signinParams.toString();
    }

    // Step 1: First, we need to get the MFA page to extract the CSRF token
    // garth does this by using the CSRF from the last response
    // But we should refetch if needed to get fresh CSRF
    let mfaCsrf = this.mfaState.clientState;

    // Get fresh CSRF from MFA page if possible
    try {
      await logAuth('Fetching MFA page for fresh CSRF...');
      const mfaPageUrl = `${SSO_URL}/verifyMFA/loginEnterMfaCode?${signinParamsString}`;
      const mfaPageResponse = await httpRequest<string>(mfaPageUrl, 'GET', undefined, {
        'Origin': 'https://sso.garmin.com',
        'Referer': `${SSO_SIGNIN_URL}`,
      });

      if (mfaPageResponse.status === 200 && mfaPageResponse.data) {
        const freshCsrf = extractCSRFToken(mfaPageResponse.data);
        if (freshCsrf) {
          await logAuth(`Got fresh CSRF from MFA page: ${freshCsrf.substring(0, 10)}...`);
          mfaCsrf = freshCsrf;
        }
      }
    } catch (e) {
      await logAuth(`Could not fetch MFA page for fresh CSRF: ${e}`, 'warn');
    }

    // MFA body - IMPORTANT: use "mfa-code" with HYPHEN, not underscore
    // Also include "embed" parameter as garth does
    const mfaBody = new URLSearchParams({
      'mfa-code': mfaCode,  // Hyphen, not underscore!
      'embed': 'true',
      '_csrf': mfaCsrf,
      'fromPage': 'setupEnterMfaCode',
    });

    const mfaUrl = `${SSO_MFA_URL}?${signinParamsString}`;
    await logAuth(`MFA URL: ${mfaUrl.substring(0, 100)}...`);
    await logAuth(`MFA body: mfa-code=${mfaCode}, embed=true, _csrf=${mfaCsrf?.substring(0, 10)}..., fromPage=setupEnterMfaCode`);

    const response = await httpRequest<string>(
      mfaUrl,
      'POST',
      mfaBody.toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://sso.garmin.com',
        'Referer': `${SSO_URL}/verifyMFA/loginEnterMfaCode?${signinParamsString}`,
      }
    );

    await logAuth(`MFA response status: ${response.status}`);
    await logAuth(`MFA response length: ${response.data?.length || 0}`);

    if (response.data && typeof response.data === 'string') {
      // Log more response data for debugging
      const responsePreview = response.data.substring(0, 500).replace(/[\n\r\t]+/g, ' ');
      await logAuth(`MFA response preview: ${responsePreview}`);

      // Check page title first (garth checks for "Success")
      const titleMatch = response.data.match(/<title>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : 'unknown';
      await logAuth(`MFA page title: "${pageTitle}"`);

      // Check response headers for redirect with ticket
      if (response.headers) {
        const location = response.headers['location'] || response.headers['Location'];
        if (location) {
          await logAuth(`MFA Redirect location: ${location}`);
          const ticketInRedirect = location.match(/ticket=([A-Za-z0-9\-_]+)/);
          if (ticketInRedirect) {
            await logAuth(`Found ticket in MFA redirect: ${ticketInRedirect[1].substring(0, 10)}...`);
            // Continue with token exchange using this ticket
            this.tokens = await this.exchangeTicket(ticketInRedirect[1]);
            this.profile = await this.fetchProfile();
            if (this.mfaState.email) {
              this.profile.email = this.mfaState.email;
            }
            await this.saveSession();
            this.mfaState = null;
            await logAuth('MFA login successful (via redirect)');
            return { tokens: this.tokens, profile: this.profile };
          }
        }
      }

      // Check for embed?ticket= pattern (EXACT garth pattern with quote at end)
      // garth uses: r'embed\?ticket=([^"]+)"'
      const embedTicketMatch = response.data.match(/embed\?ticket=([^"]+)"/);
      if (embedTicketMatch) {
        await logAuth(`Found embed ticket (garth pattern): ${embedTicketMatch[1].substring(0, 10)}...`);
        this.tokens = await this.exchangeTicket(embedTicketMatch[1]);
        this.profile = await this.fetchProfile();
        if (this.mfaState.email) {
          this.profile.email = this.mfaState.email;
        }
        await this.saveSession();
        this.mfaState = null;
        await logAuth('MFA login successful (via embed ticket)');
        return { tokens: this.tokens, profile: this.profile };
      }

      // Try alternative ticket patterns
      const ticketPatterns = [
        /ticket=([A-Za-z0-9\-_]+)/,  // Generic ticket parameter
        /"serviceTicket"\s*:\s*"([^"]+)"/,  // JSON response
        /service_ticket['"]\s*:\s*['"]([^'"]+)['"]/i,  // Alternative JSON
      ];

      for (const pattern of ticketPatterns) {
        const match = response.data.match(pattern);
        if (match) {
          await logAuth(`Found ticket with pattern ${pattern.source}: ${match[1].substring(0, 10)}...`);
          this.tokens = await this.exchangeTicket(match[1]);
          this.profile = await this.fetchProfile();
          if (this.mfaState.email) {
            this.profile.email = this.mfaState.email;
          }
          await this.saveSession();
          this.mfaState = null;
          await logAuth('MFA login successful (via alternative pattern)');
          return { tokens: this.tokens, profile: this.profile };
        }
      }

      // If title is "Success" but no ticket found, log more details
      if (pageTitle.toLowerCase() === 'success') {
        await logAuth('SUCCESS page received but no ticket found! Full response follows...', 'error');
        // Log full response in chunks for debugging
        for (let i = 0; i < Math.min(response.data.length, 3000); i += 500) {
          await logAuth(`Response chunk [${i}-${i + 500}]: ${response.data.substring(i, i + 500).replace(/[\n\r\t]+/g, ' ')}`);
        }
      }
    }

    // Fallback: Try parsing via parseSSORespsonse
    const parsed = parseSSORespsonse(response.data);
    await logAuth(`MFA parsed fallback: ticket=${!!parsed.ticket}, error=${parsed.error || 'none'}`);

    if (parsed.ticket) {
      await logAuth(`Found ticket via fallback parser: ${parsed.ticket.substring(0, 10)}...`);
      this.tokens = await this.exchangeTicket(parsed.ticket);
      this.profile = await this.fetchProfile();
      if (this.mfaState?.email) {
        this.profile.email = this.mfaState.email;
      }
      await this.saveSession();
      this.mfaState = null;
      await logAuth('MFA login successful (via fallback parser)');
      return { tokens: this.tokens, profile: this.profile };
    }

    // No ticket found - throw appropriate error
    if (parsed.error) {
      throw new Error(`MFA fehlgeschlagen: ${parsed.error}`);
    }
    throw new Error('MFA-Verifizierung fehlgeschlagen. Bitte prüfe den Code und versuche es erneut.');
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    // Need both OAuth1 and OAuth2 tokens for API requests
    if (!this.tokens?.oauth1Token || !this.tokens?.oauth2Token) {
      await logAuth('Session invalid: Missing tokens', 'warn');
      return false;
    }

    // Check token expiry
    if (this.tokenExpiry && new Date() >= this.tokenExpiry) {
      await logAuth('Token expired', 'warn');
      return false;
    }

    return true;
  }

  /**
   * Refresh expired tokens
   * Based on garth's refresh_oauth2 implementation
   */
  async refreshSession(): Promise<boolean> {
    if (!this.tokens?.oauth1Token) {
      return false;
    }

    try {
      await logAuth('Refreshing session using OAuth1 token');

      // Parse stored OAuth1 token
      let oauth1: OAuth1TokenResponse;
      try {
        oauth1 = JSON.parse(this.tokens.oauth1Token);
      } catch {
        await logAuth('Failed to parse stored OAuth1 token', 'error');
        return false;
      }

      // Use OAuth1 token to get new OAuth2 token (same as garth's refresh_oauth2)
      const oauth2 = await this.exchangeOAuth1ForOAuth2(oauth1);

      // Update tokens
      this.tokens.oauth2Token = oauth2.access_token;

      const expiresIn = oauth2.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      await this.saveSession();
      await logAuth('Session refreshed successfully');
      return true;
    } catch (error) {
      await logAuth(`Session refresh failed: ${error}`, 'error');
    }

    return false;
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    await this.clearSession();
  }

  /**
   * Get current tokens
   */
  getTokens(): GarminAuthTokens | null {
    return this.tokens;
  }

  /**
   * Get current profile
   */
  getProfile(): GarminProfile | null {
    return this.profile;
  }

  /**
   * Check if MFA is required
   */
  isMFARequired(): boolean {
    return this.mfaState?.requiresMFA || false;
  }

  /**
   * Get display name for API calls that require it in the URL
   * Returns empty string if not available (caller should handle this)
   */
  getDisplayName(): string {
    const displayName = this.profile?.displayName;
    if (!displayName || displayName === 'user' || displayName === 'User') {
      return '';
    }
    return displayName;
  }

  /**
   * Get display name async - loads from preferences if not in memory
   * Returns empty string if not available - callers should check and use alternative endpoints
   */
  async getDisplayNameAsync(): Promise<string> {
    // First try in-memory profile
    if (this.profile?.displayName && this.profile.displayName !== 'user' && this.profile.displayName !== 'User') {
      return this.profile.displayName;
    }

    // Try to load from preferences
    try {
      const result = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE });
      if (result.value) {
        const profile = JSON.parse(result.value) as GarminProfile;
        if (profile.displayName && profile.displayName !== 'user' && profile.displayName !== 'User') {
          // Also update in-memory cache
          this.profile = profile;
          return profile.displayName;
        }
      }
    } catch (error) {
      console.error('Failed to get displayName from preferences:', error);
    }

    // If still no displayName, try to refresh profile
    if (this.tokens?.oauth2Token) {
      try {
        await logAuth('displayName not found, attempting to refresh profile...');
        const freshProfile = await this.fetchProfile();
        if (freshProfile.displayName && freshProfile.displayName !== 'user' && freshProfile.displayName !== 'User') {
          this.profile = { ...this.profile, ...freshProfile };
          await this.saveSession();
          return freshProfile.displayName;
        }
      } catch (error) {
        await logAuth(`Failed to refresh profile for displayName: ${error}`, 'error');
      }
    }

    await logAuth('WARNING: Could not obtain valid displayName - some endpoints will fail', 'warn');
    return '';  // Empty string signals that displayName is not available
  }
}

// Singleton instance
export const garminAuth = new GarminAuthService();
