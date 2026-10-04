import { isPagesRequest } from '../pages';
import { env } from 'cloudflare:workers';

const COOKIE = 'ias_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const bytes = (value: string) => Uint8Array.from(value.match(/.{2}/g) || [], part => parseInt(part, 16));
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.reduce((diff, n, i) => diff | (n ^ b[i]), 0) === 0;

async function signingKey() {
  if (!env.IAS_ADMIN_SESSION_KEY) return null;
  return crypto.subtle.importKey('raw', bytes(env.IAS_ADMIN_SESSION_KEY), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}

export async function validAdminPassword(username: unknown, password: unknown) {
  if (username !== 'IASadmin' || typeof password !== 'string' || !env.IAS_ADMIN_PASSWORD_HASH) return false;
  const [salt, expected] = env.IAS_ADMIN_PASSWORD_HASH.split(':');
  if (!salt || !expected || !/^[a-f0-9]+$/.test(salt + expected)) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000}, key, 256));
  return equal(derived, bytes(expected));
}

export async function adminCookie() {
  const key = await signingKey();
  if (!key) return null;
  const expiry = Math.floor(Date.now()/1000) + SESSION_SECONDS;
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiry}.${nonce}`;
  const signature = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
  return `${COOKIE}=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`;
}

export async function adminPagesToken() {
  const key = await signingKey();
  if (!key) return null;
  const payload = `pages.${Math.floor(Date.now()/1000) + SESSION_SECONDS}.${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
  return `${payload}.${hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))))}`;
}

export async function isAdmin(request: Request) {
  if (isPagesRequest(request)) {
    // Cross-site admin sessions use signed bearer tokens, never third-party cookies.
    const token = request.headers.get('authorization')?.match(/^Bearer (pages\.\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64})$/)?.[1];
    const parts = token?.split('.');
    if (!parts || Number(parts[1]) <= Date.now()/1000 || Number(parts[1]) > Date.now()/1000 + SESSION_SECONDS) return false;
    const key = await signingKey();
    return !!key && crypto.subtle.verify('HMAC',key,bytes(parts[3]),encoder.encode(parts.slice(0,3).join('.')));
  }
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return false;
  const value = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  const match = value?.match(/^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/);
  if (!match || Number(match[1]) <= Date.now()/1000 || Number(match[1]) > Date.now()/1000 + SESSION_SECONDS) return false;
  const key = await signingKey();
  return !!key && crypto.subtle.verify('HMAC', key, bytes(match[3]), encoder.encode(`${match[1]}.${match[2]}`));
}

export const clearedAdminCookie = `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
export const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin || isPagesRequest(request);
};
