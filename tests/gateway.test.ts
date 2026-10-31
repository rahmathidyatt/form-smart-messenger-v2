/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,createHmac,randomUUID} from 'node:crypto';
const source=readFileSync('apps-script/Catalog.gs','utf8')+'\n'+readFileSync('apps-script/Code.gs','utf8');
const order={email:'agent@example.test',name:'Agent Contoh',code:'TEST',unit:'VISION',date:'2099-01-01',address:'Jalan Contoh Blok A Nomor 12',maps:'',task:'banner',other:'',owner:'TIDAK',consent:true};
function harness(){
 class Sheet{data:any[][]=[];getLastRow(){return this.data.length;}getRange(row:number,col:number,height=1,width=1){return {getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>this.data[row-1+i]?.[col-1+j]??'')),setValues:(values:any[][])=>{values.forEach((r,i)=>r.forEach((cell,j)=>{this.data[row-1+i]??=[];this.data[row-1+i][col-1+j]=cell;}));}};}appendRow(row:any[]){this.data.push(row);}setFrozenRows(){}}
 const sheets:Record<string,Sheet>={};const book={getSheetByName:(n:string)=>sheets[n],insertSheet:(n:string)=>sheets[n]=new Sheet()};
 const keys=['name_code','unit','date','address','task','other','owner','email','request_id','details'];
 const types=['TEXT','LIST','DATE','PARAGRAPH_TEXT','MULTIPLE_CHOICE','PARAGRAPH_TEXT','MULTIPLE_CHOICE','TEXT','TEXT','PARAGRAPH_TEXT'];
 const map=Object.fromEntries(keys.map((k,i)=>[k,{id:i+1,title:k}]));
 const props:Record<string,string>={FORM_ID:'test-form',LEDGER_SPREADSHEET_ID:'test-ledger',APPS_SCRIPT_SECRET:'test-key-with-more-than-32-characters',ITEM_MAP_JSON:JSON.stringify(map),PUBLIC_EMAIL_POLICY_APPROVED:'true',NOTIFY_EMAIL_TO:'ops@example.test'};
 const state={submitCalls:0,emailCalls:0,waCalls:0,mode:'ok',closed:false,quota:100,mailThrow:false};
 const responses:any[]=[];
 const items=keys.map((k,i)=>{const item:any={getId:()=>i+1,getTitle:()=>k,getType:()=>types[i],isRequired:()=>k!=='other',includesYear:()=>true,hasOtherOption:()=>true,getChoices:()=>({unit:['VISION'],task:['Pasang banner'],owner:['YA','TIDAK']} as Record<string,string[]>)[k]?.map(v=>({getValue:()=>v}))??[],createResponse:(value:unknown)=>({getItem:()=>item,getResponse:()=>value})};for(const method of ['asTextItem','asListItem','asDateItem','asParagraphTextItem','asMultipleChoiceItem','asCheckboxItem'])item[method]=()=>item;return item;});
 const form={getItems:()=>items,getItemById:(id:number)=>items[id-1],isAcceptingResponses:()=>!state.closed,getResponses:()=>responses,createResponse:()=>{const answers:any[]=[];const response:any={withItemResponse:(a:any)=>{answers.push(a);return response;},getId:()=>response.id,getResponseForItem:(item:any)=>answers.find(a=>a.getItem().getId()===item.getId())??null,submit:()=>{state.submitCalls++;if(state.mode==='before')throw new Error('network');response.id='response-'+state.submitCalls;responses.push(response);if(state.mode==='after')throw new Error('network');return response;}};return response;}};
 let locked=false;const cache=new Map();const properties={getProperty:(k:string)=>props[k],setProperty:(k:string,v:string)=>{props[k]=v;}};
 const context=vm.createContext({console,PropertiesService:{getScriptProperties:()=>properties},ContentService:{MimeType:{JSON:'json'},createTextOutput:(v:string)=>({setMimeType:()=>JSON.parse(v)})},CacheService:{getScriptCache:()=>({get:(k:string)=>cache.get(k),put:(k:string,v:string)=>cache.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},waitLock:()=>{locked=true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},SpreadsheetApp:{openById:()=>book,flush:()=>{}},Session:{getScriptTimeZone:()=>'Asia/Jakarta'},Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_:unknown,s:string)=>Array.from(createHash('sha256').update(s).digest()),computeHmacSha256Signature:(s:string,k:string)=>Array.from(createHmac('sha256',k).update(s).digest()),formatDate:(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)},FormApp:{openById:()=>form},MailApp:{getRemainingDailyQuota:()=>state.quota,sendEmail:()=>{state.emailCalls++;if(state.mailThrow)throw new Error('uncertain');}},UrlFetchApp:{fetch:()=>{state.waCalls++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({messages:[{id:'wamid-test'}]})};}}});
 vm.runInContext(source,context);const api=context as any;api.setupLedger();
 const request={id:randomUUID(),token:'a'.repeat(64),order:{...order}};
 return {api,state,request,props,sheets,items,responses};
}
test('submit uses official response path, preserves all mapped fields and records ID',()=>{const h=harness();const out=h.api.submit_(h.request);assert.equal(out.state,'synced');assert.equal(out.responseId,'response-1');assert.equal(h.responses[0].getResponseForItem(h.items[7]).getResponse(),order.email);assert.equal(h.responses[0].getResponseForItem(h.items[8]).getResponse(),h.request.id);assert.equal(h.responses[0].getResponseForItem(h.items[0]).getResponse(),'Agent Contoh (TEST)');assert.ok(h.sheets.Audit.data.length>3);});
test('same key retry submits exactly once in sequential harness',()=>{const h=harness();h.api.submit_(h.request);h.api.submit_(h.request);h.api.worker();assert.equal(h.state.submitCalls,1);});
test('same key with changed payload is rejected',()=>{const h=harness();h.api.submit_(h.request);assert.throws(()=>h.api.submit_({...h.request,order:{...order,name:'Different'}}),/CONFLICT/);});
test('wrong status token never exposes a record',()=>{const h=harness();h.api.submit_(h.request);assert.throws(()=>h.api.status_({...h.request,token:'b'.repeat(64)}),/NOT_FOUND/);assert.equal(h.api.status_(h.request).state,'synced');assert.equal(h.api.status_(h.request).payload,undefined);});
test('post-submit disconnect reconciles existing response, does not resubmit',()=>{const h=harness();h.state.mode='after';const out=h.api.submit_(h.request);assert.equal(out.state,'synced');h.api.worker();assert.equal(h.state.submitCalls,1);});
test('uncertain submit with no visible response requires review, no blind retry',()=>{const h=harness();h.state.mode='before';assert.equal(h.api.submit_(h.request).state,'needs_review');h.api.worker();h.api.reconcile_(h.api.find_(h.request.id));assert.equal(h.state.submitCalls,1);assert.equal(h.api.find_(h.request.id).state,'needs_review');});
test('pre-submit failure queues retry and can later succeed',()=>{const h=harness();h.state.closed=true;assert.equal(h.api.submit_(h.request).state,'retry_wait');assert.equal(h.state.submitCalls,0);const r=h.api.find_(h.request.id);r.nextAttempt=0;h.api.save_(r);h.state.closed=false;h.api.worker();assert.equal(h.api.find_(h.request.id).state,'synced');});
test('missing schema mapping never silently omits HRD data',()=>{const h=harness();h.props.ITEM_MAP_JSON='{}';assert.equal(h.api.submit_(h.request).state,'retry_wait');assert.equal(h.state.submitCalls,0);});
test('no notification before confirmed HRD response',()=>{const h=harness();h.state.closed=true;h.api.submit_(h.request);h.api.worker();assert.equal(h.state.emailCalls,0);assert.equal(h.state.waCalls,0);});
test('email acceptance and dashboard unread persisted; WhatsApp disabled by default',()=>{const h=harness();h.api.submit_(h.request);h.api.worker();h.api.worker();assert.equal(h.state.emailCalls,1);assert.equal(h.state.waCalls,0);const r=h.api.find_(h.request.id);assert.equal(r.notifications.email.state,'accepted');assert.equal(r.notifications.whatsapp.state,'disabled');assert.equal(h.api.dashboard_()[0].read,false);});
test('uncertain email send is not automatically duplicated',()=>{const h=harness();h.state.mailThrow=true;h.api.submit_(h.request);h.api.worker();h.api.worker();assert.equal(h.state.emailCalls,1);assert.equal(h.api.find_(h.request.id).notifications.email.state,'needs_review');});
test('WhatsApp enabled without eligibility approval sends nothing',()=>{const h=harness();h.props.WHATSAPP_ENABLED='true';h.api.submit_(h.request);h.api.worker();assert.equal(h.state.waCalls,0);assert.equal(h.api.find_(h.request.id).notifications.whatsapp.state,'retry_wait');});
test('WhatsApp official template adapter needs all gates and records provider ID',()=>{const h=harness();Object.assign(h.props,{WHATSAPP_ENABLED:'true',WHATSAPP_ELIGIBILITY_CONFIRMED:'true',WHATSAPP_RECIPIENT_OPT_IN:'true',WHATSAPP_GRAPH_VERSION:'v99.0',WHATSAPP_PHONE_NUMBER_ID:'12345678',WHATSAPP_TO:'628123456789',WHATSAPP_TEMPLATE_NAME:'order_notice',WHATSAPP_TEMPLATE_LANGUAGE:'id',WHATSAPP_ACCESS_TOKEN:'test-only'});h.api.submit_(h.request);h.api.worker();h.api.worker();assert.equal(h.state.waCalls,1);assert.equal(h.api.find_(h.request.id).notifications.whatsapp.providerId,'wamid-test');});
test('gateway rejects invalid signatures and prevents replay',()=>{const h=harness();const body=JSON.stringify({action:'dashboard',data:{}}),ts=Date.now(),nonce=randomUUID();const signature=createHmac('sha256',h.props.APPS_SCRIPT_SECRET).update(ts+'.'+nonce+'.'+body).digest('hex');const envelope={ts,nonce,body,signature};assert.equal(h.api.doPost({postData:{contents:JSON.stringify({...envelope,signature:'0'.repeat(64)})}}).code,'UNAUTHORIZED');assert.equal(h.api.doPost({postData:{contents:JSON.stringify(envelope)}}).ok,true);assert.equal(h.api.doPost({postData:{contents:JSON.stringify(envelope)}}).code,'UNAUTHORIZED');});
test('email rate limit is durable across requests',()=>{const h=harness();for(let i=0;i<5;i++)h.api.submit_({...h.request,id:randomUUID()});assert.throws(()=>h.api.submit_({...h.request,id:randomUUID()}),/RATE_LIMIT/);});
test('GAS revalidates tampered payload',()=>{for(const patch of [{unit:'FAKE'},{date:'2099-02-31'},{task:'other',other:''},{maps:'https://google.com.evil.test/'},{consent:false}]){const h=harness();assert.throws(()=>h.api.submit_({...h.request,order:{...order,...patch}}),/VALIDATION/);assert.equal(h.state.submitCalls,0);}});

test('gateway also treats blank whitespace and dash locations as absent',()=>{for(const maps of ['', '   ', '-', ' - ', '–', '—']){const h=harness();const result=h.api.submit_({...h.request,order:{...order,maps}});assert.equal(result.state,'synced');assert.equal(h.api.find_(h.request.id).payload.maps,'');}});
test('retry normalizes dash and blank to the same idempotent payload',()=>{const h=harness();h.api.submit_({...h.request,order:{...order,maps:'-'}});h.api.submit_({...h.request,order:{...order,maps:''}});assert.equal(h.state.submitCalls,1);});

test('actual form checkbox task and owner produce single-choice arrays',()=>{for(const owner of ['YA','TIDAK']){const h=harness();h.items[4].getType=()=> 'CHECKBOX';h.items[6].getType=()=> 'CHECKBOX';const result=h.api.submit_({...h.request,order:{...order,owner}});assert.equal(result.state,'synced');assert.equal(JSON.stringify(h.responses[0].getResponseForItem(h.items[4]).getResponse()),JSON.stringify(['Pasang banner']));assert.equal(JSON.stringify(h.responses[0].getResponseForItem(h.items[6]).getResponse()),JSON.stringify([owner]));}});

test('free-text agent identity is submitted exactly as typed and remains idempotent',()=>{const h=harness();const request={...h.request,order:{...order,name:'Rahmat / ABCD',code:'',address:'Blok A1'}};assert.equal(h.api.submit_(request).state,'synced');assert.equal(h.responses[0].getResponseForItem(h.items[0]).getResponse(),'Rahmat / ABCD');h.api.submit_(request);assert.equal(h.state.submitCalls,1);});

test('direct doPost without APPS_SCRIPT_SECRET or LEDGER_SPREADSHEET_ID submits to 7-question Google Form and prevents duplicates',()=>{
 const h=harness();
 delete h.props.APPS_SCRIPT_SECRET;
 delete h.props.LEDGER_SPREADSHEET_ID;
 delete h.props.ITEM_MAP_JSON;
 delete h.props.PUBLIC_EMAIL_POLICY_APPROVED;
 const defaultEntries=Object.values(h.api.itemMap_()) as Array<{id:number;title:string}>;
 const sevenTypes=['TEXT','LIST','DATE','PARAGRAPH_TEXT','CHECKBOX','PARAGRAPH_TEXT','CHECKBOX'];
 const sevenItems=defaultEntries.map((entry,i)=>{
  const item:any={
   getId:()=>entry.id,
   getTitle:()=>entry.title,
   getType:()=>sevenTypes[i],
   isRequired:()=>i!==5,
   includesYear:()=>true,
   hasOtherOption:()=>true,
   getChoices:()=>i===1?[{getValue:()=>'VISION'}]:i===4?[{getValue:()=>'Pasang banner'}]:i===6?[{getValue:()=>'YA'},{getValue:()=>'TIDAK'}]:[],
   createResponse:(value:unknown)=>({getItem:()=>item,getResponse:()=>value})
  };
  for(const m of ['asTextItem','asListItem','asDateItem','asParagraphTextItem','asMultipleChoiceItem','asCheckboxItem'])item[m]=()=>item;
  return item;
 });
 h.items.splice(0,h.items.length,...sevenItems);
 (h.api.FormApp as any).openById=()=>({
  getItems:()=>sevenItems,
  getItemById:(id:number)=>sevenItems.find(it=>it.getId()===id)||null,
  isAcceptingResponses:()=>true,
  getResponses:()=>h.responses,
  createResponse:()=>{
   const answers:any[]=[];
   const response:any={
    withItemResponse:(a:any)=>{answers.push(a);return response;},
    getId:()=>response.id,
    getResponseForItem:(item:any)=>answers.find(a=>a.getItem().getId()===item.getId())??null,
    submit:()=>{h.state.submitCalls++;response.id='gf-7q-'+h.state.submitCalls;h.responses.push(response);return response;}
   };
   return response;
  }
 });

 const res1=h.api.doPost({postData:{contents:JSON.stringify({action:'submit',data:h.request})}});
 assert.equal(res1.ok,true);
 assert.equal(res1.data.state,'synced');
 assert.equal(res1.data.responseId,'gf-7q-1');
 assert.equal(h.state.submitCalls,1);

 // Duplicate submission with same ID returns existing synced response without re-submitting
 const res2=h.api.doPost({postData:{contents:JSON.stringify({action:'submit',data:h.request})}});
 assert.equal(res2.ok,true);
 assert.equal(res2.data.responseId,'gf-7q-1');
 assert.equal(h.state.submitCalls,1);
});

test('openForm_ rejects public responder ID starting with 1FAIpQL',()=>{
 const h=harness();
 h.props.FORM_ID='1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg';
 assert.throws(()=>h.api.openForm_(),/PUBLIC_FORM_ID_NOT_ALLOWED/);
});

