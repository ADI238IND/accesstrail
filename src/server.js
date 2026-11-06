export const securityHeaders={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const json=(d,status=200)=>Response.json(d,{status,headers:{...securityHeaders,'Cache-Control':'no-store'}});
const pending=['STARTING','PENDING','RUNNING','QUEUED'];
const CACHE_MS=86400000;
export const SHARED_RUN_LIMIT=4;
async function latestReport(db,venue){
 if(db){const row=await db.prepare('SELECT result_json FROM research_jobs WHERE venue = ? AND status = ? ORDER BY updated_at DESC LIMIT 1').bind(venue.id,'COMPLETED').first();if(row?.result_json){try{return JSON.parse(row.result_json);}catch{}}}
 return recorded.id===venue.id?recorded:null;
}
export async function reserveRun(db,venue,now=Date.now()){
 const recent=await db.prepare('SELECT id,status,result_json,updated_at FROM research_jobs WHERE venue = ? AND status = ? ORDER BY updated_at DESC LIMIT 1').bind(venue.id,'COMPLETED').first();
 if(recent?.result_json&&now-recent.updated_at<CACHE_MS)return {run_id:recent.id,status:'COMPLETED',result:JSON.parse(recent.result_json),cached:true};
 await db.prepare("UPDATE research_jobs SET status = 'FAILED', error = 'Investigation exceeded the waiting period' WHERE status IN ('STARTING','PENDING','RUNNING','QUEUED') AND created_at < ?").bind(now-900000).run();
 const active=await db.prepare("SELECT id,status FROM research_jobs WHERE venue = ? AND status IN ('STARTING','PENDING','RUNNING','QUEUED') ORDER BY created_at DESC LIMIT 1").bind(venue.id).first();
 if(active)return {run_id:active.id,status:active.status,reused:true};
 const id=crypto.randomUUID();
 const reserved=await db.prepare("INSERT INTO research_jobs (id,venue,status,created_at,updated_at) SELECT ?,?,'STARTING',?,? WHERE (SELECT COUNT(*) FROM research_jobs) < ? AND NOT EXISTS (SELECT 1 FROM research_jobs WHERE venue = ? AND status IN ('STARTING','PENDING','RUNNING','QUEUED')) RETURNING id").bind(id,venue.id,now,now,SHARED_RUN_LIMIT,venue.id).first();
 if(reserved)return {run_id:id,status:'STARTING',reserved:true};
 const joined=await db.prepare("SELECT id,status FROM research_jobs WHERE venue = ? AND status IN ('STARTING','PENDING','RUNNING','QUEUED') ORDER BY created_at DESC LIMIT 1").bind(venue.id).first();
 if(joined)return {run_id:joined.id,status:joined.status,reused:true};
 return {quota_exhausted:true};
}
async function startShared(env,venue){
 if(!env.DB||!env.TINYFISH_API_KEY)return json({error:'Live research is temporarily unavailable. Saved evidence is still available.'},503);
 const reservation=await reserveRun(env.DB,venue);
 if(reservation.quota_exhausted)return json({error:'Shared live refreshes have reached their limit. You can still explore saved evidence and check its sources.'},429);
 if(!reservation.reserved)return json(reservation);
 try{
  const res=await fetch('https://agent.tinyfish.ai/v1/automation/run-async',{method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({url:venue.url,goal:createGoal(venue),api_integration:'accesstrail'}),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('TinyFish did not accept this investigation (HTTP '+res.status+').');
  const data=await res.json();if(!data.run_id||!/^[A-Za-z0-9_-]{8,100}$/.test(data.run_id))throw Error('TinyFish did not return a valid run reference.');
  await env.DB.prepare('UPDATE research_jobs SET provider_run_id = ?,status = ?,updated_at = ? WHERE id = ?').bind(data.run_id,'PENDING',Date.now(),reservation.run_id).run();
  return json({run_id:reservation.run_id,status:'PENDING',cached:false});
 }catch(e){const message=e.message?.startsWith('TinyFish')?e.message:'The investigation could not be started. The existing report is unchanged.';await env.DB.prepare('UPDATE research_jobs SET status = ?,error = ?,updated_at = ? WHERE id = ?').bind('FAILED',message,Date.now(),reservation.run_id).run();return json({error:message},502);}
}
async function checkShared(env,venue,id){
 if(!env.DB||!env.TINYFISH_API_KEY)return json({error:'Live research is temporarily unavailable.'},503);
 const row=await env.DB.prepare('SELECT * FROM research_jobs WHERE id = ? AND venue = ?').bind(id,venue.id).first();
 if(!row)return json({error:'This report run was not created by AccessTrail.'},404);
 if(row.status==='COMPLETED')return json({run_id:id,status:'COMPLETED',result:JSON.parse(row.result_json)});
 if(!pending.includes(row.status))return json({run_id:id,status:row.status,error:row.error||'This investigation did not complete.'});
 if(!row.provider_run_id||Date.now()-row.updated_at<2500)return json({run_id:id,status:row.status});
 try{
  const response=await fetch('https://agent.tinyfish.ai/v1/runs/'+row.provider_run_id,{headers:{'X-API-Key':env.TINYFISH_API_KEY},signal:AbortSignal.timeout(20000)});
  if(!response.ok)return json({run_id:id,status:row.status,retryable:true});
  const d=await response.json();const status=['PENDING','RUNNING','COMPLETED','FAILED','CANCELLED'].includes(d.status)?d.status:'RUNNING';
  let report=null;
  if(status==='COMPLETED'){report=normalizeReport(d.resultJson??d.result,venue,row.provider_run_id);if(!report){await env.DB.prepare('UPDATE research_jobs SET status = ?,error = ?,updated_at = ? WHERE id = ?').bind('FAILED','TinyFish returned an invalid evidence report.',Date.now(),id).run();return json({run_id:id,status:'FAILED',error:'TinyFish returned an invalid evidence report.'});}}
  const message=['FAILED','CANCELLED'].includes(status)?'TinyFish could not complete the investigation. No report has been substituted.':null;
  await env.DB.prepare('UPDATE research_jobs SET status = ?,result_json = ?,error = ?,updated_at = ? WHERE id = ?').bind(status,report?JSON.stringify(report):null,message,Date.now(),id).run();
  return json({run_id:id,status,result:report,error:message});
 }catch{return json({run_id:id,status:row.status,retryable:true});}
}
const normalizedText=s=>s.toLowerCase().replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/\\[nr]|\s+/g,' ');
async function refreshSources(env,venue){
 if(!env.TINYFISH_API_KEY)return json({error:'Source checking is temporarily unavailable.'},503);
 const prior=env.DB?await env.DB.prepare('SELECT * FROM source_checks WHERE venue = ?').bind(venue.id).first():null;
 if(prior&&Date.now()-prior.checked_at<300000)return json({...JSON.parse(prior.result_json),cached:true});
 const report=await latestReport(env.DB,venue);if(!report)return json({error:'Complete a venue investigation first so there are evidence markers to verify.'},409);
 const evidence=report.evidence.filter(e=>safeSource(e.source_url,venue.host));
 const urls=[...new Set(evidence.map(e=>e.source_url))].slice(0,3),checks=[];
 for(const url of urls){
  let text='',failure=false;
  try{const res=await fetch('https://api.fetch.tinyfish.ai',{method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({urls:[url]}),signal:AbortSignal.timeout(30000)});const data=res.ok?await res.json():null;text=normalizedText(JSON.stringify(data));failure=!data||data.error||data.success===false||text.length<250||/just a moment|verify you are human|access denied|cf-chl-/.test(text);}catch{failure=true;}
  for(const e of evidence.filter(e=>e.source_url===url))checks.push({requirement_id:e.requirement_id,source_url:url,marker:e.excerpt,state:failure?'retrieval_failed':text.includes(normalizedText(e.excerpt))?'found':'not_found'});
 }
 let previous=[];try{previous=prior?JSON.parse(prior.result_json).checks:[];}catch{}
 const result={checked_at:new Date().toISOString(),provider:'TinyFish TinyFetch',checks,previous_checked_at:prior?new Date(prior.checked_at).toISOString():null,changes:checks.filter(c=>c.state!=='retrieval_failed'&&previous.some(p=>p.source_url===c.source_url&&p.marker===c.marker&&p.state!==c.state&&p.state!=='retrieval_failed')),notice:'These are short text-marker checks, not a physical inspection. Missing text may reflect wording changes. Retrieval failures never establish that information or facilities were removed.'};
 if(env.DB)await env.DB.prepare('INSERT INTO source_checks (venue,checked_at,result_json) VALUES (?,?,?) ON CONFLICT(venue) DO UPDATE SET checked_at=excluded.checked_at,result_json=excluded.result_json').bind(venue.id,Date.now(),JSON.stringify(result)).run();
 return json(result);
}
export async function api(request,env={}){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/health')return json({ok:true,provider:'TinyFish',live_mode:'server-funded',storage_connected:!!env.DB,live_available:!!(env.DB&&env.TINYFISH_API_KEY)});
 if(path==='/api/catalog'&&request.method==='GET'){
  try{return json({venues:await Promise.all(VENUES.map(async v=>({...v,report:await latestReport(env.DB,v)})))});}catch{return json({venues:VENUES.map(v=>({...v,report:v.id===recorded.id?recorded:null}))});}
 }
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Origin not allowed'},403);
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large'},413);
 let input;try{const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}catch{return json({error:'Invalid request'},400);}
 const venue=VENUES.find(v=>v.id===input.venue);if(!venue)return json({error:'Choose a supported venue'},400);
 try{
  if(path==='/api/research')return await startShared(env,venue);
  if(path==='/api/run'){if(!/^[A-Za-z0-9_-]{8,100}$/.test(input.run_id||''))return json({error:'Invalid run reference'},400);return await checkShared(env,venue,input.run_id);}
  if(path==='/api/refresh')return await refreshSources(env,venue);
 }catch{return json({error:'Research storage is temporarily unavailable. Your existing report is unchanged.'},503);}
 return json({error:'Not found'},404);
}
