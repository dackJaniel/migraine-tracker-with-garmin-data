/**
 * Encryption Utilities für Migräne Tracker PWA
 * Verwendet Web Crypto API für sichere Verschlüsselung
 */

// PBKDF2 Parameter
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;

/**
 * Generiert einen Encryption Key aus einem PIN
 * Nutzt PBKDF2 mit 100.000 Iterationen
 */
export async function generateEncryptionKey(
    pin: string,
    salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const pinBuffer = new TextEncoder().encode(pin);
    const usedSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    // Import PIN als Key Material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-GCM Key
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: usedSalt as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );

    return { key, salt: usedSalt };
}

/**
 * Hash einen PIN für Verifikation mit SHA-256
 */
export async function hashPin(pin: string, salt?: Uint8Array): Promise<{
    hash: string;
    salt: string;
}> {
    const usedSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const pinBuffer = new TextEncoder().encode(pin + arrayToBase64(usedSalt));

    const hashBuffer = await crypto.subtle.digest('SHA-256', pinBuffer);
    const hash = arrayToBase64(new Uint8Array(hashBuffer));

    return {
        hash,
        salt: arrayToBase64(usedSalt),
    };
}

/**
 * Verifiziert einen PIN gegen einen gespeicherten Hash
 */
export async function verifyPin(
    pin: string,
    storedHash: string,
    storedSalt: string
): Promise<boolean> {
    const salt = base64ToArray(storedSalt);
    const { hash } = await hashPin(pin, salt);
    return hash === storedHash;
}

/**
 * Verschlüsselt Daten mit AES-GCM
 * Für Backup Export
 */
export async function encryptBackup(
    data: unknown,
    password: string
): Promise<{
    encrypted: string;
    iv: string;
    salt: string;
    algorithm: string;
    version: string;
}> {
    const jsonData = JSON.stringify(data);
    const dataBuffer = new TextEncoder().encode(jsonData);

    // Generate Key from Password
    const { key, salt } = await generateEncryptionKey(password);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
        },
        key,
        dataBuffer
    );

    return {
        encrypted: arrayToBase64(new Uint8Array(encryptedBuffer)),
        iv: arrayToBase64(iv),
        salt: arrayToBase64(salt),
        algorithm: 'AES-GCM',
        version: '1.0.0',
    };
}

/**
 * Entschlüsselt Backup Daten
 */
export async function decryptBackup<T>(
    encryptedData: string,
    iv: string,
    salt: string,
    password: string
): Promise<T> {
    const encryptedBuffer = base64ToArray(encryptedData);
    const ivBuffer = base64ToArray(iv);
    const saltBuffer = base64ToArray(salt);

    // Generate Key from Password
    const { key } = await generateEncryptionKey(password, saltBuffer);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBuffer as BufferSource,
        },
        key,
        encryptedBuffer as BufferSource
    );

    const jsonData = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonData) as T;
}

/**
 * Helper: Uint8Array zu Base64
 */
function arrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array));
}

/**
 * Helper: Base64 zu Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return array;
}

/**
 * Validiert PIN Format (6 Ziffern)
 */
export function validatePinFormat(pin: string): {
    valid: boolean;
    error?: string;
} {
    if (pin.length !== 6) {
        return { valid: false, error: 'PIN muss genau 6 Ziffern lang sein' };
    }

    if (!/^\d{6}$/.test(pin)) {
        return { valid: false, error: 'PIN darf nur Ziffern enthalten' };
    }

    // Schwache PINs verhindern
    const weakPins = [
        '000000',
        '111111',
        '222222',
        '333333',
        '444444',
        '555555',
        '666666',
        '777777',
        '888888',
        '999999',
        '123456',
        '654321',
    ];

    if (weakPins.includes(pin)) {
        return { valid: false, error: 'Dieser PIN ist zu einfach' };
    }

    return { valid: true };
}
