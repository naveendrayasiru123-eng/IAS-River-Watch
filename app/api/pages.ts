// Only this GitHub Pages origin may read this application's API cross-origin.
export const PAGES_ORIGIN = 'https://naveendrayasiru123-eng.github.io';
export const isPagesRequest = (request: Request) => request.headers.get('origin') === PAGES_ORIGIN;
export function pagesOptions(request: Request) {
  if (!isPagesRequest(request)) return new Response(null, {status:403});
  return new Response(null, {status:204, headers:{
    'Access-Control-Allow-Origin':PAGES_ORIGIN,
    'Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Max-Age':'600', 'Vary':'Origin'
  }});
}
export function withPagesCors<A extends unknown[]>(handler: (request: Request, ...args: A) => Promise<Response>) {
  return async (request: Request, ...args: A) => {
    let response: Response;
    try { response = await handler(request, ...args); }
    catch (error) {
      console.error('IAS API failed', error);
      response = Response.json({ok:false,error:'The service is temporarily unavailable. Please try again.'}, {status:503});
    }
    const headers = new Headers(response.headers);
    // Caches must never reuse an allowlisted response for another origin.
    headers.append('Vary','Origin');
    if (isPagesRequest(request)) headers.set('Access-Control-Allow-Origin', PAGES_ORIGIN);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  };
}
