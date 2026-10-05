/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v34 퀴즈 전투 화면 (battle.js)
   · 큰 아레나(지역별 배경·분위기 입자) 위에 일러스트 영웅(장비·꾸미기 반영) VS 도트 수호병·보스
   · 정답: 영웅이 돌진해 베거나(평소) 캐릭터 고유 속성 공격(3연속 정답·마지막 일격·보스전)
          화염구 · 대지 충격파 · 바람 칼날 · 빛기둥 · 번개  — 적이 흔들리고 사라지며 보상 표시
   · 오답: 적이 달려들어 영웅이 맞음(체력바·피해 숫자) / 퀴즈 스킬·아이템 사용 연출
   · 보기 큰 버튼 + 키보드 1~4, 보스 제한시간 막대와 마지막 5초 경고음, 보스 등장 연출
   기존 index.html의 전투 규칙은 그대로 두고 화면과 연출만 교체. 로드 순서: ... audio.js → battle.js
   ═══════════════════════════════════════════════════════════════ */
(function(){
var panel=document.querySelector('#battle .panel');
if(!panel||typeof startBattle!=='function'||typeof renderQuestion!=='function'||typeof answer!=='function'){ console.warn('battle.js: 원본 전투 화면을 찾지 못함'); return; }

/* ───────────── 도구 ───────────── */
function rnd(a,b){ return a+Math.random()*(b-a); }
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
function outC(t){ t=Math.max(0,Math.min(1,t)); return 1-Math.pow(1-t,3); }
function mkc(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
var _rc={};
function rgba(hex,a){ var c=_rc[hex]; if(!c){ var n=parseInt(hex.slice(1),16); c=_rc[hex]=[(n>>16)&255,(n>>8)&255,n&255]; } return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
function glow(g,x,y,r,col,a){ var gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,rgba(col,a)); gr.addColorStop(1,rgba(col,0)); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); }
function sfxp(n){ try{ if(typeof sfx==='function') sfx(n); }catch(e){} }
var AW=396, AH=224, GY=196, HX=96, FX_=304;        // 아레나 크기 · 땅 높이 · 영웅/적 x

/* ───────────── 화면 구조 다시 만들기 (기존 id는 모두 유지) ───────────── */
var css=document.createElement('style');
css.textContent=
 '#battle .panel{width:400px;max-width:100%;max-height:96vh;padding:0;overflow-x:hidden;overflow-y:auto;background:#150f26}'+
 '#bt-arena{position:relative;height:auto;aspect-ratio:396/224;border-bottom:4px solid var(--line);background:#0c0818;overflow:hidden}'+
 '#bt-arena canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto}'+
 '#bt-hud{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;gap:10px;padding:8px 9px;pointer-events:none}'+
 '.bt-side{width:46%;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000}.bt-side.foe{text-align:right}'+
 '.bt-nm{font-size:11.5px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '.bt-bar{height:9px;background:rgba(10,6,20,.78);border:2px solid #120a1e;border-radius:3px;overflow:hidden}'+
 '.bt-bar>i{display:block;height:100%;transition:width .35s ease}'+
 '#bt-hhp{background:linear-gradient(180deg,#8ff0b0,#3fbf6a);width:100%}'+
 '#bt-ehp{background:linear-gradient(180deg,#ff9a6b,#ff5a3d);width:100%}'+
 '#bt-hhpt{display:block;margin-top:2px;opacity:.9}#bt-tag{display:block;margin-top:2px;opacity:.9;color:#ffca4b}'+
 '#bt-combo{position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:5;font-size:18px;color:#ffca4b;text-shadow:2px 2px 0 #000,0 0 12px #ff9a3a;pointer-events:none;opacity:0;white-space:nowrap}'+
 '#bt-combo.pop{animation:cpop .9s ease-out}'+
 '#bt-banner{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:20px;color:#fff;text-shadow:2px 2px 0 #000,0 0 14px var(--bn,#ffca4b);pointer-events:none;opacity:0;z-index:6;letter-spacing:1px}'+
 '#bt-banner.on{animation:bnr 1.9s ease-out}'+
 '@keyframes bnr{0%{opacity:0;transform:scale(1.6)}12%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0}}'+
 '#bt-result{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(.6);z-index:7;text-align:center;opacity:0;pointer-events:none;'+
 'background:rgba(12,8,24,.86);border:3px solid var(--gold);border-radius:10px;padding:10px 18px;font-size:12px;line-height:1.7;color:#fff}'+
 '#bt-result.on{animation:rsl 2s ease-out forwards}'+
 '@keyframes rsl{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}25%{transform:translate(-50%,-50%) scale(1)}85%{opacity:1}100%{opacity:0}}'+
 '#bt-result b{display:block;font-size:17px;color:var(--gold);margin-bottom:2px}'+
 '#bt-flee{position:absolute;right:8px;bottom:6px;z-index:6;padding:5px 11px;font-size:10px;opacity:.85;border-radius:6px}'+
 '#bt-body{padding:10px 12px 12px}'+
 '#bt-prog{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);margin:0 2px 6px;min-height:14px}'+
 '#bt-prog .pips{display:flex;gap:4px}#bt-prog .pip{width:16px;height:7px;border-radius:2px;background:#2a2142;border:1px solid #120a1e}'+
 '#bt-prog .pip.done{background:var(--gold)}#bt-prog .pip.now{background:#fff;animation:pip .9s infinite}'+
 '@keyframes pip{50%{opacity:.4}}'+
 '#bt-timer{height:11px!important;border-radius:5px!important;position:relative}'+
 '#bt-timer>i{border-radius:3px}#bt-timer span{position:absolute;right:5px;top:-1px;font-size:9px;color:#fff;text-shadow:1px 1px 0 #000}'+
 '#bt-q{position:relative;background:linear-gradient(180deg,#241a3f,#1b1432)!important;border:3px solid #4a3a78!important;border-radius:10px!important;padding:13px 13px 13px 40px!important;font-size:13.5px!important;line-height:1.6!important;box-shadow:0 4px 0 #120a1e}'+
 '#bt-q::before{content:"Q";position:absolute;left:9px;top:50%;transform:translateY(-50%);width:23px;height:23px;border-radius:50%;background:var(--gold);color:#2a1a04;font-size:13px;line-height:23px;text-align:center;font-weight:900}'+
 '#bt-choices{grid-template-columns:1fr 1fr;gap:7px!important;margin-top:9px}'+
 '#bt-choices .choice{display:flex;gap:8px;align-items:center;text-align:left;padding:10px 9px!important;min-height:52px;font-size:12px!important;line-height:1.4}'+
 '#bt-choices .choice .bt-no{flex:0 0 22px;width:22px;height:22px;border-radius:6px;background:#3a2d5c;color:#ffca4b;font-size:12px;line-height:22px;text-align:center;font-weight:900;border:2px solid #120a1e}'+
 '#bt-choices .choice.ok .bt-no{background:#2f8a52;color:#fff}#bt-choices .choice.no .bt-no{background:#a83a42;color:#fff}'+
 '#bt-foot{margin-top:9px!important}#bt-items{gap:6px!important}'+
 '.bt-tool{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:48px;padding:5px 6px 4px;background:var(--panel2);border:3px solid var(--line);border-radius:8px;color:#fff;font-size:9.5px;font-family:var(--font-body);box-shadow:0 3px 0 var(--line)}'+
 '.bt-tool:active{transform:translateY(3px);box-shadow:0 0 0 var(--line)}.bt-tool:disabled{opacity:.35}'+
 '.bt-tool .ti{font-size:17px;line-height:1.1}.bt-tool .tn{position:absolute;right:-5px;top:-6px;background:#ffca4b;color:#2a1a04;border-radius:9px;padding:0 5px;font-size:9px;font-weight:900;border:2px solid #120a1e}'+
 '.bt-tool.sk{border-color:var(--purp)}.bt-tool.ult{border-color:var(--gold)}'+
 '#bt-fb{margin-top:8px!important;border-radius:8px!important}';
document.head.appendChild(css);

panel.innerHTML=
 '<div id="bt-arena"><canvas id="bt-canvas" width="'+AW+'" height="'+AH+'"></canvas>'+
   '<div id="bt-hud"><div class="bt-side"><div class="bt-nm" id="bt-hname">용사</div><div class="bt-bar"><i id="bt-hhp"></i></div><span id="bt-hhpt"></span></div>'+
   '<div class="bt-side foe"><div class="bt-nm" id="bt-name">퀴즈 수호병</div><div class="bt-bar"><i id="bt-ehp"></i></div><span id="bt-tag"></span></div></div>'+
   '<div id="bt-combo"></div><div id="bt-banner"></div><div id="bt-result"></div>'+
   '<button class="btn ghost" id="bt-flee" onclick="fleeBattle()">도망</button></div>'+
 '<div id="bt-body"><div id="bt-prog"></div><div id="bt-timer"><i></i><span></span></div><div id="bt-q">문제를 불러오는 중...</div>'+
   '<div id="bt-choices"></div><div id="bt-fb"></div><div id="bt-foot"><div id="bt-items"></div></div></div>';

/* ───────────── 배경 (지역별로 한 번만 그려 두고 재사용) ───────────── */
var BGC={};
function skyColors(rid){ var th=THEME[rid]||THEME.r1; return th; }
function makeBg(rid){
  if(BGC[rid]) return BGC[rid];
  var c=mkc(AW,AH), g=c.getContext('2d'), th=skyColors(rid), i, x, h;
  var sk=g.createLinearGradient(0,0,0,GY); sk.addColorStop(0,th.sky); sk.addColorStop(1,th.accent); g.fillStyle=sk; g.fillRect(0,0,AW,GY);
  g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(0,0,AW,GY);
  for(i=0;i<40;i++){ g.fillStyle='rgba(255,255,255,'+(0.15+(i%4)*0.12)+')'; g.fillRect((i*53+11)%AW,(i*29+7)%(GY*0.55),1+(i%3===0?1:0),1+(i%3===0?1:0)); }
  function tri(cx,base,w,hh,col){ g.fillStyle=col; g.beginPath(); g.moveTo(cx-w/2,base); g.lineTo(cx,base-hh); g.lineTo(cx+w/2,base); g.closePath(); g.fill(); }
  if(rid==='r1'){                                    // 숲: 먼 산 + 겹겹의 침엽수
    g.fillStyle='#fff4c8'; g.beginPath(); g.arc(310,40,17,0,6.28); g.fill(); glow(g,310,40,60,'#fff4c8',0.25);
    g.fillStyle='#1c2a3e'; for(i=0;i<7;i++) tri(i*70-10,GY-26,150,60+(i%3)*18,'#1c2a3e');
    for(i=0;i<22;i++) tri(i*19+((i*7)%9),GY-6,34,56+(i%4)*10,'#173025');
    for(i=0;i<18;i++) tri(i*24+8,GY+2,44,74+(i%3)*12,'#10231c');
  } else if(rid==='r2'){                              // 동굴: 종유석 + 빛나는 수정
    g.fillStyle='#120a22'; g.fillRect(0,0,AW,GY);
    var cg=g.createRadialGradient(AW/2,GY*0.65,10,AW/2,GY*0.65,AW*0.7); cg.addColorStop(0,'rgba(122,92,196,.35)'); cg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=cg; g.fillRect(0,0,AW,GY);
    for(i=0;i<20;i++){ h=26+((i*37)%58); g.fillStyle=(i%2)?'#1d1236':'#150d28'; g.beginPath(); g.moveTo(i*21-6,0); g.lineTo(i*21+8,h); g.lineTo(i*21+22,0); g.closePath(); g.fill(); }
    for(i=0;i<9;i++){ x=24+i*46+((i*13)%17); h=14+((i*11)%20); g.fillStyle='#7a5cc4'; g.beginPath(); g.moveTo(x,GY-4); g.lineTo(x+4,GY-4-h); g.lineTo(x+8,GY-4); g.closePath(); g.fill(); g.fillStyle='#c9aef5'; g.fillRect(x+3,GY-4-h+3,2,h-6); glow(g,x+4,GY-4-h/2,18,'#9a7be0',0.25); }
  } else if(rid==='r3'){                              // 협곡: 붉은 암벽 + 낮은 해
    glow(g,AW*0.7,GY-26,90,'#ffb060',0.5); g.fillStyle='#ffd890'; g.beginPath(); g.arc(AW*0.7,GY-26,15,0,6.28); g.fill();
    for(i=0;i<6;i++){ x=i*72-20; h=70+((i*29)%46); g.fillStyle=(i%2)?'#6a3a1c':'#5a2f16'; g.fillRect(x,GY-h,58,h); g.fillStyle=(i%2)?'#7a4624':'#6a3a1c'; g.fillRect(x-6,GY-h,70,10);
      g.fillStyle='rgba(0,0,0,.18)'; for(var k=0;k<5;k++) g.fillRect(x+4,GY-h+14+k*13,50,2); }
    g.fillStyle='rgba(255,200,130,.12)'; g.fillRect(0,GY-48,AW,48);
  } else if(rid==='r4'){                              // 아레나: 원형경기장 아치 + 깃발 + 관중
    g.fillStyle='#16233a'; g.fillRect(0,GY-92,AW,92);
    for(i=0;i<10;i++){ x=i*42+4; g.fillStyle='#0c1424'; g.beginPath(); g.moveTo(x,GY-30); g.lineTo(x,GY-60); g.arc(x+17,GY-60,17,Math.PI,0); g.lineTo(x+34,GY-30); g.closePath(); g.fill(); g.fillStyle='#1d3050'; g.fillRect(x-4,GY-92,6,92); }
    for(i=0;i<70;i++){ g.fillStyle='rgba(255,255,255,'+(0.3+(i%3)*0.2)+')'; g.fillRect((i*47+13)%AW,GY-92+((i*17)%30),2,2); }
    for(i=0;i<5;i++){ x=40+i*86; g.fillStyle='#4d86c9'; g.fillRect(x,GY-120,3,40); g.fillStyle=(i%2)?'#ffca4b':'#4d86c9'; g.beginPath(); g.moveTo(x+3,GY-118); g.lineTo(x+26,GY-110); g.lineTo(x+3,GY-102); g.closePath(); g.fill(); }
  } else {                                            // 성채: 붉은 하늘 + 탑 + 창
    glow(g,AW*0.5,GY*0.45,140,'#c94d7a',0.3); g.fillStyle='#f0d0e0'; g.beginPath(); g.arc(AW*0.75,46,15,0,6.28); g.fill();
    for(i=0;i<6;i++){ x=i*72-6; h=84+((i*23)%52); g.fillStyle=(i%2)?'#1a0c18':'#240f20'; g.fillRect(x,GY-h,46,h);
      for(var cx2=0;cx2<4;cx2++) g.fillRect(x+cx2*13,GY-h-9,8,9);
      g.fillStyle='#ffb050'; g.fillRect(x+19,GY-h+18,6,10); g.fillRect(x+19,GY-h+44,6,10); glow(g,x+22,GY-h+23,10,'#ff9a3a',0.3); }
  }
  var gr=g.createLinearGradient(0,GY-4,0,AH); gr.addColorStop(0,th.ground); gr.addColorStop(1,'#0c0818'); g.fillStyle=gr; g.fillRect(0,GY-4,AW,AH-GY+4);
  g.fillStyle='rgba(255,255,255,.14)'; g.fillRect(0,GY-4,AW,2);
  for(i=0;i<60;i++){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect((i*37+5)%AW,GY+3+((i*13)%(AH-GY-6)),4+(i%3)*2,2); g.fillStyle='rgba(255,255,255,.07)'; g.fillRect((i*29+9)%AW,GY+2+((i*17)%(AH-GY-4)),3,1); }
  return (BGC[rid]=c);
}

/* ───────────── 분위기 입자 ───────────── */
function ambient(rid){
  var arr=[], n=26, i; for(i=0;i<n;i++) arr.push({x:Math.random()*AW,y:Math.random()*AH*0.9,vx:rnd(-6,6),vy:rnd(-4,4),p:Math.random()*6.28,s:rnd(1,2.6)});
  return arr;
}
function stepAmbient(g,rid,dt,t){
  var A=BF.amb; if(!A) return; g.save(); g.globalCompositeOperation='lighter';
  var col={r1:'#d8f08a',r2:'#9ac0ff',r3:'#ffd090',r4:'#ffffff',r5:'#ff8a4a'}[rid]||'#ffffff';
  for(var i=0;i<A.length;i++){ var p=A[i];
    if(rid==='r1'){ p.x+=Math.sin(t/900+p.p)*8*dt+p.vx*dt; p.y+=Math.cos(t/1100+p.p)*6*dt; }
    else if(rid==='r2'){ p.y-=8*dt; p.x+=Math.sin(t/700+p.p)*6*dt; }
    else if(rid==='r3'){ p.x-=26*dt; p.y+=Math.sin(t/500+p.p)*4*dt; }
    else if(rid==='r4'){ p.y+=18*dt; p.x+=Math.sin(t/400+p.p)*8*dt; }
    else { p.y-=22*dt; p.x+=Math.sin(t/600+p.p)*7*dt; }
    if(p.x<-6) p.x=AW+6; if(p.x>AW+6) p.x=-6; if(p.y<-6) p.y=AH-4; if(p.y>AH) p.y=-4;
    var a=0.35+0.35*Math.sin(t/400+p.p); g.fillStyle=rgba(col,a); g.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(p.s),Math.ceil(p.s));
  }
  g.restore();
}

/* ───────────── 전투 연출 엔진 ───────────── */
var BF={on:false,raf:0,last:0,t:0,fx:[],texts:[],rid:'r1',boss:false,flashH:0,flashF:0,hurtV:0,foeX:0,foeY:0,heroX:0,hit:0,fall:0,defeated:false,rage:false,shield:0,enter:0,amb:null,streak:0,hpShown:null,shake:0,castGlow:0};
var fo=mkc(240,240), foc=fo.getContext('2d');
function element(){ var c=(G.save&&G.save['캐릭터'])||'taro'; return {taro:'fire',mir:'earth',hana:'wind',yuri:'holy',leon:'bolt'}[c]||'fire'; }
function weaponColor(){ try{ var eq=heroEq(); if(eq&&eq.w&&typeof WART!=='undefined'&&WART[eq.w.id]){ var c=WART[eq.w.id][1]; if(c==='RAINBOW') return 'hsl('+((performance.now()/8)%360)+',90%,65%)'; return c; } }catch(e){} return '#ffe9a8'; }
function addFx(o){ o.t=0; BF.fx.push(o); return o; }
function addText(x,y,txt,col,big){ BF.texts.push({x:x,y:y,txt:txt,col:col||'#fff',big:!!big,t:0}); }

/* 공격 연출 조각 */
function fxSlash(x,y,col){
  addFx({dur:0.32,drw:function(g,p){ g.globalCompositeOperation='lighter';
    for(var k=0;k<3;k++){ var a0=-1.2+k*0.12, a1=a0+2.1*Math.min(1,p*1.9), R=46+k*12; g.strokeStyle=rgba('#ffffff',(1-p)*(0.9-k*0.2)); g.lineWidth=5-k*1.3; g.lineCap='round'; g.beginPath(); g.arc(x+20,y+8,R,a0,a1); g.stroke();
      g.strokeStyle=col.charAt(0)==='#'?rgba(col,(1-p)*0.6):col; g.lineWidth=9-k*2; g.globalAlpha=(1-p)*0.4; g.beginPath(); g.arc(x+20,y+8,R,a0,a1); g.stroke(); g.globalAlpha=1; }
    glow(g,x,y,50*(1-p*0.4),col.charAt(0)==='#'?col:'#ffffff',0.4*(1-p)); }});
  sparks(x,y,col,14);
}
function sparks(x,y,col,n){ for(var i=0;i<n;i++){ (function(){ var a=Math.random()*6.28, sp=rnd(80,230), vx=Math.cos(a)*sp, vy=Math.sin(a)*sp-40, life=rnd(0.25,0.55); addFx({dur:life,sx:x,sy:y,drw:function(g,p){ var px=x+vx*p*life, py=y+vy*p*life+300*p*p*life*life; g.globalCompositeOperation='lighter'; g.fillStyle=i%2?'#ffffff':(col.charAt(0)==='#'?rgba(col,1-p):col); g.fillRect(px,py,2.5,2.5); }}); })(); } }
function fxFire(x0,y0,x1,y1){
  var d=Math.hypot(x1-x0,y1-y0), dur=0.34;
  addFx({dur:dur,drw:function(g,p){ var x=lerp(x0,x1,p), y=lerp(y0,y1,p)-Math.sin(p*3.14)*26; g.globalCompositeOperation='lighter';
      for(var i=1;i<=7;i++){ var q=i/7, px=lerp(x0,x1,Math.max(0,p-q*0.12)), py=lerp(y0,y1,Math.max(0,p-q*0.12))-Math.sin(Math.max(0,p-q*0.12)*3.14)*26; glow(g,px,py,18*(1-q*0.6),'#ff6a1a',0.55*(1-q)); }
      glow(g,x,y,30,'#ff8a30',0.55); g.globalCompositeOperation='source-over'; var gr=g.createRadialGradient(x,y,0,x,y,13); gr.addColorStop(0,'#fff'); gr.addColorStop(0.4,'#ffe070'); gr.addColorStop(1,'rgba(255,100,30,0)'); g.fillStyle=gr; g.beginPath(); g.arc(x,y,13,0,6.28); g.fill(); },
    end:function(){ boom(x1,y1,'#ff7a1e','#fff2a0'); }});
}
function boom(x,y,c1,c2){
  addFx({dur:0.45,drw:function(g,p){ g.globalCompositeOperation='lighter'; glow(g,x,y,70*(0.3+p),c1,(1-p)*0.8); glow(g,x,y,36*(0.3+p),c2,(1-p)); g.strokeStyle=rgba(c2,1-p); g.lineWidth=5*(1-p)+1; g.beginPath(); g.ellipse(x,y+10,56*outC(p)+8,26*outC(p)+4,0,0,6.28); g.stroke(); }});
  sparks(x,y,c1,22);
}
function fxEarth(x){
  var gy=GY-6;
  addFx({dur:0.55,drw:function(g,p){ g.globalCompositeOperation='lighter'; var r=outC(p)*Math.abs(x-HX)*0.95;
      g.strokeStyle=rgba('#ffe0a0',1-p); g.lineWidth=5*(1-p)+1; g.beginPath(); g.ellipse(HX+60+r*0.5,gy,r*0.5+10,9+r*0.05,0,0,6.28); g.stroke(); }});
  addFx({dur:0.6,drw:function(g,p){ g.globalCompositeOperation='source-over'; g.strokeStyle='rgba(30,18,10,'+(1-p)+')'; g.lineWidth=3; g.lineJoin='round'; var reach=Math.min(1,p*3);
      for(var k=0;k<6;k++){ var a=-0.9+k*0.35, L=(40+k%3*16)*reach; g.beginPath(); g.moveTo(x,gy); for(var s=1;s<=5;s++){ g.lineTo(x+Math.cos(a)*L*s/5*1.2+((s*7+k)%5-2)*2,gy+Math.sin(a)*L*s/5*0.35+((s*5+k)%4-1)*2); } g.stroke(); } }});
  for(var i=0;i<14;i++) (function(){ var vx=rnd(-90,90), vy=rnd(-260,-120), sz=rnd(3,7), life=rnd(0.5,0.8); addFx({dur:life,drw:function(g,p){ var px=x+vx*p*life, py=gy+vy*p*life+520*p*p*life*life; g.globalCompositeOperation='source-over'; g.fillStyle='rgba(120,92,60,'+(1-p*0.7)+')'; g.fillRect(px,py,sz,sz); }}); })();
  addFx({dur:0.2,drw:function(g,p){ g.globalCompositeOperation='lighter'; glow(g,x,gy-10,60,'#ffca4b',(1-p)*0.6); }});
}
function fxWind(x0,y0,x1,y1){
  addFx({dur:0.3,drw:function(g,p){ var x=lerp(x0,x1,outC(p)), y=lerp(y0,y1,p); g.globalCompositeOperation='lighter';
      for(var i=0;i<4;i++){ g.strokeStyle=rgba('#c6fff6',0.5*(1-p)); g.lineWidth=2; g.beginPath(); g.moveTo(x-60-i*14,y+(i-1.5)*9); g.lineTo(x-14,y+(i-1.5)*9); g.stroke(); }
      g.save(); g.translate(x,y); g.beginPath(); g.moveTo(-10,-34); g.quadraticCurveTo(32,0,-10,34); g.quadraticCurveTo(8,0,-10,-34); g.closePath(); g.strokeStyle=rgba('#37e0cf',0.4*(1-p*0.5)); g.lineWidth=10; g.stroke();
      var gr=g.createLinearGradient(-10,0,32,0); gr.addColorStop(0,rgba('#37e0cf',0.9)); gr.addColorStop(1,'#fff'); g.fillStyle=gr; g.fill(); g.restore(); },
    end:function(){ boom(x1,y1,'#37e0cf','#ffffff'); }});
}
function fxHoly(x){
  addFx({dur:0.7,drw:function(g,p){ var env=p<0.2?p/0.2:1-(p-0.2)/0.8, w=26*env; g.globalCompositeOperation='lighter'; var gr=g.createLinearGradient(x-w,0,x+w,0); gr.addColorStop(0,'rgba(255,224,112,0)'); gr.addColorStop(0.5,'rgba(255,255,255,'+env+')'); gr.addColorStop(1,'rgba(255,224,112,0)');
      g.fillStyle=gr; g.fillRect(x-w,0,w*2,GY); glow(g,x,GY-10,w*2.4,'#ffe070',0.7*env); g.strokeStyle=rgba('#ffe070',env); g.lineWidth=3; g.beginPath(); g.ellipse(x,GY-6,w*1.7,w*0.6,0,0,6.28); g.stroke(); }});
  for(var i=0;i<12;i++) (function(){ var px=x+rnd(-24,24), vy=rnd(-150,-60), life=rnd(0.5,0.9); addFx({dur:life,drw:function(g,p){ g.globalCompositeOperation='lighter'; g.fillStyle=rgba(i%2?'#ffffff':'#ffe070',1-p); g.fillRect(px,GY-8+vy*p*life,2.5,2.5); }}); })();
}
function zig(x1,y1,x2,y2,disp){ var pts=[[x1,y1],[x2,y2]], d, i; for(d=0;d<5;d++){ var np=[pts[0]]; for(i=1;i<pts.length;i++){ var a=pts[i-1], b=pts[i]; np.push([(a[0]+b[0])/2+rnd(-1,1)*disp,(a[1]+b[1])/2+rnd(-1,1)*disp]); np.push(b); } pts=np; disp*=0.55; } return pts; }
function fxBolt(x){
  var pts=zig(x+rnd(-24,24),-4,x,GY-34,34), acc=0;
  addFx({dur:0.38,drw:function(g,p){ acc+=0.016; if(acc>0.05){ acc=0; pts=zig(pts[0][0],-4,x,GY-34,30); } var al=p<0.15?1:1-(p-0.15)/0.85; g.globalCompositeOperation='lighter'; g.lineCap='round'; g.lineJoin='round';
      [[10,0.25,'#8a6aff'],[4.5,0.85,'#c9aef5'],[1.6,1,'#ffffff']].forEach(function(l){ g.strokeStyle=rgba(l[2],l[1]*al); g.lineWidth=l[0]; g.beginPath(); pts.forEach(function(q,i){ if(!i) g.moveTo(q[0],q[1]); else g.lineTo(q[0],q[1]); }); g.stroke(); });
      glow(g,x,GY-34,50,'#8a6aff',0.5*al); }});
  addFx({dur:0.16,drw:function(g,p){ g.globalCompositeOperation='lighter'; g.fillStyle='rgba(232,220,255,'+(0.22*(1-p))+')'; g.fillRect(0,0,AW,AH); }});
  sparks(x,GY-30,'#c9aef5',20);
}
function fxHeal(x,y,col){ for(var i=0;i<16;i++) (function(){ var px=x+rnd(-26,26), vy=rnd(-110,-50), life=rnd(0.6,1.0), d=i*0.03; addFx({dur:life,drw:function(g,p){ g.globalCompositeOperation='lighter'; g.fillStyle=rgba(i%2?'#ffffff':col,1-p); var s=2.5+(i%3); g.fillRect(px,y+vy*p*life,s,s); }}); })();
  addFx({dur:0.6,drw:function(g,p){ g.globalCompositeOperation='lighter'; g.strokeStyle=rgba(col,1-p); g.lineWidth=3; g.beginPath(); g.ellipse(x,y+22,50*outC(p),16*outC(p),0,0,6.28); g.stroke(); }}); }

/* 영웅·적 행동 */
BF.attack=function(final){
  var st=BF.streak, el=element(), skill=(st>=3&&st%3===0)||final||BF.boss;
  BF.act={kind:'attack',t:0,dur:skill?0.62:0.52,skill:skill,done:false};
  sfxp(skill?'cast':'atk');
  BF.castGlow=skill?0.5:0;
};
BF.hurtHero=function(loss){ BF.act={kind:'hurt',t:0,dur:0.6,loss:loss,done:false}; };
BF.cast=function(id,r){
  var s=G.skills.filter(function(x){ return x.id===id; })[0]; var heal=r&&r.healed, ult=s&&s.type==='ultimate';
  BF.castGlow=0.9; sfxp(heal?'heal':'cast');
  if(heal){ fxHeal(HX,GY-70,'#66e08a'); addText(HX,GY-110,'+'+r.healed,'#66e08a',true); }
  else { fxHeal(HX,GY-70,ult?'#ffca4b':'#9b7be0'); }
  banner((s?s.name:'스킬'),ult?'#ffca4b':'#9b7be0');
};
BF.itemFx=function(kind){
  if(kind==='heal'){ fxHeal(HX,GY-70,'#66e08a'); sfxp('heal'); }
  else if(kind==='shield'){ BF.shield=1; sfxp('shield'); }
  else if(kind==='hint'){ fxHeal(HX,GY-70,'#7fd0ff'); sfxp('sp'); }
  else { fxHeal(HX,GY-70,'#ffe070'); sfxp('coin'); }
};
function banner(txt,col){ var b=document.getElementById('bt-banner'); b.textContent=txt; b.style.setProperty('--bn',col||'#ffca4b'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }
BF.banner=banner;
BF.victory=function(boss){
  BF.defeated=true; BF.fall=0; sfxp('victory');
  for(var i=0;i<(boss?46:22);i++) (function(){ var vx=rnd(-120,120), vy=rnd(-220,-60), life=rnd(0.7,1.3); addFx({dur:life,drw:function(g,p){ g.globalCompositeOperation='lighter'; g.fillStyle=rgba(i%3?'#ffe070':'#ffffff',1-p); g.fillRect(BF.foeX+vx*p*life,BF.foeY-40+vy*p*life+300*p*p*life*life,3,3); }}); })();
  BF.act={kind:'cheer',t:0,dur:1.2,done:false};
};
BF.showResult=function(html){ var el=document.getElementById('bt-result'); el.innerHTML=html; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };

BF.start=function(rid,boss){
  BF.rid=rid; BF.boss=!!boss; BF.fx=[]; BF.texts=[]; BF.act=null; BF.defeated=false; BF.rage=false; BF.shield=0; BF.enter=0; BF.streak=G.save&&G.save['콤보']||0; BF.hpShown=null; BF.hit=0; BF.hurtV=0; BF.castGlow=0;
  BF.foeX=FX_; BF.foeY=GY; BF.heroX=HX; BF.amb=ambient(rid); BF.t=0; BF.foeBottom=measureFoe(rid,!!boss);
  var cv=document.getElementById('bt-canvas'), dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(AW*dpr); cv.height=Math.round(AH*dpr); BF.dpr=dpr;
  var ch=(G.characters||[]).filter(function(c){ return c.id===G.save['캐릭터']; })[0];
  document.getElementById('bt-hname').textContent=(ch?ch.name:'용사')+' Lv.'+(G.save['레벨']||1);
  updateHp(true);
  if(!BF.on){ BF.on=true; BF.last=performance.now(); BF.raf=requestAnimationFrame(loop); }
};
function updateHp(force){
  var mx=G.save.maxHP||1, hp=Math.max(0,G.save.HP||0), bar=document.getElementById('bt-hhp');
  if(bar) bar.style.width=Math.max(0,Math.min(100,hp/mx*100))+'%';
  var tx=document.getElementById('bt-hhpt'); if(tx) tx.textContent='HP '+hp+' / '+mx;
  if(bar) bar.style.background=(hp/mx<0.3)?'linear-gradient(180deg,#ff9a9a,#e03a3a)':'linear-gradient(180deg,#8ff0b0,#3fbf6a)';
  BF.hpShown=hp;
}

/** 수호병·보스 그림의 '발 위치(맨 아랫줄)'를 한 번 읽어 땅에 맞춘다 */
function measureFoe(reg,boss){
  var sc=boss?2.1:2.7, c=mkc(240,240), x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.save(); x.scale(sc,sc);
  if(boss) drawBoss(x,120/sc,168/sc,reg); else drawGuardian(x,120/sc,168/sc,reg); x.restore();
  var d=x.getImageData(0,0,240,240).data, by=216, y, i;
  for(y=239;y>=0;y--){ for(i=0;i<240;i++){ if(d[(y*240+i)*4+3]>200){ return y; } } }
  return by;
}
function drawFoe(g,t){
  var reg=BF.rid, sc=BF.boss?2.1:2.7, bob=Math.sin(t*2.2)*3, sh=BF.hit>0?Math.sin(BF.hit*60)*5*BF.hit:0, fall=BF.defeated?Math.min(1,BF.fall):0;
  foc.clearRect(0,0,240,240); foc.imageSmoothingEnabled=false; foc.save(); foc.scale(sc,sc);
  if(BF.boss) drawBoss(foc,120/sc,168/sc,reg); else drawGuardian(foc,120/sc,168/sc,reg);
  foc.restore();
  var fl=Math.max(BF.flashF,0);
  if(fl>0||BF.rage){ foc.globalCompositeOperation='source-atop'; foc.fillStyle=fl>0?'rgba(255,255,255,'+Math.min(0.9,fl)+')':'rgba(255,60,60,'+(0.18+0.12*Math.sin(t*8))+')'; foc.fillRect(0,0,240,240); foc.globalCompositeOperation='source-over'; }
  var x=BF.foeX+sh, y=BF.foeY+bob*(fall?0:1)+fall*18;
  g.save(); g.globalAlpha=1-fall*0.95;
  g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(BF.foeX,GY+4,BF.boss?56:40,9,0,0,6.28); g.fill();
  if(BF.boss){ g.globalCompositeOperation='lighter'; glow(g,x,y-52,90,BF.rage?'#ff3b3b':({r1:'#a98bff',r2:'#6adf8a',r3:'#ffb04a',r4:'#6aa8ff',r5:'#ff5a7a'}[reg]||'#ffffff'),0.25+0.1*Math.sin(t*3)); g.globalCompositeOperation='source-over'; }
  g.imageSmoothingEnabled=false; g.drawImage(fo,x-120,y-(BF.foeBottom||216)+2);
  g.restore();
}
function drawHeroSprite(g,t){
  var id=G.save['캐릭터'], eq=heroEq(), a=BF.act, ox=0, oy=0, rot=0, sq=1;
  if(a){ var p=a.t/a.dur;
    if(a.kind==='attack'){
      if(a.skill){ var up=Math.sin(Math.min(1,p*1.6)*3.14); oy=-8*up; sq=1+0.03*up; }
      else{ var dash=p<0.18?-ease(p/0.18)*8:(p<0.4?lerp(-8,FX_-HX-70,ease((p-0.18)/0.22)):(p<0.55?(FX_-HX-70):lerp(FX_-HX-70,0,ease((p-0.55)/0.45)))); ox=dash; }
    } else if(a.kind==='hurt'){ var k=Math.max(0,1-Math.abs(p-0.45)*4); ox=p>0.35?-14*Math.max(0,1-(p-0.35)*2.2):0; rot=-0.05*k; }
    else if(a.kind==='cheer'){ oy=-Math.abs(Math.sin(p*9))*10; }
  }
  var bob=Math.sin(t*2.6)*1.5;
  g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(HX+ox,GY+4,34,8,0,0,6.28); g.fill();
  g.save(); g.translate(HX+ox,GY+oy+bob); g.rotate(rot); g.scale(1,sq); g.translate(-HX-ox,-(GY+oy+bob)+0);
  if(BF.hit>0&&BF.act&&BF.act.kind==='hurt'&&BF.act.t>0.25){ /* 피격 깜빡임은 아래에서 덧그림 */ }
  var drew=false;
  if(typeof drawHeroArt==='function'){ drew=(drawHeroArt(g,id,eq,HX+ox,GY+3+oy+bob,168)!==false); }   // 성공하면 값이 없고(undefined), 실패했을 때만 false
  if(!drew&&typeof drawHero==='function'){ drawHero(g,id,HX+ox,GY-26+oy,58,1,false,eq); }
  g.restore();
  if(BF.flashH>0){ g.save(); g.globalCompositeOperation='source-atop'; }
  if(BF.castGlow>0){ g.save(); g.globalCompositeOperation='lighter'; glow(g,HX+ox,GY-70,70,element()==='fire'?'#ff7a2e':(element()==='earth'?'#d0a24a':(element()==='wind'?'#37e0cf':(element()==='holy'?'#ffe070':'#8a6aff'))),BF.castGlow*0.55); g.restore(); }
  if(BF.shield>0){ g.save(); g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(120,200,255,'+(0.5+0.3*Math.sin(t*6))+')'; g.lineWidth=3; g.beginPath(); g.ellipse(HX,GY-72,52,78,0,0,6.28); g.stroke(); glow(g,HX,GY-72,70,'#7fd0ff',0.18); g.restore(); }
}
function stepAct(dt){
  var a=BF.act; if(!a) return; a.t+=dt; var p=a.t/a.dur;
  if(a.kind==='attack'&&!a.done){
    var hitAt=a.skill?0.4:0.4;
    if(p>=hitAt){ a.done=true; var el=element(), col=weaponColor(), fx0=HX+54, fy0=GY-78, fx1=BF.foeX-10, fy1=BF.foeY-52;
      var big=BF.defeatedNext;
      if(a.skill){
        if(el==='fire') fxFire(fx0,fy0,fx1,fy1); else if(el==='earth') fxEarth(BF.foeX); else if(el==='wind') fxWind(fx0,fy0,fx1,fy1); else if(el==='holy') fxHoly(BF.foeX); else fxBolt(BF.foeX);
        setTimeout(function(){ BF.hit=0.35; BF.flashF=0.9; sfxp(BF.finalNext?'heavy':'crit'); shakeArena(); },el==='fire'||el==='wind'?300:(el==='holy'?120:(el==='bolt'?60:120)));
      } else { fxSlash(BF.foeX-26,fy1,col); BF.hit=0.25; BF.flashF=0.8; sfxp('hit'); shakeArena(); }
      addText(BF.foeX,BF.foeY-110,BF.streak>=2?('COMBO '+BF.streak):'정답!','#ffe9a8',a.skill);
    }
    if(p>=1) BF.act=null;
  } else if(a.kind==='hurt'&&!a.done){
    // 적이 달려들어 부딪힘
    var q=p<0.4?ease(p/0.4):(p<0.55?1:ease(1-(p-0.55)/0.45)); BF.foeX=lerp(FX_,HX+62,q);
    if(p>=0.4){ a.done=true; BF.flashH=0.8; BF.hurtV=0.7; sfxp('hurt'); shakeArena(); sparks(HX+30,GY-70,'#ff5a5a',16); addText(HX,GY-120,a.loss>0?'-'+a.loss:'막았다!','#ff6a6a',true); updateHp(); }
    if(p>=1){ BF.act=null; BF.foeX=FX_; }
  } else if(a.kind==='cheer'){ if(p>=1) BF.act=null; }
}
function shakeArena(){ var w=document.getElementById('bt-arena'); w.classList.remove('hitfx'); void w.offsetWidth; w.classList.add('hitfx'); }
function loop(now){
  if(!BF.on) return;
  var ov=document.getElementById('battle'); if(!ov||!ov.classList.contains('open')){ BF.on=false; return; }
  var dt=Math.min(0.05,(now-BF.last)/1000); BF.last=now; BF.t+=dt; BF.enter=Math.min(1,BF.enter+dt*2.2);
  var cv=document.getElementById('bt-canvas'), g=cv.getContext('2d'), d=BF.dpr||1;
  g.setTransform(d,0,0,d,0,0); g.globalCompositeOperation='source-over'; g.globalAlpha=1; g.imageSmoothingEnabled=true;
  g.drawImage(makeBg(BF.rid),0,0);
  stepAmbient(g,BF.rid,dt,BF.t*1000);
  if(BF.flashF>0) BF.flashF-=dt*3.2; if(BF.flashH>0) BF.flashH-=dt*3.2; if(BF.hit>0) BF.hit-=dt; if(BF.defeated) BF.fall+=dt*1.1; if(BF.castGlow>0) BF.castGlow-=dt*1.4; if(BF.hurtV>0) BF.hurtV-=dt*1.8;
  stepAct(dt);
  var slide=(1-outC(BF.enter));
  g.save(); g.translate(-slide*80,0); drawHeroSprite(g,BF.t); g.restore();
  g.save(); g.translate(slide*80,0); drawFoe(g,BF.t); g.restore();
  // 효과
  for(var i=BF.fx.length-1;i>=0;i--){ var f=BF.fx[i]; f.t+=dt; var p=f.t/f.dur; if(p>=1){ BF.fx.splice(i,1); if(f.end) f.end(); continue; } g.save(); f.drw(g,p); g.restore(); }
  // 떠오르는 글자
  g.save(); g.textAlign='center'; g.textBaseline='middle';
  for(var k=BF.texts.length-1;k>=0;k--){ var tx=BF.texts[k]; tx.t+=dt; if(tx.t>1.2){ BF.texts.splice(k,1); continue; } var al=tx.t>0.8?(1.2-tx.t)/0.4:1, y=tx.y-tx.t*34;
    g.font=(tx.big?'bold 24px':'bold 16px')+' DungGeunMo,sans-serif'; g.lineWidth=4; g.strokeStyle='rgba(10,6,20,'+al+')'; g.globalAlpha=al; g.strokeText(tx.txt,tx.x,y); g.fillStyle=tx.col; g.fillText(tx.txt,tx.x,y); }
  g.restore();
  // 비네트 · 피격 붉은 화면 · 보스 위기(시간 부족)
  var vg=g.createRadialGradient(AW/2,AH/2,AH*0.35,AW/2,AH/2,AW*0.62); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.45)'); g.fillStyle=vg; g.fillRect(0,0,AW,AH);
  if(BF.hurtV>0){ g.fillStyle='rgba(255,40,40,'+(BF.hurtV*0.4)+')'; g.fillRect(0,0,AW,AH); }
  var low=(G.save.HP/Math.max(1,G.save.maxHP))<0.25; if(low){ g.fillStyle='rgba(255,0,0,'+(0.08+0.06*Math.sin(BF.t*6))+')'; g.fillRect(0,0,AW,AH); }
  if(BF.hpShown!==G.save.HP) updateHp();
  BF.raf=requestAnimationFrame(loop);
}

/* ───────────── 기존 함수 교체 ───────────── */
var _renderArena=renderArena;
renderArena=function(emoji,z){
  var rid=(G.regions[z]&&G.regions[z].id)||'r1';
  BF.start(rid,B&&B.mode==='boss');
  document.getElementById('bt-tag').textContent=BF.boss?'봉인 수호자':(G.regions[z]?(z+1)+'단계 · '+G.regions[z].name:'');
  if(BF.boss){ var dn=(G.save['보스진행'][B.entity.region]||{}).answered||0; BF.rage=B.queue&&(dn/B.queue.length)>=0.5; }
  if(BF.boss){ banner('⚠ '+((STORY.bossTitle&&STORY.bossTitle[rid])||regName(rid))+' ⚠','#ff5a5a'); BF.shakeIn=1; }
  else banner((G.regions[z]?G.regions[z].name:'')+' 퀴즈 수호병','#9b7be0');
};
arenaFx=function(win){};           // 연출은 answer() 안에서 정답/오답 정보와 함께 실행
var _openBattleUI=openBattleUI;
openBattleUI=function(name,isBoss){
  document.getElementById('bt-name').textContent=String(name).replace(/^[^\w\uAC00-\uD7A3「]+/,'');
  document.getElementById('bt-ehp').style.width='100%';
  document.getElementById('bt-flee').style.display=isBoss?'none':'';
  document.getElementById('bt-combo').textContent='';
  openOvl('battle'); sfxp(isBoss?'boss':'open');
  renderQuestion();
};
var _renderQuestion=renderQuestion;
renderQuestion=function(){
  stopBossTimer();
  var q=qById(B.qid);
  var fbr=document.getElementById('bt-fb'); fbr.removeAttribute('style'); fbr.className=''; fbr.style.display='none';
  document.getElementById('bt-q').textContent=q.question;
  var wrap=document.getElementById('bt-choices'); wrap.innerHTML='';
  B.perm=[0,1,2,3];
  for(var pi=3;pi>0;pi--){ var pj=Math.floor(Math.random()*(pi+1)); var tt=B.perm[pi]; B.perm[pi]=B.perm[pj]; B.perm[pj]=tt; }
  B.perm.forEach(function(orig,i){
    var b=document.createElement('button'); b.className='choice';
    b.innerHTML='<span class="bt-no">'+(i+1)+'</span><span class="bt-tx">'+q.options[orig]+'</span>';
    b.onclick=function(){ answer(orig+1,b); };
    wrap.appendChild(b);
  });
  var prog=document.getElementById('bt-prog');
  if(B.mode==='boss'){
    var done=(G.save['보스진행'][B.entity.region]||{}).answered||0, n=B.queue.length, pips='';
    for(var i=0;i<n;i++) pips+='<div class="pip'+(i<done?' done':(i===done?' now':''))+'"></div>';
    prog.innerHTML='<span>봉인 해제 '+Math.min(done+1,n)+' / '+n+'</span><div class="pips">'+pips+'</div>';
    document.getElementById('bt-ehp').style.width=Math.max(0,100-(done/n*100))+'%';
    BF.rage=(done/n)>=0.5;
    startBossTimer();
  } else {
    var cn=G.save['콤보']||0;
    prog.innerHTML='<span>'+(cn>=2?'🔥 '+cn+' 연속 정답':'맞히면 수호병을 쓰러뜨려요')+'</span><span>'+(((G.save['레벨']||1)>=0)?'':'')+'</span>';
  }
  renderBattleTools();
};
/* 보스 제한시간 + 마지막 5초 경고음 */
startBossTimer=function(){
  var el=document.getElementById('bt-timer'), bar=el.querySelector('i'), num=el.querySelector('span'), last=-1;
  el.classList.add('on'); el.classList.remove('warn');
  var deadline=performance.now()+BOSS_SEC*1000;
  var tick=function(){
    var left=deadline-performance.now(); bar.style.width=Math.max(0,left/(BOSS_SEC*1000)*100)+'%';
    var sec=Math.ceil(left/1000); num.textContent=sec>0?sec+'초':'';
    if(left<5000){ el.classList.add('warn'); if(sec!==last&&sec>0){ last=sec; sfxp('tickWarn'); } }
    if(left<=0){ stopBossTimer(); toast('⏰ 시간 초과! 피격!'); sfxp('no'); vib(150); answer(0,null); return; }
    bossTimer=requestAnimationFrame(tick);
  };
  tick();
};
var _stopBossTimer=stopBossTimer;
stopBossTimer=function(){ _stopBossTimer(); var el=document.getElementById('bt-timer'); if(el){ var n=el.querySelector('span'); if(n) n.textContent=''; } };

/* 도구 막대: 아이콘 버튼 */
renderBattleTools=function(){
  var wrap=document.getElementById('bt-items'); wrap.innerHTML='';
  var inv=G.save['보유아이템']||{};
  function tool(icon,label,count,fn,cls,off){
    var b=document.createElement('button'); b.className='bt-tool'+(cls?' '+cls:''); b.innerHTML='<span class="ti">'+icon+'</span><span>'+label+'</span>'+(count?'<span class="tn">'+count+'</span>':'');
    if(off) b.disabled=true; b.onclick=fn; wrap.appendChild(b);
  }
  [['pray_hint','🔍','힌트',function(){useHintBtn();}],['energy_drink','🥤','체력',function(){useItemBtn('energy_drink');}],['big_potion','💊','큰회복',function(){useItemBtn('big_potion');}],
   ['pray_shield','🛡️','방어',function(){useItemBtn('pray_shield');}],['snack','🍪','EXP×2',function(){useItemBtn('snack');}]].forEach(function(x){ var n=inv[x[0]]||0; if(n>0) tool(x[1],x[2],n,x[3]); });
  var learned=G.save['스킬']||{};
  G.skills.filter(function(s){ return s.charId===G.save['캐릭터']&&learned[s.id]&&s.type!=='passive'; }).forEach(function(s){
    tool(s.icon,s.name.length>5?s.name.slice(0,5):s.name,0,function(){ useSkillBtn(s.id); },s.type==='ultimate'?'ult':'sk',!!B.usedSkills[s.id]);
  });
};
useHintBtn=function(){ srv('useHint',G.hakbun,B.qid).then(function(r){ if(!r.ok){ toast(r.msg||'실패'); return; } B.usedHint=true; G.save=r.save; syncFromSave(); cutChoices(r.remove); renderBattleTools(); BF.itemFx('hint'); toast('🔍 정령의 기도로 보기 2개를 지웠어요'); }); };
useItemBtn=function(id){ srv('useConsumable',G.hakbun,id).then(function(r){ if(!r.ok){ toast(r.msg||'실패'); return; } G.save=r.save; syncFromSave(); renderBattleTools();
  if(r.healed){ BF.itemFx('heal'); addText(HX,GY-110,'+'+r.healed,'#66e08a',true); toast('💚 HP +'+r.healed); } else if(id==='pray_shield'){ BF.itemFx('shield'); toast('🛡️ 다음 오답 1회 무효!'); } else if(id==='snack'){ BF.itemFx('snack'); toast('🍪 다음 정답 EXP 2배!'); } }); };
useSkillBtn=function(id){ srv('useSkill',G.hakbun,id,B.qid).then(function(r){ if(!r.ok){ toast(r.msg||'사용 불가'); return; } B.usedSkills[id]=1; G.save=r.save; syncFromSave(); if(r.remove) cutChoices(r.remove);
  BF.cast(id,r); var msg=r.name+' 발동!'; if(r.healed) msg+=' 💚+'+r.healed; toast('✦ '+msg); renderBattleTools(); }); };

/* 답 제출: 서버 규칙은 그대로, 화면 연출만 새로 */
answer=function(choice,btn){
  stopBossTimer();
  var wrap=document.getElementById('bt-choices'), hp0=G.save.HP;
  Array.prototype.forEach.call(wrap.children,function(c){ c.style.pointerEvents='none'; });
  if(btn) btn.style.borderColor='var(--gold)';
  var fbp=document.getElementById('bt-fb'); fbp.className=''; fbp.style.display='block'; fbp.style.border='3px solid var(--line)'; fbp.style.background='rgba(255,255,255,.05)'; fbp.style.color='var(--muted)'; fbp.innerHTML='⏳ 채점 중...';
  srv('submitAnswer',G.hakbun,B.qid,choice,B.usedHint).then(function(r){
    if(!r.ok){ toast(r.msg||'오류'); Array.prototype.forEach.call(wrap.children,function(c){ c.style.pointerEvents=''; }); return; }
    G.save=r.save; syncFromSave();
    if(r.drop){ sfxp('relic'); shakeScreen(5); vib([40,60,40]); doFlash(); showGetCard(r.drop.id,r.drop.name,'📚 지혜의 전리품'); }
    else if(r.dropDup){ sfxp('chest'); toast('📚 중복 전리품 → <b>TP +'+r.dropDup+'</b>'); }
    if(r.couponWon) setTimeout(function(){ showCouponCard(r.couponWon); },r.drop?1400:200);
    var ans=r.answer, dispIdx=(B.perm?B.perm.indexOf(ans-1):ans-1);
    if(wrap.children[dispIdx]) wrap.children[dispIdx].classList.add('ok');
    if(!r.correct&&btn) btn.classList.add('no');
    var fb=document.getElementById('bt-fb'); fb.removeAttribute('style'); fb.className=r.correct?'ok':'no'; fb.style.display='block';
    fb.innerHTML='<b>'+(r.correct?'정답! ✔':'오답 ✘')+'</b>'+r.explain;
    sfxp(r.correct?'ok':'no');
    /* 업적 알림은 codex.js가 서버 응답(achNew)에서 직접 띄운다 */
    var cn=G.save['콤보']||0;
    if(r.correct){
      BF.streak=cn; var finalHit=(B.mode==='boss')?(r.bossCleared):true; BF.finalNext=finalHit;
      BF.attack(finalHit);
      if(cn>=3) setTimeout(function(){ sfxp('combo'); },350);
      vib(30);
      var cb=document.getElementById('bt-combo'); cb.textContent=cn>=2?('🔥 '+cn+' 연격!'):'⚔ 일격!'; cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop');
    } else {
      var loss=Math.max(0,hp0-G.save.HP); BF.streak=0; BF.hurtHero(loss); BF.shield=0; vib(120);
      if(r.revived) toast('💫 쓰러졌지만 정령의 힘으로 부활!');
    }
    if(B.mode==='boss') handleBossAns(r); else handleNormalAns(r);
  }).catch(function(){ toast('통신 오류'); });
};
handleNormalAns=function(r){
  if(r.correct){
    if(typeof _codexCache!=='undefined') _codexCache=null;                 // 도감(지식) 목록은 새 정답이 나오면 다시 불러오기
    document.getElementById('bt-ehp').style.width='0%';
    var ent=B.entity; ent.dead=true;
    setTimeout(function(){ ent.qid=nextRegionQuestion((G.regions[ent.z]&&G.regions[ent.z].id)||'r1',ent.qid); ent.dead=false; },3800);
    setTimeout(function(){ BF.victory(false); },620);
    var lines=r.review?((r.weakReview?'⚔ 오답을 갚았다!':'복습!')+'<br>EXP +'+(r.expGain||0))
      :(r.already?'이미 익힌 지식!<br><small>(복습 보상은 잠시 후 다시 열려요)</small>':('EXP +'+(r.expGain||0)+' · TP +'+(r.tpGain||0)));
    setTimeout(function(){ BF.showResult('<b>승리!</b>'+lines); },700);
    setTimeout(function(){ closeOvl('battle'); if(r.leveledUp) levelUpFx(); },2600);
  } else {
    setTimeout(function(){
      var wrap=document.getElementById('bt-choices');
      Array.prototype.forEach.call(wrap.children,function(c){ c.classList.remove('ok','no'); if(!c.classList.contains('cut')) c.style.pointerEvents=''; });
      document.getElementById('bt-fb').style.display='none';
    },1900);
  }
};
handleBossAns=function(r){
  if(r.locked){ toast('🔒 '+(r.msg||'먼저 일반 문제를 더 푸세요')); setTimeout(function(){ closeOvl('battle'); },1200); return; }
  var region=B.entity.region;
  if(r.bossCleared){ document.getElementById('bt-ehp').style.width='0%'; setTimeout(function(){ BF.victory(true); banner('봉인 해제!','#ffca4b'); },700); setTimeout(function(){ closeOvl('battle'); showRelic(region); },2800); return; }
  if(r.bossFailed){ setTimeout(function(){ sfxp('defeat'); closeOvl('battle'); toast('👑 보스 클리어 실패… HP를 회복하고 다시 도전하세요!'); },1900); return; }
  setTimeout(function(){ B.qi++; if(B.qi<B.queue.length){ B.qid=B.queue[B.qi]; renderQuestion(); } else { closeOvl('battle'); toast('⚠ 진행이 꼬였어요. 보스에게 다시 도전하면 처음부터 시작됩니다!'); } },1700);
};

/* 키보드 1~4로 보기 고르기 */
window.addEventListener('keydown',function(ev){
  var ov=document.getElementById('battle'); if(!ov||!ov.classList.contains('open')||ev.repeat) return;
  var m=/^(Digit|Numpad)([1-4])$/.exec(ev.code); if(!m) return;
  var b=document.getElementById('bt-choices').children[Number(m[2])-1];
  if(b&&b.style.pointerEvents!=='none'&&!b.classList.contains('cut')){ ev.preventDefault(); ev.stopImmediatePropagation(); b.click(); }
},true);

window.BATTLE={BF:BF,makeBg:makeBg,element:element};
})();
