/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v27 전투 연출 (fx.js)
   ① 무기: 몸 그림에서 분리 → 손에 든 무기가 그대로 휘둘러짐 (별도 칼 없음)
      1타 베기 · 2타 역베기 · 3타 내려찍기 / 창·보주는 찌르기·시전 · 궤적은 무기 끝을 따라감
   ② 타격: 불꽃 튀김 · 충격 링 · 3타 땅울림
   ③ 공격 스킬 5종 (직접 그린 이펙트)
      화염구(아레테) · 대지 강타(포르사) · 질풍 참격(아길레) · 성스러운 빛(리커버) · 연쇄 번개(멘타)
   ④ 필살기 5종 (화면 어두워짐 + 이름 배너 + 전용 연출)
      유성우 · 강철 가시 · 난무 참격 · 성스러운 파동 · 번개 폭풍
   ⑤ 스킬 버튼에 쿨타임 게이지
   필요: art.js v27 (무기 분리 지원). 설치: hero.js 다음 줄에 <script src="fx.js?v=27"></script>
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof drawPlayer!=='function'||typeof castAttackSkill!=='function'||typeof castActionSkill!=='function'){ console.warn('fx.js: 원본 엔진을 찾지 못함'); return; }
var NEW_ART=!!(window.ART&&ART.v>=27);

/* ───────────── 기본 도구 ───────────── */
function rnd(a,b){ return a+Math.random()*(b-a); }
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
function outC(t){ t=Math.max(0,Math.min(1,t)); return 1-Math.pow(1-t,3); }
function RED(n){ return (window.OPT&&OPT.reduceFx)?Math.ceil(n*0.4):n; }
var _rc={};
function rgba(hex,a){ var c=_rc[hex]; if(!c){ var n=parseInt(hex.slice(1),16); c=_rc[hex]=[(n>>16)&255,(n>>8)&255,n&255]; } return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
function glow(g,x,y,r,col,a){ var gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,rgba(col,a)); gr.addColorStop(1,rgba(col,0)); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); }
function pos(e){ return {x:(e.tx+0.5)*TILE, y:(e.ty+0.5)*TILE}; }
function hero(){ return {x:player.x*TILE, y:player.y*TILE-TILE*0.14, dir:player.dir<0?-1:1}; }
function muzzle(){ var h=hero(); return {x:h.x+h.dir*40, y:h.y+8}; }
function sfx2(n){
  if(typeof beep!=='function'||typeof noise!=='function') return;
  try{
    if(n==='fire'){ noise(0.22,0.05); beep(520,0.22,'sawtooth',0.035,140); setTimeout(function(){ noise(0.3,0.08); beep(110,0.3,'sawtooth',0.06,50); },170); }
    else if(n==='quake'){ beep(80,0.5,'sawtooth',0.08,35); noise(0.45,0.09); setTimeout(function(){ noise(0.25,0.05); },160); }
    else if(n==='wind'){ noise(0.3,0.05); beep(1000,0.18,'triangle',0.025,250); setTimeout(function(){ noise(0.12,0.06); },120); }
    else if(n==='holy'){ [784,988,1318,1568].forEach(function(f,i){ setTimeout(function(){ beep(f,0.3,'triangle',0.04); },i*70); }); }
    else if(n==='bolt'){ noise(0.1,0.09); beep(2200,0.06,'square',0.03,200); setTimeout(function(){ noise(0.14,0.08); beep(1600,0.05,'square',0.03,150); },70); }
    else if(n==='ult'){ beep(90,0.6,'sawtooth',0.07,200); setTimeout(function(){ [523,659,784,1046,1318].forEach(function(f,i){ setTimeout(function(){ beep(f,0.25,'triangle',0.05); },i*80); }); },250); }
    else if(n==='hit2'){ noise(0.1,0.06); beep(180,0.08,'sawtooth',0.04,70); }
  }catch(e){}
}

/* ───────────── 효과 · 파티클 엔진 (세계 좌표 = 타일×TILE) ───────────── */
var FXS=[], PT=[];
function fxAdd(o){ o.t=0; if(o.L===undefined) o.L=1; FXS.push(o); return o; }
function after(d,fn){ return fxAdd({dur:d,L:1,end:fn}); }
function P(o){ if(PT.length>650) PT.shift(); o.t=0; if(o.a===undefined) o.a=1; if(!o.drag) o.drag=0; if(!o.g) o.g=0; PT.push(o); return o; }
function glowP(x,y,vx,vy,life,s,col,a){ return P({k:'glow',x:x,y:y,vx:vx,vy:vy,life:life,s:s,col:col,a:a===undefined?0.8:a}); }
function sparkP(x,y,ang,sp,life,col,grav){ return P({k:'spark',x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:life,s:2,col:col,g:grav||0,drag:2.4}); }
function smokeP(x,y,vx,vy,life,s,col){ return P({k:'smoke',x:x,y:y,vx:vx,vy:vy,life:life,s:s,col:col,a:0.5,drag:1.2}); }
function rockP(x,y,vx,vy,gy){ return P({k:'rock',x:x,y:y,vx:vx,vy:vy,life:rnd(0.9,1.5),s:rnd(4,9),col:['#6a5640','#8a7256','#4e3e2e'][Math.floor(Math.random()*3)],g:1300,rot:Math.random()*6,vr:rnd(-9,9),gy:gy,bounce:0}); }
function featherP(x,y,life){ return P({k:'feather',x:x,y:y,vx:rnd(-30,30),vy:rnd(40,110),life:life,s:rnd(3,5),col:Math.random()<0.5?'#fff6c8':'#ffe98a',rot:Math.random()*6,vr:rnd(-3,3),a:0.95,ph:Math.random()*6}); }
function stepFX(dt){
  var i;
  for(i=FXS.length-1;i>=0;i--){
    var e=FXS[i]; e.t+=dt;
    if(e.upd) e.upd.call(e,e.t,dt);
    if(e.t>=e.dur){ FXS.splice(i,1); if(e.end) try{ e.end.call(e); }catch(err){} }
  }
  for(i=PT.length-1;i>=0;i--){
    var p=PT[i]; p.t+=dt;
    if(p.t>=p.life){ PT.splice(i,1); continue; }
    if(p.drag){ var d=Math.max(0,1-p.drag*dt); p.vx*=d; p.vy*=d; }
    p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.rot!==undefined) p.rot+=p.vr*dt;
    if(p.k==='feather'){ p.x+=Math.sin(p.t*4+p.ph)*24*dt; }
    if(p.k==='rock'&&p.gy!==undefined&&p.y>p.gy&&p.vy>0){ p.y=p.gy; p.vy*=-0.28; p.vx*=0.55; p.bounce++; if(p.bounce>2){ p.vy=0; p.vx=0; p.g=0; } }
  }
}
function drawParts(g){
  var i,p,X,Y,f;
  g.save(); g.globalCompositeOperation='lighter';
  for(i=0;i<PT.length;i++){ p=PT[i]; X=p.x-cam.x; Y=p.y-cam.y; f=1-p.t/p.life;
    if(X<-40||X>W+40||Y<-60||Y>H+40) continue;
    if(p.k==='glow'){ if(p.s>6) glow(g,X,Y,p.s*(0.6+0.4*f),p.col,p.a*f); else { g.globalAlpha=p.a*f; g.fillStyle=p.col; g.fillRect(Math.round(X-p.s/2),Math.round(Y-p.s/2),p.s,p.s); g.globalAlpha=1; } }
    else if(p.k==='spark'){ g.strokeStyle=rgba(p.col,f); g.lineWidth=p.s*f+0.5; g.beginPath(); g.moveTo(X,Y); g.lineTo(X-p.vx*0.045,Y-p.vy*0.045); g.stroke(); }
  }
  g.restore();
  for(i=0;i<PT.length;i++){ p=PT[i]; X=p.x-cam.x; Y=p.y-cam.y; f=1-p.t/p.life;
    if(X<-40||X>W+40||Y<-60||Y>H+40) continue;
    if(p.k==='smoke'){ var r=p.s*(1+(1-f)*1.4); g.globalAlpha=p.a*f; glow(g,X,Y,r,p.col,1); g.globalAlpha=1; }
    else if(p.k==='rock'){ g.save(); g.translate(X,Y); g.rotate(p.rot); g.globalAlpha=Math.min(1,f*2.2); g.fillStyle=p.col; var s=p.s; g.beginPath(); g.moveTo(-s,-s*0.4); g.lineTo(-s*0.2,-s); g.lineTo(s,-s*0.3); g.lineTo(s*0.6,s*0.8); g.lineTo(-s*0.7,s*0.7); g.closePath(); g.fill(); g.fillStyle='rgba(255,255,255,.22)'; g.fillRect(-s*0.7,-s*0.7,s*0.9,s*0.35); g.restore(); }
    else if(p.k==='feather'){ g.save(); g.translate(X,Y); g.rotate(p.rot); g.globalAlpha=p.a*Math.min(1,f*2); g.fillStyle=p.col; g.beginPath(); g.ellipse(0,0,p.s*0.45,p.s*1.5,0,0,6.2832); g.fill(); g.restore(); }
  }
  g.globalAlpha=1;
}
function drawFX(g){
  var L,i,e;
  g.save(); g.setTransform(1,0,0,1,0,0);
  for(L=0;L<=2;L++){
    if(L===1){ drawParts(g); }
    for(i=0;i<FXS.length;i++){ e=FXS[i]; if(e.L===L&&e.drw){ g.save(); e.drw.call(e,g); g.restore(); } }
  }
  g.restore();
}

/* ───────────── 공용 이펙트 조각 ───────────── */
function explode(x,y,r,cA,cB,shake){
  var n=RED(26), i, a;
  fxAdd({dur:0.45,drw:function(g){ var p=this.t/this.dur, X=x-cam.x, Y=y-cam.y, rr=r*(0.2+0.9*outC(p));
    g.globalCompositeOperation='lighter';
    glow(g,X,Y,rr*1.7,cB,(1-p)*0.75); glow(g,X,Y,rr*0.9,cA,(1-p)*0.9);
    g.strokeStyle=rgba(cA,1-p); g.lineWidth=Math.max(1,7*(1-p)); g.beginPath(); g.ellipse(X,Y+4,rr,rr*0.6,0,0,6.2832); g.stroke(); }});
  for(i=0;i<n;i++){ sparkP(x,y,Math.random()*6.2832,rnd(120,420),rnd(0.25,0.6),i%3?cA:cB,520); }
  for(i=0;i<RED(8);i++) smokeP(x+rnd(-14,14),y+rnd(-10,10),rnd(-40,40),rnd(-90,-30),rnd(0.6,1.1),rnd(14,26),'#3a2a2a');
  for(i=0;i<RED(10);i++){ a=Math.random()*6.2832; glowP(x,y,Math.cos(a)*rnd(40,160),Math.sin(a)*rnd(40,160)-60,rnd(0.4,0.8),rnd(5,9),cB,0.9); }
  fxAdd({dur:2.6,L:0,drw:function(g){ var p=this.t/this.dur; g.globalAlpha=0.36*(1-p); g.fillStyle='#120a08'; g.beginPath(); g.ellipse(x-cam.x,y-cam.y+14,r*0.55,r*0.3,0,0,6.2832); g.fill(); }});
  if(shake&&typeof shakeScreen==='function') shakeScreen(shake);
}
function ring(x,y,r,col,dur,w,squash){
  fxAdd({dur:dur,drw:function(g){ var p=this.t/this.dur, rr=r*outC(p), X=x-cam.x, Y=y-cam.y;
    g.globalCompositeOperation='lighter'; g.strokeStyle=rgba(col,(1-p)*0.95); g.lineWidth=Math.max(1,w*(1-p)+1);
    g.beginPath(); g.ellipse(X,Y,rr,rr*(squash||0.55),0,0,6.2832); g.stroke();
    g.strokeStyle=rgba('#ffffff',(1-p)*0.6); g.lineWidth=1.2; g.beginPath(); g.ellipse(X,Y,rr*0.97,rr*0.97*(squash||0.55),0,0,6.2832); g.stroke(); }});
}
function pillar(x,y,col,dur,w,topY){
  fxAdd({dur:dur,drw:function(g){
    var p=this.t/this.dur, env=p<0.22?p/0.22:1-(p-0.22)/0.78, ww=w*env, X=x-cam.x, Y=y-cam.y, T=(topY===undefined?-20:topY-cam.y);
    g.globalCompositeOperation='lighter';
    var gr=g.createLinearGradient(X-ww,0,X+ww,0);
    gr.addColorStop(0,rgba(col,0)); gr.addColorStop(0.35,rgba(col,0.55*env)); gr.addColorStop(0.5,'rgba(255,255,255,'+(0.95*env)+')'); gr.addColorStop(0.65,rgba(col,0.55*env)); gr.addColorStop(1,rgba(col,0));
    g.fillStyle=gr; g.fillRect(X-ww,T,ww*2,Y-T+4);
    glow(g,X,Y,ww*2.4,col,0.7*env); g.strokeStyle=rgba(col,env); g.lineWidth=3; g.beginPath(); g.ellipse(X,Y+2,ww*1.6,ww*0.7,0,0,6.2832); g.stroke(); }});
  for(var i=0;i<RED(10);i++) glowP(x+rnd(-w,w),y+rnd(-6,6),rnd(-15,15),rnd(-160,-60),rnd(0.5,0.9),rnd(4,7),i%2?'#ffffff':col,0.9);
}
function magicCircle(x,y,r,col,dur){
  fxAdd({dur:dur,L:0,drw:function(g){
    var p=this.t/this.dur, env=p<0.18?p/0.18:(p>0.75?(1-p)/0.25:1), X=x-cam.x, Y=y-cam.y, rot=this.t*1.6, sq=0.5, i;
    g.globalCompositeOperation='lighter'; g.lineWidth=2; g.strokeStyle=rgba(col,0.9*env);
    g.beginPath(); g.ellipse(X,Y,r,r*sq,0,0,6.2832); g.stroke();
    g.beginPath(); g.ellipse(X,Y,r*0.82,r*0.82*sq,0,0,6.2832); g.stroke();
    for(i=0;i<16;i++){ var a=rot+i/16*6.2832, c=Math.cos(a), s=Math.sin(a); g.beginPath(); g.moveTo(X+c*r*0.82,Y+s*r*0.82*sq); g.lineTo(X+c*r,Y+s*r*sq); g.stroke(); }
    g.strokeStyle=rgba('#ffffff',0.85*env);
    for(i=0;i<2;i++){ g.beginPath(); for(var k=0;k<3;k++){ var b=-rot*0.7+i*Math.PI/3+k*2.0944; var px=X+Math.cos(b)*r*0.78, py=Y+Math.sin(b)*r*0.78*sq; if(!k) g.moveTo(px,py); else g.lineTo(px,py); } g.closePath(); g.stroke(); }
    glow(g,X,Y,r*0.9,col,0.22*env); }});
}
function bolt(x1,y1,x2,y2,disp,depth){
  var pts=[{x:x1,y:y1},{x:x2,y:y2}], d, i;
  for(d=0;d<depth;d++){ var np=[pts[0]]; for(i=1;i<pts.length;i++){ var a=pts[i-1], b=pts[i]; np.push({x:(a.x+b.x)/2+rnd(-1,1)*disp,y:(a.y+b.y)/2+rnd(-1,1)*disp}); np.push(b); } pts=np; disp*=0.55; }
  return pts;
}
function strokePts(g,pts,X,Y){ g.beginPath(); for(var i=0;i<pts.length;i++){ if(!i) g.moveTo(pts[i].x-X,pts[i].y-Y); else g.lineTo(pts[i].x-X,pts[i].y-Y); } g.stroke(); }
function boltFx(x1,y1,x2,y2,dur,col,width,disp,onEnd){
  var pts=bolt(x1,y1,x2,y2,disp,5), forks=[];
  function regen(){ pts=bolt(x1,y1,x2,y2,disp,5); forks=[]; for(var f=0;f<2;f++){ var q=pts[Math.floor(rnd(6,pts.length-6))]; forks.push(bolt(q.x,q.y,q.x+rnd(-70,70),q.y+rnd(20,70)*(y2>=y1?1:-1),disp*0.6,3)); } }
  regen();
  var acc=0;
  fxAdd({dur:dur,end:onEnd,upd:function(t,dt){ acc+=dt; if(acc>0.045){ acc=0; regen(); } },
    drw:function(g){ var p=this.t/this.dur, al=p<0.12?1:1-(p-0.12)/0.88, X=cam.x, Y=cam.y;
      g.globalCompositeOperation='lighter'; g.lineCap='round'; g.lineJoin='round';
      g.strokeStyle=rgba(col,0.28*al); g.lineWidth=width*4; strokePts(g,pts,X,Y);
      g.strokeStyle=rgba(col,0.85*al); g.lineWidth=width*1.7; strokePts(g,pts,X,Y);
      g.strokeStyle='rgba(255,255,255,'+al+')'; g.lineWidth=Math.max(1,width*0.6); strokePts(g,pts,X,Y);
      g.lineWidth=1.2; for(var f=0;f<forks.length;f++){ g.strokeStyle=rgba(col,0.7*al); strokePts(g,forks[f],X,Y); } }});
}
function screenFlash(col,a,dur){ if(window.OPT&&OPT.reduceFx) return; fxAdd({L:2,dur:dur||0.18,drw:function(g){ var p=this.t/this.dur; g.globalAlpha=a*(1-p); g.fillStyle=col; g.fillRect(0,0,W,H); }}); }

/* ───────────── 피해 처리 (원래 공식 그대로) ───────────── */
function hitMob(e,mul,col,big){
  if(!e||e.dead||(e.hp!==undefined&&e.hp<=0)) return false;
  if(e.hp===undefined){ e.maxhp=Math.round((18+e.z*14)*(e.tier===2?3.2:e.tier===1?1.8:1)); e.hp=e.maxhp; }
  var atk=(G.save&&G.save.atk)||6, dm=Math.max(1,Math.round(atk*mul)), now=performance.now();
  e.hp-=dm; e.hitT=now; e.knockT=now; e.knockDX=e.tx-player.x; e.knockDY=e.ty-player.y;
  var kd=Math.hypot(e.knockDX,e.knockDY)||1; e.knockDX/=kd; e.knockDY/=kd;
  addFx(e.tx+0.5,e.ty-0.3,dm,col,big||mul>=1.8);
  if(e.hp<=0){ e.hp=0; player.gauge=Math.min(100,player.gauge+8); doHunt(e); }
  return true;
}

/* ═══════════════ ① 무기 휘두르기 ═══════════════ */
var WSC={};
function weaponSprite(id){
  if(WSC[id]!==undefined) return WSC[id];
  if(typeof WART==='undefined') return (WSC[id]=null);
  var wa=WART[id]||['#6a4a26','#c9ccd8',1,'s'];
  var c=document.createElement('canvas'); c.width=9; c.height=22; var g=c.getContext('2d');
  var bl=(wa[1]==='RAINBOW')?'#ff8ae0':wa[1], hi=(wa[1]==='RAINBOW')?'#fff0ff':shade(bl,1.35), hd=wa[0], gd='#e0c060';
  function Q(x,y,col){ g.fillStyle=col; g.fillRect(x-10,y+1,1,1); }
  var L=Math.round(6*wa[2]), ty=wa[3], y;
  if(ty==='p'){ for(y=17;y>=13-L;y--) Q(14,y,hd); Q(14,12-L,bl); Q(13,11-L,bl); Q(14,11-L,hi); Q(15,11-L,bl); Q(14,10-L,hi); Q(15,14-L,'#ffe070'); }
  else if(ty==='o'){ for(y=17;y>=14-L;y--) Q(14,y,hd); Q(13,12-L,bl); Q(14,12-L,bl); Q(15,12-L,bl); Q(13,13-L,bl); Q(14,13-L,hi); Q(15,13-L,bl); Q(14,11-L,bl); Q(13,12-L,'#ffffff'); }
  else if(ty==='g'){ Q(14,14,hd); Q(14,15,hd); for(var gx=11;gx<=17;gx++) Q(gx,13,gd); for(y=12;y>=12-L;y--){ Q(13,y,shade(bl,0.8)); Q(14,y,bl); Q(15,y,hi); } Q(14,11-L,bl); }
  else if(ty==='d'){ L=Math.round(4*wa[2]); Q(14,14,hd); for(var dx=13;dx<=15;dx++) Q(dx,13,gd); for(y=12;y>12-L;y--){ Q(14,y,bl); Q(15,y,hi); } Q(14,12-L,bl); }
  else { Q(14,14,hd); Q(14,15,hd); for(var sx=12;sx<=16;sx++) Q(sx,13,gd); for(y=12;y>12-L;y--){ Q(14,y,bl); Q(15,y,hi); } Q(14,12-L,bl); }
  // 외곽선
  var id2=g.getImageData(0,0,9,22), d=id2.data, o=new Uint8Array(9*22), i;
  for(i=0;i<9*22;i++) o[i]=d[i*4+3]>0?1:0;
  for(var yy=0;yy<22;yy++) for(var xx=0;xx<9;xx++){ i=yy*9+xx; if(o[i]) continue;
    if((xx>0&&o[i-1])||(xx<8&&o[i+1])||(yy>0&&o[i-9])||(yy<21&&o[i+9])){ d[i*4]=20; d[i*4+1]=12; d[i*4+2]=30; d[i*4+3]=255; } }
  g.putImageData(id2,0,0);
  var top=0; for(top=0;top<22;top++){ var any=false; for(var x2=0;x2<9;x2++) if(d[(top*9+x2)*4+3]>0){ any=true; break; } if(any) break; }
  return (WSC[id]={c:c,gx:4.5,gy:15.5,len:15.5-top,type:ty,col:bl,rainbow:wa[1]==='RAINBOW'});
}
var SW_DUR=[0,270,270,360];
function swingAng(step,p){
  var r;
  if(step===3){ if(p<0.3) r=lerp(0,-52,ease(p/0.3)); else if(p<0.62) r=lerp(-52,150,outC((p-0.3)/0.32)); else r=lerp(150,0,ease((p-0.62)/0.38)); }
  else if(step===2){ if(p<0.12) r=lerp(0,125,ease(p/0.12)); else if(p<0.55) r=lerp(125,-50,outC((p-0.12)/0.43)); else r=lerp(-50,0,ease((p-0.55)/0.45)); }
  else { if(p<0.2) r=lerp(0,-70,ease(p/0.2)); else if(p<0.55) r=lerp(-70,125,outC((p-0.2)/0.35)); else r=lerp(125,0,ease((p-0.55)/0.45)); }
  return r*Math.PI/180;
}
function swingState(t){
  var el=t-swingT, step=(Math.abs(swingT-lastAtk)<2)?(window.RM&&RM.lastComboStep||1):1, dur=SW_DUR[step]||270;
  if(el<0||el>dur) return null;
  return {step:step,p:el/dur};
}
var castT=-9999, CAST_DUR=620;
function castAng(t){
  var el=t-castT; if(el<0||el>CAST_DUR) return null; var p=el/CAST_DUR, r;
  if(p<0.2) r=lerp(0,-40,ease(p/0.2)); else if(p<0.42) r=lerp(-40,88,outC((p-0.2)/0.22)); else if(p<0.7) r=88; else r=lerp(88,0,ease((p-0.7)/0.3));
  return r*Math.PI/180;
}
function bladeColor(ws,t){ return ws.rainbow?('hsl('+((t/8)%360)+',90%,65%)'):ws.col; }
function ptAt(gx,gy,dir,a,r){ return {x:gx+dir*Math.sin(a)*r,y:gy-Math.cos(a)*r}; }
function drawTrail(g,gx,gy,dir,st,ws,t,k){
  var L=(ws?ws.len*k:16)+8, r0=L*0.32, n=7, i, angs=[], col=ws?bladeColor(ws,t):'#ffffff';
  for(i=0;i<=n;i++){ var pp=st.p-0.15*(1-i/n); angs.push(pp<0?0:swingAng(st.step,pp)); }
  var spd=Math.min(1,Math.abs(angs[n]-angs[0])/(1.15)); if(spd<0.06) return;
  var cssCol=/^#/.test(col)?col:null;
  g.save(); g.globalCompositeOperation='lighter';
  for(i=1;i<=n;i++){
    var A=ptAt(gx,gy,dir,angs[i-1],r0), B=ptAt(gx,gy,dir,angs[i-1],L), C=ptAt(gx,gy,dir,angs[i],L), D=ptAt(gx,gy,dir,angs[i],r0);
    g.globalAlpha=(i/n)*0.8*spd; g.fillStyle=cssCol||col;
    g.beginPath(); g.moveTo(A.x,A.y); g.lineTo(B.x,B.y); g.lineTo(C.x,C.y); g.lineTo(D.x,D.y); g.closePath(); g.fill();
  }
  g.globalAlpha=spd; g.strokeStyle='#ffffff'; g.lineWidth=2; g.beginPath();
  for(i=0;i<=n;i++){ var Q=ptAt(gx,gy,dir,angs[i],L*1.02); if(!i) g.moveTo(Q.x,Q.y); else g.lineTo(Q.x,Q.y); }
  g.stroke(); g.restore();
}
function drawThrust(g,gx,gy,dir,p,ws,t,k){
  var L=(ws?ws.len*k:16), a=Math.sin(Math.min(1,p)*Math.PI), col=ws?bladeColor(ws,t):'#ffffff', off=a*14;
  g.save(); g.globalCompositeOperation='lighter'; g.globalAlpha=a*0.9; g.strokeStyle=col; g.lineWidth=7*a+1; g.lineCap='round';
  g.beginPath(); g.moveTo(gx+dir*(L*0.4+off-22),gy-3); g.lineTo(gx+dir*(L+off+8),gy-3); g.stroke();
  g.strokeStyle='#fff'; g.lineWidth=2; g.beginPath(); g.moveTo(gx+dir*(L*0.6+off),gy-3); g.lineTo(gx+dir*(L+off+8),gy-3); g.stroke();
  glow(g,gx+dir*(L+off+8),gy-3,14*a+4,col,0.8*a); g.restore();
}

var drawPlayerBase=drawPlayer;
drawPlayer=function(){
  var t=performance.now(), id=G.save['캐릭터'], eq=heroEq(), ws=(NEW_ART&&eq.w)?weaponSprite(eq.w.id):null;
  var psx=Math.round(player.x*TILE-cam.x), psy=Math.round(player.y*TILE-cam.y);
  if(!ws){ drawPlayerBase(); return; }                       // art.js 구버전이면 원래 방식으로
  var i;
  for(i=RM.ghosts.length-1;i>=0;i--){
    var gh=RM.ghosts[i], al=1-(t-gh.t)/260;
    if(al<=0){ RM.ghosts.splice(i,1); continue; }
    ctx.globalAlpha=al*0.4; drawHero(ctx,id,Math.round(gh.x*TILE-cam.x),Math.round(gh.y*TILE-cam.y)-TILE*0.14,TILE*1.15,gh.dir,false,eq);
  }
  ctx.globalAlpha=1;
  var dodging=t<RM.dodgeUntil;
  ctx.fillStyle='rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(psx,psy+TILE*0.3,TILE*0.26*(dodging?1.3:1),TILE*0.11,0,0,7); ctx.fill();
  var hop=player.moving&&!dodging?Math.abs(Math.sin(player.anim))*3:0;
  var cy=psy-hop-TILE*0.14+(dodging?TILE*0.08:0), dir=player.dir<0?-1:1, k=Math.max(1,Math.round(TILE*1.15/19));
  var st=swingState(t), ca=castAng(t), ang=0, off=0, lunge=0, thrust=(ws.type==='p'||ws.type==='o');
  if(ca!==null){ ang=ca; }
  else if(st){
    if(thrust){ ang=88*Math.PI/180*Math.sin(Math.min(1,st.p*1.6)*Math.PI/2)*(st.p<0.7?1:1-(st.p-0.7)/0.3); off=Math.sin(Math.min(1,st.p)*Math.PI)*12; }
    else ang=swingAng(st.step,st.p);
    lunge=Math.sin(Math.min(1,st.p*1.4)*Math.PI)*(st.step===3?9:4);
  }
  var bx=psx+dir*lunge, gx=bx+dir*6.5*k+dir*off, gy=cy+5*k;
  ctx.globalAlpha=(!dodging&&t<invulnUntil&&Math.floor(t/120)%2)?0.4:1;
  function putWeapon(){ ctx.save(); ctx.translate(Math.round(gx),Math.round(gy)); ctx.scale(dir,1); ctx.rotate(ang); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(ws.c,-ws.gx*k,-ws.gy*k,9*k,22*k); ctx.restore(); }
  var front=(ang<-0.25);                                     // 뒤로 젖힌 동안엔 몸 앞에 그려 머리 위로 보이게
  if(!front) putWeapon();
  var e2={}; for(var kk in eq) e2[kk]=eq[kk]; e2.noW=1;
  drawHero(ctx,id,bx,cy,TILE*1.15,dir,player.moving,e2);
  if(front) putWeapon();
  ctx.globalAlpha=1;
  if(ca!==null&&ca>0.6){ ctx.save(); ctx.globalCompositeOperation='lighter'; var tp=ptAt(gx,gy,dir,ca,ws.len*k); glow(ctx,tp.x,tp.y,16,bladeColor(ws,t).charAt(0)==='#'?bladeColor(ws,t):'#ffffff',0.55); ctx.restore(); }
  else if(st){ if(thrust) drawThrust(ctx,bx+dir*6.5*k,gy,dir,st.p,ws,t,k); else drawTrail(ctx,gx,gy,dir,st,ws,t,k); }
};

/* ── 타격 연출: 불꽃 · 충격 링 · 3타 땅울림 ── */
function hitSparks(e){
  var eq=heroEq(), ws=(eq.w&&NEW_ART)?weaponSprite(eq.w.id):null, col=ws&&/^#/.test(ws.col)?ws.col:'#ffe9a8', p=pos(e), step=(window.RM&&RM.lastComboStep)||1, i, dir=player.dir<0?-1:1;
  var n=RED(step===3?16:9);
  for(i=0;i<n;i++) sparkP(p.x,p.y,(dir>0?0:Math.PI)+rnd(-1.1,1.1)+(step===2?0.4:0),rnd(160,380),rnd(0.18,0.4),i%2?'#ffffff':col,300);
  var ang=(step===2?-0.6:0.5)*dir;
  fxAdd({dur:0.16,drw:function(g){ var q=this.t/this.dur, X=p.x-cam.x, Y=p.y-cam.y, Ln=(step===3?46:32)*(1-q*0.3);
    g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(255,255,255,'+(1-q)+')'; g.lineWidth=3*(1-q)+1; g.lineCap='round';
    g.beginPath(); g.moveTo(X-Math.cos(ang)*Ln,Y-Math.sin(ang)*Ln); g.lineTo(X+Math.cos(ang)*Ln,Y+Math.sin(ang)*Ln); g.stroke(); glow(g,X,Y,22*(1-q*0.5),col,0.5*(1-q)); }});
  if(step===3){ after(0.1,function(){ ring(p.x,p.y+10,64,col,0.35,6,0.5); for(var j=0;j<RED(8);j++) smokeP(p.x+rnd(-20,20),p.y+rnd(6,16),rnd(-70,70),rnd(-40,-10),rnd(0.4,0.8),rnd(9,15),'#8a7a66'); }); }
}
var _atk=attackHunt;
attackHunt=function(e){ var b=lastAtk; _atk(e); if(lastAtk!==b) hitSparks(e); };

/* ═══════════════ ② 공격 스킬 5종 ═══════════════ */
/* 🔥 화염구 (아레테) */
function skFire(tg){
  var e=tg[0], tp=pos(e), sfx=sfx2;
  sfx('fire');
  fxAdd({dur:0.18,drw:function(g){ var p=this.t/this.dur, m=muzzle(), X=m.x-cam.x, Y=m.y-cam.y;
    g.globalCompositeOperation='lighter'; glow(g,X,Y,10+26*p,'#ff7a1e',0.7); glow(g,X,Y,5+9*p,'#fff2a0',0.95);
    for(var i=0;i<6;i++){ var a=i/6*6.2832+this.t*14, rr=(1-p)*30+6; g.fillStyle='#ffca4b'; g.fillRect(X+Math.cos(a)*rr,Y+Math.sin(a)*rr,3,3); } }});
  after(0.18,function(){
    var o=muzzle(), dx=tp.x-o.x, dy=tp.y-o.y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d, dur=Math.max(0.12,d/720), px=o.x, py=o.y;
    fxAdd({dur:dur,
      upd:function(t){ px=o.x+ux*d*(t/dur); py=o.y+uy*d*(t/dur);
        for(var i=0;i<2;i++){ glowP(px-ux*rnd(0,16)+rnd(-4,4),py-uy*rnd(0,16)+rnd(-4,4),-ux*rnd(20,90)+rnd(-30,30),-uy*rnd(20,90)+rnd(-60,-10),rnd(0.25,0.5),rnd(5,10),Math.random()<0.5?'#ff6a1a':'#ffb020',0.85); }
        if(Math.random()<0.4) smokeP(px-ux*24,py-uy*24,rnd(-20,20),rnd(-50,-10),rnd(0.4,0.7),rnd(8,13),'#3a2424'); },
      drw:function(g){ var X=px-cam.x, Y=py-cam.y, i;
        g.globalCompositeOperation='lighter';
        for(i=1;i<=8;i++){ var q=i/8; glow(g,X-ux*q*74,Y-uy*q*74,24*(1-q*0.55),'#ff6a1a',0.55*(1-q)); }
        glow(g,X,Y,46,'#ff8a30',0.5);
        g.globalCompositeOperation='source-over';
        var gr=g.createRadialGradient(X,Y,0,X,Y,17); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.35,'#ffe070'); gr.addColorStop(0.7,'#ff8a1e'); gr.addColorStop(1,'rgba(224,66,30,0)');
        g.fillStyle=gr; g.beginPath(); g.arc(X,Y,17,0,6.2832); g.fill(); },
      end:function(){
        explode(tp.x,tp.y,66,'#fff2a0','#ff7a1e',6); hitStop(70);
        hitMob(e,2.3,'#ff9a3a',true);
        entities.forEach(function(o2){ if(o2===e||o2.dead||o2.type!=='hunt') return; var q=pos(o2); if(Math.hypot(q.x-tp.x,q.y-tp.y)<78) hitMob(o2,1.1,'#ff9a3a'); });
      }});
  });
}
/* 🪨 대지 강타 (포르사) */
function quake(cx,cy,R,mul,tg,big){
  var i, a;
  ring(cx,cy,R*1.12,'#d0a24a',0.42,9,0.5); after(0.08,function(){ ring(cx,cy,R*1.0,'#ffe0a0',0.42,6,0.5); }); after(0.16,function(){ ring(cx,cy,R*0.88,'#a8824a',0.42,5,0.5); });
  var cracks=[];
  for(i=0;i<(big?14:10);i++){ var ang=i/(big?14:10)*6.2832+rnd(-0.2,0.2), len=R*rnd(0.6,1.0), pts=[{x:cx,y:cy}], steps=Math.ceil(len/14);
    for(var s=1;s<=steps;s++){ var rr=s/steps*len, j=rnd(-6,6); pts.push({x:cx+Math.cos(ang)*rr-Math.sin(ang)*j,y:cy+(Math.sin(ang)*rr+Math.cos(ang)*j)*0.6}); } cracks.push(pts); }
  fxAdd({dur:1.3,L:0,drw:function(g){ var p=this.t/this.dur, reveal=outC(Math.min(1,this.t/0.3)), al=p<0.3?1:1-(p-0.3)/0.7;
    g.lineCap='round'; g.lineJoin='round';
    cracks.forEach(function(pts){ var m=Math.max(2,Math.floor(pts.length*reveal));
      g.strokeStyle='rgba(30,18,10,'+al+')'; g.lineWidth=5; g.beginPath(); for(var q=0;q<m;q++){ if(!q) g.moveTo(pts[q].x-cam.x,pts[q].y-cam.y); else g.lineTo(pts[q].x-cam.x,pts[q].y-cam.y); } g.stroke();
      g.save(); g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(255,154,58,'+(al*0.9)+')'; g.lineWidth=1.8; g.beginPath(); for(var q2=0;q2<m;q2++){ if(!q2) g.moveTo(pts[q2].x-cam.x,pts[q2].y-cam.y); else g.lineTo(pts[q2].x-cam.x,pts[q2].y-cam.y); } g.stroke(); g.restore(); }); }});
  for(i=0;i<RED(big?26:16);i++){ a=Math.random()*6.2832; var rr2=rnd(0.15,0.9)*R; rockP(cx+Math.cos(a)*rr2,cy+Math.sin(a)*rr2*0.6,Math.cos(a)*rnd(20,120),rnd(-560,-300),cy+Math.sin(a)*rr2*0.6+rnd(4,16)); }
  for(i=0;i<RED(18);i++){ a=Math.random()*6.2832; smokeP(cx+Math.cos(a)*R*0.3,cy+Math.sin(a)*R*0.2,Math.cos(a)*rnd(80,200),Math.sin(a)*rnd(20,60)-20,rnd(0.6,1.0),rnd(12,20),'#8a7458'); }
  (tg||[]).forEach(function(e){ var q=pos(e), d=Math.hypot(q.x-cx,(q.y-cy)*1.4); after(Math.min(0.45,d/(R/0.3)),function(){ if(hitMob(e,mul,'#d0a24a',true)){ for(var z=0;z<6;z++) sparkP(q.x,q.y,rnd(-3.1,0),rnd(140,300),rnd(0.2,0.4),'#ffe0a0',500); } }); });
}
function skEarth(tg){
  var h=hero(), cx=h.x+h.dir*8, cy=h.y+TILE*0.46;
  sfx2('quake'); shakeScreen(9); hitStop(90);
  quake(cx,cy,2.4*TILE,1.35,tg,false);
}
/* 🌀 질풍 참격 (아길레) */
function skWind(tg){
  var dir=player.dir<0?-1:1, h=hero(), travel=3.6*TILE+30, sp=900, dur=travel/sp, sx=h.x+dir*14, sy=h.y+6;
  sfx2('wind'); invulnUntil=Math.max(invulnUntil,performance.now()+280);
  var gh=0;
  fxAdd({dur:0.16,upd:function(t,dt){ tryMove(player.x+dir*22*dt,player.y); gh+=dt; if(gh>0.03){ gh=0; if(window.RM&&RM.ghosts) RM.ghosts.push({x:player.x,y:player.y,dir:dir,t:performance.now()}); }
    for(var i=0;i<3;i++) sparkP(player.x*TILE-dir*10,h.y+rnd(-6,24),dir>0?Math.PI:0,rnd(200,420),rnd(0.15,0.3),i%2?'#37e0cf':'#ffffff',0); }});
  var hx=[]; 
  fxAdd({dur:dur,
    upd:function(t){ var x=sx+dir*sp*t; if(Math.random()<0.8) sparkP(x-dir*10,sy+rnd(-28,28),dir>0?Math.PI:0,rnd(120,300),rnd(0.15,0.3),'#c6fff6',0); },
    drw:function(g){ var t=this.t, x=sx+dir*sp*t-cam.x, y=sy-cam.y, fade=t>dur*0.8?1-(t-dur*0.8)/(dur*0.2):1, i;
      g.globalCompositeOperation='lighter';
      for(i=0;i<5;i++){ var yy=(i-2)*10; g.strokeStyle='rgba(198,255,246,'+(0.5*fade*(1-Math.abs(i-2)*0.2))+')'; g.lineWidth=2; g.beginPath(); g.moveTo(x-dir*(40+Math.abs(i-2)*14),y+yy); g.lineTo(x-dir*(120+i*6),y+yy); g.stroke(); }
      g.save(); g.translate(x,y); g.scale(dir,1);
      g.beginPath(); g.moveTo(-14,-40); g.quadraticCurveTo(44,0,-14,40); g.quadraticCurveTo(12,0,-14,-40); g.closePath();
      g.strokeStyle='rgba(55,224,207,'+(0.35*fade)+')'; g.lineWidth=12; g.stroke();
      var gr=g.createLinearGradient(-14,0,40,0); gr.addColorStop(0,'rgba(55,224,207,'+(0.9*fade)+')'); gr.addColorStop(1,'rgba(255,255,255,'+fade+')');
      g.fillStyle=gr; g.fill(); g.restore(); glow(g,x+dir*16,y,42,'#37e0cf',0.35*fade); }});
  tg.forEach(function(e){ var q=pos(e), need=Math.max(0,(q.x-sx)*dir)/sp; after(need,function(){
    if(hitMob(e,1.7,'#37e0cf',true)){ for(var i=0;i<RED(12);i++) sparkP(q.x,q.y,rnd(0,6.28),rnd(160,380),rnd(0.2,0.4),i%2?'#ffffff':'#37e0cf',200);
      fxAdd({dur:0.2,drw:function(g){ var p=this.t/this.dur, X=q.x-cam.x, Y=q.y-cam.y; g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(255,255,255,'+(1-p)+')'; g.lineWidth=3*(1-p)+1; g.lineCap='round';
        g.beginPath(); g.moveTo(X-30,Y-30*dir*0+22); g.lineTo(X+30,Y-22); g.moveTo(X-30,Y-22); g.lineTo(X+30,Y+22); g.stroke(); glow(g,X,Y,26,'#37e0cf',0.55*(1-p)); }}); shakeScreen(3); } }); });
}
/* ✨ 성스러운 빛 (리커버) */
function skHoly(tg){
  var h=hero(), cx=h.x, cy=h.y+TILE*0.44, i;
  sfx2('holy'); hitStop(60);
  magicCircle(cx,cy,2.4*TILE,'#ffe070',1.0);
  for(i=0;i<RED(12);i++) glowP(cx+rnd(-50,50),cy+rnd(-8,10),rnd(-12,12),rnd(-110,-50),rnd(0.8,1.3),rnd(5,8),'#9af5b8',0.85);
  tg.forEach(function(e,idx){ var q=pos(e); after(0.12+idx*0.05,function(){ magicCircle(q.x,q.y+12,44,'#ffe070',0.6); after(0.14,function(){
      pillar(q.x,q.y+12,'#ffe070',0.6,22);
      after(0.1,function(){ if(hitMob(e,1.35,'#ffe070',true)){ shakeScreen(3); for(var k=0;k<RED(8);k++) featherP(q.x+rnd(-18,18),q.y-rnd(30,60),rnd(0.7,1.2)); } }); }); }); });
}
/* ⚡ 연쇄 번개 (멘타) */
function skBolt(tg){
  var m=muzzle(), cur={x:m.x,y:m.y}, ch=tg.slice().sort(function(a,b){ var A=pos(a),B=pos(b); return Math.hypot(A.x-m.x,A.y-m.y)-Math.hypot(B.x-m.x,B.y-m.y); }).slice(0,4);
  sfx2('bolt'); screenFlash('#c9aef5',0.16,0.14);
  ch.forEach(function(e,idx){ var q=pos(e), from={x:cur.x,y:cur.y}; cur={x:q.x,y:q.y};
    after(idx*0.09,function(){
      boltFx(from.x,from.y,q.x,q.y,0.3,'#8a6aff',2.2,26);
      glowP(from.x,from.y,0,0,0.25,30,'#c9aef5',0.8);
      if(hitMob(e,1.5,'#c9aef5',true)){ shakeScreen(3); for(var i=0;i<RED(14);i++) sparkP(q.x,q.y,Math.random()*6.2832,rnd(120,380),rnd(0.2,0.45),i%2?'#ffffff':'#c9aef5',200);
        ring(q.x,q.y+10,34,'#c9aef5',0.3,4,0.55); glowP(q.x,q.y,0,0,0.22,54,'#c9aef5',0.9); } }); });
}
var SKFX={taro:skFire,mir:skEarth,hana:skWind,yuri:skHoly,leon:skBolt};

var _castBase=castAttackSkill;
castAttackSkill=function(manual){
  if(!G.save) return;
  var now=performance.now();
  if(now<player.skillReady){ if(manual) toast('스킬 재사용 대기 중…'); return; }
  var id=G.save['캐릭터'], sk=ATKSK[id]||ATKSK.taro, fn=SKFX[id]||skFire;
  var mobs=entities.filter(function(e){ return !e.dead&&e.type==='hunt'&&regionReachable(Math.floor(e.tx/ZC)); });
  var RANGE={single:2.8,aoe:2.4,line:3.6,chain:3.6}[sk.type]||2.8;
  var inR=mobs.filter(function(e){ if(sk.type==='line'){ var dxr=(e.tx-player.x)*player.dir; return dxr>-0.6&&dxr<RANGE&&Math.abs(e.ty-player.y)<1.3; } return Math.hypot(e.tx-player.x,e.ty-player.y)<=RANGE; });
  if(!inR.length){ if(manual) toast('사거리 안에 몬스터가 없어요'); return; }
  inR.sort(function(a,b){ return Math.hypot(a.tx-player.x,a.ty-player.y)-Math.hypot(b.tx-player.x,b.ty-player.y); });
  player.skillReady=now+SK_CD; player.gauge=Math.min(100,player.gauge+10); castT=now;
  var face=inR[0].tx<player.x?-1:1; if(sk.type!=='line') player.dir=face;
  fn(inR);
  var h=hero(); addFx(player.x+0.5,player.y-1.0,sk.name,sk.col);
};

/* ═══════════════ ③ 필살기 5종 ═══════════════ */
function ultBanner(name,col,sub){
  fxAdd({L:2,dur:1.6,drw:function(g){
    var t=this.t, inn=Math.min(1,t/0.2), out=t>1.35?1-(t-1.35)/0.25:1, a=Math.max(0,Math.min(1,inn*out)), y=H*0.26, off=(1-outC(inn))*-W;
    g.globalAlpha=a; g.translate(off,0);
    g.fillStyle='rgba(10,6,20,.84)'; g.beginPath(); g.moveTo(-20,y); g.lineTo(W+20,y-10); g.lineTo(W+20,y+70); g.lineTo(-20,y+80); g.closePath(); g.fill();
    g.fillStyle=col; g.fillRect(0,y-2,W,3); g.fillRect(0,y+76,W,3);
    g.textAlign='center'; g.textBaseline='middle'; g.font='34px DungGeunMo,sans-serif';
    g.shadowColor=col; g.shadowBlur=18; g.lineWidth=5; g.strokeStyle='#120a1a'; g.strokeText('★ '+name+' ★',W/2,y+32); g.fillStyle='#ffffff'; g.fillText('★ '+name+' ★',W/2,y+32);
    g.shadowBlur=0; g.font='12px DungGeunMo,sans-serif'; g.fillStyle=col; g.fillText(sub||'필살기',W/2,y+62); }});
}
function ultDim(dur){
  fxAdd({L:0,dur:dur,drw:function(g){
    var t=this.t, a=(t<0.25?t/0.25:(t>dur-0.4?(dur-t)/0.4:1))*0.58, px=player.x*TILE-cam.x, py=player.y*TILE-cam.y-10;
    var gr=g.createRadialGradient(px,py,50,px,py,Math.max(W,H)*0.75); gr.addColorStop(0,'rgba(6,3,14,0)'); gr.addColorStop(1,'rgba(6,3,14,'+a+')');
    g.fillStyle=gr; g.fillRect(0,0,W,H); g.fillStyle='rgba(6,3,14,'+(a*0.25)+')'; g.fillRect(0,0,W,H); }});
}
function ultMeteor(tg,R,mul){
  var h=hero(), spots=[], i;
  tg.forEach(function(e){ var q=pos(e); spots.push({x:q.x,y:q.y,e:e}); });
  while(spots.length<8) spots.push({x:h.x+rnd(-R,R)*0.85,y:h.y+TILE*0.4+rnd(-R,R)*0.5});
  spots.forEach(function(s,idx){ after(0.45+idx*0.085,function(){
    var sx=s.x+280, sy=s.y-620, dur=0.34, d=Math.hypot(280,620), ux=-280/d, uy=620/d;
    fxAdd({dur:dur,upd:function(t){ var x=sx+(s.x-sx)*(t/dur), y=sy+(s.y-sy)*(t/dur); glowP(x,y,rnd(-20,20),rnd(-20,20),rnd(0.25,0.5),rnd(8,14),Math.random()<0.5?'#ff6a1a':'#ffb020',0.8); },
      drw:function(g){ var p=this.t/dur, x=sx+(s.x-sx)*p-cam.x, y=sy+(s.y-sy)*p-cam.y, i2;
        g.globalCompositeOperation='lighter'; for(i2=1;i2<=10;i2++){ var q=i2/10; glow(g,x-ux*q*120,y-uy*q*120,22*(1-q*0.6),'#ff6a1a',0.6*(1-q)); }
        glow(g,x,y,42,'#ff8a30',0.55); g.globalCompositeOperation='source-over';
        var gr=g.createRadialGradient(x,y,0,x,y,16); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.4,'#ffe070'); gr.addColorStop(1,'rgba(255,100,30,0)'); g.fillStyle=gr; g.beginPath(); g.arc(x,y,16,0,6.2832); g.fill(); },
      end:function(){ explode(s.x,s.y,78,'#fff2a0','#ff7a1e',idx%2?4:7); if(s.e) hitMob(s.e,mul,'#ff9a3a',true); }}); }); });
}
function ultSpikes(tg,R,mul){
  var h=hero(), cx=h.x, cy=h.y+TILE*0.44, i;
  after(0.45,function(){ shakeScreen(10); quake(cx,cy,R,0,[],true); });
  for(i=0;i<16;i++) (function(i){ var a=rnd(0,6.2832), rr=rnd(0.25,1)*R, sx=cx+Math.cos(a)*rr, sy=cy+Math.sin(a)*rr*0.6, hh=rnd(70,115);
    after(0.5+i*0.035,function(){ fxAdd({dur:0.7,drw:function(g){ var p=this.t/this.dur, rise=outC(Math.min(1,p/0.25)), fade=p>0.6?1-(p-0.6)/0.4:1, X=sx-cam.x, Y=sy-cam.y, ht=hh*rise;
      g.globalAlpha=fade; var gr=g.createLinearGradient(X-10,0,X+10,0); gr.addColorStop(0,'#e8ecf4'); gr.addColorStop(0.5,'#9aa4b8'); gr.addColorStop(1,'#4a5268');
      g.fillStyle=gr; g.beginPath(); g.moveTo(X-11,Y); g.lineTo(X,Y-ht); g.lineTo(X+11,Y); g.closePath(); g.fill(); g.strokeStyle='#20263a'; g.lineWidth=2; g.stroke();
      g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(255,255,255,'+(0.7*fade)+')'; g.lineWidth=1.5; g.beginPath(); g.moveTo(X-4,Y-4); g.lineTo(X-0.5,Y-ht+5); g.stroke(); }});
      for(var z=0;z<RED(3);z++) rockP(sx,sy,rnd(-60,60),rnd(-300,-160),sy+8); }); })(i);
  tg.forEach(function(e,idx){ after(0.6+Math.min(idx,8)*0.04,function(){ if(hitMob(e,mul,'#e8ecf4',true)){ var q=pos(e); for(var k=0;k<RED(10);k++) sparkP(q.x,q.y,rnd(-3.1,0),rnd(160,380),rnd(0.25,0.5),'#e8ecf4',500); } }); });
}
function ultSlashes(tg,R,mul){
  var h=hero(), cs=[], i;
  tg.forEach(function(e){ cs.push(pos(e)); }); cs.push({x:h.x,y:h.y+10});
  for(i=0;i<14;i++) (function(i){ var c=cs[Math.floor(Math.random()*cs.length)], a=rnd(-0.9,0.9)+(i%2?Math.PI:0)*0+(Math.random()<0.5?0.7:-0.7), len=rnd(130,210), ux=Math.cos(a), uy=Math.sin(a);
    after(0.4+i*0.05,function(){ fxAdd({dur:0.24,drw:function(g){ var p=this.t/this.dur, reveal=outC(Math.min(1,p/0.4)), fade=p>0.4?1-(p-0.4)/0.6:1, X=c.x-cam.x, Y=c.y-cam.y, hl=len/2;
      var x0=X-ux*hl, y0=Y-uy*hl, x1=x0+ux*len*reveal, y1=y0+uy*len*reveal, nx=-uy, ny=ux, w=9*fade;
      g.globalCompositeOperation='lighter'; g.fillStyle='rgba(55,224,207,'+(0.6*fade)+')'; g.beginPath(); g.moveTo(x0,y0); g.lineTo((x0+x1)/2+nx*w*1.6,(y0+y1)/2+ny*w*1.6); g.lineTo(x1,y1); g.lineTo((x0+x1)/2-nx*w*1.6,(y0+y1)/2-ny*w*1.6); g.closePath(); g.fill();
      g.fillStyle='rgba(255,255,255,'+fade+')'; g.beginPath(); g.moveTo(x0,y0); g.lineTo((x0+x1)/2+nx*w*0.5,(y0+y1)/2+ny*w*0.5); g.lineTo(x1,y1); g.lineTo((x0+x1)/2-nx*w*0.5,(y0+y1)/2-ny*w*0.5); g.closePath(); g.fill();
      glow(g,X,Y,34*fade,'#37e0cf',0.45*fade); }}); if(i%3===0) shakeScreen(3); }); })(i);
  var acc=0; fxAdd({dur:1.1,upd:function(t,dt){ acc+=dt; if(acc>0.02&&t>0.25){ acc=0; var a=t*9, rr=rnd(40,80); glowP(h.x+Math.cos(a)*rr,h.y+Math.sin(a)*rr*0.5+14,Math.cos(a+1.57)*110,Math.sin(a+1.57)*55,0.4,rnd(4,7),'#c6fff6',0.8); } }});
  [0.55,0.75,0.95].forEach(function(d){ after(d,function(){ tg.forEach(function(e){ if(hitMob(e,mul/3,'#37e0cf',true)){ var q=pos(e); for(var k=0;k<RED(7);k++) sparkP(q.x,q.y,rnd(0,6.28),rnd(160,360),rnd(0.2,0.4),'#ffffff',200); } }); shakeScreen(4); }); });
}
function ultNova(tg,R,mul){
  var h=hero(), cx=h.x, cy=h.y+TILE*0.44, i;
  magicCircle(cx,cy,R*0.95,'#ffe070',1.3);
  after(0.4,function(){ pillar(cx,cy,'#ffe070',0.95,42); screenFlash('#fff6c8',0.3,0.3); shakeScreen(6);
    for(var k=0;k<RED(28);k++) featherP(cx+rnd(-R,R),cy-rnd(120,420),rnd(1.0,1.8));
    for(var z=0;z<RED(14);z++) glowP(cx+rnd(-40,40),cy+rnd(-6,6),rnd(-15,15),rnd(-200,-80),rnd(0.8,1.4),rnd(5,8),z%2?'#9af5b8':'#ffffff',0.9); });
  [0.5,0.66,0.82].forEach(function(d,idx){ after(d,function(){ ring(cx,cy,R*(1.35-idx*0.1),idx%2?'#ffffff':'#ffe070',0.55,10-idx*2,0.5); }); });
  tg.forEach(function(e){ var q=pos(e), d=Math.hypot(q.x-cx,(q.y-cy)*1.5); after(0.5+Math.min(0.55,d/(R*2.2)),function(){ pillar(q.x,q.y+12,'#ffe070',0.6,20);
    after(0.1,function(){ if(hitMob(e,mul,'#ffe070',true)){ for(var k=0;k<RED(6);k++) featherP(q.x+rnd(-16,16),q.y-rnd(20,50),rnd(0.7,1.2)); } }); }); });
}
function ultStorm(tg,R,mul){
  var h=hero(), i, skyY=function(){ return cam.y-30; };
  fxAdd({L:2,dur:1.5,drw:function(g){ var t=this.t, a=(t<0.2?t/0.2:(t>1.1?(1.5-t)/0.4:1))*0.55, gr=g.createLinearGradient(0,0,0,H*0.4); gr.addColorStop(0,'rgba(40,20,80,'+a+')'); gr.addColorStop(1,'rgba(40,20,80,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H*0.4); }});
  var list=[]; tg.forEach(function(e){ list.push({e:e,p:pos(e)}); });
  while(list.length<10) list.push({p:{x:h.x+rnd(-R,R),y:h.y+TILE*0.4+rnd(-R,R)*0.5}});
  list.forEach(function(s,idx){ after(0.4+idx*0.075,function(){
    var sx=s.p.x+rnd(-50,50), sy=skyY();
    boltFx(sx,sy,s.p.x,s.p.y,0.32,'#8a6aff',3,44);
    if(idx%2===0) screenFlash('#e8dcff',0.22,0.1);
    shakeScreen(4); sfx2('bolt');
    for(var k=0;k<RED(12);k++) sparkP(s.p.x,s.p.y,rnd(-3.1,0),rnd(140,400),rnd(0.25,0.5),k%2?'#ffffff':'#c9aef5',500);
    ring(s.p.x,s.p.y+10,50,'#c9aef5',0.34,5,0.55); glowP(s.p.x,s.p.y,0,0,0.26,70,'#c9aef5',0.9);
    if(s.e) hitMob(s.e,mul,'#c9aef5',true); }); });
}
var ULT={taro:{f:ultMeteor,n:'지식 폭발',c:'#ffca4b',s:'메테오 스트라이크'},mir:{f:ultSpikes,n:'강철 강타',c:'#8fa3ff',s:'강철의 가시'},
         hana:{f:ultSlashes,n:'질풍 연격',c:'#37e0cf',s:'천 개의 참격'},yuri:{f:ultNova,n:'생명의 파동',c:'#ffe070',s:'성스러운 강림'},leon:{f:ultStorm,n:'정령 폭풍',c:'#c9aef5',s:'천둥의 심판'}};
castActionSkill=function(){
  if(casting||!G.save) return; casting=true; player.gauge=0;
  var id=G.save['캐릭터'], u=ULT[id]||ULT.taro;
  var learned=Object.keys(G.save['스킬']||{}).length, hasUlt=!!(G.save['스킬']||{})[id.charAt(0)+'_ult'];
  var R=(3+learned*0.3+(hasUlt?2:0))*TILE, mul=(3+learned*0.5)*(hasUlt?1.6:1);
  var tg=entities.filter(function(e){ return !e.dead&&e.type==='hunt'&&regionReachable(Math.floor(e.tx/ZC))&&!(e.hp!==undefined&&e.hp<=0)&&Math.hypot(e.tx-player.x,e.ty-player.y)<=R/TILE; });
  hitStop(200); sfx2('ult'); castT=performance.now(); vib&&vib([40,60,40]);
  ultDim(1.7); ultBanner(u.n,u.c,u.s);
  u.f(tg,R,mul);
  setTimeout(function(){ casting=false; },1800);
};

/* ═══════════════ ④ 스킬 버튼 쿨타임 게이지 ═══════════════ */
var css=document.createElement('style');
css.textContent='#btn-atk{position:relative}'+
 '#btn-atk::after{content:"";position:absolute;inset:0;border-radius:4px;pointer-events:none;background:conic-gradient(rgba(10,6,20,.74) 0 var(--cdp,0%),transparent 0)}'+
 '#btn-atk.cool{opacity:1!important}'+
 '#btn-atk.ready{animation:rdyp 1.3s ease-in-out infinite}'+
 '@keyframes rdyp{50%{box-shadow:0 0 0 2px var(--gold),0 0 12px rgba(255,202,75,.75),0 4px 0 var(--line)}}';
document.head.appendChild(css);
var btnAtk=null;
function hudCd(){
  if(!btnAtk) btnAtk=document.getElementById('btn-atk'); if(!btnAtk) return;
  var rem=Math.max(0,(player.skillReady-performance.now())/SK_CD);
  btnAtk.style.setProperty('--cdp',(rem*100).toFixed(1)+'%');
}

var _update=update;
update=function(dt){ _update(dt); stepFX(dt); hudCd(); };
var _draw=draw;
draw=function(){ _draw(); if(G.save&&running) drawFX(ctx); };

window.FX={explode:explode,ring:ring,pillar:pillar,boltFx:boltFx,list:FXS,parts:PT,step:stepFX,draw:drawFX,skills:SKFX,ults:ULT};
function setVer(){ try{ var v=document.getElementById('ver'); if(v) v.textContent='빌드 v27 전투 연출'; }catch(e){} }
window.addEventListener('DOMContentLoaded',setVer); window.addEventListener('load',setVer);
})();
