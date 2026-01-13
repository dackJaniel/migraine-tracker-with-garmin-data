/**
 * Dropbox integration constants
 *
 * NOTE: You must create your own Dropbox app at https://www.dropbox.com/developers
 * and replace DROPBOX_APP_KEY with your app key.
 *
 * Steps to create a Dropbox app:
 * 1. Go to https://www.dropbox.com/developers/apps
 * 2. Click "Create app"
 * 3. Choose "Scoped access"
 * 4. Choose "Full Dropbox" or "App folder"
 * 5. Name your app
 * 6. Under "Permissions", enable files.content.write and files.content.read
 * 7. Under "Settings", add the redirect URI: com.example.migrainetracker://oauth/callback
 * 8. Copy the App key and paste it below
 */

// TODO: Replace with your own Dropbox app key
export const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY';

// Dropbox OAuth URLs
export const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
export const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';

// Dropbox backup path
export const DROPBOX_BACKUP_PATH = '/MigraineTracker/backup.enc';

// OAuth scopes required for backup functionality
export const DROPBOX_SCOPES = 'files.content.write files.content.read';
