import { withPagesCors, pagesOptions } from '../../pages';
import { clearedAdminCookie, sameOrigin } from '../auth';
export const runtime = 'edge';
async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ok:false},{status:403});
  return Response.json({ok:true},{headers:{'Set-Cookie':clearedAdminCookie,'Cache-Control':'no-store'}});
}

export const POST = withPagesCors(handlePOST);
export const OPTIONS = pagesOptions;
