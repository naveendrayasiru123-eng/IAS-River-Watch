import { clearedAdminCookie, sameOrigin } from '../auth';
export const runtime = 'edge';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ok:false},{status:403});
  return Response.json({ok:true},{headers:{'Set-Cookie':clearedAdminCookie,'Cache-Control':'no-store'}});
}
