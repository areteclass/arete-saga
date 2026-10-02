/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v31 스킬트리 2.0 (skills.js)
   · 캐릭터마다 전투 스킬 5개(Lv1~5, Lv3에서 갈림길) · 패시브 4개 · 필살기 2종 → 3칸 슬롯 + 필살기 칸에 장착
   · 직접 누르는 방식(키보드 1·2·3, 필살기는 4 / 숫자패드도 가능 / 또는 화면 버튼). 필살기도 게이지가 차면 직접 발동
   · 상태이상(화상·둔화·기절), 버프(공격력·이동·피해감소·보호막), 회전체·장판·유성 등 효과 10종을 조합해 스킬을 구성
   · 스킬 정의(이름·비용·조건)는 서버(Addon.gs)가 내려주고, 이 파일은 연출·수치만 가진다.
   필요: fx.js v31 (먼저 로드). 로드 순서: remaster → art → world → hero → fx → skills
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(!window.FX||!FX.v||FX.v<31){ console.warn('skills.js: fx.js(v31)가 필요해요'); return; }
if(typeof castAttackSkill!=='function'||typeof openSkillTree!=='function'){ return; }
var F=FX, rnd=F.rnd, lerp=F.lerp, outC=F.outC, glow=F.glow, rgba=F.rgba;
function nowMs(){ return performance.now(); }

/* ───────────────────────── 1. 스킬 수치표 ─────────────────────────
   x:{키:배율} = 곱하기, set:{키:값} = 덮어쓰기. a/b = Lv3 갈림길.
   공통: mul=피해 배율 · cd=재사용(초) · range=사거리(칸) · rad/len/wid/dist=px/칸 */
var PARAMS={
  /* 아레테 — 화염 */
  taro_s1:{arch:'proj',cd:4.2,range:3.2,mul:2.3,rad:66,col:'#ff7a1e',c2:'#fff2a0',fire:1,need:1,a:{x:{rad:1.7,mul:.92}},b:{set:{count:3,spread:13},x:{mul:.55,rad:.8}}},
  taro_s2:{arch:'wave',cd:5.5,len:3.4,wid:46,mul:1.9,col:'#ff7a1e',c2:'#ffe070',style:'flame',burn:.35,fire:1,a:{set:{twice:1}},b:{x:{len:1.4,wid:1.5,mul:1.15}}},
  taro_s3:{arch:'zone',cd:10,range:3.4,at:'target',need:1,rad:90,dur:5,tick:.5,mul:.45,col:'#ff5a1e',c2:'#ffca4b',style:'fire',fire:1,a:{x:{rad:1.3},set:{slow:{pct:.3,sec:1}}},b:{x:{mul:1.5,dur:1.4}}},
  taro_s4:{arch:'dash',cd:9,dist:3,mul:1.6,endRad:80,endMul:1.2,col:'#ff7a1e',c2:'#ffe070',fire:1,a:{set:{double:1}},b:{x:{endRad:1.6},set:{stun:.8}}},
  taro_s5:{arch:'meteor',cd:14,range:3.8,need:1,n:1,rad:110,mul:4.5,delay:.8,spread:90,col:'#ff7a1e',c2:'#fff2a0',fire:1,a:{set:{n:3},x:{mul:.55,rad:.7}},b:{x:{rad:1.5,mul:1.3},set:{stun:1}}},
  /* 포르사 — 대지 · 방어 */
  mir_s1:{arch:'nova',cd:5,rad:115,mul:1.35,cracks:1,col:'#d0a24a',c2:'#ffe0a0',kb:.5,a:{x:{rad:1.3},set:{stun:.6}},b:{set:{pulses:2,gap:.3},x:{mul:.8}}},
  mir_s2:{arch:'dash',cd:7,dist:3,mul:1.2,col:'#d0a24a',c2:'#e8ecf4',stun:.8,kb:1.2,a:{x:{dist:1.5},set:{dr:{pct:.4,sec:2}}},b:{set:{endRad:90,endMul:.8,endKb:1.2}}},
  mir_s3:{arch:'buff',cd:14,dur:6,dr:.45,shield:2,col:'#8fa3ff',c2:'#e8ecf4',a:{set:{reflect:1}},b:{x:{dur:1.65},set:{dr:.6}}},
  mir_s4:{arch:'wave',cd:8,len:4,wid:30,mul:2.2,style:'spike',col:'#a08050',c2:'#e0c898',stun:.5,a:{set:{fan:3}},b:{x:{mul:1.5,len:1.3}}},
  mir_s5:{arch:'nova',cd:16,rad:150,mul:.8,pull:1,col:'#ffca4b',c2:'#ffffff',buff:{atk:.25,dur:6},a:{set:{buff:{atk:.4,dur:6}}},b:{set:{stun:1.2}}},
  /* 아길레 — 바람 · 속도 */
  hana_s1:{arch:'wave',cd:5,len:3.6,wid:44,mul:1.7,dashSelf:2.4,col:'#37e0cf',c2:'#ffffff',style:'crescent',a:{set:{twice:1}},b:{x:{len:1.4,mul:1.2},set:{slow:{pct:.4,sec:2}}}},
  hana_s2:{arch:'nova',cd:6,rad:95,mul:.7,pulses:3,gap:.3,col:'#c6fff6',c2:'#37e0cf',style:'wind',a:{x:{rad:1.4}},b:{set:{pull:1}}},
  hana_s3:{arch:'buff',cd:12,dur:6,spd:.35,col:'#37e0cf',c2:'#ffffff',a:{set:{spd:.5}},b:{set:{aspd:.4,crit:.15}}},
  hana_s4:{arch:'flurry',cd:7,range:2.8,need:1,hits:5,mul:.6,col:'#ffffff',c2:'#37e0cf',a:{set:{hits:8}},b:{set:{crit:1},x:{mul:1.4}}},
  hana_s5:{arch:'zone',cd:13,range:3.4,at:'target',need:1,rad:100,dur:4,tick:.4,mul:.5,col:'#c6fff6',c2:'#37e0cf',style:'wind',slow:{pct:.5,sec:1},pull:1,a:{x:{rad:1.4}},b:{set:{twin:1}}},
  /* 리커버 — 신성 · 회복 */
  yuri_s1:{arch:'pillar',cd:5,range:3.2,need:1,n:3,mul:1.35,rad:22,col:'#ffe070',c2:'#ffffff',style:'holy',a:{set:{n:5},x:{mul:.8}},b:{x:{mul:1.2},set:{heal:1}}},
  yuri_s2:{arch:'heal',cd:12,col:'#9af5b8',c2:'#ffffff',a:{},b:{set:{shield:2}}},
  yuri_s3:{arch:'orbit',cd:14,n:3,dur:8,orad:62,mul:.5,spd:3.2,col:'#ffe070',c2:'#ffffff',style:'holy',a:{set:{n:4}},b:{set:{slow:{pct:.3,sec:1}},x:{spd:1.5}}},
  yuri_s4:{arch:'zone',cd:16,at:'self',rad:110,dur:6,tick:.6,mul:.4,col:'#ffe070',c2:'#9af5b8',style:'holy',healTick:1,a:{x:{rad:1.3}},b:{x:{mul:1.6}}},
  yuri_s5:{arch:'pillar',cd:13,range:3.6,need:1,n:1,mul:5.5,rad:34,delay:.5,stun:1.5,col:'#ffe070',c2:'#ffffff',style:'holy',tele:1,a:{set:{n:3,seq:1},x:{mul:.55}},b:{x:{rad:2.2,mul:.9}}},
  /* 멘타 — 번개 · 마력 */
  leon_s1:{arch:'chain',cd:4.6,range:3.4,need:1,jumps:4,mul:1.5,col:'#8a6aff',c2:'#ffffff',a:{set:{jumps:6}},b:{set:{stun:.4,slow:{pct:.4,sec:1.5}}}},
  leon_s2:{arch:'proj',cd:5,range:3.8,need:1,mul:2,rad:78,speed:420,col:'#8a6aff',c2:'#e8dcff',style:'orb',a:{set:{count:3,spread:14},x:{mul:.58,rad:.8}},b:{x:{rad:1.5,mul:1.1}}},
  leon_s3:{arch:'zone',cd:12,at:'self',rad:100,dur:6,tick:.5,mul:.35,col:'#8a6aff',c2:'#c9aef5',style:'volt',slow:{pct:.4,sec:1},a:{x:{tick:.8}},b:{x:{rad:1.3},set:{stunChance:.25}}},
  leon_s4:{arch:'orbit',cd:15,n:3,dur:8,orad:70,mul:.6,spd:3,col:'#c9aef5',c2:'#ffffff',style:'spirit',a:{set:{n:5}},b:{x:{mul:1.5,spd:.8}}},
  leon_s5:{arch:'pillar',cd:14,range:3.8,need:1,n:6,mul:.9,rad:26,col:'#8a6aff',c2:'#ffffff',style:'volt',rain:1,area:130,a:{set:{n:10},x:{mul:.6}},b:{set:{n:3,stun:.8},x:{mul:2.2,rad:1.4}}}
};
var ICON_COL={taro:['#ff7a1e','#ffe070'],mir:['#d0a24a','#e8ecf4'],hana:['#37e0cf','#ffffff'],yuri:['#ffe070','#9af5b8'],leon:['#8a6aff','#e8dcff']};

/* ───────────────────────── 2. 상태 읽기 ───────────────────────── */
var DEFS=null;
function D(id){
  if(!DEFS||DEFS._src!==G.fskills){ DEFS={_src:G.fskills}; (G.fskills||[]).forEach(function(d){ DEFS[d.id]=d; }); }
  return DEFS[id];
}
function enabled(){ return !!(G.fskills&&G.fskills.length&&G.save&&G.save['캐릭터']&&PARAMS[G.save['캐릭터']+'_s1']); }
function lvOf(id){ var v=Number((G.save['스킬']||{})[id])||0, d=D(id); if(d&&d.free&&v<1) v=1; return v; }
function brOf(id){ var st=G.save['문제상태']||{}; return (st.__fbr||{})[id]||''; }
function slots(){
  var st=G.save['문제상태']||{}, sl=st.__slots||{}, c=G.save['캐릭터'], o={'1':sl['1']||'','2':sl['2']||'','3':sl['3']||'',U:sl.U||''};
  if(!o['1']&&!o['2']&&!o['3']) o['1']=c+'_s1';
  if(!o.U) o.U=c+'_u1';
  return o;
}
function PM(){
  var c=G.save['캐릭터'], p=function(i){ return lvOf(c+'_p'+i); }, p1=p(1), p2=p(2), p3=p(3), p4=p(4);
  return {cdr:0.04*p1,power:0.06*p2,gauge:1+0.12*p3,
    dr:c==='mir'?0.03*p4:0, spd:c==='hana'?0.04*p4:0, dodgeCd:c==='hana'?90*p4:0,
    burn:c==='taro'?0.25*p4:0, fire:c==='taro'?0.05*p4:0, jumps:c==='leon'?(p4>=2?2:(p4>=1?1:0)):0};
}
function paramsFor(id,lvO,brO){
  var base=PARAMS[id]; if(!base) return null;
  var lv=lvO||lvOf(id)||1, br=(brO!==undefined?brO:brOf(id)), P={}, k, pm=PM();
  for(k in base){ if(k!=='a'&&k!=='b') P[k]=base[k]; }
  if(lv>=3&&br&&base[br]){
    var m=base[br];
    if(m.x) for(k in m.x){ if(typeof P[k]==='number') P[k]=P[k]*m.x[k]; }
    if(m.set) for(k in m.set) P[k]=m.set[k];
  }
  var sz=1+0.04*(lv-1);
  if(P.mul) P.mul*=1+0.16*(lv-1);
  if(P.endMul) P.endMul*=1+0.16*(lv-1);
  ['rad','len','wid','dist','range','endRad','orad'].forEach(function(q){ if(typeof P[q]==='number') P[q]*=sz; });
  if(P.dur) P.dur*=1+0.05*(lv-1);
  if(P.arch==='chain'||P.arch==='orbit'){ if(P.jumps) P.jumps+=pm.jumps; if(P.n) P.n+=pm.jumps; }
  P.cdMs=Math.max(1200,P.cd*1000*(1-0.035*(lv-1))*(1-pm.cdr));
  P.lv=lv; P.id=id;
  return P;
}

/* ───────────────────────── 3. 상태이상 · 버프 ───────────────────────── */
var B={atk:0,atkU:0,spd:0,spdU:0,aspd:0,aspdU:0,dr:0,drU:0,crit:0,critU:0,shield:0,shieldU:0,reflect:0,reflectU:0};
function bv(k){ return nowMs()<B[k+'U']?B[k]:0; }
function setBuff(k,v,sec){ B[k]=Math.max(bv(k),v); B[k+'U']=Math.max(B[k+'U'],nowMs()+sec*1000); }
function stOf(e){ return e.st||(e.st={}); }
function stun(e,sec){ if(!sec) return; var s=stOf(e); s.stun={until:Math.max(s.stun?s.stun.until:0,nowMs()+sec*1000)}; e.wind=0; }
function slow(e,pct,sec){ var s=stOf(e); s.slow={pct:Math.max(s.slow&&nowMs()<s.slow.until?s.slow.pct:0,pct),until:nowMs()+sec*1000}; }
function burn(e,P){ var s=stOf(e), pm=PM(); s.burn={until:nowMs()+3000,boost:F.SK_BOOST*0.28*P.burn*(1+pm.burn),next:nowMs()+750,col:P.col}; }
function knock(e,tiles,fx,fy){
  var dx=e.tx-fx, dy=e.ty-fy, d=Math.hypot(dx,dy)||1, nx=e.ox+dx/d*tiles, ny=e.oy+dy/d*tiles;
  e.ox=nx; e.oy=ny; e.tx=e.tx+dx/d*tiles; e.ty=e.ty+dy/d*tiles; e.knockT=nowMs(); e.knockDX=dx/d; e.knockDY=dy/d;
}
function enemies(){ return entities.filter(function(e){ return e.type==='hunt'&&!e.dead&&!(e.hp!==undefined&&e.hp<=0)&&regionReachable(Math.floor(e.tx/ZC)); }); }
function pdist(e){ return Math.hypot(e.tx-player.x,e.ty-player.y); }
function byDist(a,b){ return pdist(a)-pdist(b); }
function near(range){ return enemies().filter(function(e){ return pdist(e)<=range; }).sort(byDist); }
function corridor(lenT,dir){ return enemies().filter(function(e){ var dx=(e.tx-player.x)*dir; return dx>-0.6&&dx<lenT&&Math.abs(e.ty-player.y)<1.3; }); }

/** 모든 스킬 피해는 여기를 거친다: 스킬 피해 패시브 · 공격력 버프 · 치명타 · 상태이상 */
function dmg(e,P,k,col,big){
  if(!e||e.dead) return false;
  var pm=PM(), crit=(P.crit===1)||Math.random()<(0.08+bv('crit')+((typeof P.crit==='number'&&P.crit<1&&P.arch!=='buff')?P.crit:0));
  var base=P.ult?F.ULT_BOOST:F.SK_BOOST;
  var boost=base*(1+pm.power+(P.fire?pm.fire:0))*(1+bv('atk'))*(crit?1.7:1);
  var ok=F.hitMob(e,(P.mul||1)*(k===undefined?1:k),col||P.col,big!==false,boost);
  if(ok){
    if(crit) addFx(e.tx+0.5,e.ty-0.95,'치명!','#ffca4b',true);
    if(P.burn) burn(e,P);
    if(P.slow) slow(e,P.slow.pct,P.slow.sec);
    if(P.stun) stun(e,P.stun);
    if(P.stunChance&&Math.random()<P.stunChance) stun(e,0.7);
    if(P.kb) knock(e,P.kb,player.x,player.y);
  }
  return ok;
}
function serverHeal(id,mode,cb){
  if(G.guest){
    var g=G._gst; if(!g) return; var hp0=g.HP, amt=Math.round(g.maxHP*(mode==='tick'?0.03:0.25));
    g.HP=Math.min(g.maxHP,g.HP+amt); G.save=guestPub(); syncFromSave();
    addFx(player.x+0.5,player.y-1.0,'+'+(g.HP-hp0),'#66e08a',true); if(cb) cb({healed:g.HP-hp0}); return;
  }
  srv('fieldHeal',G.hakbun,id,mode,G.save.HP).then(function(r){
    if(r&&r.ok){ G.save=r.save; syncFromSave(); addFx(player.x+0.5,player.y-1.0,'+'+r.healed,'#66e08a',true); if(cb) cb(r); }
  }).catch(function(){});
}

/* ───────────────────────── 4. 효과 10종 ───────────────────────── */
var RUN={};
function hc(){ var h=F.hero(); return {x:h.x,y:h.y+TILE*0.44,dir:h.dir}; }
function dashPlayer(dir,tiles,onFrame){
  var dur=0.18, spd=tiles/dur, gh=0;
  invulnUntil=Math.max(invulnUntil,nowMs()+dur*1000+160);
  F.fxAdd({dur:dur,upd:function(t,dt){
    var st=spd*dt, hh=F.hero(); tryMove(player.x+dir*st,player.y);
    gh+=dt; if(gh>0.03){ gh=0; if(window.RM&&RM.ghosts) RM.ghosts.push({x:player.x,y:player.y,dir:dir,t:nowMs()}); }
    F.sparkP(player.x*TILE-dir*10,hh.y+rnd(-6,24),dir>0?Math.PI:0,rnd(200,420),rnd(0.15,0.3),Math.random()<.5?'#ffffff':'#c6fff6',0);
    if(onFrame) onFrame();
  }});
}
/* ① 투사체 */
RUN.proj=function(P,tg){
  var e=tg[0], tp=F.pos(e), cnt=P.count||1, sp=(P.spread||0)*Math.PI/180;
  F.sfx2(P.style==='orb'?'bolt':'fire');
  F.fxAdd({dur:0.16,drw:function(g){ var p=this.t/this.dur, o=F.muzzle(), X=o.x-cam.x, Y=o.y-cam.y; g.globalCompositeOperation='lighter'; glow(g,X,Y,10+26*p,P.col,0.7); glow(g,X,Y,5+9*p,P.c2,0.95); }});
  F.after(0.16,function(){ var o=F.muzzle(), a0=Math.atan2(tp.y-o.y,tp.x-o.x); for(var i=0;i<cnt;i++) shoot(o,a0+(cnt>1?(i-(cnt-1)/2)*sp:0),P); });
};
function boomAt(x,y,P,main){
  F.explode(x,y,P.rad,P.c2,P.col,5); hitStop(60);
  enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-x,q.y-y)<=P.rad+12) dmg(e,P,e===main?1:0.55); });
}
function shoot(o,a,P){
  var spd=P.speed||720, maxd=(P.range+0.6)*TILE, ux=Math.cos(a), uy=Math.sin(a), x=o.x, y=o.y, trav=0, done=false, fx;
  fx=F.fxAdd({dur:maxd/spd+0.05,
    upd:function(t,dt){ if(done) return; var st=spd*dt; x+=ux*st; y+=uy*st; trav+=st;
      F.glowP(x-ux*rnd(0,14)+rnd(-4,4),y-uy*rnd(0,14)+rnd(-4,4),-ux*rnd(20,90),-uy*rnd(20,90)-rnd(0,30),rnd(0.25,0.5),rnd(5,10),Math.random()<0.5?P.col:P.c2,0.85);
      var hit=null; enemies().forEach(function(e){ if(hit) return; var q=F.pos(e); if(Math.hypot(q.x-x,q.y-y)<26) hit=e; });
      if(hit||trav>=maxd){ done=true; boomAt(x,y,P,hit); fx.t=fx.dur; } },
    drw:function(g){ if(done) return; var X=x-cam.x, Y=y-cam.y, i;
      g.globalCompositeOperation='lighter'; for(i=1;i<=7;i++){ var q=i/7; glow(g,X-ux*q*66,Y-uy*q*66,22*(1-q*0.55),P.col,0.5*(1-q)); } glow(g,X,Y,40,P.col,0.5);
      g.globalCompositeOperation='source-over'; var gr=g.createRadialGradient(X,Y,0,X,Y,15); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.4,P.c2); gr.addColorStop(1,rgba(P.col,0)); g.fillStyle=gr; g.beginPath(); g.arc(X,Y,15,0,6.2832); g.fill(); }});
}
/* ② 충격파 */
RUN.nova=function(P){
  var c=hc(), pulses=P.pulses||1, gap=P.gap||0;
  F.sfx2(P.style==='wind'?'wind':'quake'); if(P.cracks){ shakeScreen(8); hitStop(80); }
  for(var i=0;i<pulses;i++) (function(i){ F.after(i*gap,function(){
    F.ring(c.x,c.y,P.rad*1.1,P.col,0.42,9,0.5); F.after(0.08,function(){ F.ring(c.x,c.y,P.rad,P.c2,0.42,6,0.5); });
    if(P.cracks&&i===0) F.quake(c.x,c.y,P.rad,0,[],false);
    if(P.style==='wind') for(var s=0;s<F.RED(16);s++){ var a=Math.random()*6.2832, r=rnd(0.3,1)*P.rad; F.glowP(c.x+Math.cos(a)*r*0.3,c.y+Math.sin(a)*r*0.2,Math.cos(a+1.57)*200,Math.sin(a+1.57)*100,rnd(0.3,0.5),rnd(4,6),s%2?P.c2:'#ffffff',0.8); }
    enemies().forEach(function(e){ var q=F.pos(e), d=Math.hypot(q.x-c.x,(q.y-c.y)*1.4); if(d>P.rad+10) return;
      F.after(Math.min(0.4,d/(P.rad/0.3)),function(){ if(dmg(e,P,1)){ if(P.pull) knock(e,-1.3,player.x,player.y); } }); });
  }); })(i);
  if(P.buff){ setBuff('atk',P.buff.atk,P.buff.dur); aura(P.buff.dur,'#ffca4b'); }
};
/* ③ 참격 / 바위 창 */
RUN.wave=function(P){
  var dir=player.dir<0?-1:1, times=P.twice?2:1, angs=P.fan?[-0.32,0,0.32]:[0];
  F.sfx2(P.style==='spike'?'quake':(P.style==='flame'?'fire':'wind'));
  if(P.dashSelf) dashPlayer(dir,P.dashSelf);
  for(var k=0;k<times;k++) F.after(k*0.2,function(){ angs.forEach(function(a){ waveShot(P,dir,a); }); });
};
function waveShot(P,dir,ang){
  var h=F.hero(), sx=h.x+dir*14, sy=h.y+6, ux=dir*Math.cos(ang), uy=Math.sin(ang), len=P.len*TILE+30, sp=P.style==='spike'?1100:900, dur=len/sp, hit={}, fadeT=0;
  F.fxAdd({dur:dur+(P.style==='spike'?0.5:0),
    upd:function(t,dt){ var head=Math.min(len,sp*t);
      enemies().forEach(function(e){ if(hit[e.key||e.id||e.tx+'_'+e.ty]) return; var q=F.pos(e), rx=q.x-sx, ry=q.y-sy, along=rx*ux+ry*uy, perp=Math.abs(-rx*uy+ry*ux);
        if(along>-20&&along<head+10&&perp<P.wid/2+16){ hit[e.key||e.id||e.tx+'_'+e.ty]=1; if(dmg(e,P,1)){ for(var i=0;i<F.RED(10);i++) F.sparkP(q.x,q.y,rnd(0,6.28),rnd(160,360),rnd(0.2,0.4),i%2?'#ffffff':P.col,200); shakeScreen(3); } } });
      if(P.style!=='spike'&&Math.random()<0.8) F.sparkP(sx+ux*head-ux*10,sy+uy*head+rnd(-28,28),Math.atan2(-uy,-ux),rnd(120,300),rnd(0.15,0.3),P.c2,0); },
    drw:function(g){ var t=this.t, head=Math.min(len,sp*t), fade=P.style==='spike'?(t<dur?1:Math.max(0,1-(t-dur)/0.5)):(t>dur*0.8?1-(t-dur*0.8)/(dur*0.2):1), X=sx-cam.x, Y=sy-cam.y, i;
      if(P.style==='spike'){
        for(i=0;i*28<head;i++){ var px=X+ux*i*28, py=Y+uy*i*28+8+Math.abs(Math.sin(i*1.9))*6, ht=(36+Math.sin(i*2.3)*8)*Math.min(1,(head-i*28)/30); g.globalAlpha=fade;
          var gr=g.createLinearGradient(px-9,0,px+9,0); gr.addColorStop(0,P.c2); gr.addColorStop(0.5,P.col); gr.addColorStop(1,'#4e3e2e'); g.fillStyle=gr; g.beginPath(); g.moveTo(px-9,py); g.lineTo(px,py-ht); g.lineTo(px+9,py); g.closePath(); g.fill(); g.strokeStyle='#20180e'; g.lineWidth=2; g.stroke(); }
        g.globalAlpha=1; return; }
      var hx=X+ux*head, hy=Y+uy*head; g.globalCompositeOperation='lighter';
      for(i=0;i<5;i++){ var yy=(i-2)*10; g.strokeStyle=rgba(P.c2,0.5*fade*(1-Math.abs(i-2)*0.2)); g.lineWidth=2; g.beginPath(); g.moveTo(hx-ux*(40+Math.abs(i-2)*14),hy-uy*(40)+yy); g.lineTo(hx-ux*(120+i*6),hy-uy*120+yy); g.stroke(); }
      g.save(); g.translate(hx,hy); g.rotate(Math.atan2(uy,ux)); var w=P.wid/2+8;
      g.beginPath(); g.moveTo(-14,-w); g.quadraticCurveTo(w,0,-14,w); g.quadraticCurveTo(12,0,-14,-w); g.closePath();
      g.strokeStyle=rgba(P.col,0.35*fade); g.lineWidth=12; g.stroke();
      var gr2=g.createLinearGradient(-14,0,w,0); gr2.addColorStop(0,rgba(P.col,0.9*fade)); gr2.addColorStop(1,'rgba(255,255,255,'+fade+')'); g.fillStyle=gr2; g.fill(); g.restore(); glow(g,hx+ux*16,hy+uy*16,42,P.col,0.35*fade); }});
}
/* ④ 돌진 */
RUN.dash=function(P){
  var dir=player.dir<0?-1:1, times=P.double?2:1;
  F.sfx2('wind'); if(P.dr) setBuff('dr',P.dr.pct,P.dr.sec);
  for(var k=0;k<times;k++) F.after(k*0.34,function(){ dashOnce(P,dir); });
};
function dashOnce(P,dir){
  var hit={};
  dashPlayer(dir,P.dist,function(){ enemies().forEach(function(e){ var key=e.key||e.tx+'_'+e.ty; if(hit[key]) return; if(Math.hypot(e.tx-player.x,e.ty-player.y)<1.0){ hit[key]=1; dmg(e,P,1); } }); });
  if(P.endRad) F.after(0.2,function(){ var c=hc(); F.explode(c.x+dir*18,c.y,P.endRad,P.c2,P.col,6); hitStop(70);
    enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-c.x,q.y-c.y)<=P.endRad+14){ var Q={mul:P.endMul,col:P.col,fire:P.fire,stun:P.stun,kb:P.endKb||0}; dmg(e,Q,1); } }); });
}
/* ⑤ 장판 */
RUN.zone=function(P,tg){
  var centers=[], q;
  F.sfx2(P.style==='fire'?'fire':(P.style==='holy'?'holy':(P.style==='volt'?'bolt':'wind')));
  if(P.at==='target'&&tg&&tg[0]){ q=F.pos(tg[0]); centers.push({x:q.x,y:q.y+10}); if(P.twin) centers.push({x:q.x+rnd(-100,100),y:q.y+rnd(-40,40)}); }
  else centers.push({follow:true});
  centers.forEach(function(c){
    var acc=0, hn=0, tick=P.tick||0.5;
    if(c.follow){ var h0=hc(); c.x=h0.x; c.y=h0.y; }
    F.fxAdd({dur:P.dur,L:0,
      upd:function(t,dt){ if(c.follow){ var h=hc(); c.x=h.x; c.y=h.y; }
        var n=F.RED(1)>=1&&Math.random()<0.6; if(n){ var a=Math.random()*6.2832, r=Math.sqrt(Math.random())*P.rad;
          if(P.style==='fire') F.glowP(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.55,rnd(-10,10),rnd(-120,-50),rnd(0.4,0.8),rnd(6,11),Math.random()<0.5?P.col:P.c2,0.8);
          else if(P.style==='holy') F.glowP(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.55,0,rnd(-70,-30),rnd(0.6,1.0),rnd(4,7),Math.random()<0.5?P.col:'#ffffff',0.9);
          else if(P.style==='volt') F.sparkP(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.55,rnd(0,6.28),rnd(80,200),rnd(0.15,0.3),Math.random()<0.5?P.c2:'#ffffff',0);
          else F.glowP(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.55,Math.cos(a+1.57)*160,Math.sin(a+1.57)*80,rnd(0.3,0.5),rnd(4,7),Math.random()<0.5?P.c2:'#ffffff',0.8); }
        acc+=dt; if(acc>=tick){ acc-=tick;
          enemies().forEach(function(e){ var p=F.pos(e); if(Math.hypot(p.x-c.x,(p.y-c.y)*1.4)<=P.rad){ dmg(e,P,1,P.col,false); if(P.pull) knock(e,-0.35,c.x/TILE,c.y/TILE); } });
          if(P.healTick){ hn++; if(hn%3===1) serverHeal(P.id,'tick'); } } },
      drw:function(g){ var p=this.t/this.dur, env=p<0.1?p/0.1:(p>0.85?(1-p)/0.15:1), X=c.x-cam.x, Y=c.y-cam.y, rot=this.t*(P.style==='wind'?5:1.4);
        g.globalCompositeOperation='lighter'; glow(g,X,Y,P.rad*1.1,P.col,0.2*env);
        g.strokeStyle=rgba(P.col,0.85*env); g.lineWidth=3; g.beginPath(); g.ellipse(X,Y,P.rad,P.rad*0.55,0,0,6.2832); g.stroke();
        g.strokeStyle=rgba(P.c2,0.6*env); g.lineWidth=1.5; g.beginPath(); g.ellipse(X,Y,P.rad*0.72,P.rad*0.4,0,0,6.2832); g.stroke();
        for(var i=0;i<12;i++){ var a=rot+i/12*6.2832, cs=Math.cos(a), sn=Math.sin(a); g.strokeStyle=rgba(P.c2,0.7*env); g.beginPath(); g.moveTo(X+cs*P.rad*0.72,Y+sn*P.rad*0.4); g.lineTo(X+cs*P.rad,Y+sn*P.rad*0.55); g.stroke(); } }});
  });
};
/* ⑥ 기둥 · 낙뢰 */
RUN.pillar=function(P,tg,def){
  var pts=[], i, q0=F.pos(tg[0]);
  F.sfx2(P.style==='volt'?'bolt':'holy');
  if(P.rain){ for(i=0;i<P.n;i++) pts.push({x:q0.x+rnd(-P.area,P.area),y:q0.y+rnd(-P.area*0.6,P.area*0.6)+8,t:i*(1.4/P.n)}); }
  else if(P.seq){ for(i=0;i<P.n;i++) pts.push({x:q0.x,y:q0.y+12,t:i*0.38,e:tg[0]}); }
  else { tg.slice(0,P.n).forEach(function(e,j){ var q=F.pos(e); pts.push({x:q.x,y:q.y+12,t:0.1+j*0.07,e:e}); }); }
  pts.forEach(function(pt){
    F.after(pt.t,function(){
      if(P.tele){ F.fxAdd({dur:P.delay,L:0,drw:function(g){ var p=this.t/this.dur; g.strokeStyle=rgba(P.col,0.4+0.5*p); g.lineWidth=3; g.beginPath(); g.ellipse(pt.x-cam.x,pt.y-cam.y,P.rad*(0.5+0.6*p),P.rad*(0.5+0.6*p)*0.55,0,0,6.2832); g.stroke(); glow(g,pt.x-cam.x,pt.y-cam.y,P.rad*1.2,P.col,0.15+0.2*p); }}); }
      F.after(P.tele?P.delay:0,function(){
        if(P.style==='volt'){ F.boltFx(pt.x+rnd(-50,50),cam.y-30,pt.x,pt.y,0.3,P.col,2.6,40); F.screenFlash('#e8dcff',0.14,0.08); shakeScreen(3); F.ring(pt.x,pt.y+8,P.rad*1.8,P.c2,0.32,4,0.55); for(var s=0;s<F.RED(10);s++) F.sparkP(pt.x,pt.y,rnd(-3.1,0),rnd(140,380),rnd(0.25,0.5),s%2?'#ffffff':P.col,500); }
        else { F.magicCircle(pt.x,pt.y+4,Math.max(36,P.rad*1.6),P.col,0.55); F.pillar(pt.x,pt.y,P.col,0.6,Math.max(18,P.rad)); }
        F.after(P.style==='volt'?0.02:0.12,function(){ var hr=Math.max(P.rad*1.5,38); var any=false;
          enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-pt.x,(q.y-pt.y)*1.3)<=hr){ any=true; if(dmg(e,P,1)){ if(P.style==='holy') for(var k=0;k<F.RED(5);k++) F.featherP(q.x+rnd(-14,14),q.y-rnd(20,46),rnd(0.7,1.2)); } } });
          if(any) shakeScreen(3); });
      });
    });
  });
  if(P.heal) serverHeal(P.id,'');
};
/* ⑦ 연쇄 번개 */
RUN.chain=function(P,tg){
  var m=F.muzzle(), cur={x:m.x,y:m.y}, used={}, list=[], e=tg[0], i;
  F.sfx2('bolt'); F.screenFlash('#c9aef5',0.14,0.12);
  for(i=0;i<P.jumps&&e;i++){
    list.push(e); used[e.key||e.tx+'_'+e.ty]=1; var from=F.pos(e), nx=null, bd=1e9;
    enemies().forEach(function(o){ if(used[o.key||o.tx+'_'+o.ty]) return; var q=F.pos(o), d=Math.hypot(q.x-from.x,q.y-from.y); if(d<3.0*TILE&&d<bd){ bd=d; nx=o; } });
    e=nx;
  }
  list.forEach(function(en,idx){ var q=F.pos(en), from={x:cur.x,y:cur.y}; cur={x:q.x,y:q.y};
    F.after(idx*0.09,function(){ F.boltFx(from.x,from.y,q.x,q.y,0.3,P.col,2.2,26); F.glowP(from.x,from.y,0,0,0.25,30,P.c2,0.8);
      if(dmg(en,P,Math.pow(0.9,idx))){ shakeScreen(3); for(var k=0;k<F.RED(12);k++) F.sparkP(q.x,q.y,Math.random()*6.2832,rnd(120,380),rnd(0.2,0.45),k%2?'#ffffff':P.c2,200); F.ring(q.x,q.y+10,34,P.c2,0.3,4,0.55); } }); });
};
/* ⑧ 버프 */
function aura(sec,col){
  F.fxAdd({dur:sec,L:0,drw:function(g){ var h=hc(), X=h.x-cam.x, Y=h.y-cam.y, t=this.t, a=Math.min(1,this.t/0.3)*Math.min(1,(sec-this.t)/0.5);
    g.globalCompositeOperation='lighter'; g.strokeStyle=rgba(col,0.6*a); g.lineWidth=2.5; g.beginPath(); g.ellipse(X,Y+4,28+Math.sin(t*5)*3,13,0,0,6.2832); g.stroke(); glow(g,X,Y,34,col,0.12*a); },
    upd:function(t,dt){ if(Math.random()<0.45){ var h=hc(); F.glowP(h.x+rnd(-20,20),h.y+rnd(-4,8),0,rnd(-90,-40),rnd(0.5,0.9),rnd(4,6),Math.random()<0.5?col:'#ffffff',0.85); } }});
}
RUN.buff=function(P){
  var sec=P.dur;
  F.sfx2('holy');
  if(P.dr) setBuff('dr',P.dr,sec); if(P.spd) setBuff('spd',P.spd,sec); if(P.aspd) setBuff('aspd',P.aspd,sec); if(P.crit) setBuff('crit',P.crit,sec); if(P.atk) setBuff('atk',P.atk,sec);
  if(P.shield){ B.shield+=P.shield; B.shieldU=Math.max(B.shieldU,nowMs()+sec*1000); }
  if(P.reflect){ B.reflect=1; B.reflectU=nowMs()+sec*1000; }
  var c=hc(); F.ring(c.x,c.y,70,P.col,0.5,6,0.5); F.after(0.12,function(){ F.ring(c.x,c.y,46,P.c2,0.5,4,0.5); }); aura(sec,P.col);
  addFx(player.x+0.5,player.y-1.2,P.dr?'방어 강화':(P.spd?'신속':'강화'),P.col,true);
};
/* ⑨ 회복 */
RUN.heal=function(P,tg,def){
  var c=hc(); F.sfx2('holy');
  F.ring(c.x,c.y,80,P.col,0.6,8,0.5); F.after(0.1,function(){ F.ring(c.x,c.y,52,P.c2,0.6,5,0.5); });
  for(var i=0;i<F.RED(14);i++) F.glowP(c.x+rnd(-26,26),c.y+rnd(-6,10),0,rnd(-120,-50),rnd(0.7,1.2),rnd(5,8),i%2?P.col:'#ffffff',0.9);
  serverHeal(def.id,'');
  if(P.shield){ B.shield+=P.shield; B.shieldU=Math.max(B.shieldU,nowMs()+8000); aura(8,'#9af5b8'); }
};
/* ⑩ 난타 */
RUN.flurry=function(P,tg){
  var e=tg[0], q=F.pos(e), dir=(q.x<F.hero().x)?-1:1; player.dir=dir; F.sfx2('wind');
  var gap=Math.max(0, Math.hypot(e.tx-player.x,e.ty-player.y)-0.9);
  if(gap>0.1){ var dx=(e.tx-player.x), dy=(e.ty-player.y), d=Math.hypot(dx,dy)||1; invulnUntil=Math.max(invulnUntil,nowMs()+500);
    F.fxAdd({dur:0.12,upd:function(t,dtt){ var st=gap/0.12*dtt; tryMove(player.x+dx/d*st,player.y+dy/d*st); if(window.RM&&RM.ghosts) RM.ghosts.push({x:player.x,y:player.y,dir:dir,t:nowMs()}); }}); }
  for(var i=0;i<P.hits;i++) (function(i){ F.after(0.12+i*0.07,function(){
    var tgt=(!e.dead&&!(e.hp!==undefined&&e.hp<=0))?e:near(2.2)[0]; if(!tgt) return; var p=F.pos(tgt), last=(i===P.hits-1), a=rnd(0,3.14), L=last?54:38;
    F.fxAdd({dur:0.14,drw:function(g){ var u=this.t/this.dur, X=p.x-cam.x, Y=p.y-cam.y; g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(255,255,255,'+(1-u)+')'; g.lineWidth=(last?4:3)*(1-u)+1; g.lineCap='round'; g.beginPath(); g.moveTo(X-Math.cos(a)*L,Y-Math.sin(a)*L); g.lineTo(X+Math.cos(a)*L,Y+Math.sin(a)*L); g.stroke(); glow(g,X,Y,24*(1-u*0.4),P.c2,0.5*(1-u)); }});
    dmg(tgt,P,last?1.5:1,P.col,last); if(last){ shakeScreen(4); for(var s=0;s<F.RED(12);s++) F.sparkP(p.x,p.y,rnd(0,6.28),rnd(160,380),rnd(0.2,0.4),s%2?'#ffffff':P.c2,200); }
  }); })(i);
};
/* ⑪ 회전체 */
var orbitUid=0;
RUN.orbit=function(P){
  var uid='o'+(++orbitUid), n=P.n, spd=P.spd||3.2;
  F.sfx2(P.style==='holy'?'holy':'bolt');
  F.fxAdd({dur:P.dur,
    upd:function(t,dt){ var h=hc(), a0=t*spd, i, p;
      for(i=0;i<n;i++){ var a=a0+i*6.2832/n; p={x:h.x+Math.cos(a)*P.orad,y:h.y-8+Math.sin(a)*P.orad*0.6};
        if(Math.random()<0.5) F.glowP(p.x,p.y,rnd(-20,20),rnd(-20,20),rnd(0.2,0.4),rnd(4,7),P.col,0.8);
        enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-p.x,q.y-p.y)<30){ var ot=e._ot||(e._ot={}); if(nowMs()>(ot[uid+i]||0)){ ot[uid+i]=nowMs()+650; if(dmg(e,P,1,P.col,false)){ F.sparkP(p.x,p.y,rnd(0,6.28),rnd(100,260),0.25,'#ffffff',0); } } } }); } },
    drw:function(g){ var h=hc(), t=this.t, a0=t*spd, env=Math.min(1,t/0.3)*Math.min(1,(P.dur-t)/0.5), i;
      g.globalCompositeOperation='lighter'; g.strokeStyle=rgba(P.col,0.18*env); g.lineWidth=1.5; g.beginPath(); g.ellipse(h.x-cam.x,h.y-8-cam.y,P.orad,P.orad*0.6,0,0,6.2832); g.stroke();
      for(i=0;i<n;i++){ var a=a0+i*6.2832/n, X=h.x+Math.cos(a)*P.orad-cam.x, Y=h.y-8+Math.sin(a)*P.orad*0.6-cam.y; glow(g,X,Y,20,P.col,0.7*env); glow(g,X,Y,8,P.c2,1*env); } }});
};
/* ⑫ 유성 */
RUN.meteor=function(P,tg){
  var q=F.pos(tg[0]), spots=[{x:q.x,y:q.y+8}], i;
  F.sfx2('fire');
  for(i=1;i<P.n;i++) spots.push({x:q.x+rnd(-P.spread,P.spread),y:q.y+rnd(-P.spread*0.6,P.spread*0.6)+8});
  spots.forEach(function(s,idx){ F.after(idx*0.25,function(){
    F.fxAdd({dur:P.delay,L:0,drw:function(g){ var p=this.t/this.dur; g.strokeStyle=rgba('#ff4a2e',0.35+0.5*p); g.lineWidth=3; g.beginPath(); g.ellipse(s.x-cam.x,s.y-cam.y,P.rad*(0.4+0.6*p),P.rad*(0.4+0.6*p)*0.55,0,0,6.2832); g.stroke(); glow(g,s.x-cam.x,s.y-cam.y,P.rad,'#ff4a2e',0.1+0.18*p); }});
    F.after(P.delay,function(){
      var sx=s.x+280, sy=s.y-620, d=Math.hypot(280,620), ux=-280/d, uy=620/d;
      F.fxAdd({dur:0.3,drw:function(g){ var p=this.t/this.dur, x=sx+(s.x-sx)*p-cam.x, y=sy+(s.y-sy)*p-cam.y, i2;
          g.globalCompositeOperation='lighter'; for(i2=1;i2<=9;i2++){ var qq=i2/9; glow(g,x-ux*qq*110,y-uy*qq*110,20*(1-qq*0.6),P.col,0.6*(1-qq)); } glow(g,x,y,40,P.col,0.55);
          g.globalCompositeOperation='source-over'; var gr=g.createRadialGradient(x,y,0,x,y,15); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.4,P.c2); gr.addColorStop(1,rgba(P.col,0)); g.fillStyle=gr; g.beginPath(); g.arc(x,y,15,0,6.2832); g.fill(); },
        end:function(){ F.explode(s.x,s.y,P.rad,P.c2,P.col,idx%2?4:7); hitStop(60);
          enemies().forEach(function(e){ var p=F.pos(e); if(Math.hypot(p.x-s.x,(p.y-s.y)*1.2)<=P.rad) dmg(e,P,1); }); }});
    });
  }); });
};

/* ───────────────────────── 5. 사용 · 쿨타임 ───────────────────────── */
var CD={}, GCD=0, lastAuto=0;
function pickTargets(P){
  var a=P.arch;
  if(a==='proj'||a==='pillar'||a==='chain'||a==='meteor'||a==='flurry') return near(P.range||3);
  if(a==='zone'&&P.at==='target') return near(P.range||3);
  if(a==='nova') return near(P.rad/TILE+0.3);
  return [];
}
function remain(id){ return Math.max(0,(CD[id]||0)-nowMs()); }
function cast(key,manual){
  if(!enabled()) return false;
  var id=slots()[key]; if(!id) return false;
  var def=D(id), P=paramsFor(id); if(!def||!P) return false;
  if(lvOf(id)<1) return false;
  var now=nowMs();
  if(remain(id)>0){ if(manual) toast('재사용 대기 중… '+(remain(id)/1000).toFixed(1)+'초'); return false; }
  if(now<GCD) return false;
  var tg=pickTargets(P);
  if(P.need&&!tg.length){ if(manual) toast('사거리 안에 몬스터가 없어요'); return false; }
  if(P.arch==='heal'&&manual&&G.save.HP>=G.save.maxHP){ toast('체력이 가득 차 있어요'); return false; }
  CD[id]=now+P.cdMs; GCD=now+380; player.gauge=Math.min(100,player.gauge+10); F.markCast();
  if(tg[0]&&P.arch!=='wave'&&P.arch!=='dash') player.dir=(tg[0].tx<player.x)?-1:1;
  RUN[P.arch](P,tg,def);
  addFx(player.x+0.5,player.y-1.0,def.n,P.col);
  return true;
}
function autoWorth(P,tg){
  if(P.arch==='heal') return G.save.HP<=G.save.maxHP*0.55;
  if(P.arch==='buff') return near(3.5).length>=2||near(3.5).some(function(e){ return (e.tier||0)>=1; });
  if(P.arch==='orbit') return near(3.2).length>=1;
  if(P.arch==='nova'||(P.arch==='zone'&&P.at==='self')) return near((P.rad||100)/TILE).length>=1;
  if(P.arch==='wave'||P.arch==='dash') return corridor(P.len||P.dist||3,player.dir<0?-1:1).length>=1;
  return tg.length&&F.skillWorth(tg);
}
var _oldCast=castAttackSkill;
castAttackSkill=function(manual){
  if(!enabled()) return _oldCast(manual);
  if(manual===true){ cast('1',true); return; }
  var now=nowMs(); if(now-lastAuto<300) return; lastAuto=now;
  var sl=slots();
  for(var i=1;i<=3;i++){ var id=sl[String(i)]; if(!id||remain(id)>0) continue; var P=paramsFor(id); if(!P) continue;
    var tg=pickTargets(P); if(P.need&&!tg.length) continue; if(!autoWorth(P,tg)) continue; if(cast(String(i),false)) return; }
};

/* ───────────────────────── 6. 필살기 ───────────────────────── */
function legacyCount(){ return Object.keys(G.save['스킬']||{}).filter(function(k){ return !/^(taro|mir|hana|yuri|leon)_[spu][0-9]$/.test(k); }).length; }
var ULT2={};
ULT2.taro=function(tg,R,mul){
  var c=hc(), P={mul:mul,col:'#ff7a2e',c2:'#ffe070',fire:1,burn:1.0,ult:1};
  F.ultDim(1.8); F.ultBanner('불사조 강림','#ff7a2e','불꽃의 새');
  F.fxAdd({dur:1.7,drw:function(g){ var p=this.t/this.dur, X=c.x-cam.x, Y=c.y-cam.y-30-p*30, s=0.4+Math.min(1,p*2)*1.0, a=Math.min(1,p*3)*Math.min(1,(1-p)*3), flap=Math.sin(this.t*9)*0.25;
    g.globalCompositeOperation='lighter';
    [-1,1].forEach(function(sd){ g.save(); g.translate(X,Y); g.scale(sd*s,s); g.rotate(-0.3+flap);
      var gr=g.createLinearGradient(0,0,130,-40); gr.addColorStop(0,'rgba(255,240,160,'+a+')'); gr.addColorStop(0.5,'rgba(255,122,46,'+(0.8*a)+')'); gr.addColorStop(1,'rgba(200,40,20,0)');
      g.fillStyle=gr; g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(60,-90,150,-60); g.quadraticCurveTo(110,-30,140,0); g.quadraticCurveTo(90,0,120,34); g.quadraticCurveTo(50,10,0,24); g.closePath(); g.fill(); g.restore(); });
    glow(g,X,Y,90*s,'#ff7a2e',0.35*a); }});
  [0.5,0.68,0.86].forEach(function(d,i){ F.after(d,function(){ F.ring(c.x,c.y,R*(1.25-i*0.12),i%2?'#ffe070':'#ff7a2e',0.6,11-i*2,0.5); shakeScreen(5); }); });
  tg.forEach(function(e,i){ var q=F.pos(e); F.after(0.55+Math.min(i,8)*0.05,function(){ F.pillar(q.x,q.y+10,'#ff7a2e',0.7,26); F.explode(q.x,q.y,50,'#ffe070','#ff7a2e',3); F.after(0.12,function(){ dmg(e,P,1,'#ff9a3a',true); }); }); });
};
ULT2.mir=function(tg,R,mul){
  var c=hc(), P={mul:mul*0.7,col:'#d0a24a',c2:'#e8ecf4',ult:1,stun:0.8,kb:1.4};
  F.ultDim(1.8); F.ultBanner('철벽 요새','#8fa3ff','난공불락');
  setBuff('dr',0.7,9); setBuff('atk',0.2,9); B.shield+=6; B.shieldU=nowMs()+9000; B.reflect=1; B.reflectU=nowMs()+9000;
  F.after(0.45,function(){ shakeScreen(10); F.quake(c.x,c.y,R,0,[],true);
    enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-c.x,(q.y-c.y)*1.4)<=R) dmg(e,P,1,'#d0a24a',true); }); });
  F.fxAdd({dur:9,L:0,drw:function(g){ var t=this.t, a=Math.min(1,t/0.6)*Math.min(1,(9-t)/1), h=hc(), X=h.x-cam.x, Y=h.y-cam.y;
    for(var i=0;i<10;i++){ var an=i/10*6.2832, px=X+Math.cos(an)*92, py=Y+Math.sin(an)*50, ht=(22+Math.sin(t*3+i)*3)*Math.min(1,t/0.5); g.globalAlpha=a;
      var gr=g.createLinearGradient(px-8,0,px+8,0); gr.addColorStop(0,'#e8ecf4'); gr.addColorStop(0.5,'#9aa4b8'); gr.addColorStop(1,'#4a5268'); g.fillStyle=gr; g.fillRect(px-8,py-ht,16,ht); g.strokeStyle='#20263a'; g.lineWidth=2; g.strokeRect(px-8,py-ht,16,ht); }
    g.globalAlpha=1; g.globalCompositeOperation='lighter'; glow(g,X,Y,100,'#8fa3ff',0.14*a); }});
};
ULT2.hana=function(tg,R,mul){
  var c=hc(), P={mul:mul*0.1,col:'#c6fff6',c2:'#37e0cf',ult:1,slow:{pct:0.6,sec:1}};
  F.ultDim(1.8); F.ultBanner('태풍의 눈','#37e0cf','모든 것을 갈아 버린다'); F.sfx2('wind');
  var acc=0, rad=R*0.85;
  F.fxAdd({dur:6,L:0,upd:function(t,dt){ var h=hc(); c.x=h.x; c.y=h.y; acc+=dt;
      for(var i=0;i<F.RED(3);i++){ var a=Math.random()*6.2832, r=Math.random()*rad; F.glowP(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.55,Math.cos(a+1.57)*220,Math.sin(a+1.57)*110-30,rnd(0.35,0.6),rnd(4,8),i%2?'#ffffff':'#37e0cf',0.85); }
      if(acc>=0.3){ acc-=0.3; enemies().forEach(function(e){ var q=F.pos(e); if(Math.hypot(q.x-c.x,(q.y-c.y)*1.4)<=rad){ dmg(e,P,1,'#37e0cf',false); knock(e,-0.4,c.x/TILE,c.y/TILE); } }); } },
    drw:function(g){ var p=this.t/6, env=Math.min(1,this.t/0.4)*Math.min(1,(1-p)*5), X=c.x-cam.x, Y=c.y-cam.y, rot=this.t*7;
      g.globalCompositeOperation='lighter'; glow(g,X,Y,rad*1.1,'#37e0cf',0.16*env);
      for(var k=0;k<4;k++){ g.strokeStyle=rgba(k%2?'#ffffff':'#37e0cf',0.55*env); g.lineWidth=2.5; g.beginPath(); g.ellipse(X,Y-k*14,rad*(0.35+k*0.2),rad*(0.35+k*0.2)*0.5,0,rot+k,rot+k+4.4); g.stroke(); } }});
};
ULT2.yuri=function(tg,R,mul){
  var c=hc(), P={mul:mul*0.5,col:'#ffe070',c2:'#ffffff',ult:1};
  F.ultDim(1.8); F.ultBanner('천상의 가호','#ffe070','성스러운 강림'); F.sfx2('holy');
  serverHeal('yuri_u2','',function(){ });
  setBuff('dr',0.4,9); B.shield+=3; B.shieldU=nowMs()+9000; aura(9,'#ffe070');
  F.magicCircle(c.x,c.y,R*0.9,'#ffe070',1.5);
  F.after(0.4,function(){ F.pillar(c.x,c.y,'#ffe070',0.95,42); F.screenFlash('#fff6c8',0.28,0.3); shakeScreen(5); for(var k=0;k<F.RED(26);k++) F.featherP(c.x+rnd(-R,R),c.y-rnd(120,400),rnd(1.0,1.8)); });
  [0.5,0.66,0.82].forEach(function(d,i){ F.after(d,function(){ F.ring(c.x,c.y,R*(1.3-i*0.1),i%2?'#ffffff':'#ffe070',0.55,10-i*2,0.5); }); });
  tg.forEach(function(e){ var q=F.pos(e); F.after(0.6,function(){ F.pillar(q.x,q.y+12,'#ffe070',0.6,20); F.after(0.1,function(){ dmg(e,P,1,'#ffe070',true); }); }); });
};
ULT2.leon=function(tg,R,mul){
  var P={mul:mul*0.11,col:'#c9aef5',c2:'#ffffff',ult:1,orad:80,n:6,spd:3.4,dur:10,style:'spirit',arch:'orbit'};
  F.ultDim(1.8); F.ultBanner('번개의 군주','#c9aef5','천둥의 지배자'); F.sfx2('bolt');
  var m=F.muzzle();
  tg.slice(0,5).forEach(function(e,i){ var q=F.pos(e); F.after(0.45+i*0.1,function(){ F.boltFx(q.x+rnd(-40,40),cam.y-30,q.x,q.y,0.32,'#8a6aff',3,44); F.screenFlash('#e8dcff',0.2,0.1); shakeScreen(4); F.ring(q.x,q.y+10,50,'#c9aef5',0.34,5,0.55); dmg(e,{mul:mul*0.4,col:'#c9aef5',ult:1,stun:0.6},1,'#c9aef5',true); }); });
  F.after(0.5,function(){ RUN.orbit(P); });
};
function castUlt(manual){
  if(!enabled()) return false;
  var c=G.save['캐릭터'], id=slots().U||(c+'_u1'), lv=lvOf(id)||1;
  if(casting) return false;
  if(player.gauge<99.5){ if(manual) toast('필살기 게이지가 부족해요 ('+Math.floor(player.gauge)+'%)'); return false; }
  var pm=PM(), mulK=(1+0.2*(lv-1))*(1+pm.power);
  if(id.slice(-2)==='u1'){ F.fxUlt({force:1,mulK:mulK}); return true; }
  var learned=legacyCount(), hasUlt=!!(G.save['스킬']||{})[c.charAt(0)+'_ult'];
  var R=(3+learned*0.3+(hasUlt?2:0))*TILE*Math.sqrt(mulK), mul=(3+learned*0.5)*(hasUlt?1.6:1)*mulK;
  var tg=enemies().filter(function(e){ return pdist(e)<=R/TILE; });
  casting=true; player.gauge=0; hitStop(200); F.markCast(); if(typeof vib==='function') vib([40,60,40]); F.sfx2('ult');
  ULT2[c](tg,R,mul);
  setTimeout(function(){ casting=false; },2000);
  return true;
}
var _fxUlt=castActionSkill;
castActionSkill=function(opts){
  if(!enabled()) return _fxUlt(opts);
  if(opts&&opts.mulK) return _fxUlt(opts);                 // 내부 호출
  if(opts===true) return castUlt(true);                    // 버튼
  if(typeof autoHunt!=='undefined'&&autoHunt){                // 자동 사냥 중에만 알아서 발동(정예·무리 앞)
    var R=3.5, tg=near(R); if(tg.length&&F.ultWorth(tg)) castUlt(false);
  }                                                         // 직접 조작 중에는 버튼을 눌러야 발동
};

/* ───────────────────────── 7. 상태이상 · 버프 적용 (매 프레임) ───────────────────────── */
var lastDodge=0;
var _upd=update;
update=function(dt){
  if(!enabled()){ return _upd(dt); }
  var snap=[], px0=player.x, py0=player.y, now=nowMs(), pm=PM();
  entities.forEach(function(e){ if(e.st&&(e.st.stun||e.st.slow)) snap.push([e,e.ox,e.oy,e.tx,e.ty]); });
  F.gaugeMul=pm.gauge; player.skillReady=0;
  _upd(dt);
  now=nowMs();
  snap.forEach(function(s){ var e=s[0], st=e.st;
    if(st.stun&&now<st.stun.until){ e.ox=s[1]; e.oy=s[2]; e.tx=s[3]; e.ty=s[4]; e.wind=0; e.nextAtk2=Math.max(e.nextAtk2||0,now+300); }
    else if(st.slow&&now<st.slow.until){ var k=1-st.slow.pct; e.ox=s[1]+(e.ox-s[1])*k; e.oy=s[2]+(e.oy-s[2])*k; e.tx=s[3]+(e.tx-s[3])*k; e.ty=s[4]+(e.ty-s[4])*k; } });
  var spdB=bv('spd')+pm.spd;
  if(spdB>0&&player.moving){ var dx=player.x-px0, dy=player.y-py0; if(dx||dy){ tryMove(player.x+dx*spdB,player.y); tryMove(player.x,player.y+dy*spdB); } }
  if(window.RM&&RM.dodgeUntil!==lastDodge){ lastDodge=RM.dodgeUntil; if(pm.dodgeCd&&RM.dodgeReady) RM.dodgeReady=Math.max(now,RM.dodgeReady-pm.dodgeCd); }
  entities.forEach(function(e){ var st=e.st; if(!st) return;
    if(st.burn){ if(now>=st.burn.until){ delete st.burn; } else { if(Math.random()<0.25) F.glowP(e.tx*TILE+TILE/2+rnd(-8,8),e.ty*TILE+TILE/2+rnd(-6,10),0,rnd(-80,-30),rnd(0.3,0.5),rnd(4,7),Math.random()<0.5?'#ff7a1e':'#ffe070',0.85);
        if(now>=st.burn.next){ st.burn.next=now+750; if(!e.dead&&!(e.hp!==undefined&&e.hp<=0)) F.hitMob(e,1,'#ff9a3a',false,st.burn.boost); } } }
    if(st.stun&&now>=st.stun.until) delete st.stun; if(st.slow&&now>=st.slow.until) delete st.slow; });
  hudStep();
};
var _atk=attackHunt;
attackHunt=function(e){
  if(!enabled()) return _atk(e);
  F.ensureMobHp(e);
  var a0=G.save.atk, sv=G.save, ab=bv('atk'), as=bv('aspd');
  if(as>0) lastAtk-=230*as;
  if(ab>0) G.save.atk=Math.round(a0*(1+ab));
  _atk(e);
  if(G.save===sv) G.save.atk=a0;
};
if(F.BAL&&F.BAL.dmg){ var _bd=F.BAL.dmg;
  F.BAL.dmg=function(e){ var d=_bd(e), now=nowMs(), pm=PM();
    if(B.shield>0&&now<B.shieldU){ B.shield--; addFx(player.x+0.5,player.y-1.0,'막았다!','#8fa3ff',true);
      if(B.reflect&&now<B.reflectU){ var c=hc(), P={mul:0.8,col:'#8fa3ff',ult:0,kb:0.8}; F.ring(c.x,c.y,90,'#8fa3ff',0.4,6,0.5); enemies().forEach(function(o){ var q=F.pos(o); if(Math.hypot(q.x-c.x,q.y-c.y)<95) dmg(o,P,1); }); }
      return 0; }
    var dr=Math.min(0.85,bv('dr')+pm.dr);
    return Math.max(d>0?1:0,Math.round(d*(1-dr))); }; }

/* 상태 표시: 기절(별) · 둔화(푸른 테두리) */
var _draw=draw;
draw=function(){
  _draw();
  if(!enabled()||!running) return;
  var now=nowMs();
  entities.forEach(function(e){ var st=e.st; if(!st||e.dead) return; var X=e.tx*TILE-cam.x+TILE/2, Y=e.ty*TILE-cam.y+TILE/2;
    if(X<-30||X>W+30||Y<-30||Y>H+30) return;
    if(st.slow&&now<st.slow.until){ ctx.strokeStyle='rgba(120,200,255,.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(X,Y+TILE*0.32,TILE*0.3,TILE*0.12,0,0,6.2832); ctx.stroke(); }
    if(st.stun&&now<st.stun.until){ for(var i=0;i<3;i++){ var a=now/180+i*2.094; ctx.fillStyle='#ffe070'; ctx.fillRect(Math.round(X+Math.cos(a)*14-2),Math.round(Y-TILE*0.5+Math.sin(a)*4-2),5,5); } } });
};

/* ───────────────────────── 8. 아이콘 ───────────────────────── */
var ICONS={};
function drawIcon(g,kind,c1,c2,S){
  var c=S/2, i;
  g.clearRect(0,0,S,S);
  var bg=g.createLinearGradient(0,0,0,S); bg.addColorStop(0,'#3a2d5c'); bg.addColorStop(1,'#1c1432');
  g.fillStyle=bg; g.beginPath(); g.roundRect?g.roundRect(1,1,S-2,S-2,8):g.rect(1,1,S-2,S-2); g.fill();
  g.strokeStyle=c1; g.lineWidth=2; g.stroke();
  g.lineCap='round'; g.lineJoin='round';
  if(kind==='proj'){ for(i=1;i<=4;i++){ glow(g,c-i*5,c+i*4,10-i*1.6,c1,0.45); } var gr=g.createRadialGradient(c+3,c-3,0,c+3,c-3,10); gr.addColorStop(0,'#fff'); gr.addColorStop(0.4,c2); gr.addColorStop(1,c1); g.fillStyle=gr; g.beginPath(); g.arc(c+3,c-3,9,0,6.28); g.fill(); }
  else if(kind==='nova'){ g.strokeStyle=c1; g.lineWidth=3; g.beginPath(); g.ellipse(c,c+2,15,9,0,0,6.28); g.stroke(); g.strokeStyle=c2; g.lineWidth=2; g.beginPath(); g.ellipse(c,c+2,8,5,0,0,6.28); g.stroke(); g.fillStyle=c2; g.fillRect(c-1,c-1,3,3); }
  else if(kind==='wave'){ g.fillStyle=c1; g.beginPath(); g.moveTo(c-10,c-14); g.quadraticCurveTo(c+16,c,c-10,c+14); g.quadraticCurveTo(c+2,c,c-10,c-14); g.fill(); g.strokeStyle=c2; g.lineWidth=1.5; g.stroke(); }
  else if(kind==='dash'){ g.strokeStyle=c1; g.lineWidth=4; for(i=0;i<3;i++){ g.beginPath(); g.moveTo(c-12+i*7,c-9); g.lineTo(c-4+i*7,c); g.lineTo(c-12+i*7,c+9); g.stroke(); } g.strokeStyle=c2; g.lineWidth=1.5; g.beginPath(); g.moveTo(c+8,c-9); g.lineTo(c+16,c); g.lineTo(c+8,c+9); g.stroke(); }
  else if(kind==='zone'){ glow(g,c,c+3,16,c1,0.5); g.strokeStyle=c1; g.lineWidth=3; g.beginPath(); g.ellipse(c,c+4,15,8,0,0,6.28); g.stroke(); g.fillStyle=c2; for(i=0;i<4;i++){ g.beginPath(); g.moveTo(c-9+i*6,c+3); g.lineTo(c-7+i*6,c-10-(i%2)*5); g.lineTo(c-4+i*6,c+3); g.fill(); } }
  else if(kind==='pillar'){ var gr2=g.createLinearGradient(c-6,0,c+6,0); gr2.addColorStop(0,rgbaS(c1,0)); gr2.addColorStop(0.5,'#fff'); gr2.addColorStop(1,rgbaS(c1,0)); g.fillStyle=gr2; g.fillRect(c-7,3,14,S-10); glow(g,c,S-8,11,c1,0.7); g.strokeStyle=c2; g.lineWidth=2; g.beginPath(); g.ellipse(c,S-8,11,4,0,0,6.28); g.stroke(); }
  else if(kind==='chain'){ g.strokeStyle=c1; g.lineWidth=4; g.beginPath(); g.moveTo(c+8,5); g.lineTo(c-4,c-3); g.lineTo(c+4,c+1); g.lineTo(c-8,S-5); g.stroke(); g.strokeStyle=c2; g.lineWidth=1.5; g.stroke(); }
  else if(kind==='buff'){ g.fillStyle=c1; g.beginPath(); g.moveTo(c,5); g.lineTo(c+13,c-5); g.lineTo(c+10,c+11); g.lineTo(c,S-5); g.lineTo(c-10,c+11); g.lineTo(c-13,c-5); g.closePath(); g.fill(); g.strokeStyle=c2; g.lineWidth=2; g.stroke(); g.fillStyle=c2; g.beginPath(); g.moveTo(c,c-8); g.lineTo(c+6,c); g.lineTo(c+2,c); g.lineTo(c+2,c+7); g.lineTo(c-2,c+7); g.lineTo(c-2,c); g.lineTo(c-6,c); g.closePath(); g.fill(); }
  else if(kind==='heal'){ glow(g,c,c,16,c1,0.5); g.fillStyle=c1; g.fillRect(c-3,c-11,6,22); g.fillRect(c-11,c-3,22,6); g.fillStyle=c2; g.fillRect(c-1,c-9,2,18); g.fillRect(c-9,c-1,18,2); }
  else if(kind==='flurry'){ g.strokeStyle=c2; g.lineWidth=3; for(i=0;i<3;i++){ g.beginPath(); g.moveTo(c-12+i*3,c-12+i*8); g.lineTo(c+12+i*3,c-4+i*8); g.stroke(); } g.strokeStyle=c1; g.lineWidth=1.5; g.beginPath(); g.moveTo(c+12,c-12); g.lineTo(c-12,c+12); g.stroke(); }
  else if(kind==='orbit'){ g.strokeStyle=rgbaS(c1,0.5); g.lineWidth=1.5; g.beginPath(); g.ellipse(c,c,14,9,0,0,6.28); g.stroke(); glow(g,c,c,7,c2,0.8); for(i=0;i<3;i++){ var a=i*2.09+0.5; glow(g,c+Math.cos(a)*14,c+Math.sin(a)*9,7,c1,0.9); g.fillStyle='#fff'; g.fillRect(c+Math.cos(a)*14-1,c+Math.sin(a)*9-1,3,3); } }
  else if(kind==='meteor'){ for(i=1;i<=4;i++) glow(g,c+10-i*5,c-10+i*5,9-i,c1,0.4); var gr3=g.createRadialGradient(c-6,c+6,0,c-6,c+6,10); gr3.addColorStop(0,'#fff'); gr3.addColorStop(0.5,c2); gr3.addColorStop(1,c1); g.fillStyle=gr3; g.beginPath(); g.arc(c-6,c+6,9,0,6.28); g.fill(); }
  else if(kind==='passive'){ g.fillStyle=c1; g.beginPath(); for(i=0;i<10;i++){ var r=(i%2)?6:13, an=-1.57+i*0.628; g.lineTo(c+Math.cos(an)*r,c+Math.sin(an)*r); } g.closePath(); g.fill(); g.strokeStyle=c2; g.lineWidth=1.5; g.stroke(); }
  else { glow(g,c,c,18,c1,0.55); g.strokeStyle=c2; g.lineWidth=2.5; for(i=0;i<8;i++){ var an2=i*0.785; g.beginPath(); g.moveTo(c+Math.cos(an2)*6,c+Math.sin(an2)*6); g.lineTo(c+Math.cos(an2)*(i%2?12:16),c+Math.sin(an2)*(i%2?12:16)); g.stroke(); } g.fillStyle='#fff'; g.beginPath(); g.arc(c,c,5,0,6.28); g.fill(); g.fillStyle=c1; g.beginPath(); g.arc(c,c,3,0,6.28); g.fill(); }
}
function rgbaS(hex,a){ return rgba(hex,a); }
function iconURL(id,S){
  S=S||40; var k=id+'|'+S; if(ICONS[k]) return ICONS[k];
  var d=D(id), c=(d&&d.c)||(G.save&&G.save['캐릭터'])||'taro', cols=ICON_COL[c]||ICON_COL.taro, P=PARAMS[id];
  var cv=document.createElement('canvas'); cv.width=cv.height=S; var g=cv.getContext('2d');
  var kind=P?P.arch:(d&&d.t==='p'?'passive':'ult');
  drawIcon(g,kind,P?P.col:cols[0],P?P.c2:cols[1],S);
  return (ICONS[k]=cv.toDataURL());
}

/* ───────────────────────── 9. 화면 버튼 ───────────────────────── */
var hudBuilt=false, hudSig={};
function buildHud(){
  if(hudBuilt) return; var pad=document.getElementById('pad'); if(!pad) return; hudBuilt=true;
  var css=document.createElement('style');
  css.textContent=
   '.skbtn{position:absolute;pointer-events:auto;width:52px;height:52px;border-radius:12px;border:3px solid var(--line);background:#1d1631;box-shadow:0 4px 0 var(--line);padding:0;overflow:hidden;color:#fff;font-family:var(--font-body);touch-action:manipulation}'+
   '.skbtn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}'+
   '.skbtn img{width:100%;height:100%;display:block}'+
   '.skbtn .cdo{position:absolute;inset:0;background:conic-gradient(rgba(10,6,20,.8) 0 var(--cdp,0%),transparent 0);pointer-events:none}'+
   '.skbtn .cdt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000;pointer-events:none}'+
   '.skbtn .keyh{position:absolute;left:3px;top:1px;font-size:9px;color:#ffca4b;text-shadow:1px 1px 0 #000;pointer-events:none}'+
   '.skbtn.empty{opacity:.3}'+
   '.skbtn.rdy{border-color:var(--gold)}'+
   '#skU{width:62px;height:62px;border-radius:50%;border-color:#7a6a94}'+
   '#skU.rdy{border-color:#ffca4b;animation:ultp 1s ease-in-out infinite}'+
   '@keyframes ultp{50%{box-shadow:0 0 0 3px #ffca4b,0 0 18px rgba(255,202,75,.9),0 4px 0 var(--line)}}'+
   '#dodgebtn{right:141px!important;bottom:35px!important;width:54px!important;height:54px!important}'+
   '#pbtn{display:none!important}#btn-atk{display:none!important}';
  document.head.appendChild(css);
  var pos={'1':[132,108],'2':[72,146],'3':[8,134]};
  ['1','2','3'].forEach(function(k){
    var b=document.createElement('button'); b.className='skbtn empty'; b.id='sk'+k; b.style.right=pos[k][0]+'px'; b.style.bottom=pos[k][1]+'px';
    b.innerHTML='<img alt=""><div class="cdo"></div><div class="cdt"></div><span class="keyh">'+k+'</span>';
    var fire=function(ev){ ev.preventDefault(); cast(k,true); }; b.addEventListener('touchstart',fire,{passive:false}); b.addEventListener('mousedown',fire);
    pad.appendChild(b); });
  var u=document.createElement('button'); u.className='skbtn empty'; u.id='skU'; u.style.right='37px'; u.style.bottom='215px';
  u.innerHTML='<img alt=""><div class="cdo"></div><div class="cdt"></div><span class="keyh">4</span>';
  var fu=function(ev){ ev.preventDefault(); castUlt(true); }; u.addEventListener('touchstart',fu,{passive:false}); u.addEventListener('mousedown',fu);
  pad.appendChild(u);
  window.addEventListener('keydown',function(ev){                   // 1·2·3 = 전투 스킬, 4 = 필살기 (숫자패드도 동일)
    if(!enabled()||overlayOpen()||ev.repeat) return;
    var k=ev.code;
    if(k==='Digit1'||k==='Numpad1') cast('1',true);
    else if(k==='Digit2'||k==='Numpad2') cast('2',true);
    else if(k==='Digit3'||k==='Numpad3') cast('3',true);
    else if(k==='Digit4'||k==='Numpad4') castUlt(true); });
}
function hudStep(){
  if(!hudBuilt) buildHud(); if(!hudBuilt) return;
  var sl=slots(), now=nowMs();
  ['1','2','3'].forEach(function(k){ var b=document.getElementById('sk'+k); if(!b) return; var id=sl[k];
    if(hudSig[k]!==id){ hudSig[k]=id; if(id){ b.querySelector('img').src=iconURL(id,52); b.classList.remove('empty'); } else { b.querySelector('img').removeAttribute('src'); b.classList.add('empty'); } }
    var rem=id?remain(id):0, P=id?paramsFor(id):null, frac=(P&&rem>0)?Math.min(1,rem/P.cdMs):0;
    b.style.setProperty('--cdp',(frac*100).toFixed(1)+'%'); b.querySelector('.cdt').textContent=rem>0?(rem/1000).toFixed(rem<10000?1:0):''; b.classList.toggle('rdy',!!id&&rem===0); });
  var u=document.getElementById('skU'), uid=sl.U; if(u){
    if(hudSig.U!==uid){ hudSig.U=uid; if(uid){ u.querySelector('img').src=iconURL(uid,62); u.classList.remove('empty'); } else u.classList.add('empty'); }
    var g=player.gauge||0; u.style.setProperty('--cdp',(100-g).toFixed(1)+'%'); u.querySelector('.cdt').textContent=g>=99.5?'':Math.floor(g)+'%'; u.classList.toggle('rdy',g>=99.5); }
}
var _oo=overlayOpen;
overlayOpen=function(){ var o=document.getElementById('skills2'); return _oo()||!!(o&&o.classList.contains('open')); };

/* ───────────────────────── 10. 스킬 화면 ───────────────────────── */
var tab='a';
function statLine(id,lv){
  var P=paramsFor(id,lv,brOf(id)||'a'), parts=[];
  if(!P) return '';
  if(P.mul) parts.push('피해 '+Math.round(P.mul*100)+'%'+(P.arch==='pillar'&&P.n>1?' ×'+P.n:'')+(P.arch==='flurry'?' ×'+P.hits:'')+(P.arch==='chain'?' ×'+P.jumps+'연쇄':''));
  if(P.arch==='orbit') parts.push('구슬 '+P.n+'개 · '+Math.round(P.dur)+'초');
  if(P.arch==='zone') parts.push(Math.round(P.dur)+'초 지속');
  if(P.arch==='buff'&&P.dur) parts.push(P.dur.toFixed(1)+'초');
  if(P.arch==='heal') parts.push('체력 회복');
  parts.push('쿨 '+(P.cdMs/1000).toFixed(1)+'초');
  return parts.join(' · ');
}
function pips(n,max){ var s=''; for(var i=1;i<=max;i++) s+=(i<=n?'●':'○'); return s; }
function ensureOverlay(){
  if(document.getElementById('skills2')) return;
  var css=document.createElement('style');
  css.textContent=
   '#skills2 .panel{width:404px}'+
   '.s2-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 4px}'+
   '.s2-slot{background:var(--bg2);border:3px solid var(--line);border-radius:8px;padding:6px 2px;text-align:center;font-size:10px;min-height:76px;line-height:1.35}'+
   '.s2-slot img{width:36px;height:36px;display:block;margin:0 auto 3px}.s2-slot.u{border-color:var(--gold)}.s2-slot .k{color:var(--gold);font-size:9px}'+
   '.s2-card{background:var(--panel2);border:3px solid var(--line);border-radius:8px;padding:10px;margin-top:8px;box-shadow:0 4px 0 var(--line)}'+
   '.s2-card.lock{opacity:.55}.s2-top{display:flex;gap:10px;align-items:flex-start}.s2-top img{width:46px;height:46px;flex-shrink:0}'+
   '.s2-nm{font-size:13px;display:flex;justify-content:space-between;gap:6px}.s2-pips{color:var(--gold);letter-spacing:1px;font-size:11px;white-space:nowrap}'+
   '.s2-d{font-size:10.5px;color:var(--muted);line-height:1.55;margin-top:3px}.s2-st{font-size:10.5px;color:var(--energy);margin-top:5px;line-height:1.5}'+
   '.s2-br{font-size:10.5px;margin-top:5px;padding:5px 7px;border-radius:6px;background:var(--bg2);border:2px solid var(--line);line-height:1.5}'+
   '.s2-bt{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.s2-bt .btn{padding:8px 11px;font-size:11px}'+
   '.s2-eq{display:flex;gap:4px;align-items:center;font-size:10px;color:var(--muted)}.s2-eq button{width:30px;height:30px;border-radius:6px;border:3px solid var(--line);background:var(--bg2);color:#fff;font-size:12px;font-family:var(--font-body)}'+
   '.s2-eq button.on{border-color:var(--gold);color:var(--gold);background:var(--panel)}'+
   '.s2-note{font-size:10px;color:var(--muted);margin:8px 2px 0;line-height:1.6}';
  document.head.appendChild(css);
  var o=document.createElement('div'); o.className='ovl'; o.id='skills2';
  o.innerHTML='<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">✦ 스킬</h3><div style="font-size:13px">SP <b id="s2-sp" style="color:var(--energy)">0</b></div></div>'+
    '<div class="s2-slots" id="s2-slots"></div>'+
    '<div class="seg" id="s2-tabs" style="display:flex;gap:6px;margin-top:8px"></div>'+
    '<div id="s2-body" style="max-height:44vh;overflow-y:auto;padding-right:2px"></div>'+
    '<div style="display:flex;gap:6px;margin-top:10px"><button class="btn ghost" style="flex:1;padding:9px;font-size:11px" onclick="S2.reset()">🔄 초기화</button><button class="btn ghost" style="flex:1;padding:9px;font-size:11px" onclick="S2.legacy()">📚 퀴즈 스킬</button><button class="btn gold" style="flex:1;padding:9px;font-size:11px" onclick="closeOvl(\'skills2\')">닫기</button></div></div>';
  (document.getElementById('app')||document.body).appendChild(o);
}
function costTxt(def,next){ return def.cost[next-1]; }
function cardHtml(def){
  var lv=lvOf(def.id), c=G.save['캐릭터'], myLv=G.save['레벨']||1, sp=G.save.SP||0, next=lv+1, max=def.max, P=PARAMS[def.id];
  var learned=lv>=1, canNext=next<=max, need=canNext?def.req[next-1]:0, cost=canNext?def.cost[next-1]:0, lockLv=canNext&&myLv<need, noSp=canNext&&sp<cost;
  var h='<div class="s2-card'+((!learned&&lockLv)?' lock':'')+'"><div class="s2-top"><img src="'+iconURL(def.id,46)+'" alt=""><div style="flex:1;min-width:0">'+
    '<div class="s2-nm"><b>'+def.n+'</b><span class="s2-pips">'+pips(lv,max)+'</span></div><div class="s2-d">'+def.d+'</div>';
  if(def.t==='a'){
    h+='<div class="s2-st">'+(learned?'현재 · '+statLine(def.id,lv):'Lv.1 · '+statLine(def.id,1))+(canNext&&learned?'<br>다음 · '+statLine(def.id,next):'')+'</div>';
    var br=brOf(def.id);
    if(lv>=3&&br) h+='<div class="s2-br">⚑ <b>'+def.br[br].n+'</b> — '+def.br[br].d+'</div>';
  } else if(def.t==='p'){
    h+='<div class="s2-st">'+(lv>0?'현재 Lv.'+lv:'아직 익히지 않았어요')+'</div>';
  } else {
    var learned2=legacyCount(); h+='<div class="s2-st">필살기 Lv.'+Math.max(1,lv)+' · 피해·범위가 레벨마다 +20%</div>';
  }
  h+='</div></div>';
  h+='<div class="s2-bt">';
  if(canNext){
    if(lockLv) h+='<span style="font-size:10.5px;color:var(--bad)">🔒 캐릭터 Lv.'+need+' 필요</span>';
    else if(def.t==='a'&&next===3){
      h+='<button class="btn gold" '+(noSp?'style="opacity:.5"':'')+' onclick="S2.learn(\''+def.id+'\',\'a\')">Lv.3 · A '+def.br.a.n+' ('+cost+')</button>'+
         '<button class="btn gold" '+(noSp?'style="opacity:.5"':'')+' onclick="S2.learn(\''+def.id+'\',\'b\')">Lv.3 · B '+def.br.b.n+' ('+cost+')</button>'+
         '<div class="s2-d" style="width:100%">A '+def.br.a.n+': '+def.br.a.d+'<br>B '+def.br.b.n+': '+def.br.b.d+'</div>';
    } else h+='<button class="btn gold" '+(noSp?'style="opacity:.5"':'')+' onclick="S2.learn(\''+def.id+'\')">'+(learned?'강화':'습득')+' · '+cost+' SP</button>';
  } else h+='<span style="font-size:11px;color:var(--good)">✔ 최고 레벨</span>';
  if(def.t==='a'&&lv>=3){ var other=brOf(def.id)==='a'?'b':'a'; h+='<button class="btn ghost" onclick="S2.branch(\''+def.id+'\',\''+other+'\')">길 바꾸기 → '+def.br[other].n+' ('+(Number(G.settings&&G.settings.branchSwitchTp)||40)+' TP)</button>'; }
  if(learned&&(def.t==='a'||def.t==='u')){
    var sl=slots(), keys=def.t==='a'?['1','2','3']:['U'];
    h+='<div class="s2-eq">장착 '+keys.map(function(k){ return '<button class="'+(sl[k]===def.id?'on':'')+'" onclick="S2.equip(\''+k+'\',\''+def.id+'\')">'+(k==='U'?'★':k)+'</button>'; }).join('')+'</div>';
  }
  return h+'</div></div>';
}
function renderSkills2(){
  ensureOverlay(); var c=G.save['캐릭터'], sl=slots();
  document.getElementById('s2-sp').textContent=G.save.SP||0;
  var sh='';
  ['1','2','3','U'].forEach(function(k){ var id=sl[k], d=id?D(id):null;
    sh+='<div class="s2-slot'+(k==='U'?' u':'')+'">'+(d?'<img src="'+iconURL(id,36)+'" alt=""><div>'+d.n+'</div><div class="k">Lv.'+lvOf(id)+'</div>':'<div style="opacity:.4;padding-top:16px">비어 있음</div>')+'<div class="k" style="margin-top:2px">'+(k==='U'?'필살기':k+'번')+'</div></div>'; });
  document.getElementById('s2-slots').innerHTML=sh;
  var tabs=[['a','⚔ 전투 스킬'],['p','✚ 패시브'],['u','★ 필살기']];
  document.getElementById('s2-tabs').innerHTML=tabs.map(function(t){ return '<button class="btn '+(tab===t[0]?'gold':'ghost')+'" style="flex:1;padding:8px 4px;font-size:11px" onclick="S2.tab(\''+t[0]+'\')">'+t[1]+'</button>'; }).join('');
  var list=(G.fskills||[]).filter(function(d){ return d.c===c&&d.t===tab; }), html=list.map(cardHtml).join('');
  var note={a:'슬롯에 넣은 스킬만 쓸 수 있어요. 번호 버튼으로 칸을 정하고, 다른 칸에 있는 스킬을 누르면 서로 자리가 바뀌어요. 스킬 레벨 3에서 <b>갈림길</b>을 고르면 스킬의 성격이 바뀌어요.',p:'모든 전투 스킬에 영향을 주는 능력이에요. 캐릭터 레벨이 오를수록 더 높은 레벨까지 올릴 수 있어요.',u:'게이지가 가득 차면 ★ 버튼(또는 키보드 4)으로 직접 발동해요. 자동 사냥 중에는 알아서 써요.'}[tab];
  document.getElementById('s2-body').innerHTML=html+'<div class="s2-note">'+note+'</div>';
}
window.S2={
  tab:function(t){ tab=t; renderSkills2(); },
  learn:function(id,br){ srv('learnFSkill',G.hakbun,id,br||'').then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'습득하지 못했어요'); return; } G.save=r.save; syncFromSave(); if(typeof sfx==='function') sfx('buy'); toast('✦ <b>'+D(id).n+'</b> Lv.'+r.level); renderSkills2(); }).catch(function(){ toast('통신 오류예요'); }); },
  equip:function(slot,id){ var cur=slots()[slot]; srv('equipFSkill',G.hakbun,slot,cur===id?'':id).then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'장착하지 못했어요'); return; } G.save=r.save; syncFromSave(); hudSig={}; renderSkills2(); }).catch(function(){ toast('통신 오류예요'); }); },
  branch:function(id,br){ if(!confirm('갈림길을 바꿀까요? (TP가 들어요)')) return; srv('switchFBranch',G.hakbun,id,br).then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'바꾸지 못했어요'); return; } G.save=r.save; syncFromSave(); toast('갈림길을 바꿨어요'); renderSkills2(); }).catch(function(){ toast('통신 오류예요'); }); },
  reset:function(){
    var free=!((G.save['문제상태']||{}).__rs), cost=(G.save['레벨']||1)*(Number(G.settings&&G.settings.resetTpPerLv)||10);
    if(!confirm('스킬을 모두 초기화하고 쓴 SP를 돌려받을까요?\n'+(free?'(처음 한 번은 무료예요)':'(TP '+cost+'이 들어요)'))) return;
    srv('resetFSkills',G.hakbun).then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'초기화하지 못했어요'); return; } G.save=r.save; syncFromSave(); hudSig={}; toast('🔄 <b>SP '+r.refund+'</b>을 돌려받았어요'); renderSkills2(); }).catch(function(){ toast('통신 오류예요'); }); },
  legacy:function(){ closeOvl('skills2'); _oldOpen(); }
};
var _oldOpen=openSkillTree;
openSkillTree=function(){ if(!enabled()) return _oldOpen(); renderSkills2(); openOvl('skills2'); };

/* ───────────────────────── 11. 서버 연결 · 체험판 ───────────────────────── */
var _srv=srv;
var GUEST_FS={learnFSkill:1,switchFBranch:1,equipFSkill:1,resetFSkills:1,fieldHeal:0};
srv=function(fn){
  if(G.guest&&GUEST_FS[fn]) return Promise.resolve({ok:false,msg:'체험판에서는 스킬을 바꿀 수 없어요. 가입하면 마음껏 키울 수 있어요!'});
  var p=_srv.apply(this,arguments);
  if(fn==='initGame'||fn==='guestInit') return p.then(function(r){ if(r&&r.ok&&r.fskills){ G.fskills=r.fskills; DEFS=null; } return r; });
  return p;
};
if(typeof guestNewSave==='function'){
  var _gns=guestNewSave;
  guestNewSave=function(cid){
    _gns.apply(this,arguments);
    try{ var c=cid, g=G._gst; g['스킬']=g['스킬']||{}; g['스킬'][c+'_s1']=3; g['스킬'][c+'_s2']=2; g['스킬'][c+'_s3']=2; g['스킬'][c+'_u1']=1;
      g['문제상태']=g['문제상태']||{}; g['문제상태'].__fbr={}; g['문제상태'].__fbr[c+'_s1']='a'; g['문제상태'].__slots={'1':c+'_s1','2':c+'_s2','3':c+'_s3',U:c+'_u1'}; G.save=guestPub(); }catch(e){}
  };
}
window.SKILLS={cast:cast,castUlt:castUlt,paramsFor:paramsFor,PARAMS:PARAMS,enabled:enabled,B:B,CD:CD,RUN:RUN,ULT2:ULT2,iconURL:iconURL,render:renderSkills2,slots:slots,statLine:statLine};
(function(){ var _sv=window.setVer; })();
})();
