import { describe, it, expect, beforeEach } from 'vitest';
import {
    validatePinFormat,
    hashPin,
    verifyPin,
    encryptBackup,
    decryptBackup,
} from '@/lib/encryption';

describe('Encryption Utils', () => {
    describe('validatePinFormat', () => {
        it('should accept valid 6-digit PIN', () => {
            const result = validatePinFormat('789456');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject PIN with wrong length', () => {
            const result = validatePinFormat('12345');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('6 Ziffern');
        });

        it('should reject PIN with non-digits', () => {
            const result = validatePinFormat('12345a');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('nur Ziffern');
        });

        it('should reject weak PINs', () => {
            const weakPins = ['000000', '111111', '123456'];
            weakPins.forEach(pin => {
                const result = validatePinFormat(pin);
                expect(result.valid).toBe(false);
                expect(result.error).toContain('zu einfach');
            });
        });
    });

    describe('hashPin', () => {
        it('should generate consistent hash for same PIN and salt', async () => {
            const pin = '789456';
            const { hash: hash1, salt } = await hashPin(pin);
            const { hash: hash2 } = await hashPin(pin, base64ToArray(salt));

            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different PINs', async () => {
            const { hash: hash1 } = await hashPin('111222');
            const { hash: hash2 } = await hashPin('333444');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('verifyPin', () => {
        it('should verify correct PIN', async () => {
            const pin = '987654';
            const { hash, salt } = await hashPin(pin);

            const isValid = await verifyPin(pin, hash, salt);
            expect(isValid).toBe(true);
        });

        it('should reject incorrect PIN', async () => {
            const pin = '987654';
            const { hash, salt } = await hashPin(pin);

            const isValid = await verifyPin('111111', hash, salt);
            expect(isValid).toBe(false);
        });
    });

    describe('encryptBackup and decryptBackup', () => {
        it('should encrypt and decrypt data correctly', async () => {
            const originalData = {
                episodes: [
                    { id: 1, startTime: '2024-01-01', intensity: 7 },
                ],
                settings: { theme: 'light' },
            };

            const password = 'Test123!';

            // Encrypt
            const encrypted = await encryptBackup(originalData, password);
            expect(encrypted.encrypted).toBeTruthy();
            expect(encrypted.iv).toBeTruthy();
            expect(encrypted.salt).toBeTruthy();
            expect(encrypted.version).toBe('1.0.0');

            // Decrypt
            const decrypted = await decryptBackup(
                encrypted.encrypted,
                encrypted.iv,
                encrypted.salt,
                password
            );

            expect(decrypted).toEqual(originalData);
        });

        it('should fail with wrong password', async () => {
            const data = { test: 'data' };
            const encrypted = await encryptBackup(data, 'correct');

            await expect(
                decryptBackup(
                    encrypted.encrypted,
                    encrypted.iv,
                    encrypted.salt,
                    'wrong'
                )
            ).rejects.toThrow();
        });
    });
});

// Helper for tests
function base64ToArray(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return array;
}
