'use strict';

const DEFAULT_PRICING=Object.freeze({
  version:'2026-10-24',currency:'EUR',
  openai:{textInput:0.60,textOutput:2.40,audioInput:10,audioOutput:20,webSearchPer1000:10},
  gemini:{textInput:0.75,textOutput:4.50,audioInput:3,audioOutput:12,webSearchPer1000:14},
  local:{textInput:0,textOutput:0,audioInput:0,audioOutput:0,webSearchPer1000:0}
});
const amount=n=>Number.isFinite(Number(n))&&Number(n)>0?Number(n):0;
function calculateCost(event,pricing=DEFAULT_PRICING){
  if(Number.isFinite(Number(event?.estimatedCostEur)))return Math.max(0,Number(event.estimatedCostEur));
  const rate=pricing[event?.provider]||pricing.local,units=event?.units||{};
  return (amount(units.inputTextTokens)*rate.textInput+amount(units.outputTextTokens)*rate.textOutput+amount(units.inputAudioTokens)*rate.audioInput+amount(units.outputAudioTokens)*rate.audioOutput)/1e6+amount(units.requests)*rate.webSearchPer1000/1000;
}
function dayKey(ms){return new Date(ms).toISOString().slice(0,10);}
function monthKey(ms){return new Date(ms).toISOString().slice(0,7);}
function createCostTracker({file='',fs=null,now=Date.now,pricing=DEFAULT_PRICING}={}){
  let activePricing=pricing;
  let events=[],warnings={};
  if(file&&fs){try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(saved.events))events=saved.events.filter(event=>event&&typeof event==='object'&&Number.isFinite(Number(event.timestamp))&&Number(event.timestamp)>0&&['openai','gemini','local'].includes(event.provider)&&['reported','estimated'].includes(event.source)&&['text','audio','web_search'].includes(event.category)&&event.units&&typeof event.units==='object'&&Number.isFinite(Number(event.estimatedCostEur))&&Number(event.estimatedCostEur)>=0).slice(-2000).map(event=>({...event,timestamp:Number(event.timestamp),sessionId:String(event.sessionId||'').slice(0,80),model:String(event.model||'').slice(0,120),estimatedCostEur:Number(event.estimatedCostEur),units:Object.fromEntries(['inputTextTokens','outputTextTokens','inputAudioTokens','outputAudioTokens','requests'].map(key=>[key,amount(event.units[key])]))}));if(saved.warnings&&typeof saved.warnings==='object'&&!Array.isArray(saved.warnings))warnings=saved.warnings;}catch{}}
  const persist=()=>{if(file&&fs)try{fs.writeFileSync(file,JSON.stringify({version:1,events:events.slice(-2000),warnings}),'utf8');}catch{}};
  function normalized(event){
    const provider=['openai','gemini','local'].includes(event?.provider)?event.provider:'local';
    const source=['reported','estimated'].includes(event?.source)?event.source:'estimated';
    const category=['text','audio','web_search'].includes(event?.category)?event.category:'text';
    const units={};for(const key of ['inputTextTokens','outputTextTokens','inputAudioTokens','outputAudioTokens','requests'])units[key]=amount(event?.units?.[key]);
    const safe={id:`${now()}-${events.length}`,timestamp:now(),sessionId:String(event?.sessionId||'').slice(0,80),provider,model:String(event?.model||'').slice(0,120),category,source,units,pricingVersion:String(activePricing.version||'').slice(0,40)};
    safe.estimatedCostEur=calculateCost({...safe,estimatedCostEur:event?.estimatedCostEur},activePricing);return safe;
  }
  function selected(opts={}){const t=now(),day=dayKey(t),month=monthKey(t);return events.filter(e=>dayKey(e.timestamp)===day||monthKey(e.timestamp)===month||e.sessionId===opts.sessionId);}
  function aggregate(list){const cost=list.reduce((n,e)=>n+amount(e.estimatedCostEur),0),sources=new Set(list.map(e=>e.source));return {amountEur:Math.round(cost*1e6)/1e6,quality:sources.size===0?'none':sources.size===1?[...sources][0]:'mixed'};}
  function summary(opts={}){
    const t=now(),day=dayKey(t),month=monthKey(t),all=selected(opts),session=all.filter(e=>opts.sessionId&&e.sessionId===opts.sessionId),today=all.filter(e=>dayKey(e.timestamp)===day),thisMonth=all.filter(e=>monthKey(e.timestamp)===month),byProvider={};
    for(const provider of ['openai','gemini','local'])byProvider[provider]=aggregate(thisMonth.filter(e=>e.provider===provider));
    const web=thisMonth.filter(e=>e.category==='web_search');
    const limit=amount(opts.monthlyBudgetEur),monthTotal=aggregate(thisMonth);
    return {session:aggregate(session),day:aggregate(today),month:monthTotal,byProvider,webSearch:{...aggregate(web),requests:web.reduce((n,e)=>n+amount(e.units.requests),0)},budget:{limitEur:limit,ratio:limit?monthTotal.amountEur/limit:0,blocksNewPaidSessions:Boolean(opts.blockPaidAtBudget)},disclaimer:'Lokale Schätzung – keine Anbieterrechnung und kein offizieller Rechnungssaldo.'};
  }
  return Object.freeze({
    record(event){const value=normalized(event);events.push(value);events=events.slice(-2000);persist();return value;},
    summary,
    budgetCheck(opts={}){const month=monthKey(now()),sum=summary(opts),ratio=sum.budget.ratio,seen=new Set(Array.isArray(warnings[month])?warnings[month]:[]),newWarnings=[];for(const threshold of [50,80,100])if(ratio*100>=threshold&&!seen.has(threshold)){seen.add(threshold);newWarnings.push(threshold);}warnings[month]=[...seen];persist();return {allowed:!(opts.isNewPaidSession&&opts.blockPaidAtBudget&&amount(opts.monthlyBudgetEur)>0&&ratio>=1),ratio,newWarnings};},
    setPricing(next){if(next&&typeof next==='object')activePricing=next;return activePricing;},
    events:()=>events.map(e=>({...e,units:{...e.units}}))
  });
}
module.exports={DEFAULT_PRICING,calculateCost,createCostTracker};
