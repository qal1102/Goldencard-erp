import 'server-only';

import { randomBytes } from 'crypto';

/** Cryptographically random token for public QR lookup (not derived from certificate code). */
export function generateWarrantyPublicToken(): string {
  return randomBytes(32).toString('base64url');
}
