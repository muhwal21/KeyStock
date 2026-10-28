import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const env = process.env;
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((key) => !env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

if (env.JWT_SECRET.length < 32 || env.JWT_SECRET.toLowerCase().includes('replace-with')) {
  throw new Error('JWT_SECRET must be a generated secret with at least 32 characters.');
}

const jwtExpiresSeconds = Number(env.JWT_EXPIRES_SECONDS ?? 28800);
if (!Number.isInteger(jwtExpiresSeconds) || jwtExpiresSeconds < 300 || jwtExpiresSeconds > 86400) {
  throw new Error('JWT_EXPIRES_SECONDS must be an integer between 300 and 86400.');
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: env.JWT_SECRET,
  jwtExpiresSeconds,
  accessCookieName: env.ACCESS_COOKIE_NAME ?? 'keystock.access',
  csrfCookieName: env.CSRF_COOKIE_NAME ?? 'keystock.csrf',
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: env.DB_PASSWORD,
  },
};

export const isProduction = config.nodeEnv === 'production';
