import { createHash, randomInt } from 'crypto';

export function generateNumericOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(randomInt(min, max));
}

/**
 * OTP codes and refresh tokens are hashed with SHA-256 before storage so a
 * leaked database dump can't be replayed. This is deliberately fast (unlike
 * argon2) because OTPs are short-lived, high-entropy-per-guess-limited values.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
