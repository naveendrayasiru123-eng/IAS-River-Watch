import { withPagesCors, pagesOptions } from '../pages';
import { env } from 'cloudflare:workers';
import { isAdmin, sameOrigin } from '../admin/auth';
import candidates from '../sample-candidates.json';

export const runtime = 'edge';
async function handleGET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ok:false},{status:401});
  if (!env.DB) return Response.json({ok:false},{status:503});
  const {results} = await env.DB.prepare('SELECT sample_id, observed_date, verification_note, verified_at FROM sample_verifications ORDER BY sample_id').all();
  return Response.json({ok:true,reviews:results},{headers:{'Cache-Control':'private, no-store'}});
}
async function handlePOST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ok:false,error:'Admin login required.'},{status:401});
  if (!sameOrigin(request)) return Response.json({ok:false,error:'Invalid request.'},{status:403});
  if (!env.DB) return Response.json({ok:false,error:'Storage unavailable.'},{status:503});
  let body: any;
  try { const raw=await request.text(); if(raw.length>2000) throw Error(); body=JSON.parse(raw); }
  catch { return Response.json({ok:false,error:'Invalid review.'},{status:400}); }
  const candidate=candidates.find(row=>row.id===body?.sampleId);
  const date=body?.observedDate, note=body?.note;
  if (!candidate || typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || Date.parse(date)>Date.now()+86400000 || typeof note!=='string' || note.trim().length<20 || note.length>1000) return Response.json({ok:false,error:'Select a sample, enter the field observation date and describe evidence (at least 20 characters).'},{status:400});
  await env.DB.prepare('INSERT INTO sample_verifications (sample_id,observed_date,verification_note,verified_at) VALUES (?,?,?,?) ON CONFLICT(sample_id) DO UPDATE SET observed_date=excluded.observed_date, verification_note=excluded.verification_note, verified_at=excluded.verified_at').bind(candidate.id,date,note.trim(),new Date().toISOString()).run();
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}

export const GET = withPagesCors(handleGET);
export const POST = withPagesCors(handlePOST);
export const OPTIONS = pagesOptions;
