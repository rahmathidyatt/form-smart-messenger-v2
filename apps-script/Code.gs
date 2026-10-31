/** Server-to-server gateway. Install under the authorized Form owner's account.
 * No end-user login. Never expose script properties, ledger or response edit URLs.
 */
const RECORD_HEADERS = ['request_id', 'sync_status', 'record_json'];
const AUDIT_HEADERS = ['at_utc', 'request_id', 'event', 'actor'];
const MAX_ATTEMPTS = 5;
const CONSENT_VERSION = '2026-10-18-v2';
function prop_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }
function must_(key) { const value = prop_(key); if (!value) fail_('CONFIG'); return value; }
function fail_(code) { const error = new Error(code); error.code = code; throw error; }
function now_() { return new Date().toISOString(); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function hex_(bytes) { return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join(''); }
function hash_(text) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)); }
function equal_(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff === 0; }
function authenticate_(envelope) {
 const key = must_('APPS_SCRIPT_SECRET');
 if(key.length<32 || typeof envelope.body!=='string' || envelope.body.length>14000 || !Number.isSafeInteger(envelope.ts) || Math.abs(Date.now()-envelope.ts)>300000 || !/^[a-f0-9-]{36}$/.test(envelope.nonce || '')) fail_('UNAUTHORIZED');
 const signature = hex_(Utilities.computeHmacSha256Signature(envelope.ts+'.'+envelope.nonce+'.'+envelope.body,key,Utilities.Charset.UTF_8));
 if(!equal_(signature,envelope.signature)) fail_('UNAUTHORIZED');
 const cache=CacheService.getScriptCache(); if(cache.get('nonce:'+envelope.nonce)) fail_('UNAUTHORIZED');
 cache.put('nonce:'+envelope.nonce,'1',600);
 return JSON.parse(envelope.body);
}
function doPost(e) {
 let lock;
 try {
  if(!e || !e.postData || e.postData.contents.length>18000) fail_('VALIDATION');
  const request=authenticate_(JSON.parse(e.postData.contents));
  lock=LockService.getScriptLock(); if(!lock.tryLock(2000)) fail_('BUSY');
  let data;
  if(request.action==='submit') data=submit_(request.data);
  else if(request.action==='status') data=status_(request.data);
  else if(request.action==='dashboard') data=dashboard_();
  else if(request.action==='ack') { const r=find_(request.data.id);if(!r)fail_('NOT_FOUND');r.read=true;save_(r);audit_(r.id,'notification_read','admin');data={ok:true}; }
  else if(request.action==='retry') { const r=find_(request.data.id);if(!r)fail_('NOT_FOUND');if(r.state==='needs_review'||r.state==='submitting')reconcile_(r);else if(['failed','retry_wait'].includes(r.state)){r.state='queued';r.attempts=0;r.nextAttempt=0;save_(r);sync_(r);}audit_(r.id,'manual_retry_or_reconcile','admin');data=public_(r); }
  else fail_('VALIDATION');
  return json_({ok:true,data:data});
 } catch(error) {return json_({ok:false,code:error.code||'UNAVAILABLE'});}
 finally {if(lock && lock.hasLock())lock.releaseLock();}
}
function receipt_(d) { if(!d || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.id||'') || !/^[a-f0-9]{64}$/.test(d.token||''))fail_('VALIDATION'); }
function text_(v,min,max) { if(typeof v!=='string'||v.trim().length<min||v.length>max)fail_('VALIDATION');return v.trim(); }
function validate_(raw,checkDate) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail_('VALIDATION');
 const keys=['email','name','code','unit','date','address','maps','task','other','owner','consent'];
 if(Object.keys(raw).some(k=>!keys.includes(k))||Object.keys(raw).length!==keys.length)fail_('VALIDATION');
 const d={email:text_(raw.email,3,254).toLowerCase(),name:text_(raw.name,1,180),code:text_(raw.code,0,30),unit:text_(raw.unit,1,50),date:text_(raw.date,10,10),address:text_(raw.address,1,1500),maps:text_(raw.maps,0,1000),task:text_(raw.task,1,30),other:text_(raw.other,0,1000),owner:raw.owner,consent:raw.consent};
 if(/^[-–—]+$/.test(d.maps))d.maps='';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^[-a-zA-Z0-9]*$/.test(d.code)||!UNITS.includes(d.unit)||!Object.prototype.hasOwnProperty.call(SERVICES,d.task)||!['YA','TIDAK'].includes(d.owner)||d.consent!==true)fail_('VALIDATION');
 const date=new Date(d.date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.date)fail_('VALIDATION');
 if(checkDate&&d.date<Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd'))fail_('VALIDATION');
 if(d.task==='other'&&!d.other)fail_('VALIDATION');
 if(d.maps&&!/^https:\/\/(maps\.app\.goo\.gl|maps\.google\.com|www\.google\.com|google\.com|goo\.gl)([/?#]|$)/i.test(d.maps))fail_('VALIDATION');
 return d;
}
function book_() {return SpreadsheetApp.openById(must_('LEDGER_SPREADSHEET_ID'));}
function sheet_(name) {const sheet=book_().getSheetByName(name);if(!sheet)fail_('CONFIG');return sheet;}
function records_() {const s=sheet_('Submissions');if(s.getLastRow()<2)return [];return s.getRange(2,3,s.getLastRow()-1,1).getValues().map((row,i)=>{const r=JSON.parse(row[0]);r._row=i+2;return r;});}
function find_(id) {return records_().find(r=>r.id===id)||null;}
function save_(r) {r.updatedAt=now_();const s=sheet_('Submissions');const copy=Object.assign({},r);delete copy._row;const values=[[r.id,r.state,JSON.stringify(copy)]];if(r._row)s.getRange(r._row,1,1,3).setValues(values);else{r._row=s.getLastRow()+1;s.getRange(r._row,1,1,3).setValues(values);}SpreadsheetApp.flush();}
function audit_(id,event,actor) {sheet_('Audit').appendRow([now_(),id,event,actor]);SpreadsheetApp.flush();}
function public_(r) {return {id:r.id,state:r.state,responseId:r.responseId||null,updatedAt:r.updatedAt};}
function status_(d) {receipt_(d);const r=find_(d.id);if(!r||!equal_(r.tokenHash,hash_(d.token)))fail_('NOT_FOUND');return public_(r);}
function submit_(d) {
 receipt_(d);
 // A stored request is compared without today's date gate, so yesterday's retry is still idempotent.
 const payload=validate_(d.order,false),digest=hash_(JSON.stringify(payload));
 const existing=find_(d.id);
 if(existing){if(!equal_(existing.tokenHash,hash_(d.token))||!equal_(existing.payloadHash,digest))fail_('CONFLICT');return public_(existing);}
 validate_(payload,true);
 const all=records_(),recent=all.filter(r=>Date.now()-Date.parse(r.createdAt)<900000);
 if(all.length>=5000||recent.length>=60||recent.filter(r=>r.payload.email===payload.email).length>=5)fail_('RATE_LIMIT');
 const r={id:d.id,tokenHash:hash_(d.token),payloadHash:digest,payload:payload,state:'queued',createdAt:now_(),updatedAt:now_(),attempts:0,nextAttempt:0,responseId:null,lastCode:'',read:false,notifications:{email:{state:'pending',attempts:0,nextAttempt:0},whatsapp:{state:'pending',attempts:0,nextAttempt:0}}};
 save_(r);audit_(r.id,'received','public_form');sync_(r);return public_(r);
}
function normalize_(s) {return String(s).trim().replace(/\s+/g,' ');}
function itemMap_() {let m;try{m=JSON.parse(must_('ITEM_MAP_JSON'));}catch{fail_('CONFIG');}const keys=['name_code','unit','date','address','task','other','owner','email','request_id','details'];if(keys.some(k=>!m[k]||!Number.isSafeInteger(m[k].id)||typeof m[k].title!=='string')||new Set(keys.map(k=>m[k].id)).size!==keys.length)fail_('CONFIG');return m;}
function item_(form,entry) {const item=form.getItemById(entry.id);if(!item||normalize_(item.getTitle())!==normalize_(entry.title))fail_('FORM_SCHEMA');return item;}
function cast_(item) {switch(String(item.getType())){case 'TEXT':return item.asTextItem();case 'PARAGRAPH_TEXT':return item.asParagraphTextItem();case 'LIST':return item.asListItem();case 'MULTIPLE_CHOICE':return item.asMultipleChoiceItem();case 'CHECKBOX':return item.asCheckboxItem();case 'DATE':return item.asDateItem();default:fail_('FORM_SCHEMA');}}
function responseFor_(item,value) {
 const type=String(item.getType()),typed=cast_(item);
 if(type==='DATE'){if(!typed.includesYear())fail_('FORM_SCHEMA');return typed.createResponse(new Date(value+'T12:00:00+07:00'));}
 if(['LIST','MULTIPLE_CHOICE','CHECKBOX'].includes(type)){
  const allowed=typed.getChoices().map(c=>c.getValue());
  if(!allowed.includes(value)&&!(value===SERVICES.other&&typeof typed.hasOtherOption==='function'&&typed.hasOtherOption()))fail_('FORM_SCHEMA');
  return typed.createResponse(type==='CHECKBOX'?[value]:value);
 }
 return typed.createResponse(value);
}
function buildResponse_(r) {
 if(Session.getScriptTimeZone()!=='Asia/Jakarta')fail_('CONFIG');
 if(prop_('PUBLIC_EMAIL_POLICY_APPROVED')!=='true')fail_('EMAIL_POLICY');
 const form=FormApp.openById(must_('FORM_ID')),mapping=itemMap_();
 if(!form.isAcceptingResponses())fail_('FORM_CLOSED');
 // Unmapped required questions and unsupported item types cannot silently lose data.
 const ids=Object.keys(mapping).map(k=>mapping[k].id);
 form.getItems().forEach(item=>{const type=String(item.getType());if(['IMAGE','VIDEO','PAGE_BREAK','SECTION_HEADER'].includes(type))return;const typed=cast_(item);if(typed.isRequired()&&!ids.includes(item.getId()))fail_('FORM_SCHEMA');});
 const p=r.payload;
 const fields={name_code:p.code?p.name+' ('+p.code+')':p.name,unit:p.unit,date:p.date,address:p.address,task:SERVICES[p.task],other:p.other,owner:p.owner,email:p.email,request_id:r.id,details:JSON.stringify({source:'website',maps:p.maps,consent:true,consentVersion:CONSENT_VERSION,emailVerification:'self_declared',receivedAt:r.createdAt})};
 let response=form.createResponse();
 Object.keys(fields).forEach(key=>{const item=item_(form,mapping[key]),type=String(item.getType());
  const expected={name_code:['TEXT','PARAGRAPH_TEXT'],unit:['LIST','MULTIPLE_CHOICE'],date:['DATE'],address:['TEXT','PARAGRAPH_TEXT'],task:['LIST','MULTIPLE_CHOICE','CHECKBOX'],other:['TEXT','PARAGRAPH_TEXT'],owner:['LIST','MULTIPLE_CHOICE','CHECKBOX'],email:['TEXT'],request_id:['TEXT'],details:['PARAGRAPH_TEXT']};
  if(!expected[key].includes(type))fail_('FORM_SCHEMA');
  if(fields[key]!=='' || cast_(item).isRequired())response=response.withItemResponse(responseFor_(item,fields[key]));
 });
 return response;
}
function markSynced_(r,responseId) {if(!responseId)fail_('MISSING_RESPONSE_ID');r.responseId=responseId;r.state='synced';r.lastCode='';save_(r);audit_(r.id,'form_synced','worker');}
function reconcile_(r) {
 try {
  const form=FormApp.openById(must_('FORM_ID')),ref=item_(form,itemMap_().request_id);
  const matches=form.getResponses(new Date(Date.parse(r.createdAt)-60000)).filter(response=>{const answer=response.getResponseForItem(ref);return answer&&String(answer.getResponse())===r.id;});
  if(matches.length===1){markSynced_(r,matches[0].getId());return;}
  r.state='needs_review';r.lastCode=matches.length>1?'DUPLICATE_FOUND':'SUBMISSION_UNCERTAIN';save_(r);audit_(r.id,r.lastCode,'worker');
 }catch{r.state='needs_review';r.lastCode='RECONCILE_FAILED';save_(r);}
}
function sync_(r) {
 if(r.state==='synced')return;
 if(['submitting','needs_review'].includes(r.state)){reconcile_(r);return;}
 if(!['queued','retry_wait'].includes(r.state)||r.nextAttempt>Date.now())return;
 r.attempts+=1;
 let response;
 try{validate_(r.payload,false);response=buildResponse_(r);}
 catch(error){r.lastCode=error.code||'PRE_SUBMIT_ERROR';r.state=r.attempts>=MAX_ATTEMPTS?'failed':'retry_wait';r.nextAttempt=Date.now()+Math.min(3600000,60000*Math.pow(2,r.attempts-1));save_(r);audit_(r.id,'pre_submit_failed','worker');return;}
 // This marker must be durable BEFORE the external side effect.
 r.state='submitting';save_(r);audit_(r.id,'form_submit_started','worker');
 try{const submitted=response.submit();markSynced_(r,submitted.getId());}
 catch{reconcile_(r);} // NEVER blindly submit again after an ambiguous external outcome.
}
function dashboard_(){return records_().slice(-100).reverse().map(r=>({id:r.id,state:r.state,responseId:r.responseId,createdAt:r.createdAt,read:r.read,name:r.payload.name,unit:r.payload.unit,date:r.payload.date,task:SERVICES[r.payload.task],lastCode:r.lastCode,notifications:r.notifications}));}
function notificationText_(r){return 'Pengajuan Smart Messenger telah tercatat di Google Form HRD.\nKode: '+r.id+'\nID respons: '+r.responseId+'\nTanggal permintaan: '+r.payload.date+'\nBuka dashboard operasional untuk detail.\nStatus ini bukan persetujuan pembayaran atau pengerjaan.';}
function notify_(r,channel) {
 if(r.state!=='synced')return;
 const n=r.notifications[channel];
 if(n.state==='sending'){n.state='needs_review';save_(r);audit_(r.id,channel+'_delivery_uncertain','worker');return;}
 if(!['pending','retry_wait'].includes(n.state)||n.nextAttempt>Date.now())return;
 let send;
 try {
  if(channel==='email'){
   const to=prop_('NOTIFY_EMAIL_TO');if(!to){n.state='disabled';save_(r);return;}
   const addresses=to.split(',').map(v=>v.trim());if(addresses.length>10||addresses.some(v=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))fail_('NOTIFY_CONFIG');
   if(MailApp.getRemainingDailyQuota()<addresses.length)fail_('EMAIL_QUOTA');
   send=()=>{MailApp.sendEmail({to:addresses.join(','),subject:'[Smart Messenger] '+r.id,body:notificationText_(r)});return {accepted:true,providerId:null};};
  }else{
   if(prop_('WHATSAPP_ENABLED')!=='true'){n.state='disabled';save_(r);return;}
   if(prop_('WHATSAPP_ELIGIBILITY_CONFIRMED')!=='true'||prop_('WHATSAPP_RECIPIENT_OPT_IN')!=='true')fail_('WHATSAPP_NOT_APPROVED');
   const version=must_('WHATSAPP_GRAPH_VERSION'),phone=must_('WHATSAPP_PHONE_NUMBER_ID'),to=must_('WHATSAPP_TO'),template=must_('WHATSAPP_TEMPLATE_NAME'),language=must_('WHATSAPP_TEMPLATE_LANGUAGE'),token=must_('WHATSAPP_ACCESS_TOKEN');
   if(!/^v\d+\.\d+$/.test(version)||!/^\d+$/.test(phone)||!/^\d{8,15}$/.test(to)||!/^\w+$/.test(template)||!/^\w+$/.test(language))fail_('NOTIFY_CONFIG');
   send=()=>{const res=UrlFetchApp.fetch('https://graph.facebook.com/'+version+'/'+phone+'/messages',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:to,type:'template',template:{name:template,language:{code:language},components:[{type:'body',parameters:[{type:'text',text:r.id},{type:'text',text:r.payload.date}]}]}}),muteHttpExceptions:true});const code=res.getResponseCode();if(code>=200&&code<300){const body=JSON.parse(res.getContentText());if(!body.messages||!body.messages[0]||!body.messages[0].id)fail_('DELIVERY_UNKNOWN');return {accepted:true,providerId:body.messages[0].id};}if(code===429)return {accepted:false,retry:true};if(code>=400&&code<500)return {accepted:false,retry:false};fail_('DELIVERY_UNKNOWN');};
  }
 }catch{n.attempts+=1;n.state=n.attempts>=MAX_ATTEMPTS?'failed':'retry_wait';n.nextAttempt=Date.now()+60000*Math.pow(2,n.attempts);save_(r);audit_(r.id,channel+'_pre_send_failed','worker');return;}
 n.state='sending';n.attempts+=1;save_(r);audit_(r.id,channel+'_sending','worker');
 try{const out=send();if(out.accepted){n.state='accepted';n.providerId=out.providerId||null;}else{n.state=out.retry&&n.attempts<MAX_ATTEMPTS?'retry_wait':'failed';n.nextAttempt=Date.now()+60000*Math.pow(2,n.attempts);}save_(r);audit_(r.id,channel+'_'+n.state,'worker');}
 catch{n.state='needs_review';save_(r);audit_(r.id,channel+'_delivery_uncertain','worker');}
}
function worker(){const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;const start=Date.now();try{const all=records_();for(const r of all){if(Date.now()-start>200000)break;if(['queued','retry_wait','submitting'].includes(r.state))sync_(r);if(r.state==='synced'){notify_(r,'email');notify_(r,'whatsapp');}}PropertiesService.getScriptProperties().setProperty('WORKER_LAST_SUCCESS',now_());}finally{lock.releaseLock();}}
/** Run once from the editor after configuring Script Properties. Does not change the Form. */
function setupLedger(){const lock=LockService.getScriptLock();lock.waitLock(5000);try{const book=book_();[['Submissions',RECORD_HEADERS],['Audit',AUDIT_HEADERS]].forEach(([name,headers])=>{let s=book.getSheetByName(name);if(!s){s=book.insertSheet(name);s.appendRow(headers);s.setFrozenRows(1);}else if(JSON.stringify(s.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))fail_('LEDGER_SCHEMA');});}finally{lock.releaseLock();}}
/** Read-only inventory. Run as owner; copy item IDs into ITEM_MAP_JSON. */
function inspectForm(){const f=FormApp.openById(must_('FORM_ID'));const items=f.getItems().map(i=>{const result={id:i.getId(),title:i.getTitle(),type:String(i.getType())};if(['LIST','MULTIPLE_CHOICE','CHECKBOX'].includes(result.type))result.choices=cast_(i).getChoices().map(c=>c.getValue());return result;});console.log(JSON.stringify({title:f.getTitle(),collectsEmail:f.collectsEmail(),items:items},null,2));}
function installWorker(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='worker').forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('worker').timeBased().everyMinutes(1).create();}
/** Validate mapping against every unit/service without submitting any response. */
function validateSetup(){
 const payload={email:'setup-check@example.invalid',name:'Uji Konfigurasi',code:'CHECK',unit:UNITS[0],date:'2099-01-01',address:'Alamat contoh untuk pemeriksaan konfigurasi',maps:'',task:'banner',other:'Pemeriksaan konfigurasi tanpa pengiriman',owner:'YA',consent:true};
 const r={id:Utilities.getUuid(),createdAt:now_(),payload:payload};
 UNITS.forEach(unit=>{r.payload.unit=unit;buildResponse_(r);});
 Object.keys(SERVICES).forEach(task=>{r.payload.task=task;buildResponse_(r);});
 ['YA','TIDAK'].forEach(owner=>{r.payload.owner=owner;buildResponse_(r);});
 if(must_('APPS_SCRIPT_SECRET').length<32)fail_('CONFIG');
 console.log('Mapping unit, layanan, tanggal, email manual, dan ID pengajuan valid. Tidak ada respons dikirim. Uji end-to-end masih diperlukan.');
}
