import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../lib/game.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {PuddingGame,GAPS,BLOCKS,WORLD_END,FLOOR}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let count=0;function test(name,fn){fn();console.log('PASS',name);count++}
function make(seed=42){let n=seed;return new PuddingGame(()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296})}
function road(g){g.phase='travel';g.travelStarted=true;g.done.fill(true)}
test('a new day starts at 09:00 asleep',()=>{const g=make();g.start(1000);assert.equal(g.minute,540);assert.equal(g.activity,'sleep');assert.equal(g.nextStep,0)});
test('11:00 wakes once and preserves preparation',()=>{const g=make();g.start(0);g.done[1]=true;g.tick(60000,.016);assert.equal(g.done[0],true);assert.equal(g.done[1],true);assert.equal(g.pending,0);g.tick(62000,.016);assert.equal(g.pending,-1);g.tick(62500,.016);assert.equal(g.done[1],true)});
test('one wake switch automatically starts brushing and ignores duplicate input',()=>{const g=make();g.start(0);g.switchOn=true;assert.equal(g.motivation(),true);assert.equal(g.motivation(),false);g.tick(2400,.016);assert.deepEqual(g.done,[true,false,false,false,false]);assert.equal(g.activity,'brush');assert.equal(g.pending,1);assert.equal(g.switchOn,false);assert.equal(g.motivation(),false);g.tick(4800,.016);assert.deepEqual(g.done,[true,true,false,false,false]);assert.equal(g.nextStep,2);assert.equal(g.activity,'idle');assert.equal(g.streams,0)});
test('11:00 automatic wake also completes brushing without any clicks',()=>{const g=make();g.start(0);g.tick(60000,.016);assert.equal(g.activity,'wake');g.tick(61600,.016);assert.equal(g.activity,'brush');assert.equal(g.switchOn,false);g.tick(64000,.016);assert.deepEqual(g.done,[true,true,false,false,false]);assert.equal(g.nextStep,2)});
test('second sleep preserves completed brushing and hair',()=>{const g=new PuddingGame(()=>0);g.start(0);g.done=[true,true,true,false,false];g.activity='idle';g.idleUntil=0;g.tick(1000,.016);assert.equal(g.activity,'sleep');assert.deepEqual(g.done,[false,true,true,false,false]);g.switchOn=true;g.motivation();g.tick(3400,.016);assert.equal(g.nextStep,3)});
test('idle distraction never interrupts automatic brushing',()=>{const g=make();g.start(0);g.switchOn=true;g.idleUntil=0;g.motivation();g.tick(2400,.016);g.tick(4000,.016);assert.equal(g.activity,'brush');assert.equal(g.streams,0);assert.equal(g.sleeps,0);assert.equal(g.switchOn,false)});
test('streaming ends and allows another switch',()=>{const g=make();g.start(0);g.activity='idle';g.done[0]=g.done[1]=true;g.autoWoke=true;g.idleUntil=0;g.tick(100000,.016);assert.equal(g.activity,'stream');g.tick((g.activityUntil+.1)*1000,.016);assert.equal(g.activity,'idle');assert.equal(g.streams,1)});
test('16:00 extends an active switch without relocating it',()=>{const g=make();g.start(0);g.done[0]=true;g.autoWoke=true;g.idleUntil=999;g.switchOn=true;g.switchUntil=211;g.switchX=.3;g.switchY=.4;g.tick(210000,.016);assert.equal(g.late,true);assert.equal(g.switchUntil,212.4);assert.equal(g.switchX,.3);assert.equal(g.switchY,.4)});
test('touch switches remain stationary and disappear before the late-day boost',()=>{const g=make();g.touchFriendly=true;g.start(0);assert.equal(g.touchFriendly,true);g.tick(2000,.016);assert.equal(g.switchOn,true);const x=g.switchX,y=g.switchY,duration=g.switchUntil-g.age;assert.ok(duration>=1.15&&duration<=1.5);g.tick(2600,.016);assert.equal(g.switchX,x);assert.equal(g.switchY,y);g.tick(3600,.016);assert.equal(g.switchOn,false);assert.equal(g.late,false)});
test('sleep and idle show an advance gesture, then a different reaction on expiry',()=>{
 const lines=[];
 for(const activity of ['sleep','idle']){
  const g=make();g.start(0);
  if(activity==='idle'){g.done[0]=g.done[1]=true;g.activity='idle';}
  g.tick(500,.016);assert.equal(g.observationPose,'rest');
  g.tick(1400,.016);assert.equal(g.observationPose,'notice');assert.equal(g.motivation(),false);
  g.tick(1800,.016);assert.equal(g.switchOn,true);
  const end=g.switchUntil;
  g.tick((end+.01)*1000,.016);assert.equal(g.switchOn,false);assert.equal(g.observationPose,'dismiss');
  lines.push(g.quote);assert.match(g.quote,/のじゃ。/);
  g.tick((end+.7)*1000,.016);assert.equal(g.observationPose,'rest');
 }
 assert.notEqual(lines[0],lines[1]);
});
test('stream looks up before a real switch; tapping leaves for the next unfinished step',()=>{
 const g=make();g.start(0);g.tick(60_000,.016);g.tick(61_600,.016);g.tick(64_000,.016);
 g.tick((g.idleUntil+.01)*1000,.016);assert.equal(g.activity,'stream');
 const opens=g.nextSwitch;
 g.tick((opens-.3)*1000,.016);assert.equal(g.observationPose,'notice');
 g.tick((opens+.01)*1000,.016);assert.equal(g.switchOn,true);assert.equal(g.motivation(),true);
 assert.equal(g.activity,'hair');assert.equal(g.motivation(),false);
});
test('stream dismissal has time to read before the next distraction; late cues remain visible',()=>{
 const g=new PuddingGame(()=>.5);g.start(0);g.done[0]=g.done[1]=true;g.activity='idle';g.autoWoke=true;g.idleUntil=209;
 g.tick(210_000,.016);assert.equal(g.late,true);assert.equal(g.activity,'stream');
 g.tick((g.nextSwitch-.3)*1000,.016);assert.equal(g.observationPose,'notice');
 g.tick((g.nextSwitch+.01)*1000,.016);assert.equal(g.switchOn,true);
 g.tick((g.switchUntil+.01)*1000,.016);assert.equal(g.observationPose,'dismiss');assert.match(g.quote,/配信/);
 g.tick((g.nextSwitch-.2)*1000,.016);
 assert.equal(g.activity,'stream');assert.equal(g.observationPose,'notice');
});
test('an idle distraction does not remove an already visible switch',()=>{
 const g=make();g.start(0);g.activity='idle';g.done[0]=g.done[1]=true;g.idleUntil=2;
 g.tick(1800,.016);assert.equal(g.switchOn,true);g.tick(2050,.016);assert.equal(g.activity,'idle');
 assert.equal(g.motivation(),true);assert.equal(g.activity,'hair');
});
test('collisions penalize once and restore safe checkpoint',()=>{const g=make();g.start(0);road(g);g.x=640;g.collision();g.collision();assert.equal(g.penalties,4);assert.equal(g.hits,1);assert.equal(g.x,80);assert.equal(g.y,FLOOR)});
test('deadline applies during every unfinished activity and hidden-tab time jump',()=>{for(const activity of ['sleep','stream','wake','brush','hair','dress','depart']){const g=make();g.start(1000);g.activity=activity;g.tick(271000,.016);assert.equal(g.phase,'lost',activity)}const g=make();g.start(0);road(g);g.x=WORLD_END;g.tick(270000,.016);assert.equal(g.phase,'lost')});
test('collision penalty can cross the deadline immediately',()=>{const g=make();g.start(0);road(g);g.age=269;g.minute=1078;g.collision();assert.equal(g.phase,'lost')});
test('restart resets clock, progress, distractions, movement and penalties',()=>{const g=make();g.start(0);road(g);g.penalties=40;g.hits=10;g.streams=8;g.start(999999);assert.equal(g.minute,540);assert.equal(g.x,80);assert.equal(g.hits,0);assert.equal(g.streams,0);assert.equal(g.phase,'prep');assert.equal(g.startedAt,999999)});
test('late start is winnable with real switch timings and all obstacles',()=>{
 for(let seed=1;seed<=20;seed++){
  const g=make(seed);g.touchFriendly=seed%2===0;g.start(0);let time=0;
  while(g.active&&time<271){time+=1/60;const jump=g.phase==='travel'&&g.grounded&&(BLOCKS.some(b=>b.x-g.x>0&&b.x-g.x<75)||GAPS.some(b=>b.x-g.x>0&&b.x-g.x<30));g.tick(time*1000,1/60,{left:false,right:g.phase==='travel',jump});if(time>=210&&g.switchOn)g.motivation();}
  assert.equal(g.phase,'won',`seed ${seed}, x ${g.x}, hits ${g.hits}, time ${g.minute}`);assert.equal(g.hits,0,`clean route ${seed}`);
 }
});
console.log(`${count} tests passed; 20 seeded full late-start playthroughs cleared.`);
