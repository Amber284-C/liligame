import { PuddingGame, BLOCKS, GAPS, PLATFORMS, FLOOR, WORLD_END, CHECKPOINTS, CARAMEL_CRACK_TIME, type Trap } from './game';
import {sitePath} from './site-path';
export type Art={room:HTMLImageElement;street:HTMLImageElement;sprites:HTMLCanvasElement[];gestures:HTMLImageElement;preparation:HTMLImageElement};
const BOXES=[[40,42,325,465],[396,43,328,463],[765,43,342,468],[1155,43,345,470],[28,525,315,442],[384,565,337,359],[730,525,336,430],[1120,530,339,434]];
function load(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`画像を読み込めませんでした: ${src}`));im.src=src})}
export async function loadArt():Promise<Art>{
 const [room,street,atlas,gestures,preparation]=await Promise.all([load(sitePath('bedroom.webp')),load(sitePath('shopping-street.webp')),load(sitePath('character-atlas.webp')),load(sitePath('lily-observation.webp')),load(sitePath('lily-prep-animation.webp'))]);
 // The supplied animation atlas uses a neutral color key. Resolve it only in
 // the rendering surface; enclosed costume highlights remain intact.
 const sprites=BOXES.map(([x,y,w,h])=>{
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.drawImage(atlas,x,y,w,h,0,0,w,h);
  const im=ctx.getImageData(0,0,w,h),d=im.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const add=(p:number)=>{if(p<0||p>=w*h||seen[p])return;seen[p]=1;const i=p*4;const lo=Math.min(d[i],d[i+1],d[i+2]),hi=Math.max(d[i],d[i+1],d[i+2]);if(lo>207&&hi-lo<19){queue[tail++]=p;d[i+3]=0}};
  for(let j=0;j<w;j++){add(j);add((h-1)*w+j)}for(let j=0;j<h;j++){add(j*w);add(j*w+w-1)}
  while(head<tail){const p=queue[head++];if(p%w>0)add(p-1);if(p%w<w-1)add(p+1);add(p-w);add(p+w)}ctx.putImageData(im,0,0);return c;
 });return {room,street,sprites,gestures,preparation};
}
function sprite(ctx:CanvasRenderingContext2D,art:Art,id:number,x:number,bottom:number,height:number,flip=false,rotation=0){
 const im=art.sprites[id];const width=height*im.width/im.height;ctx.save();ctx.translate(x,bottom);if(flip)ctx.scale(-1,1);ctx.rotate(rotation);ctx.drawImage(im,-width/2,-height,width,height);ctx.restore();
}
function drawCel(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement,columns:number,rows:number,row:number,column:number,x:number,bottom:number,height:number) {
 const cellWidth = atlas.naturalWidth / columns;
 const cellHeight = atlas.naturalHeight / rows;
 const width = height * cellWidth / cellHeight;
 ctx.drawImage(atlas,column*cellWidth,row*cellHeight,cellWidth,cellHeight,
   Math.round(x-width/2),Math.round(bottom-height),Math.round(width),Math.round(height));
}
const OBSERVATION_CEL={rest:0,tension:1,glance:2,notice:3,'feint-look':2,'feint-action':4,'feint-settle':5} as const;
function observationRow(activity:string,dressed:boolean){
 return activity==='sleep'?0:(dressed?3:1)+Number(activity==='stream');
}
function drawWaiting(ctx:CanvasRenderingContext2D,g:PuddingGame,art:Art,x:number,bottom:number,size:number,reducedMotion:boolean){
 const row=observationRow(g.activity,g.done[3]);
 const pose=g.observationFrame;
 if(g.activity==='sleep'){
  // Keep her cheek tucked into her arms while waiting, even if a switch goes by.
  const column=g.observationPose==='notice'?(pose==='glance'&&!reducedMotion?2:3):5;
  drawCel(ctx,art.preparation,7,7,row,column,x,bottom,size);
  return;
 }
 if(pose==='dismiss'){
  drawCel(ctx,art.gestures,3,5,row,2,x,bottom,size);
  return;
 }
 let column=OBSERVATION_CEL[pose];
 if(reducedMotion){
  column=g.observationPose==='notice'?3:0;
 }else if(pose==='rest'&&g.activity==='idle'&&g.late){
  const beat=g.age%1.3;
  column=beat<.13||(beat>.26&&beat<.40)?5:0;
 }
 drawCel(ctx,art.preparation,7,7,row,column,x,bottom,size);
}
function drawMotivationSpark(ctx:CanvasRenderingContext2D,x:number,y:number,elapsed:number){
 const progress=Math.min(1,elapsed/.23);
 const distance=1-(.90*(1-progress))**3;
 ctx.save();
 ctx.globalAlpha=1-progress;
 for(const [dx,dy,color] of [[-16,-21,'#fff3b1'],[4,-31,'#fff8e3'],[20,-13,'#ffc2df']] as const){
  const px=Math.round(x+dx*distance),py=Math.round(y+dy*distance);
  ctx.fillStyle='#795065';ctx.fillRect(px-1,py-1,6,6);
  ctx.fillStyle=color;ctx.fillRect(px,py,4,4);
 }
 ctx.restore();
}
function drawToothpaste(ctx:CanvasRenderingContext2D,x:number,bottom:number,size:number,elapsed:number,reducedMotion:boolean){
 const scale=size/180;
 const mouthX=x-12*scale,mouthY=bottom-104*scale;
 for(let i=0;i<(reducedMotion?2:5);i++){
  const time=reducedMotion?.2+i*.14:(elapsed+i*.16)%.8;
  const px=Math.round(mouthX-(8+i*2)*time),py=Math.round(mouthY-24*time);
  ctx.fillStyle='#a7cbdc';ctx.fillRect(px-1,py-1,5,5);
  ctx.fillStyle='#f5fffc';ctx.fillRect(px,py,3,3);
 }
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size=20,color='#fff5e8',align:CanvasTextAlign='center'){
 ctx.font=`bold ${size}px "Yu Gothic", Meiryo, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='#49304fe0';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function sampleDispenser(ctx:CanvasRenderingContext2D,trap:Trap,camera:number,puddingY:number){
 const x=Math.round(trap.x-camera),bell=Math.round(trap.triggerX-camera);
 const rect=(color:string,left:number,top:number,w:number,h:number)=>{
  ctx.fillStyle=color;ctx.fillRect(left,top,w,h);
 };
 // The brass ordering mat and the serving chute have matching stripes.
 rect('#593747',bell-13,FLOOR-65,57,23);rect('#eed6a3',bell-11,FLOOR-63,53,19);
 text(ctx,'試食 →',bell+15,FLOOR-53,14,'#fff3ce');
 rect('#775359',bell-7,FLOOR-42,4,35);
 rect('#55364b',bell-7,FLOOR-6,40,7);
 rect(trap.armed?'#a67c59':'#f5cb6f',bell-4,FLOOR-5,34,4);
 rect('#654451',x+59,66,8,FLOOR-66);
 rect('#71485a',x-15,51,82,34);rect('#e9bc81',x-11,55,74,26);
 rect('#c78c60',x+3,59,40,7);rect('#a36c58',x+10,69,26,4);
 rect('#57384c',x-3,83,52,7);
 rect('#593747',x+47,104,74,28);rect('#eed6a3',x+49,106,70,24);
 text(ctx,'試食口',x+84,118,16,'#fff3ce');
 if(trap.armed&&trap.elapsed<.36)text(ctx,'チン♪',bell+13,FLOOR-83,20,'#ffe299');
 if((trap.seen&&!trap.armed)||puddingY+trap.h>=FLOOR){
  rect('#814024',x-5,FLOOR-4,53,4);rect('#eeb563',x+3,FLOOR-7,35,5);
  rect('#ffdc8e',x-9,FLOOR-6,5,4);rect('#ffdc8e',x+48,FLOOR-9,4,4);
 }
}
function samplePudding(ctx:CanvasRenderingContext2D,x:number,y:number,moving:boolean){
 // All coordinates are relative to the 44-pixel collision box.
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle='#68374a';
 ctx.fillRect(9,0,26,5);ctx.fillRect(6,5,32,11);ctx.fillRect(4,16,36,12);
 ctx.fillRect(1,28,42,10);ctx.fillRect(4,38,36,5);
 ctx.fillStyle='#ffd579';ctx.fillRect(9,7,26,12);ctx.fillRect(7,18,30,13);ctx.fillRect(4,29,36,7);
 ctx.fillStyle='#e49a49';ctx.fillRect(32,15,3,12);ctx.fillRect(35,27,3,9);ctx.fillRect(7,35,30,4);
 ctx.fillStyle='#9b4f38';ctx.fillRect(10,3,24,7);ctx.fillRect(8,8,28,4);ctx.fillRect(12,10,5,7);
 ctx.fillStyle='#eaa06b';ctx.fillRect(12,4,12,2);
 ctx.fillStyle='#fff0b3';ctx.fillRect(9,20,4,7);ctx.fillRect(7,28,4,3);
 if(moving){ctx.fillStyle='#fff2ca';ctx.fillRect(5,-16,3,10);ctx.fillRect(36,-23,3,14);}
 ctx.restore();
}
function caramelFloor(ctx:CanvasRenderingContext2D,trap:Trap,x:number){
 const broken=trap.armed&&trap.elapsed>=CARAMEL_CRACK_TIME;
 const colors=['#d89a5a','#bb743e','#df9e55','#d09451'];
 if(broken){ctx.fillStyle='#302039';ctx.fillRect(x,FLOOR,trap.w,480-FLOOR);}
 for(let i=0;i<4;i++){
  const drop=broken?Math.floor(600*(trap.elapsed-CARAMEL_CRACK_TIME)**2*(1+i*.14)):0;
  if(drop>90)continue;
  const left=Math.round(x)+i*28,top=FLOOR+drop;
  ctx.fillStyle='#754535';ctx.fillRect(left,top,28,12);
  ctx.fillStyle=colors[i];ctx.fillRect(left+1,top,26,7);
  ctx.fillStyle='#f4c186';ctx.fillRect(left+4,top+1,10,2);
  if(trap.seen){
   ctx.fillStyle='#573344';ctx.fillRect(left+10,top,3,3);
   ctx.fillRect(left+8,top+3,4,3);ctx.fillRect(left+11,top+6,3,5);
  }
 }
 if(trap.armed&&trap.elapsed<.35)text(ctx,'パリッ',x+trap.w/2,FLOOR-32,18,'#ffdc88');
}
export function renderGame(ctx:CanvasRenderingContext2D,g:PuddingGame,art:Art,t:number,width:number,reducedMotion=false){
 const height=480;ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
 const road=g.travelStarted;const age=g.age;
 if(!road){
  const scale=Math.max(width/art.room.width,height/art.room.height);const iw=art.room.width*scale,ih=art.room.height*scale;
  const atBed = (g.activity === 'sleep'||g.activity==='wake') && g.phase !== 'title';
  const bedX = Math.max(90, width*.23);
  const roomLeft = atBed ? Math.min(0, Math.max(width-iw,bedX-iw*.23)) : (width-iw)/2;
  const roomTop = -(ih-height)*.57;
  ctx.drawImage(art.room,roomLeft,roomTop,iw,ih);
  if(g.phase==='title'){sprite(ctx,art,3,width*.76,440,300,false,reducedMotion?0:Math.sin(t*1.4)*.015)}
  else{
   const x=atBed?roomLeft+iw*.23:width*.63;
   const bottom=atBed?roomTop+ih*.60:425;
   const size=atBed?200:245;
   const actionAge=Math.max(0,age-g.activityStartedAt);
   const feedback=g.motivationFeedback;
   if(feedback){
    drawCel(ctx,art.preparation,7,7,observationRow(feedback.activity,feedback.dressed),6,x,bottom,size);
   }else if(g.activity==='wake'){
    const progress=actionAge/Math.max(.01,g.activityUntil-g.activityStartedAt);
    const column=reducedMotion?2:progress<.24?0:progress<.61?1:2;
    drawCel(ctx,art.preparation,7,7,5,column,x,bottom,size);
   }else if(g.activity==='brush'){
    const beat=actionAge%.72;
    const column=reducedMotion?1:beat<.19?0:beat<.32?1:beat<.53?2:3;
    drawCel(ctx,art.preparation,7,7,6,column,x,bottom,size);
    drawToothpaste(ctx,x,bottom,size,actionAge,reducedMotion);
   }else if(g.activity==='dress'){
    const remaining=g.activityUntil-age;
    sprite(ctx,art,remaining<.95?3:0,x,bottom,size);
    if(!reducedMotion)for(let i=0;i<6;i++){const a=actionAge*3+i*Math.PI/3;text(ctx,'✦',x+Math.cos(a)*87,bottom-120+Math.sin(a)*89,18,'#ffe89d')}
   }else if(g.activity==='depart'){
    const distance=Math.min(1,actionAge/1.8);
    sprite(ctx,art,reducedMotion?6:6+Math.floor(actionAge*9)%2,x+distance*distance*width*.55,bottom,230);
   }else if(g.activity==='hair'){
    sprite(ctx,art,2,x,bottom,size);
   }else{
    drawWaiting(ctx,g,art,x,bottom,size,reducedMotion);
   }
   if(g.activity==='sleep'&&g.observationPose!=='notice'){
    const breath=reducedMotion?.5:(1-Math.cos(age*2*Math.PI/4))/2;
    ctx.save();
    ctx.globalAlpha=.45+breath*.30;
    text(ctx,'z',x+47,bottom-149-breath*5,19,'#ead2f4');
    ctx.restore();
   }
   if(g.activity==='stream'||feedback?.activity==='stream'){
    ctx.fillStyle='#572c59e0';ctx.fillRect(width*.58-94,65,192,43);
    text(ctx,'● LIVE   ♡ '+(12+Math.floor(age*3)),width*.58,87,18,'#ffc8df');
    if(!reducedMotion&&g.observationFrame==='rest'&&!feedback)for(let i=0;i<3;i++)text(ctx,'♥',x+75+Math.sin(i+age)*13,370-((age*45+i*63)%185),17,'#ff95c6');
   }
   const tap=g.lastMotivation;
   if(!reducedMotion&&tap&&age-tap.at<.23){
    const fingertip={sleep:[-38,-79],idle:[-28,-102],stream:[25,-103]}[tap.activity];
    drawMotivationSpark(ctx,x+fingertip[0]*size/180,bottom+fingertip[1]*size/180,age-tap.at);
   }
  }
  if(g.late){ctx.fillStyle='#d98e321a';ctx.fillRect(0,0,width,height)}
 }else{
  const camera=Math.max(0,Math.min(WORLD_END-width+150,g.x-width*.3));
  ctx.fillStyle='#d4a7bb';ctx.fillRect(0,0,width,height);
  const bgW=960;const offset=(camera*.27)%bgW;for(let i=-1;i<Math.ceil(width/bgW)+1;i++)ctx.drawImage(art.street,i*bgW-offset,0,bgW,height);
  // Collision geometry is deliberately bold and readable against the town art.
  ctx.fillStyle='#5b3b57';ctx.fillRect(0,FLOOR,width,height-FLOOR);ctx.fillStyle='#cb8d8d';ctx.fillRect(0,FLOOR,width,12);ctx.fillStyle='#f2c3a5';ctx.fillRect(0,FLOOR,width,4);
  ctx.fillStyle='#956574';for(let x=-(camera%48);x<width;x+=48){ctx.fillRect(x,FLOOR+15,2,28);ctx.fillRect(x+24,FLOOR+46,2,32);ctx.fillRect(x,FLOOR+43,48,2)}
  for(const gap of GAPS){const x=gap.x-camera;ctx.fillStyle='#2e263c';ctx.fillRect(x,FLOOR,gap.w,height-FLOOR);text(ctx,'↓',x+gap.w/2,FLOOR+40,24,'#a683a8')}
  for(const p of PLATFORMS){const x=p.x-camera;ctx.fillStyle='#5a3e67';ctx.fillRect(x,p.y,p.w,17);ctx.fillStyle='#c0a0d0';ctx.fillRect(x,p.y,p.w,5);ctx.fillStyle='#f8dcf2';ctx.fillRect(x+4,p.y+5,p.w-8,3)}
  for(const b of BLOCKS){const x=b.x-camera,y=FLOOR-b.h;ctx.fillStyle='#53374c';ctx.fillRect(x,y,b.w,b.h);ctx.fillStyle='#c47b77';ctx.fillRect(x+4,y+4,b.w-8,b.h-8);ctx.fillStyle='#efb38f';ctx.fillRect(x+7,y+7,b.w-14,4);text(ctx,'×',x+b.w/2,y+b.h/2+4,28,'#754154')}
  let visibleSample:Trap|undefined;
  if(g.isTroll){
   for(const trap of g.traps){
    const b=g.trapBounds(trap),x=b.x-camera;
    if(x>width+180||x+b.w<-180)continue;
    if(trap.kind==='falling'){
     sampleDispenser(ctx,trap,camera,b.y);
     if(b.y+trap.h<FLOOR)visibleSample=trap;
    }else if(trap.kind==='crumble'){
     caramelFloor(ctx,trap,x);
    }else if(trap.kind==='fake-goal'){
     if(trap.armed&&trap.elapsed>=.1){
      ctx.fillStyle='#251c33';ctx.fillRect(x,FLOOR,trap.w,480-FLOOR);
      const fall=Math.max(0,(trap.elapsed-.1)*280);
      for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#aa7786':'#dca49d';ctx.fillRect(x+i*trap.w/4,FLOOR+fall+i*6,trap.w/4-3,10);}
     }else if(trap.seen){ctx.strokeStyle='#59364e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+6,FLOOR+2);ctx.lineTo(x+32,FLOOR+12);ctx.lineTo(x+55,FLOOR+3);ctx.lineTo(x+trap.w-4,FLOOR+13);ctx.stroke();}
     if(trap.kind==='fake-goal'){
      const sign=x+trap.w/2;ctx.fillStyle='#fff2ce';ctx.fillRect(sign-52,233,104,84);ctx.strokeStyle='#b86687';ctx.lineWidth=4;ctx.strokeRect(sign-52,233,104,84);text(ctx,'🍮',sign,257,31);text(ctx,trap.seen?'…？':'GOAL!',sign,296,20,'#f6b3cf');ctx.fillStyle='#b47583';ctx.fillRect(sign-3,319,6,FLOOR-319);
     }
    }else if(trap.kind==='ceiling'&&trap.seen){
     ctx.fillStyle='#573a51';ctx.fillRect(x,b.y,b.w,b.h);ctx.fillStyle='#eeb96c';ctx.fillRect(x+3,b.y+3,b.w-6,b.h-6);text(ctx,'?',x+b.w/2,b.y+b.h/2,21,'#fff4bf');
    }else if(trap.kind==='spikes'){
     if(trap.seen){ctx.fillStyle='#673c56';ctx.fillRect(x,FLOOR-3,b.w,5);}
     if(trap.armed&&b.h>0){for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+i*19,FLOOR);ctx.lineTo(x+i*19+9.5,b.y);ctx.lineTo(x+(i+1)*19,FLOOR);ctx.closePath();ctx.fillStyle='#f2d6e4';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#984161';ctx.stroke();}}
    }else if(trap.armed&&trap.kind==='ambush'&&b.y<530){
     text(ctx,'🍮',x+b.w/2,b.y+b.h/2,43,'#ffd6a5');
     ctx.strokeStyle='#fff1c7';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+b.w+5,b.y+8+i*12);ctx.lineTo(x+b.w+24,b.y+8+i*12);ctx.stroke();}
    }
   }
  }
  for(const cp of CHECKPOINTS.slice(1)){const x=cp-camera;text(ctx,'⚑',x,365,28,cp<=g.checkpoint?'#ffeea8':'#dfbacd')}
  const shopX=WORLD_END-75-camera;
  // The goal is a functional sign marking the shop in the generated street.
  ctx.fillStyle='#fff1d3';ctx.fillRect(shopX-62,200,146,111);ctx.strokeStyle='#68415a';ctx.lineWidth=4;ctx.strokeRect(shopX-62,200,146,111);text(ctx,'🍮',shopX+12,235,43,'#fff1b5');text(ctx,'プリン屋',shopX+12,278,20,'#fff2c7');ctx.fillStyle='#6e4560';ctx.fillRect(shopX+8,313,7,79);text(ctx,'GOAL',shopX+12,176,22,'#ffeb98');
  const anim=g.respawnDelay===0&&g.grounded&&Math.abs(g.vy)<1?6+Math.floor(t*10)%2:6;
  if(g.invincible<=0||Math.floor(t*14)%2===0)sprite(ctx,art,g.phase==='won'?3:anim,g.x-camera,g.y+4,100,g.facing<0);
  if(visibleSample){
   const b=g.trapBounds(visibleSample);
   samplePudding(ctx,b.x-camera,b.y,visibleSample.elapsed>.12);
  }
  if(g.phase==='won'){for(let i=0;i<28;i++){const x=(i*73+Math.sin(t+i)*25)%width;const y=(t*45+i*31)%height;ctx.fillStyle=['#ffb2d3','#ffe49f','#c2b1f0'][i%3];ctx.fillRect(x,y,6,9)}}
  if(g.respawnDelay>0){
   // Keep the offending object and both silhouettes visible during the beat.
   const cx=Math.round(g.x-camera),cy=Math.round(g.y-44);
   ctx.strokeStyle='#ffe6a4';ctx.lineWidth=4;
   for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(cx+side*29,cy-17);ctx.lineTo(cx+side*40,cy-25);ctx.moveTo(cx+side*31,cy);ctx.lineTo(cx+side*44,cy);ctx.stroke();}
  }
 }
 // Quiet film grain lines keep the generated backgrounds and moving sprites cohesive.
 ctx.fillStyle='#28182a08';for(let y=0;y<height;y+=4)ctx.fillRect(0,y,width,1);
}
