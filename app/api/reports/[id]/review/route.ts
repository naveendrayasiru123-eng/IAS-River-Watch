import { withPagesCors, pagesOptions } from '../../../pages';
import { env } from 'cloudflare:workers';
import { isAdmin, sameOrigin } from '../../../admin/auth';

export const runtime = 'edge';
async function handlePATCH(request: Request, context: {params: Promise<{id:string}>}) {
  if (!(await isAdmin(request))) return Response.json({ok:false,error:'Admin login required.'},{status:401});
  if (!sameOrigin(request)) return Response.json({ok:false,error:'Invalid request.'},{status:403});
  if (!env.DB) return Response.json({ok:false,error:'Storage unavailable.'},{status:503});
  const {id} = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ok:false,error:'Invalid report.'},{status:400});
  let body: any;
  try { const raw=await request.text(); if(raw.length>2000) throw Error(); body=JSON.parse(raw); }
  catch { return Response.json({ok:false,error:'Invalid review.'},{status:400}); }
  const status=body?.status, note=body?.note;
  if (!['Verified','Rejected','Pending review'].includes(status) || typeof note!=='string' || note.trim().length<10 || note.length>1000) return Response.json({ok:false,error:'Choose a status and add a review note of at least 10 characters.'},{status:400});
  const result=await env.DB.prepare('UPDATE ias_reports SET review_status = ?, review_note = ?, reviewed_at = ? WHERE request_id = ?').bind(status,note.trim(),new Date().toISOString(),id).run();
  if (!result.meta.changes) return Response.json({ok:false,error:'Report not found.'},{status:404});
  return Response.json({ok:true,status},{headers:{'Cache-Control':'no-store'}});
}

export const PATCH = withPagesCors(handlePATCH);
export const OPTIONS = pagesOptions;
