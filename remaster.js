/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v11 리마스터 패치 (remaster.js)
   index.html 맨 마지막(</script> 뒤)에
     <script src="remaster.js"></script>
   한 줄만 추가하면 적용됩니다. 서버(Code.gs) 변경 없음.
   되돌리려면 그 한 줄만 지우면 원래 게임으로 돌아옵니다.

   ① 그래픽 : 섬별 조명·색보정·날씨, 벽 그림자, 바닥 장식, 몬스터 외곽선·피격 플래시
   ② 전투   : 3연격 콤보(3타 피니시 광역), 회피 구르기(무적), 베기 궤적
   ③ 몬스터 : 인식 → 추격 → 공격 예고(붉은 원) → 타격. 회피 가능. 귀환 로직
   ④ 장비   : 도트 아이콘 자동 생성, 등급(일반~전설/유물/신화), 착용 장비 대비 ▲▼
   ⑤ 맵     : 미니맵(탭하면 군도 지도)
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof draw!=='function'||typeof update!=='function'){ console.warn('remaster: 원본 엔진을 찾지 못함'); return; }

var RM={ combo:0, lastComboStep:1, dodgeReady:0, dodgeUntil:0, dodgeDX:1, dodgeDY:0, lastGhost:0,
         ghosts:[], coins:[], weather:[], wAcc:0, lights:[], lastPost:performance.now(),
         prevCamX:0, prevCamY:0, iconCache:{}, mmCache:{} };
window.RM=RM;

/* ───────────── 공통 스타일 ───────────── */
var css=document.createElement('style');
css.textContent=[
 '#crt{opacity:.1!important}',
 '.hud-box{background:linear-gradient(180deg,#261c3c,#140e22)!important;border-color:#0d0818!important}',
 '.panel{background:linear-gradient(180deg,#2d2346 0%,#1f1832 100%)!important}',
 '.bar>i{box-shadow:inset 0 2px 0 rgba(255,255,255,.28),inset 0 -2px 0 rgba(0,0,0,.25)}',
 '.shop-item{background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,0) 60%),var(--panel2)!important}',
 '.shop-item .ic{width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center}',
 '.shop-item .ic img,.slot .se img{image-rendering:pixelated;display:block}',
 '.slot .se{display:flex;justify-content:center}',
 '.rz{font-size:9px;padding:1px 5px;border-radius:3px;border:1.5px solid;margin-left:3px;vertical-align:1px}',
 '.shop-item .st{font-size:10.5px;color:var(--text);margin-top:2px}',
 '#dodgebtn{position:absolute;width:60px;height:60px;border-radius:50%;right:32px;bottom:136px;pointer-events:auto;',
 ' border:3px solid var(--line);background:#2d8fb0;color:#fff;font-family:var(--font-disp);font-size:13px;',
 ' box-shadow:0 5px 0 var(--line);transition:transform .07s,box-shadow .07s,opacity .15s}',
 '#dodgebtn:active{transform:translateY(5px);box-shadow:0 0 0 var(--line)}',
 '#dodgebtn.cool{opacity:.45}',
 '#minimap{position:absolute;top:60px;right:8px;z-index:21;border:3px solid #0d0818;border-radius:6px;',
 ' box-shadow:0 3px 0 #0d0818;image-rendering:pixelated;background:#0a0710;cursor:pointer;display:none}',
 '#rm-combo{position:absolute;left:50%;top:170px;transform:translateX(-50%);z-index:19;pointer-events:none;',
 ' font-family:var(--font-disp);font-size:18px;color:#fff;text-shadow:2px 2px 0 #000;opacity:0;transition:opacity .25s}',
 '#rm-combo.on{opacity:1}',
 '#rm-combo b{color:var(--gold);font-size:26px}'
].join('\n');
document.head.appendChild(css);

/* ───────────── 섬별 분위기 ───────────── */
var MOOD={
  r1:{mul:'#dcefd6', dark:0.18, wx:'leaf',  glow:'#ffcf7a'},
  r2:{mul:'#b6a8e6', dark:0.58, wx:'spore', glow:'#8fe8ff'},
  r3:{mul:'#f6dcae', dark:0.10, wx:'dust',  glow:'#ffd08a'},
  r4:{mul:'#cfdcf6', dark:0.24, wx:'mote',  glow:'#fff0b0'},
  r5:{mul:'#eab2c2', dark:0.48, wx:'ember', glow:'#ff9a4a'}
};
function curReg(){ return (G.regions[curZone]&&G.regions[curZone].id)||'r1'; }
function now_(){ return performance.now(); }

/* ═══════════════ ① 바닥: 벽 그림자 + 물거품 + 장식 ═══════════════ */
var _drawGround=drawGround;
drawGround=function(g,regId,tx,ty,sx,sy,reach){
  _drawGround(g,regId,tx,ty,sx,sy,reach);
  if(!reach) return;
  var T=TILE, lz=Math.floor(tx/ZC), ltx=tx-lz*ZC;
  if(isWater(lz,ltx,ty)){
    var w=Math.sin(now_()/500+ty*0.8)*2;
    if(ltx===1){ g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(sx+T-5+w,sy,3,T); }
    if(ltx===ZC-2){ g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(sx+2-w,sy,3,T); }
    return;
  }
  if(ltx<2||ltx>ZC-3) return;                       // 다리
  if(blockedLocal(lz,ltx,ty)) return;                // 장애물 칸은 오브젝트가 덮음
  // 벽 아래 그림자(앰비언트 오클루전)
  if(blockedLocal(lz,ltx,ty-1)&&!isWater(lz,ltx,ty-1)){
    g.fillStyle='rgba(0,0,0,.26)'; g.fillRect(sx,sy,T,Math.round(T*0.16));
    g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(sx,sy+Math.round(T*0.16),T,Math.round(T*0.14));
  }
  if(blockedLocal(lz,ltx-1,ty)&&!isWater(lz,ltx-1,ty)){
    g.fillStyle='rgba(0,0,0,.14)'; g.fillRect(sx,sy,Math.round(T*0.14),T);
  }
  if(ty===ROAD||ty===ROAD-1) return;
  var h=hash(tx*17+3,ty*29+7);
  if(h<0.085) drawDecor(g,regId,sx+T/2,sy+T/2,h/0.085,tx,ty);
};
function P(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))); }
function drawDecor(g,regId,cx,cy,v,tx,ty){
  var T=TILE, u=T/16, t=now_();
  if(regId==='r1'){
    if(v<0.45){                                              // 꽃무리
      var cols=['#ff8ab8','#ffe070','#ffffff','#b8a0ff'];
      for(var i=0;i<3;i++){ var fx0=cx+(i-1)*u*4, fy0=cy+((i%2)?u*2:-u);
        P(g,fx0,fy0,u*0.8,u*3,'#2f6b32'); P(g,fx0-u,fy0-u,u*2.6,u*2.2,cols[(tx+ty+i)%4]); P(g,fx0,fy0-u*0.4,u*0.8,u*0.8,'#ffe98a'); }
    } else if(v<0.75){                                       // 버섯
      P(g,cx-u,cy,u*2,u*3,'#efe6d0'); P(g,cx-u*3,cy-u*2.5,u*6,u*3,'#d8423a');
      P(g,cx-u*2,cy-u*2,u,u,'#fff'); P(g,cx+u,cy-u*1.5,u,u,'#fff');
    } else {                                                 // 흔들리는 풀
      var sw=Math.sin(t/600+tx)*u;
      P(g,cx-u*2+sw,cy-u*4,u,u*5,'#5fb85c'); P(g,cx+sw*0.6,cy-u*5,u,u*6,'#79c85f'); P(g,cx+u*2+sw,cy-u*3,u,u*4,'#4f9a44');
    }
  } else if(regId==='r2'){
    if(v<0.6){                                               // 발광 수정
      var cc=(v<0.3)?'#8fe8ff':'#c98cff';
      P(g,cx-u*3,cy-u*2,u*2,u*5,shade(cc.length===7?cc:'#8fe8ff',0.7)); P(g,cx-u,cy-u*6,u*2.5,u*9,cc); P(g,cx+u*2,cy-u*3,u*2,u*6,shade(cc,0.8));
      P(g,cx-u*0.4,cy-u*5,u*0.8,u*4,'rgba(255,255,255,.7)');
      RM.lights.push({x:cx,y:cy-u*2,r:T*1.5,c:cc});
    } else {                                                 // 뼈
      P(g,cx-u*4,cy,u*8,u*1.4,'#d8d0c0'); P(g,cx-u*5,cy-u*0.6,u*1.6,u*2.6,'#e8e0d0'); P(g,cx+u*3.6,cy-u*0.6,u*1.6,u*2.6,'#e8e0d0');
    }
  } else if(regId==='r3'){
    if(v<0.5){                                               // 선인장
      P(g,cx-u,cy-u*6,u*2.4,u*9,'#4f8a3a'); P(g,cx-u*4,cy-u*3,u*2,u*2,'#4f8a3a'); P(g,cx-u*4,cy-u*5,u*1.4,u*3,'#4f8a3a');
      P(g,cx+u*1.4,cy-u*2,u*2,u*1.6,'#4f8a3a'); P(g,cx+u*2.6,cy-u*4,u*1.4,u*3,'#4f8a3a'); P(g,cx-u*0.4,cy-u*6,u*0.8,u*9,'#6fae52');
    } else {                                                 // 마른 덤불 + 조약돌
      P(g,cx-u*3,cy-u,u*6,u*2,'#8a6a3a'); P(g,cx-u*2,cy-u*3,u,u*3,'#a5793a'); P(g,cx+u,cy-u*3.5,u,u*3,'#a5793a');
      P(g,cx+u*3,cy+u,u*2.4,u*1.6,'#c9a47a');
    }
  } else if(regId==='r4'){
    if(v<0.3){                                               // 가로등
      P(g,cx-u*0.6,cy-u*9,u*1.2,u*11,'#3a3a48'); P(g,cx-u*2,cy-u*10.5,u*4,u*2,'#5a5a6a');
      P(g,cx-u*1.4,cy-u*9,u*2.8,u*1.2,'#fff0b0');
      RM.lights.push({x:cx,y:cy-u*8,r:T*2.2,c:'#fff0b0'});
    } else {                                                 // 필드 콘 / 깃발
      if(v<0.65){ P(g,cx-u*2,cy+u,u*4,u,'#e8e8e8'); P(g,cx-u*1.4,cy-u*2,u*2.8,u*3,'#ff7a3a'); P(g,cx-u*1.4,cy-u*0.8,u*2.8,u*0.8,'#fff'); }
      else { P(g,cx-u*0.4,cy-u*6,u*0.8,u*8,'#d8d8e8'); var fw=Math.sin(t/300+tx)*u*0.6; P(g,cx+u*0.4,cy-u*6,u*4+fw,u*2.4,'#4d86c9'); }
    }
  } else if(regId==='r5'){
    if(v<0.45){                                              // 횃불
      P(g,cx-u*0.8,cy-u*4,u*1.6,u*6,'#4a3222'); P(g,cx-u*1.6,cy-u*4.6,u*3.2,u*1.2,'#6a4a2e');
      var fl=Math.sin(t/80+tx)*u*0.6;
      P(g,cx-u*1.2,cy-u*7-fl,u*2.4,u*2.6+fl,'#ff5a2e'); P(g,cx-u*0.6,cy-u*6.6-fl,u*1.2,u*1.6,'#ffd04a');
      RM.lights.push({x:cx,y:cy-u*6,r:T*2.0,c:'#ff9a4a'});
    } else {                                                 // 해골 · 균열
      if(v<0.7){ P(g,cx-u*2,cy-u*2,u*4,u*3,'#d8d0c0'); P(g,cx-u*1.2,cy-u,u,u,'#2a2030'); P(g,cx+u*0.4,cy-u,u,u,'#2a2030'); P(g,cx-u,cy+u,u*2,u,'#c8c0b0'); }
      else { P(g,cx-u*4,cy,u*3,u*0.8,'rgba(0,0,0,.4)'); P(g,cx-u,cy-u,u*3,u*0.8,'rgba(0,0,0,.4)'); P(g,cx+u*2,cy+u,u*2,u*0.8,'rgba(0,0,0,.4)'); }
    }
  }
}

/* ═══════════════ ① 몬스터 외곽선·피격 플래시·공격 예고 틴트 ═══════════════ */
var sprCv=document.createElement('canvas'), sctx=sprCv.getContext('2d');
var olCv=document.createElement('canvas'), octx=olCv.getContext('2d');
var _des=drawEntitySprite;
drawEntitySprite=function(g,e,cx,cy,T){
  if(e.type!=='hunt'&&e.type!=='boss'){ _des(g,e,cx,cy,T); return; }
  var S=Math.ceil(TILE*2.6);
  if(sprCv.width!==S){ sprCv.width=S; sprCv.height=S; olCv.width=S; olCv.height=S; }
  var t=now_();
  sctx.globalCompositeOperation='source-over'; sctx.clearRect(0,0,S,S);
  _des(sctx,e,S/2,S/2,T);
  if(e.wind){                                             // 공격 직전: 붉게 달아오름
    sctx.globalCompositeOperation='source-atop';
    sctx.fillStyle='rgba(255,40,40,'+(0.25+0.25*Math.sin(t/50))+')'; sctx.fillRect(0,0,S,S);
  }
  if(e.hitT&&t-e.hitT<90){                                // 피격: 하얀 플래시
    sctx.globalCompositeOperation='source-atop';
    sctx.fillStyle='rgba(255,255,255,.85)'; sctx.fillRect(0,0,S,S);
  }
  sctx.globalCompositeOperation='source-over';
  // 외곽선 실루엣
  octx.globalCompositeOperation='source-over'; octx.clearRect(0,0,S,S);
  octx.drawImage(sprCv,0,0);
  octx.globalCompositeOperation='source-in';
  octx.fillStyle=(e.tier===2)?'#ffca4b':(e.tier===1?'#e8e8ff':'#08050e');
  octx.fillRect(0,0,S,S);
  var ox=cx-S/2, oy=cy-S/2, o=(e.tier>=1)?2:1.5;
  g.drawImage(olCv,ox-o,oy); g.drawImage(olCv,ox+o,oy); g.drawImage(olCv,ox,oy-o); g.drawImage(olCv,ox,oy+o);
  g.drawImage(sprCv,ox,oy);
};

/* ═══════════════ ② 플레이어: 잔상 + 베기 궤적 ═══════════════ */
function weaponColor(){
  var w=(G.save&&G.save.equipped&&G.save.equipped.weapon)?G.itemById[G.save.equipped.weapon.id]:null;
  if(!w) return {main:'#e8e8ff',blade:null};
  var wa=WART[w.id];
  return { main:tierColor(w), blade:wa?wcol(wa[1]):'#dfe4f0' };
}
function drawSlash(x,y,p,dir,step){
  var wc=weaponColor(), fist=!wc.blade;
  var R=TILE*(step===3?1.05:(fist?0.45:0.72));
  var e=1-Math.pow(1-Math.min(1,p*1.25),3);
  var a0,a1;
  if(step===2){ a0=1.0; a1=-1.5; } else if(step===3){ a0=-2.6; a1=2.8; } else { a0=-1.6; a1=1.0; }
  var head=a0+(a1-a0)*e, tail=a0+(a1-a0)*Math.max(0,e-0.5);
  var lo=Math.min(head,tail), hi=Math.max(head,tail);
  ctx.save(); ctx.translate(x,y); ctx.scale(dir,1); ctx.lineCap='round';
  var fade=Math.max(0,1-p);
  ctx.globalAlpha=fade*0.55; ctx.strokeStyle=wc.main; ctx.lineWidth=TILE*(step===3?0.3:0.2);
  ctx.beginPath(); ctx.arc(0,0,R,lo,hi); ctx.stroke();
  ctx.globalAlpha=fade; ctx.strokeStyle='#ffffff'; ctx.lineWidth=TILE*0.06;
  ctx.beginPath(); ctx.arc(0,0,R*1.04,lo,hi); ctx.stroke();
  if(!fist && p<0.8){                                     // 칼날 자체
    ctx.globalAlpha=1; ctx.strokeStyle=wc.blade; ctx.lineWidth=TILE*0.09;
    ctx.beginPath(); ctx.moveTo(Math.cos(head)*R*0.25,Math.sin(head)*R*0.25);
    ctx.lineTo(Math.cos(head)*R*1.08,Math.sin(head)*R*1.08); ctx.stroke();
    ctx.strokeStyle='#4a3a2a'; ctx.lineWidth=TILE*0.1;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(head)*R*0.25,Math.sin(head)*R*0.25); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha=1;
}
drawPlayer=function(){
  var t=now_();
  var psx=Math.round(player.x*TILE-cam.x), psy=Math.round(player.y*TILE-cam.y);
  // 잔상
  for(var i=RM.ghosts.length-1;i>=0;i--){
    var gh=RM.ghosts[i], a=1-(t-gh.t)/260;
    if(a<=0){ RM.ghosts.splice(i,1); continue; }
    ctx.globalAlpha=a*0.4;
    drawHero(ctx,G.save['캐릭터'],Math.round(gh.x*TILE-cam.x),Math.round(gh.y*TILE-cam.y)-TILE*0.14,TILE*1.15,gh.dir,false,heroEq());
  }
  ctx.globalAlpha=1;
  var dodging=t<RM.dodgeUntil;
  ctx.fillStyle='rgba(0,0,0,.32)'; ctx.beginPath();
  ctx.ellipse(psx,psy+TILE*0.3,TILE*0.26*(dodging?1.3:1),TILE*0.11,0,0,7); ctx.fill();
  var hop=player.moving&&!dodging?Math.abs(Math.sin(player.anim))*3:0;
  ctx.globalAlpha=(!dodging&&t<invulnUntil&&Math.floor(t/120)%2)?0.4:1;
  drawHero(ctx,G.save['캐릭터'],psx,psy-hop-TILE*0.14+(dodging?TILE*0.08:0),TILE*1.15,player.dir,player.moving,heroEq());
  ctx.globalAlpha=1;
  var swp=t-swingT;
  if(swp>=0&&swp<230){
    var step=(Math.abs(swingT-lastAtk)<2)?RM.lastComboStep:1;
    drawSlash(psx+player.dir*TILE*0.1,psy-hop-TILE*0.12,swp/230,player.dir,step);
  }
};

/* ═══════════════ ② 전투: 3연격 콤보 ═══════════════ */
var comboEl=document.createElement('div'); comboEl.id='rm-combo'; document.getElementById('app').appendChild(comboEl);
var _comboHideT=null;
function showCombo(n,label){
  comboEl.innerHTML='<b>'+n+'</b> HIT'+(label?' · '+label:'');
  comboEl.classList.add('on'); clearTimeout(_comboHideT);
  _comboHideT=setTimeout(function(){ comboEl.classList.remove('on'); },900);
}
function ensureHp(e){ if(e.hp===undefined){ e.maxhp=(window.BAL&&BAL.hp)?BAL.hp(e):Math.round((18+e.z*14)*(e.tier===2?3.2:e.tier===1?1.8:1)); e.hp=e.maxhp; } }   /* fx.js의 밸런스 공식이 있으면 그것을 사용 */
function applyHit(e,dmg,crit,finisher,t){
  ensureHp(e); if(e.hp<=0) return;
  e.hp-=dmg; e.hitT=t;
  e.knockT=t; e.knockDX=(e.tx-player.x); e.knockDY=(e.ty-player.y);
  var kd=Math.hypot(e.knockDX,e.knockDY)||1; e.knockDX/=kd; e.knockDY/=kd;
  if(finisher&&e.ox!==undefined){                          // 피니시: 실제로 밀려남
    var nx=e.ox+e.knockDX*0.7, ny=e.oy+e.knockDY*0.7;
    if(!blockedWorld(Math.floor(nx+0.5),Math.floor(ny+0.5))){ e.ox=nx; e.oy=ny; }
    e.wind=0; e.nextAtk2=t+900;                            // 피니시는 공격 예고를 끊는다
  }
  addRing(e.tx+0.5,e.ty+0.3);
  addFx(e.tx+0.5,e.ty-0.2,(crit?'💥':'')+dmg,crit?'#ffca4b':(finisher?'#8fe8ff':'#ffffff'),crit||finisher);
  if(crit) burstShards(e.tx+0.5,e.ty+0.2,'#ffca4b');
  if(e.hp<=0){
    e.hp=0; addFx(e.tx+0.5,e.ty-0.6,'KO!','#66e08a',true);
    hitStop(150); burstShards(e.tx+0.5,e.ty+0.2,'#ff6b4d'); shakeScreen(6); sfx('atk'); vib(40);
    player.gauge=Math.min(100,player.gauge+14); doHunt(e);
  }
}
attackHunt=function(e){
  var t=now_();
  if(t-lastAtk<230) return;
  if(e.hp!==undefined&&e.hp<=0) return;
  RM.combo=(t-lastAtk<720)?(RM.combo%3)+1:1;
  lastAtk=t; swingT=t; RM.lastComboStep=RM.combo;
  stickyHunt=e; stickyHuntUntil=t+1200;
  ensureHp(e);
  var fin=(RM.combo===3);
  var atk=(G.save&&G.save.atk)||6;
  var crit=Math.random()<(fin?0.25:0.12);
  var mast=masteryOf((G.regions[e.z]&&G.regions[e.z].id)||'r1');
  var mul=[1,0.9,1.05,1.9][RM.combo];
  var dmg=Math.max(1,Math.round(atk*(0.85+Math.random()*0.3)*(crit?1.8:1)*(1+mast)*mul));
  if(e.tx<player.x) player.dir=-1; else player.dir=1;
  applyHit(e,dmg,crit,fin,t);
  if(fin){                                                 // 피니시: 주변 광역
    entities.forEach(function(o){
      if(o===e||o.dead||o.type!=='hunt') return;
      if(o.hp!==undefined&&o.hp<=0) return;
      if(Math.hypot(o.tx-player.x,o.ty-player.y)<1.9) applyHit(o,Math.round(dmg*0.6),false,true,t);
    });
    hitStop(crit?150:110); shakeScreen(6); vib([30,30,50]); noise(0.12,0.05); sfx('hit');
    showCombo(3,'피니시!');
  } else {
    hitStop(crit?90:45); shakeScreen(crit?4:2); vib(crit?50:20); sfx('hit');
    if(RM.combo===2) showCombo(2,'');
  }
  if(mast>=0.5) addFx(e.tx+0.5,e.ty-0.55,'약점!','#37e0cf');
  player.gauge=Math.min(100,player.gauge+(fin?14:7));
  if(player.gauge>=100) castActionSkill();
};

/* 처치 시 코인이 튀어나와 나에게 날아온다 (모든 처치 경로 공통) */
var _doHunt=doHunt;
doHunt=function(e){
  for(var i=0;i<7;i++){
    var a=Math.random()*6.28, sp=2+Math.random()*2.5;
    RM.coins.push({x:e.tx+0.5,y:e.ty+0.2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,t:0});
  }
  return _doHunt(e);
};

/* ═══════════════ ② 회피 구르기 ═══════════════ */
function inputDir(){
  var dx=0,dy=0;
  if(keys['ArrowLeft']||keys['KeyA']||keys['a']) dx-=1;
  if(keys['ArrowRight']||keys['KeyD']||keys['d']) dx+=1;
  if(keys['ArrowUp']||keys['KeyW']||keys['w']) dy-=1;
  if(keys['ArrowDown']||keys['KeyS']||keys['s']) dy+=1;
  if(joy.active){ dx=joy.dx; dy=joy.dy; }
  var l=Math.hypot(dx,dy);
  return l>0.15?{x:dx/l,y:dy/l}:null;
}
function doDodge(){
  if(!running||!G.save||overlayOpen()||dying) return;
  var t=now_(); if(t<RM.dodgeReady) return;
  var d=inputDir()||{x:player.dir,y:0};
  RM.dodgeDX=d.x; RM.dodgeDY=d.y;
  RM.dodgeUntil=t+200; RM.dodgeReady=t+900;
  invulnUntil=Math.max(invulnUntil,t+340);
  if(d.x<0) player.dir=-1; else if(d.x>0) player.dir=1;
  noise(0.12,0.035); beep(420,0.1,'triangle',0.03,180); vib(15);
}
window.doDodge=doDodge;
var db=document.createElement('button'); db.id='dodgebtn'; db.textContent='회피';
document.getElementById('pad').appendChild(db);
db.addEventListener('touchstart',function(ev){ ev.preventDefault(); doDodge(); },{passive:false});
db.addEventListener('click',function(){ doDodge(); });
window.addEventListener('keydown',function(ev){
  if(ev.code==='ShiftLeft'||ev.code==='ShiftRight'||ev.code==='KeyL'){ if(!overlayOpen()){ ev.preventDefault(); doDodge(); } }
});

/* ═══════════════ ③ 몬스터 AI: 인식 → 추격 → 예고 → 타격 ═══════════════ */
function mobHitPlayer(e,t){
  if(dying) return;
  if(t<invulnUntil){
    if(t<RM.dodgeUntil+160){                              // 구르기로 피함 = 보너스
      addFx(player.x,player.y-0.9,'회피!','#8fe8ff',true);
      player.gauge=Math.min(100,player.gauge+12); sfx('ok');
    }
    return;
  }
  var mdmg=(window.BAL&&BAL.dmg)?BAL.dmg(e):Math.max(1,Math.round(((Number(G.settings.mobDmgBase)||4)+e.z*3)*(e.tier===2?2:e.tier===1?1.4:1)-(G.save.def||0)*0.4));
  G.save.HP=Math.max(0,G.save.HP-mdmg);
  syncFromSave(); hurt(); shakeScreen(e.tier===2?7:3); vib(60); noise(0.08,0.05); hitStop(50);
  addFx(player.x,player.y-0.7,'-'+mdmg,'#ff6b6b');
  scheduleHpSync();
  if(G.save.HP<=0) onFieldDeath();
}
function mobAI(dt,t){
  var px0=player.x-0.5, py0=player.y-0.5;
  for(var i=0;i<entities.length;i++){
    var e=entities[i];
    if(e.type!=='hunt'||e.ox===undefined) continue;
    if(e.hx===undefined){ e.hx=e.ox; e.hy=e.oy; e.agB=0; }
    if(e.dead||(e.hp!==undefined&&e.hp<=0)){ e.ox=e.hx; e.oy=e.hy; e.aggro=false; e.wind=0; e.agB=0; continue; }
    if(!regionReachable(Math.floor(e.hx/ZC))) continue;
    var dx=px0-e.ox, dy=py0-e.oy, d=Math.hypot(dx,dy)||0.001;
    var R=e.tier===2?4.6:(e.tier===1?4:3.2);
    var hd=Math.hypot(e.ox-e.hx,e.oy-e.hy);
    if(!e.aggro&&d<R&&!dying&&hd<1){ e.aggro=true; e.alertT=t; e.nextAtk2=t+450; }
    if(e.aggro&&(d>R*2.2||hd>7||dying)){ e.aggro=false; e.wind=0; }
    e.agB=Math.max(0,Math.min(1,(e.agB||0)+(e.aggro?dt*4:-dt*2)));
    if(e.wind){
      if(t>=e.wind){
        var reach=e.tier===2?1.8:1.3;
        e.lunge=t; e.wind=0; e.nextAtk2=t+(e.tier===2?2300:1500);
        if(e.tier===2){ addRing(e.tx+0.5,e.ty+0.5); shakeScreen(5); noise(0.15,0.05); }
        if(Math.hypot(px0-e.ox,py0-e.oy)<=reach) mobHitPlayer(e,t);
      }
    } else if(e.aggro){
      var stop=(e.tier===2)?1.1:0.8;
      if(d>stop){
        var sp=(1.5+e.tier*0.45)*dt;
        var nx=e.ox+dx/d*sp, ny=e.oy+dy/d*sp;
        if(!blockedWorld(Math.floor(nx+0.5),Math.floor(e.oy+0.5))) e.ox=nx;
        if(!blockedWorld(Math.floor(e.ox+0.5),Math.floor(ny+0.5))) e.oy=ny;
      }
      if(d<(e.tier===2?1.6:1.15)&&t>=(e.nextAtk2||0)){
        e.windStart=t; e.wind=t+(e.tier===2?820:560);
        e.lgx=dx/d; e.lgy=dy/d;
      }
    } else if(hd>0.05){
      var bs=Math.min(1.4*dt,hd);
      e.ox+=(e.hx-e.ox)/hd*bs; e.oy+=(e.hy-e.oy)/hd*bs;
    }
    // 추격 중에는 제자리 서성임을 멈춘다
    var b=e.agB||0;
    e.tx=e.ox+(e.tx-e.ox)*(1-b); e.ty=e.oy+(e.ty-e.oy)*(1-b);
  }
}

var _update=update;
update=function(dt){
  var t=now_();
  for(var i=0;i<entities.length;i++){ if(entities[i].type==='hunt') entities[i].nextAtk=t+1e7; } // 원본 즉발 공격 비활성
  _update(dt);
  if(!G.save||overlayOpen()) return;
  if(t<RM.dodgeUntil){
    var sp=11*dt;
    tryMove(player.x+RM.dodgeDX*sp,player.y); tryMove(player.x,player.y+RM.dodgeDY*sp);
    if(t-RM.lastGhost>35){ RM.ghosts.push({x:player.x,y:player.y,dir:player.dir,t:t}); RM.lastGhost=t; }
  }
  mobAI(dt,t);
  db.classList.toggle('cool',t<RM.dodgeReady);
};

/* ═══════════════ ① 조명 · 날씨 · 비네트 (후처리) ═══════════════ */
var lightCv=document.createElement('canvas'), lctx=lightCv.getContext('2d');
var vignette=null;
function spawnWeather(type){
  var w={type:type,t:0,rot:Math.random()*6.28};
  if(type==='leaf'){ w.x=Math.random()*W; w.y=-8; w.vx=18+Math.random()*25; w.vy=28+Math.random()*22; w.c=['#6fbf52','#a5d65a','#e0c050'][Math.floor(Math.random()*3)]; }
  else if(type==='spore'){ w.x=Math.random()*W; w.y=H+8; w.vx=(Math.random()-0.5)*10; w.vy=-(10+Math.random()*15); w.c=Math.random()<0.5?'#8fe8ff':'#c98cff'; }
  else if(type==='dust'){ w.x=-20; w.y=Math.random()*H; w.vx=140+Math.random()*90; w.vy=(Math.random()-0.5)*14; w.c='rgba(240,210,160,.35)'; }
  else if(type==='mote'){ w.x=Math.random()*W; w.y=H+8; w.vx=(Math.random()-0.5)*8; w.vy=-(12+Math.random()*10); w.c='#fff0b0'; }
  else { w.x=Math.random()*W; w.y=H+8; w.vx=(Math.random()-0.5)*18; w.vy=-(35+Math.random()*35); w.c=Math.random()<0.5?'#ff7a2e':'#ffca4b'; }
  RM.weather.push(w);
}
function drawWeather(dt,id){
  var type=(MOOD[id]||MOOD.r1).wx;
  var rate={leaf:5,spore:5,dust:12,mote:4,ember:10}[type]||0;
  if(OPT.reduceFx) rate*=0.35;
  RM.wAcc+=dt*rate;
  while(RM.wAcc>1&&RM.weather.length<90){ RM.wAcc-=1; spawnWeather(type); }
  var pdx=(cam.x-RM.prevCamX)*0.35, pdy=(cam.y-RM.prevCamY)*0.35;
  if(Math.abs(pdx)>80||Math.abs(pdy)>80){ pdx=0; pdy=0; }   // 순간이동 시 튐 방지
  for(var i=RM.weather.length-1;i>=0;i--){
    var w=RM.weather[i];
    if(w.type!==type){ RM.weather.splice(i,1); continue; }
    w.t+=dt; w.rot+=dt*3;
    w.x+=w.vx*dt+(w.type==='leaf'?Math.sin(w.t*2+w.rot)*0.6:0)+(w.type==='ember'?Math.sin(w.t*5)*0.4:0)-pdx;
    w.y+=w.vy*dt-pdy;
    if(w.x<-30||w.x>W+30||w.y<-30||w.y>H+30||w.t>14){ RM.weather.splice(i,1); continue; }
    if(w.type==='leaf'){
      ctx.save(); ctx.translate(w.x,w.y); ctx.rotate(w.rot); ctx.fillStyle=w.c; ctx.fillRect(-3,-1.5,6,3); ctx.restore();
    } else if(w.type==='dust'){
      ctx.fillStyle=w.c; ctx.fillRect(w.x,w.y,14,1.5);
    } else {
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=0.5+0.5*Math.sin(w.t*4+w.rot);
      ctx.fillStyle=w.c; ctx.fillRect(Math.round(w.x),Math.round(w.y),w.type==='ember'?2:3,w.type==='ember'?2:3);
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    }
  }
  RM.prevCamX=cam.x; RM.prevCamY=cam.y;
}
function drawAtmosphere(dt){
  var id=curReg(), m=MOOD[id]||MOOD.r1;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  // 색보정
  ctx.globalCompositeOperation='multiply'; ctx.fillStyle=m.mul; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='source-over';
  // 어둠 + 광원 구멍
  if(lightCv.width!==W){ lightCv.width=W; lightCv.height=H; }
  lctx.globalCompositeOperation='source-over'; lctx.clearRect(0,0,W,H);
  lctx.fillStyle='rgba(10,5,24,'+m.dark+')'; lctx.fillRect(0,0,W,H);
  lctx.globalCompositeOperation='destination-out';
  function hole(x,y,r,a){
    if(x<-r||x>W+r||y<-r||y>H+r) return;
    var gr=lctx.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba(0,0,0,'+a+')'); gr.addColorStop(1,'rgba(0,0,0,0)');
    lctx.fillStyle=gr; lctx.beginPath(); lctx.arc(x,y,r,0,6.29); lctx.fill();
  }
  var psx=player.x*TILE-cam.x, psy=player.y*TILE-cam.y;
  hole(psx,psy,TILE*3.8,1);
  var glows=[];
  entities.forEach(function(e){
    if(e.dead) return;
    if(e.type!=='fire'&&e.type!=='gate'&&e.type!=='shop') return;
    var x=(e.tx+0.5)*TILE-cam.x, y=(e.ty+0.5)*TILE-cam.y;
    var fl=(e.type==='fire')?1+Math.sin(now_()/90)*0.06:1;
    var r=TILE*(e.type==='fire'?3.4:2.2)*fl;
    hole(x,y,r,0.95);
    glows.push({x:x,y:y,r:r*0.8,c:e.type==='fire'?'#ff9a3a':(e.type==='gate'?'#b08cff':'#ffe0a0')});
  });
  RM.lights.forEach(function(l){ hole(l.x,l.y,l.r,0.85); glows.push({x:l.x,y:l.y,r:l.r*0.7,c:l.c}); });
  ctx.drawImage(lightCv,0,0);
  // 따뜻한 빛 번짐 (가산)
  ctx.globalCompositeOperation='lighter';
  glows.forEach(function(gl){
    if(gl.x<-gl.r||gl.x>W+gl.r||gl.y<-gl.r||gl.y>H+gl.r) return;
    var gr=ctx.createRadialGradient(gl.x,gl.y,0,gl.x,gl.y,gl.r);
    gr.addColorStop(0,gl.c); gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=0.22; ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(gl.x,gl.y,gl.r,0,6.29); ctx.fill();
  });
  ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
  drawWeather(dt,id);
  if(!vignette){
    vignette=ctx.createRadialGradient(W/2,H/2,H*0.32,W/2,H/2,H*0.78);
    vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,.55)');
  }
  ctx.fillStyle=vignette; ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/* 공격 예고 원 · 인식 느낌표 · 정예 이름표 */
function drawThreats(){
  var t=now_();
  entities.forEach(function(e){
    if(e.type!=='hunt'||e.dead) return;
    var x=(e.tx+0.5)*TILE-cam.x, y=(e.ty+0.5)*TILE-cam.y;
    if(x<-TILE*2||x>W+TILE*2||y<-TILE*2||y>H+TILE*2) return;
    if(e.wind){
      var p=Math.min(1,(t-e.windStart)/(e.wind-e.windStart));
      var R=(e.tier===2?1.8:1.3)*TILE, gy=y+TILE*0.3;
      ctx.save();
      ctx.strokeStyle='rgba(255,60,60,.85)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x,gy,R,R*0.45,0,0,6.29); ctx.stroke();
      ctx.fillStyle='rgba(255,40,40,'+(0.12+0.18*p)+')';
      ctx.beginPath(); ctx.ellipse(x,gy,R*p,R*0.45*p,0,0,6.29); ctx.fill();
      ctx.fillStyle='#ff4040'; ctx.font='bold '+Math.round(TILE*0.55)+'px DungGeunMo,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#000'; ctx.strokeText('!!',x,y-TILE*0.95); ctx.fillText('!!',x,y-TILE*0.95);
      ctx.restore();
    } else if(e.alertT&&t-e.alertT<650){
      var j=Math.sin((t-e.alertT)/650*Math.PI)*TILE*0.25;
      ctx.save(); ctx.fillStyle='#ffe14d'; ctx.font='bold '+Math.round(TILE*0.5)+'px DungGeunMo,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=3; ctx.strokeStyle='#000';
      ctx.strokeText('!',x,y-TILE*0.9-j); ctx.fillText('!',x,y-TILE*0.9-j); ctx.restore();
    }
    if(e.tier>=1&&(e.aggro||(e.hp!==undefined&&e.hp<e.maxhp))){
      var nm=((BEAST_NAME[(G.regions[e.z]||{}).id]||[])[e.sp||0])||'몬스터';
      var label=(e.tier===2?'희귀 ':'정예 ')+nm;
      ctx.save(); ctx.font=Math.round(TILE*0.24)+'px DungGeunMo,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.fillStyle=e.tier===2?'#ffca4b':'#e8e8ff';
      var ly=y-TILE*(e.tier===2?1.05:0.95);
      ctx.strokeText(label,x,ly); ctx.fillText(label,x,ly); ctx.restore();
    }
  });
}
function drawCoins(dt){
  for(var i=RM.coins.length-1;i>=0;i--){
    var c=RM.coins[i]; c.t+=dt;
    if(c.t<0.35){ c.x+=c.vx*dt; c.y+=c.vy*dt; c.vy+=9*dt; }
    else {
      var dx=player.x-c.x, dy=(player.y-0.2)-c.y, d=Math.hypot(dx,dy);
      if(d<0.3||c.t>2.5){ RM.coins.splice(i,1); beep(1300+Math.random()*300,0.04,'square',0.018); continue; }
      var sp=(6+c.t*14)*dt; c.x+=dx/d*Math.min(sp,d); c.y+=dy/d*Math.min(sp,d);
    }
    var sx=c.x*TILE-cam.x, sy=c.y*TILE-cam.y, r=TILE*0.09, sq=Math.abs(Math.cos(c.t*9));
    ctx.fillStyle='#8a5a10'; ctx.fillRect(Math.round(sx-r*sq-1),Math.round(sy-r-1),Math.round(2*r*sq+2),Math.round(2*r+2));
    ctx.fillStyle='#ffca4b'; ctx.fillRect(Math.round(sx-r*sq),Math.round(sy-r),Math.max(1,Math.round(2*r*sq)),Math.round(2*r));
    ctx.fillStyle='#fff6c0'; ctx.fillRect(Math.round(sx-r*sq*0.4),Math.round(sy-r*0.6),Math.max(1,Math.round(r*sq*0.5)),Math.round(r*0.5));
  }
}
function drawDamageNumbers(){
  fx.forEach(function(f){
    var sx=Math.round(f.x*TILE-cam.x), sy=Math.round(f.y*TILE-cam.y);
    if(f.ring){
      var rp=f.t/0.28;
      ctx.globalAlpha=Math.max(0,1-rp); ctx.strokeStyle='#ffd76a'; ctx.lineWidth=Math.max(2,TILE*0.06);
      ctx.beginPath(); ctx.arc(sx,sy,TILE*(0.18+0.55*rp),0,6.29); ctx.stroke();
    } else {
      var a=Math.max(0,1-f.t/0.8), pop=f.t<0.12?1+(0.12-f.t)/0.12*0.7:1;
      ctx.globalAlpha=a;
      ctx.font=Math.round(TILE*(f.big?0.6:0.4)*pop)+'px DungGeunMo,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.strokeText(f.txt,sx,sy);
      ctx.fillStyle=f.c; ctx.fillText(f.txt,sx,sy);
    }
  });
  ctx.globalAlpha=1;
}

var _draw=draw;
draw=function(){
  RM.lights.length=0;
  _draw();
  if(!G.save) return;
  var t=now_(), dt=Math.min(0.05,(t-RM.lastPost)/1000); RM.lastPost=t;
  ctx.setTransform(1,0,0,1,0,0);
  drawAtmosphere(dt);
  drawThreats();
  drawCoins(dt);
  drawDamageNumbers();
};

/* ═══════════════ ⑤ 미니맵 ═══════════════ */
var mm=document.createElement('canvas'); mm.id='minimap';
var MS=3; mm.width=ZC*MS; mm.height=ZR*MS;
mm.style.width=(ZC*MS)+'px'; mm.style.height=(ZR*MS)+'px';
document.getElementById('app').appendChild(mm);
mm.addEventListener('click',function(){ if(typeof openMap==='function') openMap(); });
function mmStatic(z){
  if(RM.mmCache[z]) return RM.mmCache[z];
  var c=document.createElement('canvas'); c.width=ZC*MS; c.height=ZR*MS;
  var g=c.getContext('2d'), rid=G.regions[z].id, p=GT[rid]||GT.r1;
  for(var ty=0;ty<ZR;ty++) for(var tx=0;tx<ZC;tx++){
    var col;
    if(isWater(z,tx,ty)) col='#1d4a78';
    else if(blockedLocal(z,tx,ty)) col=shade(p.dark,0.55);
    else if(ty===ROAD||ty===ROAD-1) col=p.path;
    else col=p.base;
    g.fillStyle=col; g.fillRect(tx*MS,ty*MS,MS,MS);
  }
  RM.mmCache[z]=c; return c;
}
function drawMinimap(){
  var show=running&&G.save&&G.regions.length&&!document.getElementById('intro').classList.contains('open');
  mm.style.display=show?'block':'none';
  if(!show) return;
  var g=mm.getContext('2d'), z=curZone, base=z*ZC;
  g.drawImage(mmStatic(z),0,0);
  var cl=G.save['클리어지역']||[];
  entities.forEach(function(e){
    if(e.dead||e.z!==z) return;
    var x=(e.tx+0.5-base)*MS, y=(e.ty+0.5)*MS, c=null, s=2;
    if(e.type==='hunt'){ c=e.tier===2?'#ffca4b':'#ff4d4d'; s=e.tier===2?3:2; }
    else if(e.type==='boss'){ if(cl.indexOf(e.region)!==-1) return; c='#c05aff'; s=4; }
    else if(e.type==='chest'){ if((G.save['문제상태']||{})['chest_'+e.key]) return; c='#ffe070'; }
    else if(e.type==='fire'){ c='#ff9a3a'; s=3; }
    else if(e.type==='shop'){ c='#37e0cf'; s=3; }
    else if(e.type==='npc'){ c=((G.save['대화기록']||{})[e.npc.id])?'#8a8aa0':'#ffffff'; }
    else if(e.type==='quiz'){ c='rgba(201,174,245,.7)'; s=1.5; }
    if(!c) return;
    g.fillStyle=c; g.fillRect(Math.round(x-s/2),Math.round(y-s/2),Math.ceil(s),Math.ceil(s));
  });
  // 현재 화면 영역
  g.strokeStyle='rgba(255,255,255,.45)'; g.lineWidth=1;
  g.strokeRect(Math.round(cam.x/TILE-base)*MS+0.5, Math.round(cam.y/TILE)*MS+0.5, Math.round(W/TILE)*MS, Math.round(H/TILE)*MS);
  // 나
  var blink=Math.floor(now_()/300)%2;
  g.fillStyle=blink?'#ffffff':'#37e0cf';
  g.fillRect(Math.round((player.x-base)*MS)-2,Math.round(player.y*MS)-2,4,4);
}
setInterval(function(){ try{ if(!document.hidden) drawMinimap(); }catch(err){} },150);

/* ═══════════════ ④ 장비: 도트 아이콘 · 등급 · 비교 ═══════════════ */
var RARITY=['일반','고급','희귀','영웅','전설'];
function rarityOf(it){
  if(!it) return {n:'',c:'#8a8a9a'};
  if(it.id==='w_rain') return {n:'신화',c:'#ff5adf'};
  if(Number(it.price)<=0&&it.kind!=='소비') return {n:'유물',c:'#37e0cf'};
  var t=Math.min(5,Math.max(1,Number(it.tier)||1));
  return {n:RARITY[t-1],c:tierColor(it)};
}
window.rarityOf=rarityOf;
function drawItemIcon(g,it,S){
  var u=S/16, rc=rarityOf(it).c;
  function B(x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x*u),Math.round(y*u),Math.max(1,Math.round(w*u)),Math.max(1,Math.round(h*u))); }
  function line(x0,y0,n,w,c){ for(var i=0;i<n;i++) B(x0+i,y0-i,w,w,c); }
  // 배경: 등급색 은은한 빛 + 테두리
  g.fillStyle='#140e22'; g.fillRect(0,0,S,S);
  var gr=g.createRadialGradient(S/2,S/2,1,S/2,S/2,S*0.72);
  gr.addColorStop(0,rc); gr.addColorStop(1,'rgba(20,14,34,0)');
  g.globalAlpha=0.38; g.fillStyle=gr; g.fillRect(0,0,S,S); g.globalAlpha=1;
  g.strokeStyle=rc; g.lineWidth=Math.max(2,u); g.strokeRect(u*0.5,u*0.5,S-u,S-u);
  var k=it.kind;
  if(k==='무기'){
    var wa=WART[it.id]||['#6a4a26','#c9ccd8',1,'s'];
    var bl=(wa[1]==='RAINBOW')?'#ff9ae8':wa[1], hd=wa[0], hi=(wa[1]==='RAINBOW')?'#fff':shade(bl,1.35);
    if(wa[3]==='p'){ line(2,13,10,1.3,hd); B(11,2,3,3,bl); B(12,1,2,2,hi); B(10,4,2,1.2,'#ffe070'); }
    else if(wa[3]==='o'){ line(3,13,7,1.3,hd); B(8,3,5,5,bl); B(9,4,1.6,1.6,'#fff'); B(7,6,1,1,shade(bl.charAt(0)==='#'?bl:'#c9aef5',0.7)); }
    else if(wa[3]==='g'){ line(5,11,8,3,bl); line(6,10,7,1,hi); line(2,14,3,1.6,hd); B(3,10,5,1.6,'#ffe070'); }
    else if(wa[3]==='d'){ line(6,10,5,2,bl); line(7,9,4,0.9,hi); line(3,13,3,1.5,hd); B(4,10,4,1.2,'#c9a25a'); }
    else { line(5,11,8,2,bl); line(6,10,7,0.9,hi); line(2,14,3,1.5,hd); B(3,10,4,1.4,'#ffe070'); B(5,11,1.4,3,'#ffe070'); }
  } else if(k==='방어구'){
    var aa=AART[it.id]||['#7a828e','#aab2c0',0];
    B(4,3,8,aa[2]?11:9,aa[0]); B(2,3,3,3,aa[1]); B(11,3,3,3,aa[1]);
    B(6,3,4,2,'#140e22'); B(4,9,8,1.2,aa[1]); B(5,4,1,5,'rgba(255,255,255,.35)');
    if(aa[2]){ B(3,12,10,2,shade(aa[0],0.8)); }
    B(7.4,6,1.2,1.2,rc);
  } else if(k==='장신구'){
    var id=it.id;
    if(id==='ac_crown'){ B(3,7,10,4,'#ffd040'); B(3,4,2,3,'#ffd040'); B(7,3,2,4,'#ffd040'); B(11,4,2,3,'#ffd040'); B(7.2,8,1.6,1.6,'#ff5a8a'); }
    else if(id==='ac_halo'){ g.strokeStyle='#e8d0ff'; g.lineWidth=u*1.4; g.beginPath(); g.ellipse(S/2,S/2,S*0.3,S*0.14,0,0,6.29); g.stroke(); B(7,3,2,2,'#fff'); }
    else if(id==='ac_glass'){ B(2,6,5,4,'#cfe8ff'); B(9,6,5,4,'#cfe8ff'); B(7,7,2,1,'#8a8a9a'); B(3,7,1,1,'#fff'); B(10,7,1,1,'#fff'); }
    else { g.strokeStyle='#d8c070'; g.lineWidth=u; g.beginPath(); g.arc(S/2,S*0.34,S*0.26,0.2,Math.PI-0.2); g.stroke();
      B(6.5,9,3,4,rc); B(7,10,1.2,1.2,'#fff'); }
  } else if(k==='코스튬'){
    if(it.slot==='hat'){ B(2,11,12,2,'#4a6ad0'); B(5,5,6,6,'#4a6ad0'); B(7,2,3,3,'#4a6ad0'); B(6,9,5,1.2,'#ffe070'); }
    else if(it.slot==='cape'){ B(5,3,6,2,'#8a2a2a'); B(4,5,8,9,'#c03a3a'); B(3,11,10,3,'#c03a3a'); B(5,5,1,8,'rgba(255,255,255,.2)'); }
    else { g.strokeStyle=rc; g.lineWidth=u*1.2; for(var r=0;r<3;r++){ g.globalAlpha=1-r*0.28; g.beginPath(); g.ellipse(S/2,S*0.62,S*(0.14+r*0.09),S*(0.06+r*0.04),0,0,6.29); g.stroke(); } g.globalAlpha=1; B(7.5,3,1,1,'#fff'); B(5,6,1,1,'#fff'); B(10,5,1,1,'#fff'); }
  } else {                                                 // 소비
    var ec={heal:'#ff5a6a',hint:'#b07ae0',shield:'#5a8ad0',exp2x:'#c98a3a'}[it.effect]||'#66e08a';
    if(it.effect==='exp2x'){ g.fillStyle=ec; g.beginPath(); g.arc(S/2,S/2,S*0.32,0,6.29); g.fill();
      B(5,6,1.6,1.6,'#4a2a10'); B(9,5,1.6,1.6,'#4a2a10'); B(8,9,1.6,1.6,'#4a2a10'); B(5,10,1.4,1.4,'#4a2a10'); }
    else if(it.effect==='shield'){ B(4,3,8,6,ec); B(5,9,6,3,ec); B(7,12,2,2,ec); B(7.3,4,1.4,8,'#dfe9ff'); }
    else { B(6.5,2,3,1.4,'#8a6a3a'); B(7,3.4,2,2,'#dfe4f0'); B(4,5.4,8,8.6,ec); B(4,5.4,8,2,shade(ec,1.3)); B(5,7,1.2,5,'rgba(255,255,255,.45)'); }
  }
}
function iconURL(it,S){
  var key=it.id+'_'+S;
  if(RM.iconCache[key]) return RM.iconCache[key];
  var c=document.createElement('canvas'); c.width=S; c.height=S;
  var g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  try{ drawItemIcon(g,it,S); }catch(err){ g.fillStyle='#444'; g.fillRect(0,0,S,S); }
  return (RM.iconCache[key]=c.toDataURL());
}
function iconImg(it,S){ return it?'<img src="'+iconURL(it,S)+'" width="'+S+'" height="'+S+'" alt="">':''; }
window.iconImg=iconImg;
function statLine(it){
  if(it.effect==='atk') return '⚔ 공격 +'+it.value;
  if(it.effect==='def') return '🛡 방어 +'+it.value;
  return '';
}
function cmpLine(it){
  var eqId=(G.save['장착']||{})[it.slot];
  if(!eqId||eqId===it.id) return '';
  var e=G.itemById[eqId]; if(!e||e.effect!==it.effect) return '';
  var d=Number(it.value)-Number(e.value);
  if(!d) return ' <span style="color:var(--muted)">(착용 장비와 같음)</span>';
  return ' <span style="color:'+(d>0?'var(--good)':'var(--bad)')+'">'+(d>0?'▲':'▼')+Math.abs(d)+'</span>';
}
function glowShadow(c,strong){
  var s='0 4px 0 var(--line), inset 0 0 0 1px '+c;
  if(strong&&/^#[0-9a-f]{6}$/i.test(c)) s+=', 0 0 12px '+c+'66';
  return s;
}

renderShop=function(){
  document.getElementById('shop-tp').textContent='🪙 '+G.save.TP+' TP';
  var list=document.getElementById('shop-list'); list.innerHTML='';
  var inv=G.save['보유아이템']||{}, equipped=G.save['장착']||{};
  G.items.filter(function(it){ return it.kind===curShopTab; }).forEach(function(it){
    var isGear=['무기','방어구','장신구','코스튬'].indexOf(it.kind)>=0;
    if(isGear&&Number(it.price)<=0&&!inv[it.id]) return;
    var owned=isGear&&inv[it.id], isEq=isGear&&equipped[it.slot]===it.id;
    var lvl=(G.save['강화']||{})[it.id]||0;
    var reach=!isGear||regionReachableById(it.region);
    var ra=rarityOf(it), tc=ra.c;
    var row=document.createElement('div'); row.className='shop-item'+(isEq?' equipped':'');
    row.style.borderColor=tc; row.style.boxShadow=glowShadow(tc,isGear&&(Number(it.tier)>=4||Number(it.price)<=0));
    var myMatch=(it.kind==='무기'&&WCLASS[it.id]&&WCLASS[it.id]===G.save.wclass);
    var right='';
    if(isGear){
      if(owned){
        right='<div style="display:flex;flex-direction:column;gap:5px">'+
          (isEq?'<span style="color:var(--good);font-size:12px;text-align:center">장착중</span>'
               :'<button class="btn ghost" style="padding:7px 12px" onclick="doEquip(\''+it.id+'\')">장착</button>')+
          (it.kind==='코스튬'?'':(function(){
            var _t=Number(it.tier)||1, _c=Math.round((Number(G.settings.enhanceCost)||8)*_t*(1+lvl*0.6));
            return '<button class="btn" style="padding:7px 12px" onclick="doEnhance(\''+it.id+'\')">강화 '+(lvl>0?('+'+lvl):'')+' ('+_c+')</button>';
          })())+'</div>';
      } else if(!reach){
        right='<span style="color:var(--muted);font-size:12px">🔒 지역<br>미해금</span>';
      } else {
        right='<button class="btn gold" style="padding:9px 14px" onclick="doBuy(\''+it.id+'\')">'+it.price+' TP</button>';
      }
    } else {
      right='<div style="text-align:right"><div style="font-size:11px;color:var(--muted)">보유 '+(inv[it.id]||0)+'</div>'+
        '<button class="btn gold" style="padding:9px 14px;margin-top:4px" onclick="doBuy(\''+it.id+'\')">'+it.price+' TP</button></div>';
    }
    var sl=isGear?statLine(it):'';
    row.innerHTML='<div class="ic">'+iconImg(it,44)+'</div><div class="info">'+
      '<div class="nm"><span style="color:'+tc+'">'+it.name+'</span>'+(lvl>0?' <small>+'+lvl+'</small>':'')+
      (isGear?'<span class="rz" style="color:'+tc+';border-color:'+tc+'">'+ra.n+'</span>':'')+
      (myMatch?' <b style="color:var(--energy);font-size:10px">★내 계열 +20%</b>':'')+'</div>'+
      (sl?'<div class="st">'+sl+(owned?'':cmpLine(it))+'</div>':'')+
      '<div class="ds">'+it.desc+'</div></div>'+right;
    list.appendChild(row);
  });
};

openBag=function(){
  var s=G.save, st=s.stats||s.baseStats||{};
  document.getElementById('bag-stats').innerHTML=
    '레벨 <b style="color:var(--gold)">'+s['레벨']+'</b> · 전투력 <b style="color:var(--gold)">'+s.power+'</b> · 구출한 정령 <b>'+((s['클리어지역']||[]).length)+'</b>/5<br>'+
    '⚔️ 공격 '+s.atk+' · 🛡️ 방어 '+s.def+' · 🪙 '+s.TP+' TP · ✦ '+(s.SP||0)+' SP<br>'+
    '지구력 '+st['지구력']+' · 근력 '+st['근력']+' · 순발력 '+st['순발력']+' · 회복력 '+st['회복력']+' · 정신력 '+st['정신력']+
    '<br><span style="color:var(--gold);font-size:11px">💡 장비를 탭하면 바로 장착돼요! (강화는 🏪상점에서)</span>';
  var grid=document.getElementById('bag-grid'), html='';
  var eq=s.equipped||{};
  ['weapon','armor','acc','hat','cape','aura'].forEach(function(sl){
    if(!eq[sl]) return; var it=G.itemById[eq[sl].id]; if(!it) return; var ra=rarityOf(it);
    html+='<div class="slot" style="border-color:var(--good);box-shadow:'+glowShadow(ra.c,true)+'"><div class="se">'+iconImg(it,40)+'</div>'+
      '<div class="nm"><span style="color:'+ra.c+'">'+it.name+'</span>'+(eq[sl].lvl?(' +'+eq[sl].lvl):'')+'<br><small style="color:var(--good)">장착</small></div></div>';
  });
  var inv=s['보유아이템']||{};
  Object.keys(inv).forEach(function(id){
    if(id.charAt(0)==='_') return; var it=G.itemById[id]; if(!it) return;
    var ra=rarityOf(it);
    if(['무기','방어구','장신구','코스튬'].indexOf(it.kind)>=0){
      if((s['장착']||{})[it.slot]===id) return;
      html+='<div class="slot" style="border-color:'+ra.c+';cursor:pointer" onclick="doEquip(\''+id+'\')">'+
        '<div class="se">'+iconImg(it,40)+'</div><div class="nm"><span style="color:'+ra.c+'">'+it.name+'</span>'+
        '<br><small style="color:var(--gold)">'+ra.n+' · 탭하여 장착</small></div></div>';
    } else if(inv[id]>0){
      html+='<div class="slot"><div class="se">'+iconImg(it,40)+'</div><div class="nm">'+it.name+' ×'+inv[id]+'</div></div>';
    }
  });
  grid.innerHTML=html||'<div style="color:var(--muted);font-size:13px;grid-column:1/-1;text-align:center;padding:20px">가방이 비어 있어요. 상점에서 장비를 사보세요!</div>';
  openOvl('bag');
};

/* 도감(수집) 탭도 도트 아이콘으로 */
var _renderCodex=renderCodex;
renderCodex=function(){
  if(_cxTab!=='c'){ return _renderCodex(); }
  var b=document.getElementById('cx-body'), pc=document.getElementById('cx-pct');
  b.innerHTML='';
  var gears=G.items.filter(function(i){ return ['무기','방어구','장신구','코스튬'].indexOf(i.kind)>=0; });
  var inv=G.save['보유아이템']||{};
  var own=gears.filter(function(i){ return inv[i.id]; }).length;
  pc.textContent='수집률 '+Math.round(own/Math.max(1,gears.length)*100)+'% ('+own+'/'+gears.length+')';
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">';
  gears.forEach(function(it){
    var has=!!inv[it.id], ra=rarityOf(it);
    html+='<div class="slot" style="'+(has?'border-color:'+ra.c:'opacity:.45;filter:grayscale(1)')+'">'+
      '<div class="se">'+(has?iconImg(it,40):'<span style="font-size:30px">❔</span>')+'</div>'+
      '<div class="nm">'+(has?'<span style="color:'+ra.c+'">'+it.name+'</span>':'???')+
      '<br><small style="color:var(--muted)">'+(has?ra.n:(Number(it.price)>0?'상점':'전리품'))+'</small></div></div>';
  });
  b.innerHTML=html+'</div>';
};

/* 획득 카드에 등급 표시 */
var _showGetCard=showGetCard;
showGetCard=function(id,name,kind){
  _showGetCard(id,name,kind);
  var it=G.itemById[id]; if(!it) return;
  var ra=rarityOf(it);
  document.getElementById('gc-kind').innerHTML=kind+' · <span style="color:'+ra.c+'">'+ra.n+' '+(it.kind||'')+'</span>'+
    (statLine(it)?'<br>'+statLine(it):'');
};

/* ═══════════════ 안내 문구 · 튜토리얼 · 버전 ═══════════════ */
try{
  var hp=document.querySelector('#help .panel > div');
  if(hp){
    var p1=document.createElement('p'); p1.innerHTML='🗡️ <b>3연격 콤보</b>: 리듬 있게 A를 누르면 3타째에 <b>피니시</b>가 터져요. 주변 몬스터까지 밀어냅니다.';
    var p2=document.createElement('p'); p2.innerHTML='💨 <b>회피</b>: 회피 버튼 / Shift. 몬스터 머리 위에 <b>!!</b>와 붉은 원이 뜨면 굴러서 피하세요. 제때 피하면 필살기 게이지가 차요.';
    hp.insertBefore(p2,hp.children[2]||null); hp.insertBefore(p1,p2);
  }
  if(Array.isArray(TUT)){
    TUT.splice(5,0,{t:'💨 몬스터 머리 위에 <b>!!</b>와 붉은 원이 뜨면 공격 직전!<br><b>회피</b> 버튼(PC는 Shift)으로 굴러 피하자.',a:null});
    TUT.splice(4,0,{t:'🗡️ A를 <b>리듬 있게 3번</b> 누르면<br>3타째에 강력한 <b>피니시</b>가 나간다!',a:'abtn'});
  }
  var ver=document.getElementById('ver'); if(ver) ver.textContent='빌드 v11 리마스터';
}catch(err){}

})();
