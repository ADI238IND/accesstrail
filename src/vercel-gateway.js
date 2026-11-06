// Vercel is the public web host. The existing research service owns D1 and the
// TinyFish secret, preserving saved reports and the shared allowance.
export const RESEARCH_ORIGIN='https://accesstrail.adityasinghal074.chatgpt.site';
const methods={health:'GET',catalog:'GET',research:'POST',run:'POST',refresh:'POST'};
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const error=(message,status)=>Response.json({error:message},{status,headers});
export async function gateway(request){
 const url=new URL(request.url),route=url.searchParams.get('route');
 if(!Object.hasOwn(methods,route||''))return error('Not found',404);
 if(request.method!==methods[route])return error('Method not allowed',405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return error('Origin not allowed',403);
 if(Number(request.headers.get('content-length')||0)>4096)return error('Request too large',413);
 let body;
 if(request.method==='POST'){
  body=await request.text();if(body.length>4096)return error('Request too large',413);
  try{const parsed=JSON.parse(body);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();}catch{return error('Invalid request',400);}
 }
 try{
  // No cookies, authorization, visitor keys, forwarded headers or query targets
  // are sent upstream. The destination and allowed operations are fixed.
  const upstream=await fetch(RESEARCH_ORIGIN+'/api/'+route,{
   method:request.method,
   headers:{'Content-Type':'application/json','Accept':'application/json','Origin':RESEARCH_ORIGIN},
   ...(body!==undefined?{body}:{}),
   signal:AbortSignal.timeout(90000),redirect:'error'
  });
  if(!upstream.headers.get('content-type')?.includes('application/json'))return error('The research service returned an unexpected response. Your saved report is unchanged.',502);
  return new Response(await upstream.arrayBuffer(),{status:upstream.status,headers});
 }catch{return error('The research service is temporarily unavailable. Please try again; your saved report is unchanged.',502);}
}
