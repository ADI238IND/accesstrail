import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reduceReport,safeSource,parseResult,enquiry,createGoal,VENUES} from '../src/core.js';
import worker from '../worker/index.js';
const ev=(claim='supports',rest={})=>({requirement_id:'restroom',claim,excerpt:'Accessible toilet',source_url:'https://www.britishmuseum.org/visit/accessibility',...rest});
test('absence stays unknown',()=>assert.equal(reduceReport({evidence:[]},['restroom'])[0].state,'unknown'));
test('positive evidence is retained',()=>assert.equal(reduceReport({evidence:[ev()]},['restroom'])[0].state,'supported'));
test('negative evidence is not cancelled by a positive',()=>{const r=reduceReport({evidence:[ev(),ev('contradicts')]},['restroom'])[0];assert.equal(r.state,'conflict');assert.equal(r.records.length,2);});
test('negative-only evidence is contradicted',()=>assert.equal(reduceReport({evidence:[ev('contradicts')]},['restroom'])[0].state,'contradicted'));
test('off-domain and script sources never qualify',()=>{for(const source_url of ['javascript:alert(1)','https://britishmuseum.org.evil.test/x','http://britishmuseum.org','https://user:secret@britishmuseum.org'])assert.equal(reduceReport({evidence:[ev('supports',{source_url})]},['restroom'])[0].state,'unknown');});
test('unknown claim types and empty quotes never qualify',()=>{for(const e of [ev('maybe'),ev('supports',{excerpt:''}),ev('supports',{excerpt:' '})])assert.equal(reduceReport({evidence:[e]},['restroom'])[0].state,'unknown');});
test('duplicate records are collapsed',()=>assert.equal(reduceReport({evidence:[ev(),ev()]},['restroom'])[0].records.length,1));
test('retrieval failure is different from unknown',()=>assert.equal(reduceReport({retrieval_failed:true,evidence:[]},['restroom'])[0].state,'failed'));
test('requirement selection does not change other claims',()=>assert.equal(reduceReport({evidence:[ev()]},['entrance'])[0].state,'unknown'));
test('result parser accepts current and legacy payloads',()=>{assert.deepEqual(parseResult({result:{evidence:[]}}),{evidence:[]});assert.deepEqual(parseResult({resultJson:'{"evidence":[]}'}),{evidence:[]});assert.equal(parseResult({result:'not JSON'}),null);});
test('enquiry asks about unresolved requirements',()=>{const s=enquiry(reduceReport({evidence:[ev()]},['entrance','restroom']),'Venue');assert.match(s,/Which entrance/);assert.doesNotMatch(s,/Is there an accessible restroom/);});
test('prompt prevents bookings and keeps unknowns',()=>{const goal=createGoal(VENUES[0]);assert.match(goal,/Never log in/);assert.match(goal,/omit missing information/);});
test('home and fixture endpoints are accessible',async()=>{const r=await worker.fetch(new Request('https://test.local/'),{},{});assert.equal(r.status,200);assert.match(await r.text(),/Check the/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);const f=await worker.fetch(new Request('https://test.local/fixtures/updates'),{},{});assert.match(await f.text(),/Fictional/);});
test('live endpoint rejects missing credentials',async()=>{const r=await worker.fetch(new Request('https://test.local/api/research',{method:'POST',body:JSON.stringify({venue:'british'})}),{},{});assert.equal(r.status,401);});
test('unlisted venue and cross-origin requests are rejected',async()=>{const a=await worker.fetch(new Request('https://test.local/api/research',{method:'POST',body:'{"venue":"http://localhost"}'}),{},{});assert.equal(a.status,400);const b=await worker.fetch(new Request('https://test.local/api/research',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),{},{});assert.equal(b.status,403);});
test('refresh without configuration fails honestly',async()=>{const r=await worker.fetch(new Request('https://test.local/api/refresh',{method:'POST',body:'{"venue":"british"}'}),{},{});assert.equal(r.status,503);});
test('live proxy sends credentials only to the fixed provider and returns run reference',async()=>{
 const original=globalThis.fetch;let called=false;
 globalThis.fetch=async(url,opts)=>{called=true;assert.equal(url,'https://agent.tinyfish.ai/v1/automation/run-async');assert.equal(opts.headers['X-API-Key'],'sk-tinyfish-testkey123456789');const p=JSON.parse(opts.body);assert.equal(p.url,VENUES[0].url);assert.match(p.goal,/omit missing information/);return Response.json({run_id:'run_test12345',error:null});};
 try{const r=await worker.fetch(new Request('https://test.local/api/research',{method:'POST',headers:{'X-Tinyfish-Key':'sk-tinyfish-testkey123456789'},body:'{"venue":"british"}'}),{},{});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\/json/);const t=await r.text();assert.match(t,/run_test12345/);assert.doesNotMatch(t,/testkey/);assert.ok(called);}finally{globalThis.fetch=original;}
});
test('provider failures become useful errors without reflecting secrets',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('private provider error',{status:401});
 try{const r=await worker.fetch(new Request('https://test.local/api/research',{method:'POST',headers:{'X-Tinyfish-Key':'sk-tinyfish-testkey123456789'},body:'{"venue":"british"}'}),{},{});assert.equal(r.status,502);const t=await r.text();assert.match(t,/HTTP 401/);assert.doesNotMatch(t,/private provider error|testkey/);}finally{globalThis.fetch=original;}
});
test('blocked source checks never imply removal',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({content:'Just a moment. Verify you are human. '.repeat(20)});
 try{const r=await worker.fetch(new Request('https://test.local/api/refresh',{method:'POST',body:'{"venue":"british"}'}),{TINYFISH_API_KEY:'fake'},{});assert.equal(r.status,502);assert.match(await r.text(),/not evidence of removal/);}finally{globalThis.fetch=original;}
});
test('polling returns the completed result without unrelated provider metadata',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://agent.tinyfish.ai/v1/runs/run_test12345');assert.equal(opts.method,'GET');return Response.json({run_id:'run_test12345',status:'COMPLETED',result:{evidence:[]},goal:'private goal',streaming_url:'https://private.test'});};
 try{const r=await worker.fetch(new Request('https://test.local/api/run',{method:'POST',headers:{'X-Tinyfish-Key':'sk-tinyfish-testkey123456789'},body:'{"venue":"british","run_id":"run_test12345"}'}),{},{});const d=await r.json();assert.equal(d.status,'COMPLETED');assert.deepEqual(d.result,{evidence:[]});assert.equal(d.goal,undefined);assert.equal(d.streaming_url,undefined);}finally{globalThis.fetch=original;}
});
test('polling rejects injected run paths',async()=>{const r=await worker.fetch(new Request('https://test.local/api/run',{method:'POST',headers:{'X-Tinyfish-Key':'sk-tinyfish-testkey123456789'},body:'{"venue":"british","run_id":"../../../evil"}'}),{},{});assert.equal(r.status,400);});
