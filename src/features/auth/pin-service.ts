import { Preferences } from '@capacitor/preferences';
import { hashPin, verifyPin, validatePinFormat } from '@/lib/encryption';

const PIN_HASH_KEY = 'pin_hash';
const PIN_SALT_KEY = 'pin_salt';
const PIN_ATTEMPTS_KEY = 'pin_attempts';
const MAX_ATTEMPTS = 3;

/**
 * PIN Service für Authentication
 * Verwaltet PIN Setup, Verifikation und Änderungen
 */

/**
 * Prüft ob ein PIN bereits gesetzt wurde
 */
export async function isPinSetup(): Promise<boolean> {
  const { value } = await Preferences.get({ key: PIN_HASH_KEY });
  return value !== null;
}

/**
 * Erstmalig PIN setzen
 */
export async function setupPin(pin: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Validierung
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Prüfen ob bereits ein PIN existiert
  const alreadySetup = await isPinSetup();
  if (alreadySetup) {
    return { success: false, error: 'PIN wurde bereits gesetzt' };
  }

  try {
    // Hash PIN
    const { hash, salt } = await hashPin(pin);

    // Speichern in Preferences
    await Preferences.set({ key: PIN_HASH_KEY, value: hash });
    await Preferences.set({ key: PIN_SALT_KEY, value: salt });

    // Reset Attempts
    await Preferences.remove({ key: PIN_ATTEMPTS_KEY });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * PIN Verifizierung
 */
export async function verifyPinInput(pin: string): Promise<{
  success: boolean;
  error?: string;
  attemptsLeft?: number;
}> {
  // Attempts prüfen
  const attempts = await getFailedAttempts();
  if (attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: 'Maximale Anzahl an Versuchen erreicht. Bitte setze den PIN zurück.',
      attemptsLeft: 0,
    };
  }

  try {
    // Hash und Salt laden
    const { value: hash } = await Preferences.get({ key: PIN_HASH_KEY });
    const { value: salt } = await Preferences.get({ key: PIN_SALT_KEY });

    if (!hash || !salt) {
      return { success: false, error: 'Kein PIN gesetzt' };
    }

    // Verifizieren
    const isValid = await verifyPin(pin, hash, salt);

    if (isValid) {
      // Reset Attempts on success
      await Preferences.remove({ key: PIN_ATTEMPTS_KEY });
      return { success: true };
    } else {
      // Increment Attempts
      const newAttempts = attempts + 1;
      await Preferences.set({
        key: PIN_ATTEMPTS_KEY,
        value: String(newAttempts),
      });

      return {
        success: false,
        error: `Falscher PIN. ${MAX_ATTEMPTS - newAttempts} Versuche übrig.`,
        attemptsLeft: MAX_ATTEMPTS - newAttempts,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * PIN ändern
 */
export async function changePin(
  oldPin: string,
  newPin: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Alten PIN verifizieren
  const verification = await verifyPinInput(oldPin);
  if (!verification.success) {
    return { success: false, error: 'Alter PIN ist falsch' };
  }

  // Neuen PIN validieren
  const validation = validatePinFormat(newPin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Neuen PIN hashen
    const { hash, salt } = await hashPin(newPin);

    // Speichern
    await Preferences.set({ key: PIN_HASH_KEY, value: hash });
    await Preferences.set({ key: PIN_SALT_KEY, value: salt });

    // Reset Attempts
    await Preferences.remove({ key: PIN_ATTEMPTS_KEY });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * PIN zurücksetzen (nur für Testing oder wenn User ausgesperrt ist)
 */
export async function resetPin(): Promise<void> {
  await Preferences.remove({ key: PIN_HASH_KEY });
  await Preferences.remove({ key: PIN_SALT_KEY });
  await Preferences.remove({ key: PIN_ATTEMPTS_KEY });
}

/**
 * Failed Attempts auslesen
 */
async function getFailedAttempts(): Promise<number> {
  const { value } = await Preferences.get({ key: PIN_ATTEMPTS_KEY });
  return value ? parseInt(value, 10) : 0;
}

/**
 * Prüft ob User ausgesperrt ist
 */
export async function isLocked(): Promise<boolean> {
  const attempts = await getFailedAttempts();
  return attempts >= MAX_ATTEMPTS;
}

/**
 * Gibt Anzahl verbleibender Versuche zurück
 */
export async function getRemainingAttempts(): Promise<number> {
  const attempts = await getFailedAttempts();
  return Math.max(0, MAX_ATTEMPTS - attempts);
}
