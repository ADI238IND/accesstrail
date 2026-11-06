import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reduceReport,visitBrief,enquiry} from '../src/core.js';
const source_url='https://www.britishmuseum.org/visit/accessibility-museum';
const record=(requirement_id,claim='supports',extra={})=>({requirement_id,claim,excerpt:'Published facility statement',source_url,...extra});
test('essential gaps are not hidden by support for other facilities',()=>{
 const rows=reduceReport({evidence:[record('entrance'),record('restroom')]});
 const brief=visitBrief(rows,['lift']);
 assert.equal(brief.supported.length,2);assert.deepEqual(brief.essentialUnresolved.map(r=>r.id),['lift']);
});
test('essential unresolved questions come before optional questions',()=>{
 const rows=reduceReport({evidence:[]});const brief=visitBrief(rows,['assistance']);
 assert.equal(brief.questions[0].id,'assistance');assert.equal(brief.questions.length,5);
 const text=enquiry(rows,'Venue',['assistance']);assert.match(text,/1\. \[Essential for my visit\] What assistance/);
});
test('unselected and invalid essential ids cannot add requirements',()=>{
 const rows=reduceReport({evidence:[]},['restroom']);const brief=visitBrief(rows,['entrance','unrecognized']);
 assert.equal(brief.essential.length,0);assert.equal(brief.selectedCount,1);assert.equal(brief.questions.length,1);
});
test('conditions, conflicts and unconfirmed excerpts remain essential questions',()=>{
 const rows=reduceReport({evidence:[record('entrance','supports',{verification:'not_found'}),record('restroom'),record('restroom','contradicts'),record('assistance','supports',{conditional:true})]});
 const brief=visitBrief(rows,['entrance','restroom','assistance']);
 assert.deepEqual(brief.essentialUnresolved.map(r=>r.state),['unknown','conflict','conditional']);
});
test('a supported essential need does not erase unrelated unanswered questions',()=>{
 const rows=reduceReport({evidence:[record('entrance')]});const brief=visitBrief(rows,['entrance']);
 assert.equal(brief.essentialUnresolved.length,0);assert.equal(brief.questions.length,4);
 assert.doesNotMatch(enquiry(rows,'Venue',['entrance']),/Which entrance/);
});
test('empty selection creates neither invented support nor invented priorities',()=>{
 const brief=visitBrief([],['entrance']);assert.equal(brief.supported.length,0);assert.equal(brief.essential.length,0);assert.equal(brief.questions.length,0);
});
