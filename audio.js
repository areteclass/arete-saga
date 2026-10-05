/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v34 소리 (audio.js)
   · 외부 음원 파일 없이 브라우저가 직접 연주 (칩튠 시퀀서)
   · 배경음 8곡: 타이틀 · 1~5번 섬 · 퀴즈 전투 · 보스전 — 장소에 따라 부드럽게 바뀜
   · 효과음 30여 종: 타격·스킬·UI·정답/오답·레벨업·상자·업적 등
   · 설정 화면에 [배경음 크기] [효과음 크기] 추가
   기존 beep/noise/sfx/startBgm/stopBgm/bgmMaybe 를 같은 이름으로 대체(다른 파일은 수정 불필요)
   로드 순서: ... fx.js → skills.js → audio.js
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof beep!=='function'||typeof noise!=='function'||typeof sfx!=='function'||typeof audioInit!=='function'){ console.warn('audio.js: 원본 소리 엔진을 찾지 못함'); return; }

var Au={ok:false,music:null,sfxBus:null,musicBus:null,comp:null,noiseBuf:null,cur:null,seq:null,fading:[],duckUntil:0};
function curVol(k){ var o=(typeof OPT!=='undefined')?OPT:{}; return (o.vol===undefined?1:o.vol)*(o[k]===undefined?(k==='musicVol'?0.7:1):o[k]); }
function ensure(){
  if(Au.ok) return true;
  if(typeof audioInit==='function') audioInit();
  if(!AC) return false;
  try{
    Au.comp=AC.createDynamicsCompressor(); Au.comp.threshold.value=-14; Au.comp.knee.value=18; Au.comp.ratio.value=5; Au.comp.attack.value=0.004; Au.comp.release.value=0.2;
    Au.comp.connect(AC.destination);
    Au.sfxBus=AC.createGain(); Au.sfxBus.gain.value=0.9; Au.sfxBus.connect(Au.comp);
    Au.musicBus=AC.createGain(); Au.musicBus.gain.value=0.34; Au.musicBus.connect(Au.comp);
    var len=AC.sampleRate*1, b=AC.createBuffer(1,len,AC.sampleRate), d=b.getChannelData(0); for(var i=0;i<len;i++) d[i]=Math.random()*2-1; Au.noiseBuf=b;
    Au.ok=true;
  }catch(e){ return false; }
  return true;
}
function resume(){ try{ if(AC&&AC.state==='suspended') AC.resume(); }catch(e){} }

/* ───────────── 기본 소리 (같은 이름으로 대체) ───────────── */
function envGain(t,vol,att,dur,rel){
  var g=AC.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att);
  g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(att+0.01,dur+(rel||0))); return g;
}
beep=function(freq,dur,type,vol,slideTo){
  if(!AC||muted||!ensure()) return; resume();
  try{
    var t=AC.currentTime, o=AC.createOscillator(), g=envGain(t,(vol||0.05)*curVol('sfxVol')*1.0,0.004,dur,0.02);
    o.type=type||'square'; o.frequency.setValueAtTime(freq,t); if(slideTo) o.frequency.linearRampToValueAtTime(slideTo,t+dur);
    o.connect(g); g.connect(Au.sfxBus); o.start(t); o.stop(t+dur+0.05);
  }catch(e){}
};
noise=function(dur,vol,hp){
  if(!AC||muted||!ensure()) return; resume();
  try{
    var t=AC.currentTime, s=AC.createBufferSource(); s.buffer=Au.noiseBuf; s.loop=true;
    var f=AC.createBiquadFilter(); f.type=hp?'highpass':'lowpass'; f.frequency.value=hp?4000:6000;
    var g=envGain(t,(vol||0.05)*curVol('sfxVol'),0.002,dur,0.01);
    s.connect(f); f.connect(g); g.connect(Au.sfxBus); s.start(t,Math.random()*0.5); s.stop(t+dur+0.05);
  }catch(e){}
};
function tone(f,dur,type,vol,slide,delay){ if(delay){ setTimeout(function(){ beep(f,dur,type,vol,slide); },delay); } else beep(f,dur,type,vol,slide); }
function seqTones(notes,step,type,vol,dur){ notes.forEach(function(f,i){ tone(f,dur||step*1.6,type||'triangle',vol||0.05,0,i*step); }); }

var lastSfx={};
function gate(name,ms){ var t=performance.now(); if(lastSfx[name]&&t-lastSfx[name]<ms) return false; lastSfx[name]=t; return true; }
var _sfxOld=sfx;
sfx=function(name){
  if(!AC||muted) return;
  if(!ensure()) return;
  switch(name){
    case 'click': if(!gate('click',45)) return; tone(940,0.025,'square',0.028); break;
    case 'open':  if(!gate('open',90)) return; noise(0.07,0.025); tone(420,0.07,'triangle',0.03,720); break;
    case 'close': if(!gate('close',90)) return; noise(0.06,0.02); tone(620,0.07,'triangle',0.028,360); break;
    case 'ok':    tone(784,0.07,'square',0.045); tone(988,0.07,'square',0.045,0,70); tone(1319,0.16,'square',0.05,0,140); tone(1319,0.2,'triangle',0.04,0,140); break;
    case 'no':    tone(190,0.2,'sawtooth',0.05,80); tone(150,0.22,'square',0.035,70,60); break;
    case 'combo': seqTones([880,1175,1568,2093],0.045,'square',0.04); break;
    case 'hit':   if(!gate('hit',40)) return; noise(0.08,0.05); tone(190,0.09,'sawtooth',0.05,70); break;
    case 'crit':  noise(0.12,0.06); tone(150,0.14,'sawtooth',0.06,50); tone(1400,0.08,'square',0.04,0,25); tone(1900,0.1,'triangle',0.035,0,60); break;
    case 'heavy': noise(0.16,0.07); tone(90,0.2,'triangle',0.08,40); tone(150,0.1,'sawtooth',0.04,60); break;
    case 'atk':   if(!gate('atk',60)) return; noise(0.07,0.035,true); tone(340,0.07,'square',0.03,130); break;
    case 'miss':  noise(0.09,0.03,true); tone(500,0.09,'triangle',0.02,200); break;
    case 'hurt':  if(!gate('hurt',120)) return; tone(240,0.22,'sawtooth',0.06,60); noise(0.12,0.05); tone(120,0.18,'square',0.035,50,40); break;
    case 'die':   tone(400,0.5,'sawtooth',0.06,50); tone(200,0.6,'square',0.04,40,120); noise(0.3,0.04); break;
    case 'mobdie':if(!gate('mobdie',70)) return; noise(0.13,0.045); tone(520,0.13,'square',0.035,110); break;
    case 'alert': if(!gate('alert',320)) return; tone(880,0.05,'square',0.03); tone(1244,0.08,'square',0.035,0,60); break;
    case 'dash':  noise(0.14,0.04,true); tone(420,0.14,'triangle',0.03,1300); break;
    case 'heal':  seqTones([523,659,784,1047],0.06,'triangle',0.045,0.16); break;
    case 'shield':tone(380,0.18,'sine',0.05,820); noise(0.1,0.025,true); tone(1200,0.1,'triangle',0.03,0,100); break;
    case 'lvl':   seqTones([523,659,784,1047,1319,1568],0.085,'square',0.05,0.2); seqTones([262,330,392,523,659,784],0.085,'triangle',0.05,0.28); break;
    case 'chest': seqTones([784,988,1175,1568],0.06,'triangle',0.05,0.2); tone(2093,0.25,'sine',0.03,0,240); break;
    case 'buy':   tone(988,0.05,'square',0.04); tone(1480,0.09,'square',0.04,0,60); break;
    case 'coin':  if(!gate('coin',60)) return; tone(1319,0.05,'square',0.03); tone(1760,0.1,'square',0.03,0,50); break;
    case 'sp':    seqTones([1047,1319,1568,2093],0.05,'triangle',0.04,0.14); break;
    case 'equip': noise(0.05,0.03,true); tone(700,0.04,'square',0.035); tone(1050,0.07,'triangle',0.035,0,45); break;
    case 'enhance':seqTones([440,554,659,880],0.07,'square',0.045,0.14); tone(1760,0.25,'triangle',0.04,0,300); break;
    case 'enhanceFail': tone(260,0.3,'sawtooth',0.05,90); noise(0.15,0.04); break;
    case 'tick':  tone(1100,0.035,'square',0.03); break;
    case 'tickWarn': tone(1500,0.05,'square',0.045); tone(1100,0.05,'square',0.03,0,70); break;
    case 'boss':  tone(98,0.7,'sawtooth',0.07,52); tone(73,0.8,'square',0.04,40,100); noise(0.4,0.05); tone(196,0.4,'sawtooth',0.03,98,200); break;
    case 'relic': seqTones([659,784,988,1318,1568,1976],0.13,'triangle',0.05,0.4); seqTones([330,392,494,659],0.2,'sine',0.04,0.5); break;
    case 'achv':  seqTones([784,1047,1319,1568],0.09,'triangle',0.05,0.25); tone(2093,0.4,'sine',0.04,0,400); tone(1568,0.4,'triangle',0.03,0,400); break;
    case 'codex': tone(1319,0.18,'sine',0.04); tone(1976,0.3,'sine',0.035,0,110); break;
    case 'victory': seqTones([523,659,784,1047],0.11,'square',0.05,0.18); seqTones([784,1047,1319,1568],0.11,'triangle',0.05,0.5); break;
    case 'defeat':  seqTones([440,392,349,294],0.2,'sawtooth',0.04,0.3); break;
    case 'cast':  noise(0.12,0.03,true); tone(520,0.2,'triangle',0.04,1040); break;
    case 'fire':  noise(0.22,0.05); tone(520,0.22,'sawtooth',0.035,140); break;
    default: _sfxOld(name);
  }
};

/* ───────────── 음악 이론 도구 ───────────── */
var PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(name){ var m=/^([A-G])([#b]?)(-?\d)$/.exec(name); if(!m) return null; var v=PC[m[1]]+(m[2]==='#'?1:(m[2]==='b'?-1:0)); return 12*(Number(m[3])+1)+v; }
function hz(m){ return 440*Math.pow(2,(m-69)/12); }
function chordTones(sym,oct){
  var m=/^([A-G][#b]?)(m|7|M7|dim)?$/.exec(sym); if(!m) return [];
  var r=midi(m[1]+oct), q=m[2]||'';
  var iv=(q==='m')?[0,3,7]:(q==='7')?[0,4,7,10]:(q==='dim')?[0,3,6]:[0,4,7];
  return iv.map(function(x){ return r+x; });
}
/* 리듬 패턴: 16칸(16분음표) × 마디 */
var DRUMS={
  soft:  {k:[0,8],  s:[],       h:[0,2,4,6,8,10,12,14], hv:0.35},
  rock:  {k:[0,6,10], s:[4,12], h:[0,2,4,6,8,10,12,14], hv:0.5},
  march: {k:[0,8],  s:[4,12,14], h:[0,4,8,12], hv:0.35, t:[6,10]},
  fast:  {k:[0,3,4,8,11,12], s:[4,12], h:[0,2,4,6,8,10,12,14], hv:0.55},
  tom:   {k:[0,8],  s:[12],     h:[0,4,8,12], hv:0.3, t:[3,6,10,14]},
  none:  {k:[],s:[],h:[]}
};
function bassPat(style,r){      // [step,midi,len]
  var f=r+7, o=r+12;
  if(style==='walk') return [[0,r,4],[4,f,4],[8,r,4],[12,r+4,4]];
  if(style==='driving'){ var a=[]; for(var i=0;i<8;i++) a.push([i*2,(i%4===3)?o:r,2]); return a; }
  if(style==='octave') return [[0,r,2],[2,o,2],[4,r,2],[6,o,2],[8,r,2],[10,o,2],[12,r,2],[14,o,2]];
  return [[0,r,8],[8,f,8]];      // half
}
function arpPat(style,tones,oct){
  if(style==='none') return [];
  var base=tones.map(function(x){ return x+12*(oct||1); }), idx, out=[], i;
  if(style==='updown') idx=[0,1,2,1,0,1,2,1];
  else idx=[0,1,2,0,1,2,1,2];
  for(i=0;i<8;i++) out.push([i*2,base[idx[i]%base.length],2]);
  return out;
}

/* ───────────── 곡 (8마디 반복) ───────────── */
/* lead: 마디마다 'E5:4 G5:4 ...' (칸 수 합계 16), r = 쉼표. prog: 마디별 코드 */
var TRACKS={
  title:{bpm:88,key:'C',prog:['C','Am','F','G','C','Am','Dm','G'],lw:'triangle',lv:0.5,arp:'updown',aw:'sine',av:0.28,bass:'half',drums:'none',pad:true,echo:0.22,
    lead:['E5:6 G5:2 E5:4 D5:4','C5:4 E5:4 A5:8','A5:6 G5:2 F5:4 E5:4','D5:4 G5:4 B5:8','E5:6 G5:2 C6:4 B5:4','A5:4 C6:4 E6:8','D6:6 C6:2 A5:4 F5:4','G5:4 B5:4 C6:8']},
  r1:{bpm:104,key:'C',prog:['C','G','Am','F','C','G','F','G'],lw:'triangle',lv:0.55,arp:'updown',aw:'square',av:0.12,bass:'walk',drums:'soft',pad:false,echo:0.12,
    lead:['E5:2 G5:2 C6:4 G5:2 E5:2 D5:4','D5:2 G5:2 B5:4 G5:2 D5:2 B4:4','C5:2 E5:2 A5:4 E5:2 C5:2 A4:4','A4:2 C5:2 F5:4 C5:2 A4:2 F5:4','E5:2 G5:2 C6:4 G5:2 E5:2 G5:4','D5:2 G5:2 B5:4 D6:4 B5:4','C6:2 A5:2 F5:4 A5:2 C6:2 F6:4','D6:4 B5:4 G5:4 D5:4']},
  r2:{bpm:84,key:'D',prog:['Dm','Bb','C','Am','Dm','Bb','A','Dm'],lw:'triangle',lv:0.5,arp:'up8',aw:'sine',av:0.2,bass:'half',drums:'none',pad:true,echo:0.35,
    lead:['A4:8 D5:4 F5:4','D5:8 Bb4:4 D5:4','E5:8 C5:4 E5:4','C5:8 A4:4 C5:4','F5:8 D5:4 A4:4','D5:8 Bb4:4 F5:4','E5:4 C#5:4 E5:4 A5:4','D5:12 r:4']},
  r3:{bpm:112,key:'A',prog:['Am','Bb','Am','G','Am','Bb','G','Am'],lw:'square',lv:0.42,arp:'none',aw:'square',av:0.1,bass:'driving',drums:'tom',pad:false,echo:0.1,
    lead:['A4:4 Bb4:2 A4:2 E5:4 D5:4','Bb4:4 D5:2 F5:2 E5:4 D5:4','A4:4 C5:2 E5:2 A5:4 G5:4','G5:4 E5:2 D5:2 B4:8','A4:4 Bb4:2 A4:2 E5:4 G5:4','F5:4 E5:2 D5:2 Bb4:4 D5:4','D5:4 G5:4 B5:4 G5:4','A5:8 E5:4 A4:4']},
  r4:{bpm:124,key:'E',prog:['Em','C','G','D','Em','C','D','B'],lw:'square',lv:0.42,arp:'up8',aw:'triangle',av:0.3,bass:'driving',drums:'fast',pad:false,echo:0.08,
    lead:['E5:2 G5:2 B5:4 A5:2 G5:2 E5:4','E5:2 G5:2 C6:4 B5:2 A5:2 G5:4','D5:2 G5:2 B5:4 D6:2 B5:2 G5:4','F#5:2 A5:2 D6:4 C#6:2 A5:2 F#5:4','E5:2 G5:2 B5:4 E6:4 B5:4','C6:2 B5:2 G5:2 E5:2 G5:4 C6:4','D6:2 C#6:2 A5:2 F#5:2 D6:8','D#6:4 B5:4 F#5:4 B5:4']},
  r5:{bpm:108,key:'F#',prog:['F#m','D','E','C#','F#m','D','Bm','C#'],lw:'square',lv:0.38,arp:'up8',aw:'triangle',av:0.18,bass:'octave',drums:'march',pad:true,echo:0.18,
    lead:['F#5:4 A5:4 C#6:4 A5:4','F#5:4 A5:4 D6:8','G#5:4 B5:4 E6:4 B5:4','F5:4 G#5:4 C#6:8','C#6:4 A5:4 F#5:4 A5:4','D6:4 A5:4 F#5:8','D6:4 B5:4 F#5:4 B5:4','C#6:4 F6:4 G#5:8']},
  battle:{bpm:138,key:'A',prog:['Am','F','G','E','Am','F','G','E'],lw:'square',lv:0.4,arp:'up8',aw:'triangle',av:0.2,bass:'driving',drums:'rock',pad:false,echo:0.06,
    lead:['A4:2 r:2 A4:2 C5:2 E5:4 C5:4','F4:2 r:2 F4:2 A4:2 C5:4 A4:4','G4:2 r:2 G4:2 B4:2 D5:4 B4:4','E5:2 r:2 E5:2 G#5:2 B5:4 G#5:4','A5:2 r:2 A5:2 E5:2 C6:4 A5:4','F5:2 r:2 F5:2 C5:2 A5:4 F5:4','G5:2 r:2 G5:2 D5:2 B5:4 G5:4','E5:4 G#5:4 B5:4 E6:4']},
  boss:{bpm:160,key:'D',prog:['Dm','Dm','Bb','A','Dm','Gm','A','A'],lw:'sawtooth',lv:0.5,arp:'none',aw:'square',av:0.1,bass:'driving',drums:'fast',pad:true,echo:0.05,
    lead:['D5:1 F5:1 A5:1 F5:1 D5:1 F5:1 A5:1 F5:1 D6:2 A5:2 F5:2 A5:2','D5:1 F5:1 A5:1 F5:1 D5:1 F5:1 A5:1 F5:1 C6:2 A5:2 F5:2 A5:2','Bb5:2 D6:2 F6:4 D6:2 Bb5:2 F5:4','C#6:2 E6:2 A6:4 E6:2 C#6:2 A5:4','D6:2 F6:2 A6:4 F6:2 D6:2 A5:4','G5:2 Bb5:2 D6:4 Bb5:2 G5:2 D5:4','A5:2 C#6:2 E6:4 A6:4 E6:4','A5:1 Bb5:1 A5:1 G#5:1 A5:4 E5:4 A5:4']}
};
/* 곡 → 이벤트(칸 번호별) 목록으로 미리 계산 */
function compile(name){
  var T=TRACKS[name]; if(T._c) return T._c;
  var steps=T.prog.length*16, ev=[], bar, i, s, tok, n, len, m;
  var drum=DRUMS[T.drums]||DRUMS.none;
  for(i=0;i<steps;i++) ev.push([]);
  T.lead.forEach(function(line,b){ s=b*16; line.split(' ').forEach(function(x){ tok=x.split(':'); len=Number(tok[1]); if(tok[0]!=='r'){ n=midi(tok[0]); if(n!==null) ev[s].push({ch:'lead',m:n,len:len}); } s+=len; }); });
  T.prog.forEach(function(sym,b){
    var tn=chordTones(sym,3), root=tn[0]-12;                       // 베이스는 코드 근음의 한 옥타브 아래
    bassPat(T.bass,root).forEach(function(p){ ev[b*16+p[0]].push({ch:'bass',m:p[1],len:p[2]}); });
    arpPat(T.arp,tn.slice(0,3),1).forEach(function(p){ ev[b*16+p[0]].push({ch:'arp',m:p[1],len:p[2]}); });
    if(T.pad) ev[b*16].push({ch:'pad',ms:tn.slice(0,3).map(function(x){return x+12;}),len:16});
    drum.k.forEach(function(p){ ev[b*16+p].push({ch:'kick'}); });
    drum.s.forEach(function(p){ ev[b*16+p].push({ch:'snare'}); });
    drum.h.forEach(function(p){ ev[b*16+p].push({ch:'hat',v:drum.hv}); });
    (drum.t||[]).forEach(function(p){ ev[b*16+p].push({ch:'tom',m:root+24-(p%3)*2}); });
  });
  return (T._c={steps:steps,ev:ev,stepDur:60/T.bpm/4,key:T.key});
}

/* ───────────── 악기 ───────────── */
function osc(type,freq,t,dur,vol,dest,opts){
  var o=AC.createOscillator(), g=AC.createGain(), a=(opts&&opts.att)||0.008, rel=(opts&&opts.rel)||0.06;
  o.type=type; o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+a);
  g.gain.setValueAtTime(vol*((opts&&opts.sus)||0.7),t+Math.min(dur*0.5,0.12));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur+rel);
  if(opts&&opts.lp){ var f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=opts.lp; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(dest); o.start(t); o.stop(t+dur+rel+0.02);
  return g;
}
function drumHit(kind,t,v,dest){
  if(kind==='kick'){ var o=AC.createOscillator(), g=AC.createGain(); o.type='sine'; o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(42,t+0.12);
    g.gain.setValueAtTime(0.4*v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.18); return; }
  if(kind==='tom'){ var o2=AC.createOscillator(), g2=AC.createGain(); o2.type='sine'; o2.frequency.setValueAtTime(v,t); o2.frequency.exponentialRampToValueAtTime(v*0.6,t+0.14);
    g2.gain.setValueAtTime(0.3,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.16); o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t+0.18); return; }
  var s=AC.createBufferSource(); s.buffer=Au.noiseBuf; var f=AC.createBiquadFilter(), g3=AC.createGain();
  if(kind==='snare'){ f.type='bandpass'; f.frequency.value=1800; g3.gain.setValueAtTime(0.32,t); g3.gain.exponentialRampToValueAtTime(0.0001,t+0.13); }
  else { f.type='highpass'; f.frequency.value=7000; g3.gain.setValueAtTime(0.16*(v||0.5),t); g3.gain.exponentialRampToValueAtTime(0.0001,t+0.04); }
  s.connect(f); f.connect(g3); g3.connect(dest); s.start(t,Math.random()*0.4); s.stop(t+0.15);
}

/* ───────────── 연주기 (미리 예약하는 방식) ───────────── */
function Sequencer(name){
  this.name=name; this.T=TRACKS[name]; this.C=compile(name); this.step=0; this.t=AC.currentTime+0.08; this.stopped=false;
  this.out=AC.createGain(); this.out.gain.value=0.0001; this.out.connect(Au.musicBus);
  if(this.T.echo){ this.dl=AC.createDelay(1); this.dl.delayTime.value=60/this.T.bpm*0.75; var fb=AC.createGain(); fb.gain.value=0.3; var wet=AC.createGain(); wet.gain.value=this.T.echo;
    this.dl.connect(fb); fb.connect(this.dl); this.dl.connect(wet); wet.connect(this.out); }
  var self=this; this.timer=setInterval(function(){ self.tick(); },45); this.tick();
}
Sequencer.prototype.tick=function(){
  if(this.stopped||!AC) return;
  var ahead=AC.currentTime+0.28, T=this.T;
  if(this.t<AC.currentTime-0.5) this.t=AC.currentTime+0.05;           // 탭이 멈췄다 돌아온 경우 따라잡기
  while(this.t<ahead){
    var evs=this.C.ev[this.step%this.C.steps], t=this.t, sd=this.C.stepDur;
    for(var i=0;i<evs.length;i++){ var e=evs[i];
      if(e.ch==='lead'){ var d=Math.max(0.05,e.len*sd*0.92); var g=osc(T.lw,hz(e.m),t,d,0.5*(T.lv||0.4),this.out,{lp:T.lw==='square'?2600:(T.lw==='sawtooth'?1800:null),att:0.01}); if(this.dl) g.connect(this.dl); }
      else if(e.ch==='arp') osc(T.aw,hz(e.m),t,e.len*sd*0.7,0.3*(T.av||0.2),this.out,{att:0.004,rel:0.05});
      else if(e.ch==='bass') osc('triangle',hz(e.m),t,e.len*sd*0.9,0.14,this.out,{att:0.005,sus:0.9,rel:0.04});
      else if(e.ch==='pad'){ for(var k=0;k<e.ms.length;k++) osc('sine',hz(e.ms[k]),t,e.len*sd*0.98,0.05,this.out,{att:0.35,rel:0.5,sus:1}); }
      else if(e.ch==='tom') drumHit('tom',t,hz(e.m),this.out);
      else drumHit(e.ch,t,e.v||1,this.out);
    }
    this.t+=this.C.stepDur; this.step++;
  }
};
Sequencer.prototype.fadeIn=function(sec){ var g=this.out.gain, t=AC.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(0.0001,t); g.linearRampToValueAtTime(1,t+sec); };
Sequencer.prototype.fadeOut=function(sec){ var g=this.out.gain, t=AC.currentTime, self=this; try{ g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001,g.value),t); g.linearRampToValueAtTime(0.0001,t+sec); }catch(e){}
  setTimeout(function(){ self.stop(); },sec*1000+120); };
Sequencer.prototype.stop=function(){ this.stopped=true; clearInterval(this.timer); try{ this.out.disconnect(); }catch(e){} };

var MusicCtl={
  play:function(name){
    if(!ensure()||muted||!TRACKS[name]) return; resume();
    if(Au.cur===name&&Au.seq&&!Au.seq.stopped) return;
    if(Au.seq) Au.seq.fadeOut(0.7);
    Au.cur=name; Au.seq=new Sequencer(name); Au.seq.fadeIn(0.9);
  },
  stop:function(){ if(Au.seq){ Au.seq.fadeOut(0.4); Au.seq=null; } Au.cur=null; },
  update:function(){
    if(!Au.ok) return;
    var duck=(performance.now()<Au.duckUntil)?0.35:1, base=0.34*curVol('musicVol')*duck;
    try{ Au.musicBus.gain.setTargetAtTime(base,AC.currentTime,0.15); }catch(e){}
  },
  duck:function(sec){ Au.duckUntil=performance.now()+sec*1000; }
};
function wantedTrack(){
  try{
    var bt=document.getElementById('battle');
    if(bt&&bt.classList.contains('open')) return (typeof B!=='undefined'&&B&&B.mode==='boss')?'boss':'battle';
    if(typeof G==='undefined'||!G.save||typeof running==='undefined'||!running) return 'title';
    var en=document.getElementById('ending'); if(en&&en.classList.contains('open')) return 'title';
    var reg=(G.regions[curZone]&&G.regions[curZone].id)||'r1'; return TRACKS[reg]?reg:'r1';
  }catch(e){ return 'title'; }
}
var pollT=null;
function poll(){ if(muted||!AC){ return; } MusicCtl.update(); var w=wantedTrack(); if(w!==Au.cur||!Au.seq) MusicCtl.play(w);
  var rl=document.getElementById('relic'); if(rl&&rl.classList.contains('open')) MusicCtl.duck(0.8); }
/* 기존 배경음 함수를 대체 */
startBgm=function(){ if(muted) return; audioInit(); if(!AC||!ensure()) return; resume(); if(!pollT) pollT=setInterval(poll,400); poll(); };
stopBgm=function(){ if(pollT){ clearInterval(pollT); pollT=null; } MusicCtl.stop(); };
bgmMaybe=function(){ if(!pollT&&!muted) startBgm(); };

/* ───────────── 상황별 효과음 연결 ───────────── */
(function hookEvents(){
  if(typeof hurt==='function'){ var _h=hurt; hurt=function(){ sfx('hurt'); return _h.apply(this,arguments); }; }
  if(typeof openOvl==='function'){ var _o=openOvl; openOvl=function(id){ if(id!=='battle') sfx('open'); return _o.apply(this,arguments); }; }
  if(typeof closeOvl==='function'){ var _c=closeOvl; closeOvl=function(id){ if(id!=='battle') sfx('close'); return _c.apply(this,arguments); }; }
  document.addEventListener('pointerdown',function(ev){ var t=ev.target; if(!t||!t.closest) return; if(t.closest('.choice,.skbtn,#abtn,#stick,#dodgebtn,#game')) return; if(t.closest('button,.shop-item,.slot,[onclick]')) sfx('click'); },true);
  /* 몬스터가 나를 발견했을 때 · 쓰러졌을 때 */
  if(typeof update==='function'){
    var _u=update;
    update=function(dt){
      _u(dt);
      try{ if(!G.save||!window.entities) return;
        for(var i=0;i<entities.length;i++){ var e=entities[i]; if(e.type!=='hunt') continue;
          if(e.aggro&&!e._aA){ e._aA=1; if(Math.hypot(e.tx-player.x,e.ty-player.y)<6) sfx('alert'); } else if(!e.aggro) e._aA=0;
          if(e.dead&&!e._dA){ e._dA=1; if(Math.hypot(e.tx-player.x,e.ty-player.y)<8) sfx('mobdie'); } else if(!e.dead) e._dA=0; }
      }catch(err){}
    };
  }
})();

/* ───────────── 설정 화면: 배경음·효과음 크기 ───────────── */
if(typeof renderSettings==='function'){
  var _rs=renderSettings;
  renderSettings=function(){
    _rs();
    var b=document.getElementById('set-body'); if(!b||document.getElementById('au-rows')) return;
    function row(label,key,def){
      var v=Math.round(((OPT[key]===undefined?def:OPT[key]))*100);
      return '<div style="display:flex;justify-content:space-between"><span>'+label+'</span><span id="au-'+key+'" style="color:var(--gold)">'+v+'%</span></div>'+
        '<input type="range" min="0" max="100" value="'+v+'" style="width:100%;margin-top:6px" oninput="AUSET(\''+key+'\',this.value)">';
    }
    var d=document.createElement('div'); d.id='au-rows'; d.className='qrow'; d.style.display='block';
    d.innerHTML=row('🎵 배경음 크기','musicVol',0.7)+'<div style="height:10px"></div>'+row('🔔 효과음 크기','sfxVol',1)+
      '<div style="margin-top:8px;display:flex;gap:6px"><button class="btn ghost" style="flex:1;padding:8px;font-size:11px" onclick="AUTEST(\'ok\')">정답음</button><button class="btn ghost" style="flex:1;padding:8px;font-size:11px" onclick="AUTEST(\'hit\')">타격음</button><button class="btn ghost" style="flex:1;padding:8px;font-size:11px" onclick="AUTEST(\'lvl\')">레벨업</button></div>';
    b.appendChild(d);
  };
}
window.AUSET=function(key,v){ OPT[key]=Number(v)/100; var el=document.getElementById('au-'+key); if(el) el.textContent=v+'%'; if(typeof saveOpt==='function') saveOpt(); MusicCtl.update(); };
window.AUTEST=function(n){ audioInit(); resume(); sfx(n); };

window.AU={tracks:TRACKS,compile:compile,play:MusicCtl.play,stop:MusicCtl.stop,duck:MusicCtl.duck,midi:midi,hz:hz,chordTones:chordTones,state:Au,sfx:sfx};
})();
