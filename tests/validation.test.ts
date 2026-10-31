import test from 'node:test';
import assert from 'node:assert/strict';
import {orderSchema,receiptSchema} from '../src/lib/submission';
import {sameSecret,signature,requireAdmin,checkOrigin,readBody} from '../src/lib/server/bridge';
const valid={email:'agent@example.test',name:'Agent Contoh',code:'TEST',unit:'VISION',date:'2099-01-01',address:'Jalan Contoh Blok A 12',maps:'',task:'documents',other:'',owner:'TIDAK',consent:true};
test('valid public order does not require login and allows owner pending',()=>assert.equal(orderSchema.safeParse(valid).success,true));
test('reject missing, invalid unit, past date, invalid calendar date and consent',()=>{for(const patch of [{name:''},{unit:'FAKE'},{date:'2000-01-01'},{date:'2099-02-31'},{consent:false},{email:'invalid'},{task:'other',other:''}])assert.equal(orderSchema.safeParse({...valid,...patch}).success,false);});
test('unknown fields cannot smuggle role or payment approvals',()=>assert.equal(orderSchema.safeParse({...valid,role:'admin'}).success,false));
test('invalid map schemes and spoofed hosts rejected',()=>{for(const maps of ['javascript:alert(1)','https://maps.google.com.evil.test','http://google.com'])assert.equal(orderSchema.safeParse({...valid,maps}).success,false);});
test('receipt token requires 256-bit random hexadecimal value shape',()=>assert.equal(receiptSchema.safeParse({id:'any',token:'short'}).success,false));
test('signature binds timestamp nonce and request body',()=>{assert.notEqual(signature('secret',1,'a','{}'),signature('secret',1,'a','{"action":"admin"}'));assert.equal(sameSecret('a','a'),true);assert.equal(sameSecret('ab','a'),false);});
test('admin and origin authorization fail closed',()=>{const prevToken=process.env.ADMIN_ACCESS_TOKEN,prevOrigin=process.env.APP_ORIGIN;try{process.env.ADMIN_ACCESS_TOKEN='a'.repeat(64);process.env.APP_ORIGIN='https://site.example';assert.throws(()=>requireAdmin(new Request('https://site.example/api/admin')),/UNAUTHORIZED/);assert.throws(()=>checkOrigin(new Request('https://site.example',{headers:{origin:'https://evil.example'}})),/ORIGIN/);}finally{if(prevToken===undefined)delete process.env.ADMIN_ACCESS_TOKEN;else process.env.ADMIN_ACCESS_TOKEN=prevToken;if(prevOrigin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=prevOrigin;}});
test('oversized JSON is rejected even without content-length',async()=>{await assert.rejects(readBody(new Request('https://site.example',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({large:'x'.repeat(17000)})})),/TOO_LARGE/);});

test('optional location accepts empty whitespace and dash without requiring https',()=>{for(const maps of ['', '   ', '-', ' - ', '–', '—']){const p=orderSchema.safeParse({...valid,maps});assert.equal(p.success,true);if(p.success)assert.equal(p.data.maps,'');}});
test('optional location preserves valid Maps link and rejects non-link text',()=>{const maps='https://maps.app.goo.gl/example';assert.equal(orderSchema.parse({...valid,maps}).maps,maps);assert.equal(orderSchema.safeParse({...valid,maps:'bukan tautan'}).success,false);});
