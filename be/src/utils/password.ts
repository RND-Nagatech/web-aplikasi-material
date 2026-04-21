import crypto from 'crypto';

const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

const derive = (password: string, salt: string, iterations: number): Promise<string> =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, KEY_LENGTH, DIGEST, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await derive(password, salt, ITERATIONS);
  return `${ITERATIONS}:${salt}:${hash}`;
};

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const [iterText, salt, storedHash] = encoded.split(':');
  if (!iterText || !salt || !storedHash) return false;

  const iterations = Number(iterText);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const hashBuffer = Buffer.from(await derive(password, salt, iterations), 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (hashBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, storedBuffer);
};
