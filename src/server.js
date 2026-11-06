export const securityHeaders={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const json=(d,status=200)=>Response.json(d,{status,headers:{...securityHeaders,'Cache-Control':'no-store'}});
export async function api(request,env={}){
 const path=new URL(request.url).pathname;
 if(path==='/api/health')return json({ok:true,provider:'TinyFish',saved_runs:1,live_mode:'bring-your-own-key',source_refresh:!!env.TINYFISH_API_KEY});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large'},413);
 let input;try{const s=await request.text();if(s.length>4096)return json({error:'Request too large'},413);input=JSON.parse(s);}catch{return json({error:'Invalid request'},400);}
 const venue=VENUES.find(v=>v.id===input.venue);
 if(!venue)return json({error:'Choose a supported venue'},400);
 if(path==='/api/refresh'){
  if(!env.TINYFISH_API_KEY)return json({error:'Source verification is not configured'},503);
  // Fixed venue URLs prevent callers from turning this into a general fetch proxy.
  try{
   const res=await fetch('https://api.fetch.tinyfish.ai',{method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({urls:[venue.url]}),signal:AbortSignal.timeout(45000)});
   if(!res.ok)return json({error:'TinyFetch could not retrieve the page. Existing evidence is unchanged.'},502);
   const payload=await res.json();const text=JSON.stringify(payload).toLowerCase();
   const blocked=/just a moment|verify you are human|access denied|cf-chl-/.test(text);
   if(blocked||text.length<250)return json({error:'Source could not be verified. A blocked page is not evidence of removal.'},502);
   // Surface marker matches, not a claim that accessibility conditions were re-verified.
   const source=recorded.id===venue.id?recorded:null;
   const checks=(source?.evidence||[]).map(e=>({requirement_id:e.requirement_id,marker:e.excerpt,found:text.includes(e.excerpt.toLowerCase())}));
   return json({checked_at:new Date().toISOString(),provider:'TinyFish TinyFetch',url:venue.url,checks,notice:'Checks short text markers on one source page only. Missing markers need manual review; accessibility claims are not automatically changed.'});
  }catch{return json({error:'Source verification timed out or failed. Existing evidence is unchanged.'},502);}
 }
 if(path==='/api/research'||path==='/api/run'){
  const key=request.headers.get('x-tinyfish-key')||'';
  if(!/^sk-tinyfish-[A-Za-z0-9_-]{10,200}$/.test(key))return json({error:'Connect your TinyFish API key to run live research. Saved evidence needs no key.'},401);
  try{
   if(path==='/api/run'&&!/^[A-Za-z0-9_-]{8,100}$/.test(input.run_id||''))return json({error:'Invalid run reference'},400);
   const polling=path==='/api/run';
   const res=await fetch(polling?'https://agent.tinyfish.ai/v1/runs/'+input.run_id:'https://agent.tinyfish.ai/v1/automation/run-async',{method:polling?'GET':'POST',headers:{'X-API-Key':key,'Content-Type':'application/json'},...(!polling?{body:JSON.stringify({url:venue.url,goal:createGoal(venue),api_integration:'accesstrail'})}:{}),signal:AbortSignal.timeout(25000)});
   if(!res.ok){return json({error:'TinyFish did not accept the run (HTTP '+res.status+'). Check your key, credits and account limits.'},502);}
   const d=await res.json();
   if(!polling){if(!d.run_id)return json({error:'TinyFish did not return a run reference'},502);return json({run_id:d.run_id,status:d.status||'QUEUED'});}
   return json({run_id:d.run_id||input.run_id,status:d.status,result:d.resultJson??d.result??null,error:d.error?{message:'TinyFish could not complete this investigation. Check the source or provider run.'}:null});
  }catch{return json({error:'Could not start TinyFish. Please try again; no result has been substituted.'},502);}
 }
 return json({error:'Not found'},404);
}
