import { env } from 'cloudflare:workers';
import candidates from '../sample-candidates.json';

export const runtime = 'edge';
export async function GET() {
  if (!env.DB) return Response.json({ok:false,error:'Insights are unavailable.'},{status:503});
  try {
    const [reports,samples] = await Promise.all([
      env.DB.prepare('SELECT request_id, received_at, species, basin, latitude, longitude, observed_date, abundance, habitat, degradation, review_status, reviewed_at FROM ias_reports').all<any>(),
      env.DB.prepare('SELECT sample_id, observed_date, verified_at FROM sample_verifications').all<any>()
    ]);
    const pending=reports.results.filter(r=>r.review_status==='Pending review');
    const monthlyCounts=Object.entries(reports.results.reduce((acc:Record<string,number>,r:any)=>{const month=String(r.received_at).slice(0,7);if(/^\d{4}-\d{2}$/.test(month))acc[month]=(acc[month]||0)+1;return acc;},{})).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([month,count])=>({month,count}));
    const pendingByBasin=Object.entries(pending.reduce((acc:Record<string,number>,r:any)=>{acc[r.basin]=(acc[r.basin]||0)+1;return acc;},{})).map(([basin,count])=>({basin,count}));
    const verifiedReports=reports.results.filter(r=>r.review_status==='Verified').map(r=>({id:r.request_id,source:'Community report',species:r.species,basin:r.basin,latitude:r.latitude,longitude:r.longitude,observedDate:r.observed_date,receivedAt:r.received_at,abundance:r.abundance,habitat:r.habitat,degradation:r.degradation,verifiedAt:r.reviewed_at}));
    const verifiedSamples=samples.results.flatMap(s=>{const c=candidates.find(row=>row.id===s.sample_id);return c?[{id:`sample-${c.id}`,source:'Field-verified former sample',species:c.sci,basin:c.basin,latitude:c.lat,longitude:c.lng,observedDate:s.observed_date,verifiedAt:s.verified_at}]:[];});
    return Response.json({ok:true,pendingCount:pending.length,pendingByBasin,totalSubmissions:reports.results.length,monthlyCounts,verifiedReports,verifiedSamples,sampleCandidates:candidates.length,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=30'}});
  } catch(error) { console.error('IAS insights failed',error); return Response.json({ok:false,error:'Insights could not be loaded.'},{status:503}); }
}
