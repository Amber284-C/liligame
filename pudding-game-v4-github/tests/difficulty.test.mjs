import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../lib/game.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {PuddingGame}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let count=0;function test(name,fn){fn();console.log('PASS',name);count++}
function road(difficulty='troll'){const g=new PuddingGame(()=>.5);g.setDifficulty(difficulty);g.start(0);g.phase='travel';g.travelStarted=true;g.done.fill(true);return g}
function step(g,n=1,right=true,jump=false){for(let i=0;i<n&&g.active;i++)g.tick((g.age+1/60)*1000,1/60,{left:false,right,jump:jump&&i===0})}
function trap(g,kind){return g.traps.find(t=>t.kind===kind)}
test('difficulty selection is safe by default, validated and locked during play',()=>{
 const g=new PuddingGame();assert.equal(g.difficulty,'normal');g.tick(999999,1);assert.equal(g.minute,540);
 for(const invalid of ['',null,'easy',1,{}])assert.throws(()=>g.setDifficulty(invalid));
 g.setDifficulty('troll');g.touchFriendly=true;g.start(1000);assert.equal(g.snapshot().difficultyName,'鬼畜');assert.throws(()=>g.setDifficulty('normal'));
 g.phase='lost';g.start(2000);assert.equal(g.difficulty,'troll');assert.equal(g.touchFriendly,true);
 g.phase='won';g.setDifficulty('normal');g.start(3000);assert.equal(g.difficulty,'normal');
});
test('hard miss costs ten minutes, restores checkpoint and remembers discovered traps',()=>{
 const g=road();g.checkpoint=2510;g.x=2900;const t=trap(g,'ambush');t.armed=t.seen=true;t.elapsed=.4;g.collision('プリンが飛んできた！');
 assert.equal(g.penalties,10);assert.equal(g.x,2510);assert.equal(t.armed,false);assert.equal(t.seen,true);assert.equal(t.elapsed,0);assert.equal(g.hits,1);
 step(g,10);assert.equal(g.x,2510);g.collision();assert.equal(g.hits,1);assert.ok(g.age>0);g.phase='lost';g.start(1234);assert.ok(g.traps.every(t=>!t.armed&&!t.seen));assert.equal(g.hits,0);
});
test('hard penalty still enforces the 18:00 deadline immediately',()=>{const g=road();g.age=266;g.collision();assert.equal(g.phase,'lost');assert.equal(g.minute,1080)});
test('falling pudding punishes rushing but can be baited by waiting',()=>{
 const g=road();g.x=390;step(g,50);assert.equal(g.hits,1);assert.match(g.lastFailure,/降って/);
 const safe=road();safe.x=390;step(safe,60,false);step(safe,50);assert.equal(safe.hits,0);
});
test('hidden block cancels the usual jump and becomes visible',()=>{const g=road();g.x=1100;step(g,10,true,true);assert.equal(trap(g,'ceiling').seen,true);assert.ok(g.vy>=0);step(g,60);assert.equal(g.hits,1)});
test('pavement collapses under a walker and reset retains a crack hint',()=>{const g=road();g.x=1760;step(g,40);assert.equal(g.hits,1);assert.equal(trap(g,'crumble').seen,true);assert.equal(trap(g,'crumble').armed,false)});
test('flying pudding catches a jump while a grounded player can let it pass',()=>{
 const g=road();g.x=2680;step(g,12);step(g,30,true,true);assert.equal(g.hits,1);assert.match(g.lastFailure,/飛んで/);
 const safe=road();safe.x=2680;step(safe,75,false);assert.equal(safe.hits,0);assert.ok(safe.trapBounds(trap(safe,'ambush')).x<safe.x);
});
test('hidden spikes punish walking but a timed jump clears them',()=>{
 const g=road();g.x=3370;step(g,40);assert.equal(g.hits,1);assert.match(g.lastFailure,/トゲ/);
 const safe=road();safe.x=3390;step(safe,48,true,true);assert.equal(safe.hits,0);assert.ok(safe.x>3516);
});
test('fake goal opens a pit, never awards a win, and can be jumped',()=>{
 const g=road();g.x=4800;step(g,40);assert.equal(g.phase,'travel');assert.equal(g.hits,1);assert.equal(trap(g,'fake-goal').seen,true);
 const safe=road();safe.x=4800;step(safe,50,true,true);assert.equal(safe.hits,0);assert.equal(safe.phase,'travel');step(safe,45);assert.equal(safe.phase,'won');
});
test('normal mode contains no hidden traps and keeps the four-minute penalty',()=>{
 for(const x of [390,1100,1760,2680,3370,4800]){const g=road('normal');g.x=x;step(g,10,false);assert.ok(g.traps.every(t=>!t.armed&&!t.seen));assert.equal(g.floorMissing(1830),false);assert.equal(g.floorMissing(4870),false)}
 const g=road('normal');g.collision();assert.equal(g.penalties,4);
});
// A practiced route uses only the same move/jump inputs as a player, with fixed
// jump landmarks and two waits. No state overrides or invincibility after start.
const jumpAt=[556,1060,1475,1720,1900,2293,2746,3196,3390,3583,3866,4373,4610,4800];
function learnedInput(g){
 const wait=(g.x>=390&&g.x<410&&trap(g,'falling').elapsed<1)||(g.x>=2680&&g.x<2700&&trap(g,'ambush').elapsed<1.2);
 const jump=g.grounded&&jumpAt.some(x=>g.x>=x&&g.x<x+18);
 return {left:false,right:!wait,jump};
}
test('the hard route is beatable with mobile frame rates after waiting until 16:00',()=>{
 for(const fps of [30,60])for(let seed=1;seed<=10;seed++){
  let n=seed;const g=new PuddingGame(()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296});g.setDifficulty('troll');g.touchFriendly=true;g.start(0);
  let time=0;
  while(g.active&&time<271){time+=1/fps;g.tick(time*1000,1/fps,g.phase==='travel'?learnedInput(g):{left:false,right:false,jump:false});if(time>=210&&g.switchOn)g.motivation();}
  assert.equal(g.phase,'won',`${fps}fps seed ${seed}: x=${g.x}, hits=${g.hits}, reason=${g.lastFailure}, minute=${g.minute}`);assert.equal(g.hits,0,`${fps}fps seed ${seed}: ${g.lastFailure}`);
 }
});
console.log(`${count} difficulty tests passed; 20 full hard-mode playthroughs cleared.`);
