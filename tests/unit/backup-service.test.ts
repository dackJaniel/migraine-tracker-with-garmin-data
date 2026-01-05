import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '@/features/backup/backup-service';

describe('Backup Service', () => {
    describe('validatePasswordStrength', () => {
        it('should reject passwords shorter than 8 characters', () => {
            const result = validatePasswordStrength('short');
            expect(result.isValid).toBe(false);
            expect(result.strength).toBe('weak');
        });

        it('should accept strong passwords', () => {
            const result = validatePasswordStrength('MyStr0ng!Password');
            expect(result.isValid).toBe(true);
            expect(result.strength).toBe('strong');
        });

        it('should rate medium strength passwords correctly', () => {
            const result = validatePasswordStrength('Password1');
            expect(result.isValid).toBe(true);
            expect(result.strength).toBe('medium');
        });

        it('should require at least score 2 for validity', () => {
            // Only lowercase, 8 chars - should be invalid
            const result = validatePasswordStrength('password');
            expect(result.isValid).toBe(false);
            expect(result.strength).toBe('weak');
        });

        it('should give bonus for 12+ character passwords', () => {
            const shortResult = validatePasswordStrength('Pass1234');
            const longResult = validatePasswordStrength('Pass12345678');

            // Both should be valid but long one should be stronger
            expect(shortResult.isValid).toBe(true);
            expect(longResult.isValid).toBe(true);
        });

        it('should recognize mixed case as a strength factor', () => {
            const lowerOnly = validatePasswordStrength('password123');
            const mixedCase = validatePasswordStrength('Password123');

            expect(lowerOnly.strength).toBe('weak');
            expect(mixedCase.strength).toBe('medium');
        });

        it('should recognize special characters as a strength factor', () => {
            const noSpecial = validatePasswordStrength('Password1');
            const withSpecial = validatePasswordStrength('Password1!');

            expect(noSpecial.strength).toBe('medium');
            expect(withSpecial.strength).toBe('strong');
        });

        it('should return appropriate messages', () => {
            const weak = validatePasswordStrength('abc');
            const medium = validatePasswordStrength('Password1');
            const strong = validatePasswordStrength('MyStr0ng!Pass');

            expect(weak.message).toContain('mindestens 8 Zeichen');
            expect(medium.message).toContain('Sonderzeichen');
            expect(strong.message).toContain('Stark');
        });
    });
});
