import test from 'node:test';
import assert from 'node:assert/strict';
import {agentFormSchema} from '../src/lib/agent-form';
const input={nameCode:'Rahmat ABCD',email:'test@example.com',unit:'AKASIA',date:'2099-01-01',address:'Blok A 1',maps:'-',task:'other',other:'Uji integrasi',owner:'YA',consent:true};
test('agent identity accepts free text and preserves punctuation without requiring parentheses',()=>{for(const nameCode of ['Rahmat ABCD','Rahmat - ABCD','Rahmat / ABCD','Rahmat (ABCD)','Rahmat']){const result=agentFormSchema.parse({...input,nameCode});assert.equal(result.name,nameCode);assert.equal(result.code,'');assert.equal(result.maps,'');assert.equal('nameCode' in result,false);}});
test('required data and actual email remain validated',()=>{for(const patch of [{nameCode:''},{email:'invalid'},{other:''},{date:'2000-01-01'}])assert.equal(agentFormSchema.safeParse({...input,...patch}).success,false);assert.equal(agentFormSchema.safeParse({...input,email:'  Agent+order@example.com  '}).success,true);});
