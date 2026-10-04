import { withPagesCors, pagesOptions, isPagesRequest } from '../../pages';
import { env } from 'cloudflare:workers';
import { adminPagesToken, adminCookie, sameOrigin, validAdminPassword } from '../auth';

export const runtime = 'edge';
const reply = (error: string, status: number) => Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});

async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return reply('Invalid login request.',403);
  if (!env.DB || !env.IAS_ADMIN_PASSWORD_HASH || !env.IAS_ADMIN_SESSION_KEY) return reply('Admin login is unavailable.',503);
  if (Number(request.headers.get('content-length')) > 2048) return reply('Invalid login request.',400);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip))),b=>b.toString(16).padStart(2,'0')).join('');
  const now = Math.floor(Date.now()/1000), windowStart = now - 900;
  try {
    const attempt = await env.DB.prepare('SELECT attempts, window_start FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).first<{attempts:number;window_start:number}>();
    if (attempt && attempt.window_start > windowStart && attempt.attempts >= 5) return reply('Too many attempts. Try again in 15 minutes.',429);
    let body: any;
    try { const raw = await request.text(); if(raw.length > 2048) return reply('Invalid login request.',400); body=JSON.parse(raw); }
    catch { return reply('Invalid login request.',400); }
    if (!(await validAdminPassword(body?.username,body?.password))) {
      await env.DB.prepare('INSERT INTO admin_login_attempts (ip_hash,attempts,window_start) VALUES (?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END, window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END').bind(ipHash,now,windowStart,windowStart).run();
      return reply('Incorrect username or password.',401);
    }
    await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).run();
    if (isPagesRequest(request)) {
      const token = await adminPagesToken();
      if (!token) return reply('Admin login is unavailable.',503);
      return Response.json({ok:true,token},{headers:{'Cache-Control':'no-store'}});
    }
    const cookie = await adminCookie();
    if (!cookie) return reply('Admin login is unavailable.',503);
    return Response.json({ok:true},{headers:{'Set-Cookie':cookie,'Cache-Control':'no-store'}});
  } catch(error) { console.error('Admin login failed',error); return reply('Admin login is temporarily unavailable.',503); }
}

export const POST = withPagesCors(handlePOST);
export const OPTIONS = pagesOptions;
