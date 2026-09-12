import { PuddingGame, BLOCKS, GAPS, PLATFORMS, FLOOR, WORLD_END, CHECKPOINTS } from './game';
export type Art={room:HTMLImageElement;street:HTMLImageElement;sprites:HTMLCanvasElement[]};
const BOXES=[[40,42,325,465],[396,43,328,463],[765,43,342,468],[1155,43,345,470],[28,525,315,442],[384,565,337,359],[730,525,336,430],[1120,530,339,434]];
function load(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`画像を読み込めませんでした: ${src}`));im.src=src})}
export async function loadArt():Promise<Art>{
 const [room,street,atlas]=await Promise.all([load('/bedroom.webp'),load('/shopping-street.webp'),load('/character-atlas.webp')]);
 // The supplied animation atlas uses a neutral color key. Resolve it only in
 // the rendering surface; enclosed costume highlights remain intact.
 const sprites=BOXES.map(([x,y,w,h])=>{
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.drawImage(atlas,x,y,w,h,0,0,w,h);
  const im=ctx.getImageData(0,0,w,h),d=im.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const add=(p:number)=>{if(p<0||p>=w*h||seen[p])return;seen[p]=1;const i=p*4;const lo=Math.min(d[i],d[i+1],d[i+2]),hi=Math.max(d[i],d[i+1],d[i+2]);if(lo>207&&hi-lo<19){queue[tail++]=p;d[i+3]=0}};
  for(let j=0;j<w;j++){add(j);add((h-1)*w+j)}for(let j=0;j<h;j++){add(j*w);add(j*w+w-1)}
  while(head<tail){const p=queue[head++];if(p%w>0)add(p-1);if(p%w<w-1)add(p+1);add(p-w);add(p+w)}ctx.putImageData(im,0,0);return c;
 });return {room,street,sprites};
}
function sprite(ctx:CanvasRenderingContext2D,art:Art,id:number,x:number,bottom:number,height:number,flip=false,rotation=0){
 const im=art.sprites[id];const width=height*im.width/im.height;ctx.save();ctx.translate(x,bottom);if(flip)ctx.scale(-1,1);ctx.rotate(rotation);ctx.drawImage(im,-width/2,-height,width,height);ctx.restore();
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size=20,color='#fff5e8',align:CanvasTextAlign='center'){
 ctx.font=`bold ${size}px "Yu Gothic", Meiryo, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='#49304fe0';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);
}
export function renderGame(ctx:CanvasRenderingContext2D,g:PuddingGame,art:Art,t:number,width:number){
 const height=480;ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
 const road=g.travelStarted;const age=g.age;
 if(!road){
  const scale=Math.max(width/art.room.width,height/art.room.height);const iw=art.room.width*scale,ih=art.room.height*scale;
  ctx.drawImage(art.room,(width-iw)/2,-(ih-height)*.57,iw,ih);
  if(g.phase==='title'){sprite(ctx,art,3,width*.76,440,300,false,Math.sin(t*1.4)*.015)}
  else{
   const asleep=g.activity==='sleep';const id=asleep?5:g.activity==='stream'?4:g.activity==='brush'?1:g.activity==='hair'?2:g.done[3]?3:0;
   let x=asleep?width*.23:width*.63;let bottom=asleep?290:425;let size=asleep?165:236;
   let rotation=asleep?Math.sin(t*1.5)*.025:0;
   if(g.activity==='wake'){bottom-=Math.abs(Math.sin(t*5))*15;rotation=Math.sin(t*5)*.04;}
   if(g.activity==='brush'){x+=Math.sin(t*22)*2.5;rotation=Math.sin(t*11)*.018;}
   if(g.activity==='hair'){rotation=Math.sin(t*7)*.035;bottom+=Math.sin(t*7)*3;}
   if(g.activity==='dress'){const remaining=g.activityUntil-age;const frame=Math.floor(t*9)%2?3:0;sprite(ctx,art,frame,x,bottom,size,false,Math.sin(t*14)*.035);for(let i=0;i<9;i++){const a=t*3+i*.7;text(ctx,'✦',x+Math.cos(a)*95,bottom-120+Math.sin(a)*95,20,'#ffe89d')}if(remaining<.5){ctx.fillStyle=`rgba(255,233,244,${Math.max(0,.5-remaining)})`;ctx.fillRect(0,0,width,height)}}
   else if(g.activity==='depart'){x+=Math.min(1,1-(g.activityUntil-age)/1.8)*width*.55;sprite(ctx,art,6+Math.floor(t*9)%2,x,bottom,230)}
   else sprite(ctx,art,id,x,bottom+Math.sin(t*2)*2,size,false,rotation);
   if(asleep){text(ctx,'z',x+65,195-Math.sin(t)*8,23,'#ead2f4');text(ctx,'Z',x+92,160-Math.sin(t+1)*10,32,'#ead2f4')}
   if(g.activity==='brush')for(let i=0;i<5;i++){ctx.fillStyle='#f2faff';ctx.fillRect(x-27+Math.sin(t*5+i)*13,285-i*5+Math.cos(t*7+i)*6,4,4)}
   if(g.activity==='stream'){ctx.fillStyle='#572c59e0';ctx.fillRect(width*.58-94,65,192,43);text(ctx,'● LIVE   ♡ '+(12+Math.floor(age*3)),width*.58,87,18,'#ffc8df');for(let i=0;i<5;i++)text(ctx,'♥',x+75+Math.sin(i+t)*22,370-((t*45+i*43)%210),20,'#ff95c6')}
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
  if(g.isTroll){
   for(const trap of g.traps){
    const b=g.trapBounds(trap),x=b.x-camera;
    if(x>width+180||x+b.w<-180)continue;
    if(trap.kind==='crumble'||trap.kind==='fake-goal'){
     if(trap.armed&&trap.elapsed>=(trap.kind==='crumble'?.14:.1)){
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
    }else if(trap.armed&&(trap.kind==='falling'||trap.kind==='ambush')&&b.y<530){
     text(ctx,'🍮',x+b.w/2,b.y+b.h/2,43,'#ffd6a5');
     ctx.strokeStyle='#fff1c7';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();if(trap.kind==='falling'){ctx.moveTo(x+9+i*12,b.y-7);ctx.lineTo(x+9+i*12,b.y-23)}else{ctx.moveTo(x+b.w+5,b.y+8+i*12);ctx.lineTo(x+b.w+24,b.y+8+i*12)}ctx.stroke();}
    }
   }
  }
  for(const cp of CHECKPOINTS.slice(1)){const x=cp-camera;text(ctx,'⚑',x,365,28,cp<=g.checkpoint?'#ffeea8':'#dfbacd')}
  const shopX=WORLD_END-75-camera;
  // The goal is a functional sign marking the shop in the generated street.
  ctx.fillStyle='#fff1d3';ctx.fillRect(shopX-62,200,146,111);ctx.strokeStyle='#68415a';ctx.lineWidth=4;ctx.strokeRect(shopX-62,200,146,111);text(ctx,'🍮',shopX+12,235,43,'#fff1b5');text(ctx,'プリン屋',shopX+12,278,20,'#fff2c7');ctx.fillStyle='#6e4560';ctx.fillRect(shopX+8,313,7,79);text(ctx,'GOAL',shopX+12,176,22,'#ffeb98');
  const anim=g.grounded&&Math.abs(g.vy)<1?6+Math.floor(t*10)%2:6;
  if(g.invincible<=0||Math.floor(t*14)%2===0)sprite(ctx,art,g.phase==='won'?3:anim,g.x-camera,g.y+4,100,g.facing<0);
  if(g.phase==='won'){for(let i=0;i<28;i++){const x=(i*73+Math.sin(t+i)*25)%width;const y=(t*45+i*31)%height;ctx.fillStyle=['#ffb2d3','#ffe49f','#c2b1f0'][i%3];ctx.fillRect(x,y,6,9)}}
  if(g.respawnDelay>0){ctx.fillStyle='#61304b55';ctx.fillRect(0,0,width,height);text(ctx,'MISS',width/2,190,46,'#ffb3ce');}
 }
 // Quiet film grain lines keep the generated backgrounds and moving sprites cohesive.
 ctx.fillStyle='#28182a08';for(let y=0;y<height;y+=4)ctx.fillRect(0,y,width,1);
}
