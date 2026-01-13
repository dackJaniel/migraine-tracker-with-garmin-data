/**
 * Dropbox OAuth2 Authentication Service
 * Implements PKCE flow for mobile apps following the Garmin auth pattern
 */

import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  DROPBOX_APP_KEY,
  DROPBOX_AUTH_URL,
  DROPBOX_TOKEN_URL,
  DROPBOX_SCOPES,
} from './constants';
import type { DropboxTokens } from './types';

const TOKENS_KEY = 'dropbox_tokens';

/**
 * Authenticate with Dropbox using OAuth2 PKCE flow
 */
export async function authenticateDropbox(): Promise<DropboxTokens> {
  const options = {
    appId: DROPBOX_APP_KEY,
    authorizationBaseUrl: DROPBOX_AUTH_URL,
    accessTokenEndpoint: DROPBOX_TOKEN_URL,
    responseType: 'code',
    pkceEnabled: true,
    scope: DROPBOX_SCOPES,
    additionalParameters: {
      token_access_type: 'offline', // Request refresh token
    },
    web: {
      redirectUrl: window.location.origin + '/callback',
    },
    android: {
      redirectUrl: 'com.example.migrainetracker://oauth/callback',
    },
  };

  const result = await GenericOAuth2.authenticate(options);

  const tokens: DropboxTokens = {
    accessToken: result['access_token'] as string,
    refreshToken: (result['refresh_token'] as string) || null,
    expiresAt: result['expires_in']
      ? Date.now() + (result['expires_in'] as number) * 1000
      : null,
  };

  await saveTokens(tokens);
  return tokens;
}

/**
 * Refresh the Dropbox access token using the refresh token
 */
export async function refreshDropboxToken(): Promise<DropboxTokens | null> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const result = await GenericOAuth2.refreshToken({
      appId: DROPBOX_APP_KEY,
      accessTokenEndpoint: DROPBOX_TOKEN_URL,
      refreshToken: tokens.refreshToken,
    });

    const newTokens: DropboxTokens = {
      accessToken: result['access_token'] as string,
      refreshToken: (result['refresh_token'] as string) || tokens.refreshToken,
      expiresAt: result['expires_in']
        ? Date.now() + (result['expires_in'] as number) * 1000
        : null,
    };

    await saveTokens(newTokens);
    return newTokens;
  } catch {
    return null;
  }
}

/**
 * Get stored tokens from Preferences
 */
export async function getTokens(): Promise<DropboxTokens | null> {
  const { value } = await Preferences.get({ key: TOKENS_KEY });
  return value ? JSON.parse(value) : null;
}

/**
 * Save tokens to Preferences
 */
export async function saveTokens(tokens: DropboxTokens): Promise<void> {
  await Preferences.set({ key: TOKENS_KEY, value: JSON.stringify(tokens) });
}

/**
 * Clear stored tokens
 */
export async function clearTokens(): Promise<void> {
  await Preferences.remove({ key: TOKENS_KEY });
}

/**
 * Get a valid access token, refreshing if necessary
 * Returns null if not authenticated or refresh fails
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  // Check if token is expired (with 5 min buffer)
  if (tokens.expiresAt && tokens.expiresAt < Date.now() + 300000) {
    const refreshed = await refreshDropboxToken();
    return refreshed?.accessToken || null;
  }

  return tokens.accessToken;
}

/**
 * Check if running in web development mode
 */
export function isWebDev(): boolean {
  return !Capacitor.isNativePlatform();
}
