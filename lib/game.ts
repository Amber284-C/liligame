export type Phase = 'title'|'prep'|'travel'|'won'|'lost';
export type Activity = 'sleep'|'idle'|'wake'|'brush'|'hair'|'dress'|'depart'|'stream';
type WaitingActivity = 'sleep'|'idle'|'stream';
export type ObservationPose = 'rest'|'notice'|'dismiss';
export type ObservationFrame = ObservationPose|'tension'|'glance'|'feint-look'|'feint-action'|'feint-settle';
type MotivationBeat = {activity:WaitingActivity;dressed:boolean;at:number};
const SWITCH_CUE_SECONDS = .75;
const MOTIVATION_HOLD = .08;
const MISSED_SWITCH_LINES: Record<WaitingActivity, readonly string[]> = {
 sleep:['「今のは明日のわしに任せたのじゃ。」','「片目ぶんは起きたのじゃ。」'],
 idle:['「この手はプリン用に温存するのじゃ。」','「やる気にお休みをあげたのじゃ。」'],
 stream:['「今の通知は配信に映せぬのじゃ。」','「配信の続きが先なのじゃ。」'],
};
export type Input = {left:boolean;right:boolean;jump:boolean};
export type Difficulty = 'normal'|'troll';
export const DIFFICULTIES = {
 normal: {name:'おさんぽ',penalty:4},
 troll: {name:'鬼畜',penalty:10},
} as const;
export const WORLD_END = 5200;
export const FLOOR = 392;
export const GAPS = [{x:1130,w:110},{x:2320,w:120},{x:3610,w:125},{x:4400,w:110}];
export const BLOCKS = [{x:630,w:48,h:48},{x:1550,w:55,h:58},{x:1950,w:45,h:44},{x:2820,w:58,h:62},{x:3270,w:48,h:48},{x:3940,w:50,h:55},{x:4700,w:48,h:48}];
export const PLATFORMS = [{x:860,y:300,w:125},{x:2540,y:295,w:130},{x:4180,y:298,w:110}];
export const CHECKPOINTS=[80,1300,2510,3810,4570];
const IMPACT_HOLD = .22;
export const CARAMEL_CRACK_TIME = .18;
export type TrapKind='falling'|'ceiling'|'crumble'|'ambush'|'spikes'|'fake-goal';
export type Trap={id:string;kind:TrapKind;x:number;y:number;w:number;h:number;triggerX:number;armed:boolean;elapsed:number;seen:boolean};
export const TROLL_TRAPS: Omit<Trap,'armed'|'elapsed'|'seen'>[] = [
 {id:'pudding-rain',kind:'falling',x:530,y:82,w:44,h:44,triggerX:390},
 {id:'bonk',kind:'ceiling',x:1145,y:282,w:48,h:28,triggerX:0},
 {id:'bad-pavement',kind:'crumble',x:1780,y:392,w:112,h:88,triggerX:1780},
 {id:'flying-pudding',kind:'ambush',x:3020,y:252,w:44,h:44,triggerX:2680},
 {id:'surprise-spikes',kind:'spikes',x:3440,y:334,w:76,h:58,triggerX:3370},
 {id:'not-the-goal',kind:'fake-goal',x:4820,y:392,w:115,h:88,triggerX:4800},
];
const IDLE_QUOTES=['「プリンは……飲みものなのじゃ？」','「やる気を出すための、やる気がないのじゃ。」','「服はある。意志がないのじゃ。」'];
export class PuddingGame {
 phase:Phase='title'; activity:Activity='sleep'; done=[false,false,false,false,false];
 minute=540; age=0; startedAt=0; penalties=0; hits=0; misses=0; streams=0; sleeps=0;
 quote='「あと5分だけ……プリンは逃げないのじゃ。」'; notice=''; noticeUntil=0;
 activityStartedAt=0; activityUntil=0; idleUntil=12; autoWoke=false; late=false; pending=-1;
 completedAt:(number|null)[]=[null,null,null,null,null];
 lastMotivation:MotivationBeat|undefined=undefined;
 switchOn=false; switchX=.66; switchY=.33; switchUntil=0; nextSwitch=1.8; nextMove=0;
 private dismissUntil=0;
 private skippedSwitches: Record<WaitingActivity, number> = {sleep:0,idle:0,stream:0};
 x=80;y=FLOOR;vy=0;facing=1;grounded=true;checkpoint=80;invincible=0;coyote=0;jumpBuffer=0;
 travelStarted=false; totalTravel=0; touchFriendly=false; difficulty:Difficulty='normal';
 respawnDelay=0; lastFailure='';
 // Remember the floor that gave way even if horizontal input carries Lily past it.
 private fallingFrom:Trap|null=null;
 traps:Trap[]=TROLL_TRAPS.map(t=>({...t,armed:false,elapsed:0,seen:false}));
 constructor(public random:()=>number=Math.random){}
 get active(){return this.phase==='prep'||this.phase==='travel'}
 get nextStep(){return this.done.findIndex(x=>!x)}
 get busy(){return this.pending>=0}
 private get waitingActivity():WaitingActivity|undefined {
  if(this.activity==='sleep'||this.activity==='idle'||this.activity==='stream')return this.activity;
 }
 private get waitEndsBeforeSwitch(){
  return (this.activity==='idle'&&this.idleUntil<=this.nextSwitch)
   || (this.activity==='stream'&&this.activityUntil<=this.nextSwitch)
   || (this.activity==='sleep'&&!this.autoWoke&&540+2*this.nextSwitch>=660);
 }
 get observationPose():ObservationPose {
  if(this.phase!=='prep'||!this.waitingActivity||this.switchOn)return 'rest';
  if(this.age<this.dismissUntil)return 'dismiss';
  const untilSwitch=this.nextSwitch-this.age;
  return !this.waitEndsBeforeSwitch&&untilSwitch>0&&untilSwitch<=SWITCH_CUE_SECONDS ? 'notice' : 'rest';
 }
 get observationFrame():ObservationFrame {
  const pose=this.observationPose;
  const untilSwitch=this.nextSwitch-this.age;
  if(pose==='notice'){
   // Leave enough time to read the raised finger even when the schedule is tight.
   if(this.late||(this.activity==='stream'&&this.activityUntil-this.nextSwitch<.35))return 'notice';
   if(untilSwitch>.55)return 'tension';
   return untilSwitch>.34?'glance':'notice';
  }
  if(pose!=='rest'||this.phase!=='prep'||this.switchOn||this.late||this.waitEndsBeforeSwitch)return pose;
  // Time feints from the existing schedule so they never consume a gameplay random draw.
  const feint=(this.activity==='sleep'&&this.skippedSwitches.sleep%3===0)
   ||(this.activity==='stream'&&this.streams%2===1&&this.skippedSwitches.stream%3===0);
  if(!feint||untilSwitch<=.82||untilSwitch>1.69)return pose;
  if(untilSwitch>1.29)return 'feint-look';
  return untilSwitch>1.02?'feint-action':'feint-settle';
 }
 get motivationFeedback(){
  if(this.phase!=='prep'||!this.lastMotivation)return;
  const {activity,dressed,at}=this.lastMotivation;
  const elapsed=this.age-at;
  if(elapsed<MOTIVATION_HOLD)return {activity,dressed,elapsed};
 }
 get isTroll(){return this.difficulty==='troll'}
 setDifficulty(value:unknown){
  if(value!=='normal'&&value!=='troll')throw new Error('難易度は「おさんぽ」か「鬼畜」を選んでください。');
  if(this.active)throw new Error('難易度は一日を始める前に選んでください。');
  this.difficulty=value;
 }
 start(now:number){const rng=this.random,touchFriendly=this.touchFriendly,difficulty=this.difficulty;Object.assign(this,new PuddingGame(rng));this.touchFriendly=touchFriendly;this.difficulty=difficulty;this.phase='prep';this.startedAt=now;}
 say(text:string,duration=3){this.notice=text;this.noticeUntil=this.age+duration}
 relocate(){this.switchX=.06+this.random()*.86;this.switchY=.08+this.random()*.64;}
 scheduleSwitch(){this.nextSwitch=this.age+(this.late?.65+this.random()*.55:2.3+this.random()*3.1)}
 private letSwitchPass(){
  this.switchOn=false;
  this.scheduleSwitch();
  const activity=this.waitingActivity;
  if(!activity)return;
  const lines=MISSED_SWITCH_LINES[activity];
  this.quote=lines[this.skippedSwitches[activity]++ % lines.length];
  // Reserve space for the next tell even during the rapid afternoon cycle.
  this.dismissUntil=Math.min(this.age+.65,this.nextSwitch-.4);
 }
 finish(){this.phase='won';this.switchOn=false;this.activity='idle';this.quote='「ほら、間に合った。計画どおりなのじゃ！」';this.say('プリン、確保！',99)}
 lose(){this.phase='lost';this.minute=1080;this.switchOn=false;this.quote=this.travelStarted?'「あとちょっと……明日こそ本気を出すのじゃ。」':'「あれ？ もう今日が終わりなのじゃ？」';this.say('18:00　閉店しました',99)}
 motivation(now?:number){
  if(this.phase!=='prep'||!this.switchOn||this.busy)return false;
  // A tap after a delayed paint should still obey the real deadline.
  if(now!==undefined&&(now-this.startedAt)/1000>this.age)this.tick(now,0);
  const activity=this.waitingActivity;
  if(this.phase!=='prep'||!this.switchOn||this.busy||!activity)return false;
  const step=this.nextStep;if(step<0)return false;
  this.lastMotivation={activity,dressed:this.done[3],at:this.age};
  this.beginPreparation(step);return true;
 }
 beginPreparation(step:number){
  this.dismissUntil=0;
  this.switchOn=false;this.pending=step;this.activity=(['wake','brush','hair','dress','depart'] as Activity[])[step];
  this.activityStartedAt=this.age;
  this.activityUntil=this.age+(step===4?1.8:2.3);
  this.quote=['「起きた。えらい。今日はもう十分なのじゃ。」','「歯みがきで、プリンの味が変わりそうなのじゃ。」','「この寝ぐせは……悪魔の仕様なのじゃ。」','「おでかけ服、装備。やる気は別売りなのじゃ。」','「待っておれ、プリン！ いま行くのじゃ！」'][step];
  this.say(['やる気、接続！','起きたら自動で歯みがき。しゃかしゃか…','寝ぐせと交戦中…','おでかけ服にチェンジ！','いってきます！'][step]);
 }
 miss(){if(this.phase==='prep'&&!this.busy){this.misses++;if(this.misses%3===0)this.say('そこには、やる気がありません。',1.7)}}
 collision(reason='つまずいた！',retort?:string){
  if(this.respawnDelay>0||this.invincible>0||this.phase!=='travel')return false;
  const penalty=DIFFICULTIES[this.difficulty].penalty;
  this.hits++;this.penalties+=penalty;this.minute=Math.min(1080,540+this.age*2+this.penalties);
  this.coyote=0;this.jumpBuffer=0;this.lastFailure=reason;
  this.say(`${reason}　${penalty}分ロス…`,2);
  this.quote=retort??(this.isTroll?'「聞いておらぬのじゃ！」':'「いまのは地面が悪いのじゃ。」');
  if(this.isTroll)this.respawnDelay=IMPACT_HOLD;
  else this.respawn();
  if(this.minute>=1080)this.lose();
  return true;
 }
 private respawn(){
  this.x=this.checkpoint;this.y=FLOOR;this.vy=0;this.grounded=true;
  this.jumpBuffer=0;this.coyote=0;this.fallingFrom=null;
  this.invincible=this.isTroll?.95:1.4;
  for(const trap of this.traps){trap.armed=false;trap.elapsed=0;}
 }
 trapBounds(trap:Trap){
  if(trap.kind==='spikes'){const h=trap.h*Math.max(0,Math.min(1,(trap.elapsed-.18)/.08));return {x:trap.x,y:FLOOR-h,w:trap.w,h};}
  // A short bell ring, then the sample slides out of the dispenser.
  const drop=trap.kind==='falling'?850*Math.max(0,trap.elapsed-.12)**2:0;
  return {x:trap.x-(trap.kind==='ambush'?trap.elapsed*500:0),y:trap.y+drop,w:trap.w,h:trap.h};
 }
 floorMissing(x:number){
  return GAPS.some(g=>x>g.x&&x<g.x+g.w)||(this.isTroll&&this.traps.some(t=>(t.kind==='crumble'||t.kind==='fake-goal')&&t.armed&&t.elapsed>=(t.kind==='crumble'?CARAMEL_CRACK_TIME:.1)&&x>t.x&&x<t.x+t.w));
 }
 advanceTraps(dt:number){
  if(!this.isTroll)return;
  for(const trap of this.traps){
   const triggerEnd=trap.x+trap.w+(trap.kind==='crumble'?0:60);
   if(!trap.armed&&trap.kind!=='ceiling'&&this.x>=trap.triggerX&&this.x<=triggerEnd&&(trap.kind!=='crumble'||this.grounded)){
    trap.armed=true;trap.seen=true;
    if(trap.kind==='fake-goal'){this.say('CLEAR……？',.75);this.quote='「着いた！ プリンを買うのじゃ……？」';}
   }
   if(trap.armed)trap.elapsed+=dt;
  }
 }
 collideTraps(oldY:number){
  if(!this.isTroll)return false;
  for(const trap of this.traps){
   const b=this.trapBounds(trap),overX=this.x+15>b.x&&this.x-15<b.x+b.w;
   if(trap.kind==='ceiling'){
    if(!overX)continue;
    if(this.vy<0&&this.y>b.y&&this.y-65<b.y+b.h){
     trap.armed=true;trap.seen=true;this.y=b.y+b.h+65;this.vy=120;this.coyote=0;
     this.say('そこに、見えないブロック。',1.2);this.quote='「頭上注意なんて聞いておらぬのじゃ！」';
    }else if(this.vy>=0&&oldY<=b.y&&this.y>=b.y){trap.armed=true;trap.seen=true;this.y=b.y;this.vy=0;this.grounded=true;}
   }else if(trap.armed&&trap.kind!=='crumble'&&trap.kind!=='fake-goal'){
    if(trap.kind==='spikes'&&trap.elapsed<.18)continue;
    if(overX&&this.y>b.y+5&&this.y-62<b.y+b.h-5){
     const reason=trap.kind==='falling'?'プリンが降ってきた！':trap.kind==='ambush'?'プリンが飛んできた！':'足元からトゲ！';
     const retort=trap.kind==='falling'?'「試食が頭に届いたのじゃ！」':undefined;
     if(this.collision(reason,retort))return true;
    }
   }
  }
  return false;
 }
 tick(now:number,dt:number,input:Input={left:false,right:false,jump:false}){
  if(!this.active)return;
  this.age=Math.max(this.age,(now-this.startedAt)/1000);this.minute=Math.min(1080,540+this.age*2+this.penalties);
  if(this.minute>=1080){this.lose();return;}
  if(!this.late&&this.minute>=960){this.late=true;if(this.switchOn)this.switchUntil=this.age+2.4;else this.nextSwitch=Math.min(this.nextSwitch,this.age+.65);this.say('16:00！　急にやる気が出てきた！',4)}
  if(this.phase==='prep'){
   if(!this.autoWoke&&this.minute>=660){this.autoWoke=true;if(!this.done[0]&&this.pending!==0){this.done[0]=true;this.activity='wake';this.pending=0;this.activityStartedAt=this.age;this.activityUntil=this.age+1.5;this.switchOn=false;this.quote='「11時？ ……まだ朝なのじゃ。」';this.say('11:00　強制おめざめ！')}}
   if(this.pending>=0&&this.age>=this.activityUntil){
    const finished=this.pending;this.done[finished]=true;this.completedAt[finished]=this.age;this.pending=-1;this.activity='idle';
    // Both player-triggered and 11:00 wake-ups flow straight into brushing.
    // Completed brushing survives a second sleep, like the other preparation.
    if(finished===0&&!this.done[1]){this.beginPreparation(1);return;}
    this.idleUntil=this.age+10+this.random()*7;this.scheduleSwitch();
    if(finished===4){this.phase='travel';this.travelStarted=true;this.quote='「帰って寝たい気持ちが、最大の敵なのじゃ。」';this.say(this.touchFriendly?'右を押しながら、ジャンプで箱と穴を越えよう！':'← → で移動　SPACE でジャンプ！',5);return;}
   }
   if(this.activity==='stream'&&this.age>=this.activityUntil&&!this.switchOn&&this.age>=this.dismissUntil){this.activity='idle';this.idleUntil=this.age+12+this.random()*6;this.scheduleSwitch();this.quote='「配信おつかれなのじゃ。用事を忘れたのじゃ。」';}
   if(this.busy)return;
   if(this.activity==='idle'&&this.done[0]&&this.age>=this.idleUntil&&!this.switchOn&&this.age>=this.dismissUntil){
    this.switchOn=false;
    if(this.minute<660&&this.random()<.58){this.done[0]=false;this.completedAt[0]=null;this.activity='sleep';this.sleeps++;this.quote='「起きるのにも疲れた……もうひと眠りなのじゃ。」';this.say('二度寝にログインしました。');this.scheduleSwitch();}
    else{this.activity='stream';this.activityStartedAt=this.age;this.activityUntil=this.age+4+this.random()*2;this.nextSwitch=this.age+(this.late?.85:1.5);this.streams++;this.quote='「ちょっとだけ配信！ みんな、おはようなのじゃ♡」';this.say('まさかの配信スタート。',1);}
    this.idleUntil=this.age+14;return;
   }
   if(this.switchOn){
    if(this.age>=this.switchUntil){this.letSwitchPass();}
    else if(!this.late&&!this.touchFriendly&&this.age>=this.nextMove){this.relocate();this.nextMove=this.age+.43;}
   }else if(this.age>=this.nextSwitch){this.switchOn=true;this.switchUntil=this.age+(this.late?2.4:(this.touchFriendly?1.15:.8)+this.random()*.35);this.nextMove=this.age+.43;this.relocate();}
   if(this.activity==='idle'&&this.age>=this.dismissUntil&&this.age%21<dt)this.quote=IDLE_QUOTES[Math.floor(this.random()*IDLE_QUOTES.length)];
  }else if(this.phase==='travel'){
   // Wall-clock deadline is independent of capped, fixed-size physics steps.
   let remain=Math.min(.1,Math.max(0,dt));
   // A tap consumed while the impact is visible must never launch at respawn.
   if(input.jump&&this.respawnDelay===0)this.jumpBuffer=.14;
   while(remain>0){const step=Math.min(1/120,remain);this.physics(step,input);remain-=step;if(this.phase!=='travel')break;}
  }
 }
 physics(dt:number,input:Input){
  if(this.respawnDelay>0){
   this.respawnDelay=Math.max(0,this.respawnDelay-dt);
   if(this.respawnDelay===0)this.respawn();
   return;
  }
  this.invincible=Math.max(0,this.invincible-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  this.coyote=this.grounded?.11:Math.max(0,this.coyote-dt);
  if(this.jumpBuffer>0&&this.coyote>0){this.vy=-620;this.grounded=false;this.coyote=0;this.jumpBuffer=0;}
  const axis=Number(input.right)-Number(input.left);if(axis)this.facing=axis;
  this.x=Math.max(24,Math.min(WORLD_END,this.x+axis*230*dt));
  this.advanceTraps(dt);
  const oldY=this.y;this.vy+=1550*dt;this.y+=this.vy*dt;this.grounded=false;
  const inGap=this.floorMissing(this.x);
  if(!inGap&&this.y>=FLOOR&&oldY<=FLOOR+2&&this.vy>=0){this.y=FLOOR;this.vy=0;this.grounded=true;}
  for(const p of PLATFORMS){if(this.x+17>p.x&&this.x-17<p.x+p.w&&oldY<=p.y&&this.y>=p.y&&this.vy>=0){this.y=p.y;this.vy=0;this.grounded=true;}}
  if(this.collideTraps(oldY))return;
  for(const b of BLOCKS){if(this.x+15>b.x&&this.x-15<b.x+b.w&&this.y>FLOOR-b.h+7&&this.y-65<FLOOR){if(this.collision())return;}}
  if(this.isTroll && !this.fallingFrom && inGap && this.y>FLOOR && this.vy>0){
   this.fallingFrom=this.traps.find(trap=>(trap.kind==='crumble'||trap.kind==='fake-goal')&&trap.armed&&this.x>trap.x&&this.x<trap.x+trap.w)??null;
  }
  if(this.isTroll && this.y>FLOOR+46){
   const caramel=this.fallingFrom?.kind==='crumble';
   if(this.collision(caramel?'カラメル床が割れた！':'足場を信じた結果。',caramel?'「床までパリパリなのじゃ!?」':undefined))return;
  }
  if(this.y>550&&this.collision('穴に落ちた！'))return;
  // A checkpoint is accepted only while standing safely on the ground.
  if(this.grounded&&this.y===FLOOR)for(const cp of CHECKPOINTS){if(this.x>=cp&&cp>this.checkpoint)this.checkpoint=cp;}
  this.totalTravel=Math.max(this.totalTravel,this.x);
  if(this.x>=WORLD_END-75&&this.minute<1080)this.finish();
 }
 snapshot(){return {phase:this.phase,difficulty:this.difficulty,difficultyName:DIFFICULTIES[this.difficulty].name,time:`${Math.floor(this.minute/60).toString().padStart(2,'0')}:${Math.floor(this.minute%60).toString().padStart(2,'0')}`,preparation:[...this.done],activity:this.activity,switchVisible:this.switchOn,distanceRemaining:Math.max(0,Math.ceil(WORLD_END-this.x)),collisions:this.hits,lastFailure:this.lastFailure};}
}
