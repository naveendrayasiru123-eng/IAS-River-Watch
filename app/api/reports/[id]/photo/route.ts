import { withPagesCors, pagesOptions } from '../../../pages';
import { env } from 'cloudflare:workers';
import { isAdmin } from '../../../admin/auth';

export const runtime = 'edge';

async function handleGET(request: Request, context: {params: Promise<{id: string}>}) {
  if (!(await isAdmin(request))) return new Response('Admin login required.',{status:401});
  const {id} = await context.params;
  if(!/^[a-f0-9-]{36}$/i.test(id) || !env.DB || !env.BUCKET) return new Response('Not found.',{status:404});
  const row=await env.DB.prepare('SELECT photo_key FROM ias_reports WHERE request_id = ?').bind(id).first<{photo_key:string|null}>();
  if(!row?.photo_key) return new Response('Not found.',{status:404});
  const object=await env.BUCKET.get(row.photo_key);
  if(!object) return new Response('Not found.',{status:404});
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType || 'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
}

export const GET = withPagesCors(handleGET);
export const OPTIONS = pagesOptions;
