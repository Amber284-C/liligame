'use client';
import { useEffect, useRef, useState } from 'react';
import { Moon, VolumeX, Volume2, HelpCircle, ArrowRight, ArrowLeft, Heart, Sun, Sparkles, Check, Zap, RotateCcw, Footprints } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PuddingGame, WORLD_END, DIFFICULTIES } from '@/lib/game';
import { GameControls, type Control } from '@/lib/controls';
import { loadArt, renderGame, type Art } from '@/lib/render-game';
import {sitePath} from '@/lib/site-path';
const STEPS = ['起きる', '歯みがき', '髪をととのえる', '着替える', '出発！'];
const MODES:Record<string,string>={sleep:'ねむねむモード',idle:'やる気、捜索中',wake:'起床中',brush:'歯みがき中',hair:'髪をセット中',dress:'お着替え中',depart:'おでかけ！',stream:'配信中'};
export default function Home(){
 const game=useRef(new PuddingGame()),canvas=useRef<HTMLCanvasElement>(null),art=useRef<Art|null>(null),input=useRef(new GameControls());
 const [ready,setReady]=useState(false),[assetError,setAssetError]=useState(false),[help,setHelp]=useState(false),[sound,setSound]=useState(false);
 const [choosing,setChoosing]=useState(false),difficultyHeading=useRef<HTMLHeadingElement>(null);
 const [,update]=useState(0);const audio=useRef<AudioContext|null>(null),soundRef=useRef(false),helpRef=useRef(false);
 const g=game.current;
 const refresh=()=>update(v=>v+1);
 const play=(notes:number[]= [523,659,784])=>{if(!soundRef.current)return;try{audio.current??=new AudioContext();void audio.current.resume();const c=audio.current;notes.forEach((freq,i)=>{const o=c.createOscillator(),v=c.createGain();o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.045,c.currentTime+i*.09);v.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.09+.16);o.connect(v);v.connect(c.destination);o.start(c.currentTime+i*.09);o.stop(c.currentTime+i*.09+.18)})}catch{}};
 const start=()=>{if(!art.current)return;setChoosing(false);game.current.start(Date.now());input.current.clear();refresh();play()};
 const choose=(value:unknown)=>{game.current.setDifficulty(value);refresh()};
 const motivate=()=>{if(game.current.motivation()){play();refresh()}};
 const fetchArt=()=>{setAssetError(false);void loadArt().then(a=>{art.current=a;setReady(true)}).catch(()=>setAssetError(true))};
 useEffect(()=>{
  fetchArt();
  const touchQuery=window.matchMedia('(any-pointer: coarse)');
  const setTouchMode=()=>{game.current.touchFriendly=touchQuery.matches};
  setTouchMode();touchQuery.addEventListener('change',setTouchMode);
  let frame=0,last=Date.now(),lastUI=0,lastDraw=0,canvasWidth=960;
  const resize=()=>{const el=canvas.current;if(!el)return;const rect=el.getBoundingClientRect();canvasWidth=Math.max(1,Math.round(rect.width*480/Math.max(1,rect.height)));el.width=canvasWidth;el.height=480;};
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);
  if(canvas.current)observer?.observe(canvas.current);window.addEventListener('resize',resize);resize();
  const loop=()=>{
   const now=Date.now(),dt=Math.max(0,(now-last)/1000);last=now;
   const model=game.current,oldPhase=model.phase,oldHits=model.hits;
   model.tick(now,dt,input.current.consume());
   if(model.hits>oldHits)play([180,120]);
   if(model.phase==='won'&&oldPhase!=='won')play([523,659,784,1046]);
   if(model.phase==='lost'&&oldPhase!=='lost')play([330,262,196]);
   if(canvas.current&&art.current&&now-lastDraw>=(model.touchFriendly?1000/30:1000/60)){
    lastDraw=now;const ctx=canvas.current.getContext('2d');if(ctx)renderGame(ctx,model,art.current,now/1000,canvasWidth);
   }
   if(now-lastUI>=100){lastUI=now;update(v=>v+1)}frame=requestAnimationFrame(loop);
  };
  frame=requestAnimationFrame(loop);
  const clear=()=>{input.current.clear();document.querySelectorAll<HTMLElement>('.touch-controls [data-pressed]').forEach(button=>delete button.dataset.pressed)};
  const keydown=(e:KeyboardEvent)=>{
   if(game.current.phase!=='travel'||helpRef.current||e.ctrlKey||e.metaKey||e.altKey)return;
   const target=e.target as HTMLElement;
   if(target?.closest('input,textarea,[role="dialog"]')||(e.code==='Space'&&target?.closest('button,a')))return;
   if(input.current.pressKey(e.code))e.preventDefault();
  };
  const keyup=(e:KeyboardEvent)=>input.current.releaseKey(e.code);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);touchQuery.removeEventListener('change',setTouchMode);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);void audio.current?.close()};
 },[]);
 useEffect(()=>{helpRef.current=help;input.current.clear()},[help]);
 useEffect(()=>{if(choosing)difficultyHeading.current?.focus()},[choosing]);
 useEffect(()=>{
  type Tool={name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(value:unknown)=>unknown};
  const context=(document as unknown as {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return;const lifecycle=new AbortController();
  const register=(tool:Tool)=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}};
  const validate=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length)throw new Error('引数は空のオブジェクトにしてください。')};
  register({name:'read_pudding_game',title:'ゲームの状態を見る',description:'選択中の難易度、現在の時刻、準備、やる気スイッチ、道中の進み具合を読み取ります。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(v){validate(v);return game.current.snapshot()}});
  register({name:'select_pudding_difficulty',title:'難易度を選ぶ',description:'開始前または結果画面で難易度を選びます。normalはおさんぽ（ミスで4分ロス）、trollは鬼畜（初見殺しの罠、ミスで10分ロス）。進行中は変更できません。',inputSchema:{type:'object',properties:{difficulty:{type:'string',enum:['normal','troll']}},required:['difficulty'],additionalProperties:false},annotations:{readOnlyHint:false},execute(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==1||!('difficulty' in v))throw new Error('difficultyだけを指定してください。');game.current.setDifficulty((v as {difficulty:unknown}).difficulty);setChoosing(true);update(x=>x+1);return game.current.snapshot()}});
  register({name:'start_pudding_day',title:'新しい一日をはじめる',description:'開始画面または結果画面から選択中の難易度で09:00に開始します。進行中のゲームはリセットできません。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(v){validate(v);if(game.current.active)throw new Error('一日はすでに進行中です。');if(!art.current)throw new Error('画像を読み込み中です。');setChoosing(false);game.current.start(Date.now());input.current.clear();update(x=>x+1);return game.current.snapshot()}});
  return()=>lifecycle.abort();
 },[]);
 const hour=Math.floor(g.minute/60).toString().padStart(2,'0'),minute=Math.floor(g.minute%60).toString().padStart(2,'0');
 const remain=Math.max(0,Math.ceil(1080-g.minute));const ended=g.phase==='won'||g.phase==='lost';
 const control=(which:Control)=>({
  onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.pressed='true';input.current.pressPointer(e.pointerId,which);if(which==='jump')play([440])},
  onPointerUp:(e:React.PointerEvent<HTMLButtonElement>)=>{input.current.releasePointer(e.pointerId);delete e.currentTarget.dataset.pressed},
  onPointerCancel:(e:React.PointerEvent<HTMLButtonElement>)=>{input.current.releasePointer(e.pointerId);delete e.currentTarget.dataset.pressed},
  onLostPointerCapture:(e:React.PointerEvent<HTMLButtonElement>)=>{input.current.releasePointer(e.pointerId);delete e.currentTarget.dataset.pressed},
  onClick:(e:React.MouseEvent)=>{if(e.detail===0&&which==='jump')input.current.queueJump()},
  onKeyDown:(e:React.KeyboardEvent<HTMLButtonElement>)=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();input.current.pressKey('button-'+which+'-'+e.code,which);e.currentTarget.dataset.pressed='true'}},
  onKeyUp:(e:React.KeyboardEvent<HTMLButtonElement>)=>{input.current.releaseKey('button-'+which+'-'+e.code);delete e.currentTarget.dataset.pressed},
  onBlur:()=>{input.current.releaseKey('button-'+which+'-Space');input.current.releaseKey('button-'+which+'-Enter')},
 });
 return <main className={"game-shell phase-"+g.phase+(choosing?' is-choosing':'')}>
 <header className="page-header"><a className="brand" href={sitePath('' )} aria-label="プリン買いにいこ ホーム"><span className="brand-pudding">🍮</span><div><h1>プリン買いにいこ<span>！</span></h1><p>PUDDING QUEST <span>—</span> やる気は、行方不明。</p></div></a><div className="header-controls"><span className="genre-tag">気まぐれおでかけゲーム</span><button className="icon-button" aria-label={sound?'サウンドをオフにする':'サウンドをオンにする'} aria-pressed={sound} onClick={()=>{soundRef.current=!sound;setSound(!sound);if(!sound)play([659])}}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><Dialog open={help} onOpenChange={setHelp}><DialogTrigger className="icon-button" aria-label="遊び方"><HelpCircle size={19}/></DialogTrigger><DialogContent className="help-dialog"><DialogTitle>プリンまでの、長い一日。</DialogTitle><DialogDescription>1日は約4分半。18:00の閉店までにプリン屋さんへ！</DialogDescription><p>現れる「やる気スイッチ」をクリック／タップ。起床 → 自動で歯みがき → 髪 → 着替え → 出発、と準備が進みます。歯みがきは起きたら自動で始まるので、スイッチは不要です。</p><p>11:00には自動で起床。16:00を過ぎるとスイッチが長く現れ、逃げなくなります。準備中に放っておくと二度寝や配信を始めます。</p><p>道中は ← → / A D で移動、Space / ↑ / W でジャンプ。スマホでは下の左右ボタンを押し続けて移動。もう片方の指でジャンプをタップできます。縦持ち・横持ちのどちらでも遊べます。箱と穴を飛び越え、右端のプリン屋へ！</p><p>「おさんぽ」は箱と穴のいつもの道。ミスで4分ロス。「鬼畜」は落下物・隠しブロック・崩れる床など、初見殺しの罠がある道。ミスで10分ロスです。どちらもチェックポイントから再挑戦。18:00でゲームオーバーです。</p><p className="help-warning">説明中も別のタブにいる間も、時計は進みます。</p></DialogContent></Dialog></div></header>
 <section className="game-window" aria-label="プリン買いにいこ ゲーム">
 <div className="window-bar"><div className="window-title">{g.travelStarted?<Footprints size={16}/>:<Moon size={16}/>}<span>STAGE {g.travelStarted?'02':'01'}</span><b>{g.travelStarted?'プリン屋さんへ！':'おでかけの準備'}</b></div><span className={"difficulty-badge "+g.difficulty}>{DIFFICULTIES[g.difficulty].name}</span><span className="window-state"><i/>{g.phase==='won'?'プリン確保':g.phase==='lost'?'閉店':g.travelStarted?'商店街':'おうち'}</span></div>
 <div className={'game-hud '+(g.minute>=1020?'urgent':'')}><div className="clock-block"><Sun size={24}/><div><span className="eyebrow">ただいまの時刻</span><strong>{hour}<span>:</span>{minute}</strong></div><span className="am-label">{g.minute<720?'AM':'PM'}</span></div><div className="deadline"><span>プリン屋さんの閉店まで</span><strong>あと {Math.floor(remain/60)}時間{(remain%60).toString().padStart(2,'0')}分</strong><span className="deadline-tag">18:00 CLOSE</span></div></div>
 <div className={'stage '+(g.phase==='title'?'initial-stage':'')+(ended?' ended-stage':'')} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(e.target===e.currentTarget||e.target===canvas.current){g.miss();refresh()}}}>
 <canvas ref={canvas} className="game-canvas" width={960} height={480} aria-label={g.travelStarted?'リリーを操作して障害物を飛び越え、プリン屋へ進む横スクロールゲーム':'寝たり準備したり配信したりする小悪魔のリリー'} />
 {g.phase==='title'&&!choosing&&<div className="intro-card"><span className="tiny-label">MISSION : GET THE PUDDING</span><h2>プリンが食べたいのじゃ。<br/>でも、起きたくないのじゃ。</h2><p>やる気スイッチをつかまえて、<br/>気まぐれなリリーをおでかけさせよう。</p><button className="primary-button" disabled={!ready&&!assetError} onClick={assetError?fetchArt:()=>setChoosing(true)}>{assetError?'画像を再読み込み':ready?'難易度を選ぶ':'お部屋を準備中…'}<ArrowRight size={19}/></button><span className="intro-note">{assetError?'画像を読み込めませんでした。もう一度お試しください。':'1プレイ 約4分半 ・ 音はオフではじまります'}</span></div>}
 {choosing&&<section className="difficulty-screen" aria-labelledby="difficulty-heading"><div className="difficulty-card"><span className="tiny-label">HOW MUCH SUFFERING?</span><h2 id="difficulty-heading" tabIndex={-1} ref={difficultyHeading}>今日の道は、どっち？</h2><p className="difficulty-lead">「プリンを買うだけ、のはずなのじゃ。」</p><RadioGroup className="difficulty-options" value={g.difficulty} onValueChange={choose} aria-label="道中の難易度"><label htmlFor="difficulty-normal" className={'difficulty-option '+(g.difficulty==='normal'?'selected':'')}><RadioGroupItem id="difficulty-normal" value="normal"/><span><strong>🍮 おさんぽ</strong><small>いつもの箱と穴。気軽におでかけ。</small><em>ミスで4分ロス</em></span></label><label htmlFor="difficulty-troll" className={'difficulty-option troll-option '+(g.difficulty==='troll'?'selected':'')}><RadioGroupItem id="difficulty-troll" value="troll"/><span><strong>💀 鬼畜</strong><small>初見殺し・隠し罠・偽ゴール。理不尽歓迎。</small><em>ミスで10分ロス ／ 覚えて突破</em></span></label></RadioGroup><p className="difficulty-note">準備とスマホ操作は共通。時計は開始ボタンを押してから。</p><div className="difficulty-actions"><button className="secondary-button" onClick={()=>setChoosing(false)}>戻る</button><button className="primary-button" onClick={start}>{DIFFICULTIES[g.difficulty].name}で出発準備<ArrowRight size={18}/></button></div></div></section>}
 {g.phase==='prep'&&<><div className="motivation-status"><Zap size={15}/>{g.late?'やる気、覚醒中！':'やる気スイッチをさがそう'}<span>{g.late?'今がチャンス':'16:00までは気まぐれ'}</span></div>{g.switchOn&&!g.busy&&<button className={'motivation-switch '+(g.late?'motivated':'')} style={{left:`calc(12px + (100% - var(--switch-width) - 24px) * ${g.switchX})`,top:`calc(56px + (100% - var(--switch-height) - 84px) * ${g.switchY})`}} onPointerDown={e=>{e.stopPropagation();e.preventDefault();motivate()}} onClick={e=>{if(e.detail===0)motivate()}} aria-label={`やる気スイッチ：${STEPS[g.nextStep]}`}><span><Zap size={21} fill="currentColor"/>やる気スイッチ</span><small>{STEPS[g.nextStep]}！</small></button>}</>}
 {g.active&&g.notice&&g.noticeUntil>g.age&&<div className={'game-notice '+(g.busy?'busy-notice':'')} aria-live="polite">{g.notice}</div>}
 {g.phase==='travel'&&<div className="travel-distance"><span>プリンまで あと {Math.max(0,Math.ceil((WORLD_END-75-g.x)/10))}m</span><Progress value={g.x/WORLD_END*100} aria-label="プリン屋までの進み具合"/></div>}
 {ended&&!choosing&&<div className="result-scrim"><div className={'result-card '+(g.phase==='won'?'success':'')}><span className="result-emoji">{g.phase==='won'?'🍮':'🌙'}</span><span className="tiny-label">{g.phase==='won'?'MISSION COMPLETE':'GAME OVER'}</span><h2>{g.phase==='won'?'プリン、買えた！':'プリン屋、閉まった。'}</h2><p>{g.phase==='won'?'今日のやる気は、すべて使い切ったのじゃ。':g.travelStarted?'家を出ただけでも、えらかったのじゃ。':'明日こそ、本気を出すのじゃ。'}</p><span className={"result-difficulty difficulty-badge "+g.difficulty}>{DIFFICULTIES[g.difficulty].name}</span><div className="result-stats"><span>{g.phase==='won'?'到着':'閉店'}<b>{hour}:{minute}</b></span><span>二度寝<b>{g.sleeps} 回</b></span><span>配信<b>{g.streams} 回</b></span><span>ミス<b>{g.hits} 回</b></span></div><button className="primary-button" onClick={start}><RotateCcw size={17}/>同じ難易度でもう一日</button><button className="secondary-button change-difficulty" onClick={()=>setChoosing(true)}>難易度を選び直す</button></div></div>}
 <span className="scene-location">{g.travelStarted?<Footprints size={14}/>:<Moon size={14}/>} {g.travelStarted?'夕焼け商店街':'リリーのお部屋'}</span>
 </div>
 {g.phase==='travel'&&<div className="touch-controls" aria-label="移動とジャンプの操作" onContextMenu={e=>e.preventDefault()}><div><button aria-label="左に移動" {...control('left')}><ArrowLeft/><small>左</small></button><button aria-label="右に移動" {...control('right')}><ArrowRight/><small>右</small></button></div><span>← → 移動 <kbd>SPACE</kbd> ジャンプ</span><button className="jump-button" aria-label="ジャンプ" {...control('jump')}>ジャンプ ↑</button></div>}
 <div className="dialogue" aria-live="polite" aria-atomic="true"><div className="portrait"><img src={sitePath('character-reference.webp')} alt=""/></div><div><span className="speaker">リリー <span>{g.phase==='won'?'ごきげん':g.phase==='lost'?'しょんぼり':g.travelStarted?'プリンへ一直線':MODES[g.activity]}</span></span><p>{g.quote}</p></div><span className="dialogue-mark">▼</span></div>
 <div className="prep-list">{STEPS.map((s,i)=><div className={'prep-step '+(g.done[i]?'complete':(g.pending>=0?g.pending:g.nextStep)===i?'current':'')} key={s}><span className="step-number">{g.done[i]?<Check size={14}/>:i+1}</span><span>{s}{i===1&&<small className="auto-step-label">自動</small>}</span>{i<4&&<span className="step-arrow">›</span>}</div>)}</div>
 </section>
 <section className="day-timeline" aria-label="一日のタイムライン"><div className="timeline-track"><div className="early-zone"/><div className="late-zone"/><Progress value={(g.minute-540)/540*100} aria-label="一日の経過"/><span className="timeline-now" style={{left:`${(g.minute-540)/540*100}%`}} /></div><div className="timeline-labels"><span><b>09:00</b>おはよう…？</span><span><b>11:00</b>強制おめざめ</span><span><b>16:00</b><Sparkles size={13}/>やる気、覚醒</span><span><b>18:00</b>閉店ガラガラ</span></div></section>
 <footer className="game-footer"><div><span className="tip-label">あそびかた</span><p>{g.travelStarted?<>← → / A D で移動、<b>Space / ↑ でジャンプ。</b> 箱と穴に注意！</>:<>現れては消える <b>やる気スイッチ</b> をクリック／タップ。</>}</p></div><span className="footer-comment"><Heart size={14}/> やる気がないのも、仕様です。</span></footer>
 </main>
}
