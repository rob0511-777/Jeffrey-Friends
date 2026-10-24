'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
test('strukturell beschädigte Kostenjournale werden ohne Absturz verworfen',()=>{
  const fs={readFileSync:()=>JSON.stringify({events:[null,{timestamp:'evil',provider:{},units:'bad'},{timestamp:Date.parse('2026-10-24T10:00:00Z'),provider:'openai',model:'safe',category:'text',source:'reported',units:{inputTextTokens:5},estimatedCostEur:0.1}],warnings:{}}),writeFileSync:()=>{}};
  const {createCostTracker}=require('../cost-tracker.cjs');
  const tracker=createCostTracker({file:'usage.json',fs,now:()=>Date.parse('2026-10-24T12:00:00Z')});
  assert.doesNotThrow(()=>tracker.summary({monthlyBudgetEur:10}));
  assert.equal(tracker.events().length,1);
});
