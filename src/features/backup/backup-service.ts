import { db } from '@/lib/db';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';

export interface BackupData {
    version: string;
    createdAt: string;
    episodes: any[];
    garminData: any[];
    settings: any[];
}

export interface EncryptedBackup {
    version: string;
    encrypted: boolean;
    algorithm: string;
    iv: string;
    data: string;
}

/**
 * Exportiert alle Daten als verschlüsseltes Backup
 */
export async function exportData(password: string): Promise<void> {
    try {
        // 1. Alle Daten aus DB sammeln
        const episodes = await db.episodes.toArray();
        const garminData = await db.garminData.toArray();
        const settings = await db.settings.toArray();

        const backupData: BackupData = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            episodes,
            garminData,
            settings,
        };

        // 2. Daten verschlüsseln
        const encryptedData = await encryptBackup(JSON.stringify(backupData), password);

        // 3. Als Datei speichern
        const fileName = `migraine-backup-${format(new Date(), 'yyyy-MM-dd')}.enc`;
        const encryptedBackup: EncryptedBackup = {
            version: '1.0.0',
            encrypted: true,
            algorithm: 'AES-GCM',
            iv: encryptedData.iv,
            data: encryptedData.data,
        };

        const fileContent = JSON.stringify(encryptedBackup, null, 2);

        // 4. Datei speichern und teilen
        await Filesystem.writeFile({
            path: fileName,
            data: fileContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });

        // 5. Share API für Export
        await Share.share({
            title: 'Migräne Tracker Backup',
            text: 'Backup-Datei',
            url: fileName,
            dialogTitle: 'Backup exportieren',
        });
    } catch (error) {
        console.error('Fehler beim Exportieren:', error);
        throw new Error('Backup konnte nicht erstellt werden');
    }
}

/**
 * Importiert Daten aus einem verschlüsselten Backup
 */
export async function importData(
    fileContent: string,
    password: string,
    mode: 'merge' | 'replace' = 'merge'
): Promise<{ episodes: number; garminData: number; settings: number }> {
    try {
        // 1. JSON parsen
        const encryptedBackup: EncryptedBackup = JSON.parse(fileContent);

        if (!encryptedBackup.encrypted || encryptedBackup.algorithm !== 'AES-GCM') {
            throw new Error('Ungültiges Backup-Format');
        }

        // 2. Daten entschlüsseln
        const decryptedData = await decryptBackup(
            { iv: encryptedBackup.iv, data: encryptedBackup.data },
            password
        );

        const backupData: BackupData = JSON.parse(decryptedData);
        const episodes = backupData.episodes;

        // 3. Import-Modus
        if (mode === 'replace') {
            // Alles löschen und neu importieren
            await db.transaction('rw', [db.episodes, db.garminData, db.settings], async () => {
                await db.episodes.clear();
                await db.garminData.clear();
                await db.settings.clear();

                await db.episodes.bulkAdd(episodes);
                await db.garminData.bulkAdd(backupData.garminData);
                await db.settings.bulkAdd(backupData.settings);
            });
        } else {
            // Merge: Vorhandene Daten behalten, neue hinzufügen
            await db.transaction('rw', [db.episodes, db.garminData, db.settings], async () => {
                // Episodes: Nur neue hinzufügen (keine Duplikate)
                const existingEpisodeIds = new Set(
                    (await db.episodes.toArray())
                        .map((ep) => ep.id)
                        .filter((id): id is number => id !== undefined)
                );
                const newEpisodes = episodes.filter(
                    (ep: any) => !ep.id || !existingEpisodeIds.has(ep.id)
                );
                await db.episodes.bulkAdd(newEpisodes);

                // Garmin Data: Überschreiben bei gleichem Datum
                await db.garminData.bulkPut(backupData.garminData);

                // Settings: Merge
                await db.settings.bulkPut(backupData.settings);
            });
        }

        return {
            episodes: episodes.length,
            garminData: backupData.garminData.length,
            settings: backupData.settings.length,
        };
    } catch (error) {
        console.error('Fehler beim Importieren:', error);
        if (error instanceof Error && error.message.includes('decrypt')) {
            throw new Error('Falsches Passwort oder beschädigte Datei');
        }
        throw new Error('Backup konnte nicht importiert werden');
    }
}

/**
 * Validiert ein Backup ohne zu importieren
 */
export async function validateBackup(
    fileContent: string,
    password: string
): Promise<BackupData> {
    const encryptedBackup: EncryptedBackup = JSON.parse(fileContent);

    if (!encryptedBackup.encrypted || encryptedBackup.algorithm !== 'AES-GCM') {
        throw new Error('Ungültiges Backup-Format');
    }

    const decryptedData = await decryptBackup(
        { iv: encryptedBackup.iv, data: encryptedBackup.data },
        password
    );

    return JSON.parse(decryptedData);
}

/**
 * Verschlüsselt Daten mit AES-GCM
 */
async function encryptBackup(
    data: string,
    password: string
): Promise<{ iv: string; data: string }> {
    // Key Derivation aus Passwort
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const passwordHash = await crypto.subtle.digest('SHA-256', passwordBuffer);

    const key = await crypto.subtle.importKey(
        'raw',
        passwordHash,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    // Zufälliger IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Verschlüsselung
    const dataBuffer = encoder.encode(data);
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
    );

    // Base64 Encoding
    return {
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(encryptedBuffer),
    };
}

/**
 * Entschlüsselt Daten mit AES-GCM
 */
async function decryptBackup(
    encrypted: { iv: string; data: string },
    password: string
): Promise<string> {
    // Key Derivation aus Passwort
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const passwordHash = await crypto.subtle.digest('SHA-256', passwordBuffer);

    const key = await crypto.subtle.importKey(
        'raw',
        passwordHash,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    // Base64 Decoding
    const iv = base64ToArrayBuffer(encrypted.iv);
    const dataBuffer = base64ToArrayBuffer(encrypted.data);

    // Entschlüsselung
    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch {
        throw new Error('Decryption failed: Wrong password or corrupted data');
    }
}

/**
 * ArrayBuffer → Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Base64 → ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Validiert Passwort-Stärke
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    message: string;
} {
    if (password.length < 8) {
        return {
            isValid: false,
            strength: 'weak',
            message: 'Passwort muss mindestens 8 Zeichen lang sein',
        };
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    let score = 0;

    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score >= 3) strength = 'strong';
    else if (score >= 2) strength = 'medium';

    return {
        isValid: score >= 2,
        strength,
        message:
            strength === 'strong'
                ? 'Starkes Passwort'
                : strength === 'medium'
                    ? 'Mittleres Passwort - für besseren Schutz Sonderzeichen hinzufügen'
                    : 'Schwaches Passwort - verwende Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen',
    };
}
