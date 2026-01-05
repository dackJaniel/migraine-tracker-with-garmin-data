// Garmin Authentication Service
// Implementiert OAuth1/OAuth2 Flow basierend auf python-garminconnect (garth)

import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import type { HttpOptions } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { SESSION_CONFIG, DEFAULT_HEADERS, ERROR_MESSAGES, GARMIN_BASE_URL, GARMIN_SSO_URL } from './constants';
import type { GarminAuthTokens, GarminProfile, GarminLoginResponse, GarminMFAState } from './types';
import { db } from '../db';

// Garmin SSO URLs - use proxy in dev mode
const SSO_URL = `${GARMIN_SSO_URL}/sso`;
const SSO_SIGNIN_URL = `${SSO_URL}/signin`;
const SSO_MFA_URL = `${SSO_URL}/verifyMFA/loginEnterMfaCode`;
const OAUTH_URL = `${GARMIN_BASE_URL}/modern/di-oauth/exchange`;

// OAuth Consumer Credentials (from garth/python-garminconnect)
const CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
// CONSUMER_SECRET is empty for Garmin (not needed for this OAuth flow)

interface TokenExchangeResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

/**
 * Log authentication events
 */
async function logAuth(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    try {
        await db.logs.add({
            timestamp: new Date().toISOString(),
            level,
            message: `[Garmin Auth] ${message}`,
        });
    } catch (e) {
        console.error('Failed to log:', e);
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
        /"errorMessage"\s*:\s*"([^"]+)"/,
        /"error"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of errorPatterns) {
        const errorMatch = html.match(pattern);
        if (errorMatch) {
            const errorText = errorMatch[1].trim();
            // Skip empty, generic messages, or messages that are just technical codes
            if (errorText && errorText.length > 5 && !errorText.startsWith('error') && !errorText.match(/^[A-Z_]+$/)) {
                return { error: errorText, csrf };
            }
        }
    }

    // Check for invalid credentials message in page content
    const lowerHtml = html.toLowerCase();
    if ((lowerHtml.includes('credentials') || lowerHtml.includes('kennwort') || lowerHtml.includes('passwort')) &&
        (lowerHtml.includes('invalid') || lowerHtml.includes('incorrect') || lowerHtml.includes('falsch') || lowerHtml.includes('ungültig'))) {
        return { error: 'INVALID_CREDENTIALS', csrf };
    }

    // Check for locked account
    if (lowerHtml.includes('locked') || lowerHtml.includes('gesperrt')) {
        return { error: 'ACCOUNT_LOCKED', csrf };
    }

    // Check for ACTUAL MFA page - the page title is "MFA required"
    // This is the most reliable indicator
    if (html.includes('<title>MFA required</title>') ||
        html.includes('<title>MFA Required</title>') ||
        lowerHtml.includes('<title>mfa required</title>')) {
        return { error: 'MFA_REQUIRED', csrf };
    }

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
     */
    private async initiateSSO(email: string, password: string): Promise<{ ticket: string } | { mfaRequired: true; clientState: string }> {
        await logAuth(`Initiating SSO login for ${email.split('@')[0]}@...`);

        const params = new URLSearchParams({
            service: OAUTH_URL,
            webhost: GARMIN_BASE_URL,
            source: SSO_SIGNIN_URL,
            redirectAfterAccountLoginUrl: OAUTH_URL,
            redirectAfterAccountCreationUrl: OAUTH_URL,
            gauthHost: SSO_URL,
            locale: 'de_DE',
            id: 'gauth-widget',
            cssUrl: 'https://static.garmincdn.com/com.garmin.connect/ui/css/gauth-custom-v1.2-min.css',
            privacyStatementUrl: 'https://www.garmin.com/privacy-policy/',
            clientId: CONSUMER_KEY,
            rememberMeShown: 'true',
            rememberMeChecked: 'false',
            createAccountShown: 'true',
            openCreateAccount: 'false',
            displayNameShown: 'false',
            consumeServiceTicket: 'false',
            initialFocus: 'true',
            embedWidget: 'false',
            generateExtraServiceTicket: 'true',
            generateTwoExtraServiceTickets: 'true',
            generateNoServiceTicket: 'false',
            globalOptInShown: 'true',
            globalOptInChecked: 'false',
            mobile: 'false',
            connectLegalTerms: 'true',
            showTermsOfUse: 'false',
            showPrivacyPolicy: 'false',
            showConnectLegalAge: 'false',
            locationPromptShown: 'true',
            showPassword: 'true',
            useCustomHeader: 'false',
            mfaRequired: 'false',
            performMFACheck: 'true',
            rememberMyBrowserShown: 'true',
            rememberMyBrowserChecked: 'false',
        });

        // Step 1: Get initial SSO page to extract CSRF token
        const initUrl = `${SSO_SIGNIN_URL}?${params.toString()}`;
        await logAuth(`Fetching SSO page: ${initUrl.substring(0, 100)}...`);

        const initResponse = await httpRequest<string>(initUrl, 'GET');
        await logAuth(`SSO page response status: ${initResponse.status}`);

        // Extract CSRF token from the page
        const initParsed = parseSSORespsonse(initResponse.data);
        const csrf = initParsed.csrf;

        if (!csrf) {
            await logAuth('Could not extract CSRF token from SSO page', 'error');
            await logAuth(`Response snippet: ${initResponse.data.substring(0, 500)}`, 'error');
            throw new Error('Login fehlgeschlagen: CSRF Token nicht gefunden');
        }

        await logAuth(`CSRF token extracted: ${csrf.substring(0, 10)}...`);

        // Step 2: Submit login credentials with real CSRF token
        const loginBody = new URLSearchParams({
            username: email,
            password: password,
            embed: 'false',
            _csrf: csrf,
        });

        await logAuth('Submitting login credentials...');

        const loginResponse = await httpRequest<string>(
            `${SSO_SIGNIN_URL}?${params.toString()}`,
            'POST',
            loginBody.toString(),
            {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://sso.garmin.com',
                'Referer': initUrl,
            }
        );

        await logAuth(`Login response status: ${loginResponse.status}`);

        // Log more details for debugging
        const responseLength = loginResponse.data?.length || 0;
        await logAuth(`Response length: ${responseLength} chars`);

        // Check if response is a redirect (contains ticket in URL or response)
        if (loginResponse.data && typeof loginResponse.data === 'string') {
            // Log first part of response for debugging - more context
            const snippet = loginResponse.data.substring(0, 1500);
            await logAuth(`Response preview (first 300 chars): ${snippet.replace(/[\n\r\t]+/g, ' ').substring(0, 300)}`);

            // Check if ticket is in headers (redirect)
            if (loginResponse.headers) {
                const location = loginResponse.headers['location'] || loginResponse.headers['Location'];
                if (location) {
                    await logAuth(`Redirect location: ${location}`);
                    // If there's a redirect with ticket, extract it
                    const ticketInRedirect = location.match(/ticket=([A-Za-z0-9\-_]+)/);
                    if (ticketInRedirect) {
                        await logAuth(`Found ticket in redirect: ${ticketInRedirect[1].substring(0, 10)}...`);
                        return { ticket: ticketInRedirect[1] };
                    }
                }
            }
        }

        const parsed = parseSSORespsonse(loginResponse.data);
        await logAuth(`Parsed result: ticket=${!!parsed.ticket}, error=${parsed.error || 'none'}, csrf=${!!parsed.csrf}`);

        if (parsed.error === 'MFA_REQUIRED') {
            // Extract CSRF token from MFA page (might be different from login page)
            const mfaCsrf = parsed.csrf || extractCSRFToken(loginResponse.data) || csrf;
            await logAuth(`MFA page CSRF: ${mfaCsrf ? mfaCsrf.substring(0, 10) + '...' : 'not found'}`);

            this.mfaState = {
                clientState: mfaCsrf,
                requiresMFA: true,
                email: email,  // Store email for later profile fetch
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

        if (!parsed.ticket) {
            // Log response for debugging
            await logAuth(`No ticket found. Response length: ${loginResponse.data.length}`, 'warn');
            await logAuth(`Response snippet: ${loginResponse.data.substring(0, 1000)}`, 'warn');
            throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
        }

        await logAuth(`Service ticket received: ${parsed.ticket.substring(0, 10)}...`);
        return { ticket: parsed.ticket };
    }

    /**
     * Step 2: Exchange service ticket for OAuth tokens
     */
    private async exchangeTicket(ticket: string): Promise<GarminAuthTokens> {
        await logAuth('Exchanging service ticket for OAuth tokens');

        const exchangeUrl = `${OAUTH_URL}?ticket=${ticket}`;

        const response = await httpRequest<TokenExchangeResponse>(
            exchangeUrl,
            'POST',
            undefined,
            {
                'Accept': 'application/json',
            }
        );

        if (!response.data.access_token) {
            throw new Error('Token exchange failed: No access token received');
        }

        // Calculate token expiry
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

        return {
            oauth1Token: response.data.refresh_token || 'oauth1_placeholder',
            oauth2Token: response.data.access_token,
        };
    }

    /**
     * Step 3: Get user profile
     */
    private async fetchProfile(): Promise<GarminProfile> {
        await logAuth('Fetching user profile');

        const profileUrl = `${GARMIN_BASE_URL}/modern/proxy/userprofile-service/socialProfile`;

        const response = await httpRequest<{
            displayName?: string;
            fullName?: string;
            userName?: string;
        }>(
            profileUrl,
            'GET',
            undefined,
            {
                'Authorization': `Bearer ${this.tokens?.oauth2Token}`,
            }
        );

        return {
            displayName: response.data.displayName || response.data.userName || 'User',
            fullName: response.data.fullName || '',
            email: '', // Email not returned by this endpoint
        };
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
     */
    async completeMFA(mfaCode: string): Promise<GarminLoginResponse> {
        if (!this.mfaState) {
            throw new Error('No MFA session active');
        }

        await logAuth(`Completing MFA verification with code length: ${mfaCode.length}`);
        await logAuth(`Using CSRF: ${this.mfaState.clientState?.substring(0, 10)}...`);

        const mfaBody = new URLSearchParams({
            mfa_code: mfaCode,
            _csrf: this.mfaState.clientState,
            fromPage: 'setupEnterMfaCode',
        });

        await logAuth(`MFA URL: ${SSO_MFA_URL}`);
        
        const response = await httpRequest<string>(
            SSO_MFA_URL,
            'POST',
            mfaBody.toString(),
            {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://sso.garmin.com',
                'Referer': `${SSO_URL}/verifyMFA/loginEnterMfaCode`,
            }
        );

        await logAuth(`MFA response status: ${response.status}`);
        await logAuth(`MFA response length: ${response.data?.length || 0}`);
        
        if (response.data && typeof response.data === 'string') {
            await logAuth(`MFA response preview: ${response.data.substring(0, 200).replace(/[\n\r\t]+/g, ' ')}`);
        }

        const parsed = parseSSORespsonse(response.data);
        await logAuth(`MFA parsed: ticket=${!!parsed.ticket}, error=${parsed.error || 'none'}`);

        if (!parsed.ticket) {
            // Check if there's a specific error
            if (parsed.error) {
                throw new Error(`MFA fehlgeschlagen: ${parsed.error}`);
            }
            throw new Error('MFA-Verifizierung fehlgeschlagen. Bitte Code überprüfen.');
        }

        // Continue with token exchange
        this.tokens = await this.exchangeTicket(parsed.ticket);
        this.profile = await this.fetchProfile();
        
        // Set email from saved MFA state
        if (this.mfaState.email) {
            this.profile.email = this.mfaState.email;
        }

        await this.saveSession();
        this.mfaState = null;

        await logAuth('MFA login successful');

        return {
            tokens: this.tokens,
            profile: this.profile,
        };
    }

    /**
     * Check if session is valid
     */
    async isSessionValid(): Promise<boolean> {
        if (!this.tokens?.oauth2Token) {
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
     */
    async refreshSession(): Promise<boolean> {
        if (!this.tokens?.oauth1Token) {
            return false;
        }

        try {
            await logAuth('Refreshing session');

            // Use refresh token to get new access token
            const response = await httpRequest<TokenExchangeResponse>(
                `${OAUTH_URL}/refresh`,
                'POST',
                JSON.stringify({
                    refresh_token: this.tokens.oauth1Token,
                    grant_type: 'refresh_token',
                }),
                {
                    'Content-Type': 'application/json',
                }
            );

            if (response.data.access_token) {
                this.tokens.oauth2Token = response.data.access_token;
                if (response.data.refresh_token) {
                    this.tokens.oauth1Token = response.data.refresh_token;
                }

                const expiresIn = response.data.expires_in || 3600;
                this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

                await this.saveSession();
                await logAuth('Session refreshed successfully');
                return true;
            }
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
}

// Singleton instance
export const garminAuth = new GarminAuthService();
