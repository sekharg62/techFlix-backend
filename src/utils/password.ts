import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const PREFIX = 'scrypt';
const KEY_LENGTH = 64;

/** Hash a password as `scrypt$<salt-hex>$<hash-hex>` (Node's built-in scrypt, random 16-byte salt). */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString('hex')}$${hash.toString('hex')}`;
};

export const isHashed = (stored: string) => stored.startsWith(`${PREFIX}$`);

/**
 * Check a password against what is stored. Accepts legacy plain-text values so old
 * accounts can still log in (they are re-hashed on successful login).
 */
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (!isHashed(stored)) {
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, saltHex, hashHex] = stored.split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
