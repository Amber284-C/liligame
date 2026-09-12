import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../lib/controls.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {GameControls}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let count=0;function test(name,fn){fn();console.log('PASS',name);count++}
test('two thumbs can hold right and jump at the same time',()=>{const c=new GameControls();c.pressPointer(1,'right');c.pressPointer(2,'jump');assert.deepEqual(c.consume(),{left:false,right:true,jump:true});c.releasePointer(2);assert.deepEqual(c.consume(),{left:false,right:true,jump:false});c.releasePointer(1);assert.equal(c.consume().right,false)});
test('a jump tap released before the next frame is not lost',()=>{const c=new GameControls();c.pressPointer(1,'jump');c.releasePointer(1);assert.equal(c.consume().jump,true);assert.equal(c.consume().jump,false)});
test('releasing one finger does not cancel another finger on the same direction',()=>{const c=new GameControls();c.pressPointer(1,'right');c.pressPointer(2,'right');c.releasePointer(1);assert.equal(c.consume().right,true);c.releasePointer(2);assert.equal(c.consume().right,false)});
test('keyboard and touch holds do not cancel each other',()=>{const c=new GameControls();c.pressKey('KeyD');c.pressPointer(1,'right');c.releasePointer(1);assert.equal(c.consume().right,true);c.releaseKey('KeyD');assert.equal(c.consume().right,false)});
test('held jump keys never queue automatic repeat jumps',()=>{const c=new GameControls();c.pressKey('Space');assert.equal(c.consume().jump,true);c.pressKey('Space');assert.equal(c.consume().jump,false);c.releaseKey('Space');c.pressKey('Space');assert.equal(c.consume().jump,true)});
test('help, focus loss and hidden tabs clear all pending input',()=>{const c=new GameControls();c.pressKey('ArrowLeft');c.pressPointer(1,'right');c.pressPointer(2,'jump');c.clear();assert.deepEqual(c.consume(),{left:false,right:false,jump:false})});
test('unrelated keyboard input is not captured',()=>{const c=new GameControls();assert.equal(c.pressKey('KeyQ'),false);assert.deepEqual(c.consume(),{left:false,right:false,jump:false})});
console.log(`${count} input tests passed.`);
