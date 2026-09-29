import { env } from 'cloudflare:workers';
import { isAdmin } from '../admin/auth';

export const runtime = 'edge';

const BASINS = ['Attanagalu Oya Basin', 'Kelani Basin', 'Kalu Basin', 'Not sure'];
const IMAGE_TYPES: Record<string, string> = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'};
const message = (error: string, status = 400) => Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
const safe = (value: unknown, limit = 3000) => typeof value === 'string' && value.length <= limit ? value.trim() : null;

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return message('Admin login required.',401);
  if (!env.DB) return message('Report storage is unavailable.',503);
  const offset = Number(new URL(request.url).searchParams.get('offset') || '0');
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return message('Invalid page.');
  try {
    const {results} = await env.DB.prepare('SELECT request_id, received_at, species, basin, latitude, longitude, observed_date, abundance, habitat, degradation, notes, photo_key, review_status, review_note, reviewed_at FROM ias_reports ORDER BY received_at DESC LIMIT 101 OFFSET ?').bind(offset).all();
    return Response.json({ok:true,reports:results.slice(0,100).map(({photo_key,...rest}:any)=>({...rest,has_photo:!!photo_key})),nextOffset:results.length>100?offset+100:null},{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) {
    console.error('IAS report listing failed',error);
    return message('Saved reports could not be loaded.',503);
  }
}

export async function POST(request: Request) {
  if (!env.DB || !env.BUCKET) return message('Report storage is unavailable. Please try later.',503);
  if (Number(request.headers.get('content-length')) > 7_200_000) return message('Report or photograph is too large.',413);
  let body: any;
  try { body = await request.text(); if(body.length > 7_200_000) return message('Report is too large.',413); body = JSON.parse(body); }
  catch { return message('Invalid report.'); }
  const id = body.requestId;
  if(typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return message('Invalid report reference.');
  const species=safe(body.species,200), basin=safe(body.basin,100), observedDate=safe(body.observedDate,10);
  if(!species || !basin || !BASINS.includes(basin) || !observedDate || !/^\d{4}-\d{2}-\d{2}$/.test(observedDate) || Number.isNaN(Date.parse(observedDate)) || Date.parse(observedDate) > Date.now()+86_400_000) return message('Check the species, basin, and observation date.');
  const latitude=body.latitude, longitude=body.longitude;
  if(typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude)>90 || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude)>180) return message('Choose a valid sighting location.');
  const abundance=safe(body.abundance), habitat=safe(body.habitat), degradation=safe(body.degradation), notes=safe(body.notes);
  if([abundance,habitat,degradation,notes].some(v=>v===null)) return message('Report text is too long.');
  let photo: Uint8Array | null = null, photoKey: string | null = null, photoType: string | null = null;
  if(body.photo){
    photoType=body.photo.mimeType;
    if(!IMAGE_TYPES[photoType as string] || typeof body.photo.base64 !== 'string' || body.photo.base64.length>7_000_000) return message('Choose a JPG, PNG, or WebP photograph up to 5 MB.');
    try { const binary=atob(body.photo.base64); photo=Uint8Array.from(binary,c=>c.charCodeAt(0)); } catch { return message('Invalid photograph.'); }
    if(photo.byteLength<12 || photo.byteLength>5*1024*1024) return message('Photograph must be at most 5 MB.');
    const bytes=photo;
    const valid=photoType==='image/jpeg' ? bytes[0]===255&&bytes[1]===216&&bytes[2]===255 : photoType==='image/png' ? [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n) : String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!valid) return message('The photograph does not match its file type.');
    photoKey=`reports/${id}.${IMAGE_TYPES[photoType!]}`;
  }
  const digestBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
  const digest=Array.from(new Uint8Array(digestBytes),b=>b.toString(16).padStart(2,'0')).join('');
  try {
    const previous=await env.DB.prepare('SELECT request_digest FROM ias_reports WHERE request_id = ?').bind(id).first<{request_digest:string}>();
    if(previous) return previous.request_digest===digest ? Response.json({ok:true,requestId:id}) : message('This report reference was already used.',409);
    if(photo && photoKey) await env.BUCKET.put(photoKey,photo,{httpMetadata:{contentType:photoType!}});
    await env.DB.prepare('INSERT INTO ias_reports (request_id, received_at, species, basin, latitude, longitude, observed_date, abundance, habitat, degradation, notes, photo_key, review_status, request_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id,new Date().toISOString(),species,basin,latitude,longitude,observedDate,abundance,habitat,degradation,notes,photoKey,'Pending review',digest).run();
    return Response.json({ok:true,requestId:id},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    console.error('IAS report storage failed',error);
    if(photoKey) try { await env.BUCKET.delete(photoKey); } catch {}
    return message('Report could not be saved. Please try again.',503);
  }
}
