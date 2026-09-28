/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v15 월드 (world.js) — 넓은 섬 + 설계된 지형
   - 섬 크기 38×17 → 56×25 타일 (약 2.2배)
   - 퀴즈 수호병: 한 줄로 늘어서던 배치 → 섬 전체에 흩어 배치, 동시 출현 수 제한
   - 사냥 몹·보물상자: 섬 곳곳(상자는 막다른 구석)에 배치, 모두 길로 연결된 칸에만
   - NPC: 넓어진 섬에 맞춰 위치 재배치
   - 문제 순환: 안 푼 문제 → 틀린 문제 우선, 필드에 같은 문제가 겹치지 않게
   설치: art.js 다음 줄에 <script src="world.js?v=13"></script>
   서버 변경 없음 (사냥 키 r1_h0~h9, 상자 키 c1~c3 그대로 사용)
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof initEntities!=='function'||typeof blockedLocal!=='function'){ console.warn('world.js: 원본 엔진을 찾지 못함'); return; }

/* ── 조정 가능한 값 ── */
var NEW_ZC=56, NEW_ZR=25;      // 섬 가로·세로 타일 수
var QUIZ_PER_REGION=10;        // 한 섬에 동시에 서 있는 퀴즈 수호병 수
var QUIZ_GAP=5;                // 수호병끼리 최소 간격(타일)
var HUNT_GAP=4.5;              // 사냥 몹끼리 최소 간격

var OLD_ZC=ZC, OLD_ZR=ZR, OLD_ROAD=ROAD;
ZC=NEW_ZC; ZR=NEW_ZR; ROAD=Math.floor(NEW_ZR/2); WW=ZC*5; WH=ZR;

/* 미니맵(remaster.js) 크기 갱신 */
try{
  var mm=document.getElementById('minimap');
  if(mm){ mm.width=ZC*3; mm.height=ZR*3; mm.style.width=(ZC*2)+'px'; mm.style.height=(ZR*2)+'px'; }
  if(window.RM) RM.mmCache={};
}catch(e){}

/* ═══════════════ 지형 설계 (v15) ═══════════════
   섬마다 '장소'가 느껴지도록 규칙 기반으로 지형을 짓는다.
   코드: 0 땅 · 1 벽/나무 · 2 물 · 3 오솔길 · 4 광장 · 5 꽃밭 · 6 다리 */
var TM={};
function tcode(z,x,y){ var m=TM[z]; if(!m||x<0||x>=ZC||y<0||y>=ZR) return 0; return m[y*ZC+x]; }
window.WORLD={ code:tcode };
var _isWaterOrig=isWater;
isWater=function(z,tx,ty){ if(_isWaterOrig(z,tx,ty)) return true; return tcode(z,tx,ty)===2; };
var CLEAR={};
function clearArea(z,cx,cy,rx,ry){
  for(var x=cx-rx;x<=cx+rx;x++) for(var y=cy-ry;y<=cy+ry;y++){
    if(y<1||y>ZR-2||x<2||x>ZC-3) continue;
    CLEAR[z+','+x+','+y]=1;
  }
}
var _blocked=blockedLocal;
blockedLocal=function(z,tx,ty){
  if(ty<1||ty>ZR-2) return true;
  if(_isWaterOrig(z,tx,ty)) return true;
  if(tx<2||tx>ZC-3) return false;
  if(CLEAR[z+','+tx+','+ty]) return false;
  var m=TM[z]; if(!m) return _blocked(z,tx,ty);
  var c=m[ty*ZC+tx]; return c===1||c===2;
};

function seeded(s){ return function(){ s|=0; s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function vnoise(x,y,sc,seed){
  var fx=x/sc, fy=y/sc, x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0;
  function h(a,b){ return hash(a*7+seed*131,b*13+seed*17); }
  var sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty);
  var a=h(x0,y0), b=h(x0+1,y0), c=h(x0,y0+1), d=h(x0+1,y0+1);
  return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
}
function genTerrain(z,reg){
  var m=new Uint8Array(ZC*ZR), R=seeded(9001+z*7919), x, y, i;
  function inb(x,y){ return x>=2&&x<=ZC-3&&y>=1&&y<=ZR-2; }
  function S(x,y,v){ x=Math.round(x); y=Math.round(y); if(inb(x,y)) m[y*ZC+x]=v; }
  function Gt(x,y){ return inb(x,y)?m[y*ZC+x]:1; }
  function ellF(cx,cy,rx,ry,v){ for(var yy=Math.floor(cy-ry);yy<=Math.ceil(cy+ry);yy++) for(var xx=Math.floor(cx-rx);xx<=Math.ceil(cx+rx);xx++){
    var d=((xx-cx)*(xx-cx))/(rx*rx)+((yy-cy)*(yy-cy))/(ry*ry); if(d<=1) S(xx,yy,v); } }
  function rectF(x0,y0,w,h,v){ for(var yy=y0;yy<y0+h;yy++) for(var xx=x0;xx<x0+w;xx++) S(xx,yy,v); }
  function pathTo(x0,y0,x1,y1){
    var xx=x0, yy=y0;
    function put(){ if(yy===ROAD||yy===ROAD-1) return; var c=Gt(xx,yy); if(c===2) S(xx,yy,6); else if(c!==4&&c!==6) S(xx,yy,3); }
    put(); while(xx!==x1){ xx+=(x1>xx?1:-1); put(); } while(yy!==y1){ yy+=(y1>yy?1:-1); put(); }
  }
  var near=function(y){ return Math.abs(y-(ROAD-0.5)); };

  if(reg==='r1'){                                   // 숲: 나무 군락 · 꽃밭 · 연못 두 개
    for(y=1;y<=ZR-2;y++) for(x=2;x<=ZC-3;x++){
      var n=vnoise(x,y,5,1)*0.7+vnoise(x,y,2.5,2)*0.3, edge=Math.min(y-1,ZR-2-y);
      var thr=edge<=1?0.34:(near(y)<=3?0.82:0.6);
      S(x,y,n>thr?1:(n<0.3?5:0));
    }
    ellF(40,5,7.5,3.4,0); ellF(40,5,5.2,2.2,2);
    ellF(14,19,6,3,0); ellF(14,19,3.8,1.7,2);
    pathTo(21,ROAD+1,21,16); pathTo(21,16,15,16);
    pathTo(33,ROAD-2,33,8); pathTo(33,8,38,8);
  } else if(reg==='r2'){                            // 동굴: 자연 동굴 벽(셀룰러 오토마타) · 지하 호수
    for(y=1;y<=ZR-2;y++) for(x=2;x<=ZC-3;x++) S(x,y,R()<0.47?1:0);
    for(var it=0;it<4;it++){
      var nm=new Uint8Array(m);
      for(y=1;y<=ZR-2;y++) for(x=2;x<=ZC-3;x++){
        var cnt=0; for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; if(Gt(x+dx,y+dy)===1) cnt++; }
        nm[y*ZC+x]=cnt>=5?1:(cnt<=3?0:m[y*ZC+x]);
      }
      m=nm;
    }
    for(x=2;x<=ZC-3;x++){ if(R()<0.85) S(x,ROAD-2,0); if(R()<0.85) S(x,ROAD+1,0); }
    for(y=1;y<=ZR-2;y++) for(x=2;x<=ZC-3;x++)
      if(Gt(x,y)===0&&near(y)>3.5&&vnoise(x,y,4,5)>0.68) S(x,y,2);
  } else if(reg==='r3'){                            // 협곡: 들쭉날쭉한 절벽 · 바위 기둥 · 오아시스
    for(x=2;x<=ZC-3;x++){
      var top=1+Math.floor(vnoise(x,0,6,7)*6), bot=ZR-2-Math.floor(vnoise(x,40,6,8)*6);
      for(y=1;y<=ZR-2;y++) S(x,y,(y<=top||y>=bot)?1:0);
    }
    for(i=0;i<8;i++){
      var cx=8+R()*40, cy=(i%2)?ROAD-5-R()*2:ROAD+4+R()*2, r=1+R()*1.4;
      if(cx>38&&cx<50&&cy>ROAD) continue;
      ellF(cx,cy,r+0.6,r,1);
    }
    ellF(44,17,6,3,5); ellF(44,17,3.4,1.6,2);
    pathTo(37,ROAD+1,37,16); pathTo(37,16,40,16);
  } else if(reg==='r4'){                            // 아레나 도시: 거리 · 집 · 분수 광장 · 원형 경기장
    for(x=6;x<=ZC-7;x++){ S(x,5,3); if(x<27||x>44) S(x,19,3); }
    [10,26,45].forEach(function(sx){ for(y=2;y<=ZR-3;y++) if(!(sx===45&&y>ROAD+1&&y<22)) S(sx,y,3); });
    var bx=[[3,9],[12,25],[28,44],[47,ZC-4]], by=[[2,4],[7,ROAD-3],[ROAD+2,18],[20,ZR-3]];
    bx.forEach(function(X,bi){ by.forEach(function(Y,bj){
      if(bi===2&&bj>=2) return;                     // 경기장 자리
      if(bi===0&&bj===1) return;                    // 입구 캠프
      if(R()<0.22){ rectF(X[0],Y[0],X[1]-X[0]+1,Y[1]-Y[0]+1,5); return; }   // 공원
      var xx=X[0];
      while(xx<=X[1]-2){ var w=3+Math.floor(R()*2), h=Math.min(3,Y[1]-Y[0]+1);
        if(xx+w-1>X[1]) break; rectF(xx,Y[0],w,h,1); xx+=w+1+Math.floor(R()*2); }
    }); });
    rectF(15,7,7,3,4); S(18,8,2);                   // 분수 광장
    var scx=36, scy=ROAD+6.5;                       // 원형 경기장
    for(y=ROAD+2;y<=ZR-2;y++) for(x=28;x<=44;x++){
      var d=Math.sqrt(((x-scx)*(x-scx))/(7.8*7.8)+((y-scy)*(y-scy))/(4.8*4.8));
      if(d>1) continue;
      var gate=(Math.abs(y-scy)<1.2)||(Math.abs(x-scx)<1.2&&y<scy);
      if(d>0.78) S(x,y,gate?4:1); else if(d>0.5) S(x,y,3); else S(x,y,5);
    }
  } else {                                          // 성채: 방 · 문 · 기둥 대회랑 · 옥좌 광장
    var vx=[10,19,28,37,46], hy=[ROAD-4,ROAD+3];
    vx.forEach(function(wx){
      for(y=1;y<=hy[0];y++) S(wx,y,1);
      for(y=hy[1];y<=ZR-2;y++) S(wx,y,1);
    });
    hy.forEach(function(wy){ for(x=2;x<=ZC-3;x++) S(x,wy,1); });
    var cols=[2].concat(vx).concat([ZC-2]);
    for(i=0;i<cols.length-1;i++){                   // 가로벽마다 방 하나당 문 1개
      var a0=cols[i]+1, a1=cols[i+1]-1;
      hy.forEach(function(wy){ var dx0=a0+1+Math.floor(R()*Math.max(1,a1-a0-2)); S(dx0,wy,0); S(dx0+1,wy,0); });
    }
    vx.forEach(function(wx){                        // 세로벽에도 문
      var d1=2+Math.floor(R()*(hy[0]-3)); S(wx,d1,0);
      var d2=hy[1]+1+Math.floor(R()*(ZR-3-hy[1]-1)); S(wx,d2,0);
    });
    for(x=6;x<=ZC-6;x+=6){ S(x,ROAD-3,1); S(x,ROAD+2,1); }   // 기둥
    for(i=0;i<cols.length-1;i++){
      var rx0=cols[i]+1, rx1=cols[i+1]-1, pick=R();
      if(pick<0.3) rectF(rx0+1,2,rx1-rx0-1,hy[0]-3,4);
      else if(pick<0.45){ S(Math.floor((rx0+rx1)/2),Math.floor((ROAD+3+ZR-2)/2),2); S(Math.floor((rx0+rx1)/2)+1,Math.floor((ROAD+3+ZR-2)/2),2); }
    }
  }
  // 입구 캠프 광장
  rectF(2,ROAD-3,7,6,4);
  // 보스 앞마당 + 길로 이어지는 참배로
  var bp=bossPos(z);
  rectF(bp.c-2,bp.r-1,5,3,4);
  var yy=bp.r+(bp.r<ROAD?2:-2);
  while(yy!==ROAD&&yy!==ROAD-1){ var c0=Gt(bp.c,yy); S(bp.c,yy,c0===2?6:(c0===4?4:3)); yy+=(yy<ROAD?1:-1); }
  // 대로
  for(x=2;x<=ZC-3;x++){ S(x,ROAD-1,0); S(x,ROAD,0); }
  // 모든 빈 땅을 입구와 연결 (고립된 곳은 길을 뚫는다)
  function pass(c){ return c!==1&&c!==2; }
  for(var guard=0;guard<80;guard++){
    var seen=new Uint8Array(ZC*ZR), q=[3+ROAD*ZC], h=0; seen[q[0]]=1;
    while(h<q.length){ var p=q[h++], px0=p%ZC, py0=(p/ZC)|0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dd){ var nx=px0+dd[0], ny=py0+dd[1];
        if(!inb(nx,ny)) return; var k=ny*ZC+nx; if(seen[k]||!pass(m[k])) return; seen[k]=1; q.push(k); }); }
    var lost=-1;
    for(i=0;i<ZC*ZR;i++){ var ix=i%ZC, iy=(i/ZC)|0; if(inb(ix,iy)&&pass(m[i])&&!seen[i]){ lost=i; break; } }
    if(lost<0) break;
    var lx=lost%ZC, ly=(lost/ZC)|0, st=ly<ROAD?1:-1;
    while(!seen[ly*ZC+lx]&&ly!==ROAD){ var cc=m[ly*ZC+lx]; if(cc===1) m[ly*ZC+lx]=3; else if(cc===2) m[ly*ZC+lx]=6; ly+=st; }
  }
  TM[z]=m;
}

/* ── 입구에서 걸어서 갈 수 있는 칸 (BFS) ── */
function walkable(z){
  var seen={}, q=[[3,ROAD]], out=[], head=0;
  seen['3,'+ROAD]=1;
  while(head<q.length){
    var p=q[head++]; out.push(p);
    var nb=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<4;i++){
      var x=p[0]+nb[i][0], y=p[1]+nb[i][1], k=x+','+y;
      if(x<2||x>ZC-3||y<1||y>ZR-2||seen[k]) continue;
      if(blockedLocal(z,x,y)) continue;
      seen[k]=1; q.push([x,y]);
    }
  }
  return {list:out,set:seen};
}
function openNeighbors(z,x,y){
  var n=0; [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){ if(!blockedLocal(z,x+d[0],y+d[1])) n++; });
  return n;
}
/* 결정론적 흩뿌리기: 해시 순으로 훑으며 간격 조건을 만족하는 칸만 채택 */
function scatter(z,cands,count,gap,avoid,avoidGap,salt){
  var sorted=cands.slice().sort(function(a,b){ return hash(z*977+a[0]*3+salt,a[1]*7)-hash(z*977+b[0]*3+salt,b[1]*7); });
  var picked=[];
  for(var i=0;i<sorted.length&&picked.length<count;i++){
    var c=sorted[i], ok=true, j;
    for(j=0;j<picked.length;j++){ if(Math.hypot(picked[j][0]-c[0],picked[j][1]-c[1])<gap){ ok=false; break; } }
    if(ok) for(j=0;j<avoid.length;j++){ if(Math.hypot(avoid[j][0]-c[0],avoid[j][1]-c[1])<avoidGap){ ok=false; break; } }
    if(ok) picked.push(c);
  }
  if(picked.length<count&&gap>2) return scatter(z,cands,count,gap-1,avoid,Math.max(1.5,avoidGap-0.5),salt);
  return picked;
}
function nearest(list,x,y){
  var best=list[0], bd=1e9;
  list.forEach(function(p){ var d=Math.hypot(p[0]-x,p[1]-y); if(d<bd){ bd=d; best=p; } });
  return best;
}
function qState(id){ return ((G.save&&G.save['문제상태'])||{})[id]; }

/* ── 엔티티 배치 (원본 initEntities 대체) ── */
initEntities=function(){
  entities=[];
  G.regions.forEach(function(reg,z){ genTerrain(z,reg.id); });
  G.regions.forEach(function(reg,z){
    var base=z*ZC, th=THEME[reg.id]||THEME.r1;
    var bp=bossPos(z);
    clearArea(z,bp.c,bp.r,2,1);
    clearArea(z,3,ROAD+2,1,1);
    clearArea(z,5,ROAD-2,1,1);
    var W_=walkable(z), all=W_.list;
    var fixed=[[3,ROAD+2],[5,ROAD-2],[bp.c,bp.r]];

    // 모닥불 · 상점
    entities.push({type:'fire',z:z,tx:base+3,ty:ROAD+2,emoji:'🔥'});
    entities.push({type:'shop',z:z,tx:base+5,ty:ROAD-2,emoji:'🛒'});

    // NPC: 넓어진 섬 비율로 옮기고, 길에서 너무 멀지 않게
    var npcSpots=[];
    G.npcs.filter(function(n){ return n.region===reg.id; }).forEach(function(n){
      var nx=Math.round(Number(n.tx)*(ZC/OLD_ZC));
      var ny=ROAD+Math.round((Number(n.ty)-OLD_ROAD)*1.3);
      ny=Math.max(ROAD-5,Math.min(ROAD+4,ny));
      var near=all.filter(function(p){ return Math.abs(p[1]-ROAD)>=1&&Math.abs(p[1]-ROAD+0.5)>0.6; });
      var s=nearest(near.length?near:all,nx,ny);
      npcSpots.push(s);
      entities.push({type:'npc',z:z,tx:base+s[0],ty:s[1],emoji:n.emoji,npc:n});
    });

    // 길(가운데 2줄)과 입구·보스 주변은 몹 배치 금지
    var field=all.filter(function(p){
      return p[0]>=8 && p[0]<=ZC-7 && (p[1]<ROAD-2||p[1]>ROAD+1);
    });
    var avoidBase=fixed.concat(npcSpots);

    // 사냥 몹 10마리 (서버 키 h0~h9 유지). 안쪽일수록 강한 등급
    var hs=scatter(z,field,10,HUNT_GAP,avoidBase,3,11).sort(function(a,b){ return a[0]-b[0]; });
    hs.forEach(function(sp,i){
      var tier=(i>=9?2:(i>=6?1:0));
      entities.push({type:'hunt',z:z,tx:base+sp[0],ty:sp[1],emoji:th.hunt,key:reg.id+'_h'+i,tier:tier,sp:i%3});
    });

    // 퀴즈 수호병: 안 푼 문제 → 틀린 문제 → 이미 푼 문제 순으로 골라 흩어 세움
    var normals=G.questions.filter(function(q){ return q.region===reg.id&&q.type==='normal'; });
    var order=normals.slice().sort(function(a,b){
      function rank(q){ var s=qState(q.id); if(!s) return 1; if(s.solved) return 2; return 0; }
      return rank(a)-rank(b);
    });
    var qn=Math.min(QUIZ_PER_REGION,order.length);
    var qs=scatter(z,field,qn,QUIZ_GAP,avoidBase.concat(hs),2.5,29);
    qs.forEach(function(sp,i){
      entities.push({type:'quiz',z:z,tx:base+sp[0],ty:sp[1],emoji:th.mob,qid:order[i].id,dead:false});
    });

    // 보물상자 3개: 길에서 먼 막다른 구석 우선
    var nooks=field.filter(function(p){ return Math.abs(p[1]-ROAD)>=5 && openNeighbors(z,p[0],p[1])<=2; });
    var cs=scatter(z,nooks.length>=3?nooks:field,3,12,avoidBase.concat(hs,qs),2,47);
    ['c1','c2','c3'].forEach(function(key,i){
      var sp=cs[i]||field[(i*37)%Math.max(1,field.length)]||[10+i*10,ROAD+4];
      entities.push({type:'chest',z:z,tx:base+sp[0],ty:sp[1],emoji:'📦',key:reg.id+'_'+key});
    });

    // 보스 봉인석 · 관문
    entities.push({type:'boss',z:z,tx:base+bp.c,ty:bp.r,emoji:th.boss,region:reg.id});
    if(z<G.regions.length-1) entities.push({type:'gate',z:z,tx:base+ZC-1,ty:ROAD,emoji:'🌀',nextZ:z+1});
  });
  if(window.RM) RM.mmCache={};
};

/* ── 문제 순환: 필드에 없는 문제 중에서, 틀린 문제·안 푼 문제 우선 ── */
nextRegionQuestion=function(regionId,cur){
  var pool=G.questions.filter(function(q){ return q.region===regionId&&q.type==='normal'; });
  if(!pool.length) return cur;
  var onField={};
  entities.forEach(function(e){ if(e.type==='quiz'&&!e.dead&&e.qid) onField[e.qid]=1; });
  function pick(a){ return a[Math.floor(Math.random()*a.length)].id; }
  var free=pool.filter(function(q){ return !onField[q.id]&&q.id!==cur; });
  if(!free.length) free=pool;
  var weak=free.filter(function(q){ var s=qState(q.id); return s&&s.attempts>0&&!s.solved; });
  if(weak.length&&Math.random()<0.6) return pick(weak);
  var fresh=free.filter(function(q){ var s=qState(q.id); return !(s&&s.solved); });
  if(fresh.length) return pick(fresh);
  return pick(free);
};


/* ═══════════════ 군도 지도 리뉴얼 (v16) ═══════════════
   - 게임과 같은 도트 스타일의 섬 5개 (숲·동굴·협곡·아레나·성채)
   - 잠긴 섬은 '엔트로피의 안개'가 덮고 있다가, 앞 섬을 클리어하면 걷힘
   - 뱃길 점선, 현재 위치 화살표, 구출한 섬의 코어 빛과 깃발
   - 라벨이 섬을 가리지 않게 재배치 + 진행 막대 */
var MW=202, MH=150;
var ISL=[[34,60],[76,104],[108,46],[144,98],[178,42]];
ISLE=ISL.map(function(p){ return {x:p[0]*4,y:p[1]*4}; });
var mapLo=document.createElement('canvas'); mapLo.width=MW; mapLo.height=MH;
var ml=mapLo.getContext('2d');
var ISC={};
function mpx(g,x,y,c,w,h){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),w||1,h||1); }
var ISL_PAL={
  r1:{top:'#5aa84a',hi:'#7cc85a',rim:'#e0cc8a',cliff:'#6a4a2e',cd:'#4a321e'},
  r2:{top:'#5a5070',hi:'#7a70a0',rim:'#8a8098',cliff:'#3a3050',cd:'#241e34'},
  r3:{top:'#d09a58',hi:'#e8b878',rim:'#f0d8a0',cliff:'#9a6232',cd:'#6a3e1c'},
  r4:{top:'#4f9a58',hi:'#6fbc70',rim:'#e0cc8a',cliff:'#6a5a4a',cd:'#4a3e32'},
  r5:{top:'#4a4058',hi:'#6a5f7e',rim:'#7a6e8e',cliff:'#2e2640',cd:'#1c1628'}
};
function buildIsland(reg,z){
  var key=reg+z; if(ISC[key]) return ISC[key];
  var W=52, H=42, c=document.createElement('canvas'); c.width=W; c.height=H;
  var g=c.getContext('2d'), p=ISL_PAL[reg]||ISL_PAL.r1, cx=26, cy=17;
  function inside(x,y){ var dx=(x-cx)/19, dy=(y-cy)/11, a=Math.atan2(dy,dx);
    var rr=1+0.11*Math.sin(3*a+z*1.7)+0.07*Math.sin(5*a+z); return Math.sqrt(dx*dx+dy*dy)/rr; }
  var x, y;
  for(y=0;y<H;y++) for(x=0;x<W;x++){                    // 절벽(두께)
    var up=false; for(var k=1;k<=6;k++) if(inside(x,y-k)<=1){ up=true; break; }
    if(up&&inside(x,y)>1) mpx(g,x,y,(y%3===0)?p.cd:p.cliff);
  }
  for(y=0;y<H;y++) for(x=0;x<W;x++){                    // 윗면
    var d=inside(x,y); if(d>1) continue;
    var col=d>0.86?p.rim:p.top;
    if(inside(x,y-1)>1) col=p.hi;
    if(d<=0.86&&hash(x*7+z,y*3)<0.12) col=p.hi;
    mpx(g,x,y,col);
  }
  function tree(tx,ty){ mpx(g,tx,ty-3,'#2f7a34'); mpx(g,tx-1,ty-2,'#2f7a34',3,1); mpx(g,tx-1,ty-1,'#245e28',3,1); mpx(g,tx,ty-3,'#7cc85a'); mpx(g,tx,ty,'#5a3a1e'); }
  if(reg==='r1'){
    [[14,14],[18,11],[22,15],[30,10],[35,13],[39,16],[17,19],[33,20],[26,9]].forEach(function(t){ tree(t[0],t[1]); });
    mpx(g,24,18,'#3a78c0',5,2); mpx(g,25,18,'#8fc8f0',2,1);
  } else if(reg==='r2'){
    for(var i=0;i<9;i++){ mpx(g,20-i+9,6+i,'#6a6088',1+i*2,1); }                 // 바위산
    mpx(g,26,6,'#b8b0d0'); mpx(g,25,7,'#b8b0d0',2,1);
    mpx(g,24,12,'#120c1c',5,3); mpx(g,25,11,'#120c1c',3,1);                     // 동굴 입구
    [[14,16,'#8fe8ff'],[36,15,'#c98cff'],[33,19,'#8fe8ff'],[17,20,'#c98cff']].forEach(function(q){ mpx(g,q[0],q[1]-1,q[2]); mpx(g,q[0]-1,q[1],q[2],3,1); });
  } else if(reg==='r3'){
    for(y=0;y<H;y++) for(x=0;x<W;x++){ var dd=inside(x,y); if(dd<0.62&&dd>0.5) mpx(g,x,y,'#b8844a'); if(dd<0.35&&dd>0.26) mpx(g,x,y,'#b8844a'); }
    [[13,15],[38,17],[30,21]].forEach(function(q){ mpx(g,q[0],q[1]-2,'#4f8a3a',1,3); mpx(g,q[0]-1,q[1]-1,'#4f8a3a'); mpx(g,q[0]+1,q[1]-2,'#4f8a3a'); });
  } else if(reg==='r4'){
    g.fillStyle='#d8cfa8'; g.beginPath(); g.ellipse(26,15,9,5,0,0,6.3); g.fill();
    g.fillStyle='#b0a578'; g.beginPath(); g.ellipse(26,15,9,5,0,0,6.3); g.fill();
    g.fillStyle='#c9a060'; g.beginPath(); g.ellipse(26,15,6.5,3.2,0,0,6.3); g.fill();
    g.fillStyle='#5a9a4a'; g.beginPath(); g.ellipse(26,15,4.5,2,0,0,6.3); g.fill();
    for(var a2=0;a2<10;a2++){ var an=a2/10*6.28; mpx(g,26+Math.cos(an)*9,15+Math.sin(an)*5-1,'#8a7a4a',1,2); }
    [[12,18],[40,18],[15,11]].forEach(function(q){ mpx(g,q[0],q[1],'#4a5a7a',3,2); mpx(g,q[0],q[1]+2,'#e0d8c8',3,1); });
  } else {
    mpx(g,19,8,'#6a5f7e',14,9); mpx(g,19,8,'#8a7e9e',14,1);                     // 성벽
    mpx(g,16,4,'#6a5f7e',4,13); mpx(g,32,4,'#6a5f7e',4,13); mpx(g,24,2,'#6a5f7e',4,6);
    mpx(g,16,3,'#c03a3a',4,1); mpx(g,32,3,'#c03a3a',4,1); mpx(g,24,1,'#c03a3a',4,1);
    mpx(g,17,2,'#c03a3a',2,1); mpx(g,33,2,'#c03a3a',2,1); mpx(g,25,0,'#c03a3a',2,1);
    [[18,7],[34,7],[25,5],[22,11],[29,11]].forEach(function(q){ mpx(g,q[0],q[1],'#ffca4b'); });
    mpx(g,25,13,'#2a2036',2,4);
  }
  return (ISC[key]=c);
}
var FOG=[]; for(var fi=0;fi<12;fi++) FOG.push({ox:(hash(fi,21)-0.5)*30,oy:(hash(fi,22)-0.5)*14-2,r:5+hash(fi,23)*4,ph:fi*1.3});
function drawLock(g,x,y){
  mpx(g,x-2,y-4,'#d8c070',1,3); mpx(g,x+2,y-4,'#d8c070',1,3); mpx(g,x-1,y-5,'#d8c070',3,1);
  mpx(g,x-3,y-1,'#e8c860',7,5); mpx(g,x-3,y-1,'#fff0a0',7,1); mpx(g,x,y+1,'#6a4a10',1,2);
}
drawWorldMap=function(){
  var cv=document.getElementById('wmap-canvas'); if(!cv) return;
  cv.style.imageRendering='pixelated';
  var g=ml, t=performance.now(), cl=G.save['클리어지역']||[];
  for(var y=0;y<MH;y++){ var f=y/MH; g.fillStyle='rgb('+Math.round(30+10*(1-f))+','+Math.round(78+30*(1-f))+','+Math.round(130+36*(1-f))+')'; g.fillRect(0,y,MW,1); }
  for(var i=0;i<70;i++){ var wx=((hash(i,11)*MW+t/90*(0.5+hash(i,12)))%(MW+10))-5, wy=hash(i,13)*MH, on=((t/600+i*0.7)%3)<2;
    if(on) mpx(g,wx,wy,'rgba(160,210,255,.35)',3,1); }
  // 뱃길
  for(var z=1;z<ISL.length;z++){
    var A=ISL[z-1], B=ISL[z], open=cl.indexOf(G.regions[z-1].id)!==-1;
    var mx=(A[0]+B[0])/2, my=(A[1]+B[1])/2+(z%2?-18:18);
    for(var s=0;s<=1;s+=0.02){
      var bx=(1-s)*(1-s)*A[0]+2*(1-s)*s*mx+s*s*B[0], by=(1-s)*(1-s)*A[1]+2*(1-s)*s*my+s*s*B[1];
      var ph=Math.floor(s*50+(open?t/150:0))%3;
      if(ph===0) mpx(g,bx,by,open?'#ffd86a':'rgba(255,255,255,.35)',2,1);
    }
  }
  // 섬
  G.regions.forEach(function(reg,z){
    var P=ISL[z], cleared=cl.indexOf(reg.id)!==-1, reach=(z===0)||(cl.indexOf(G.regions[z-1].id)!==-1);
    g.fillStyle='rgba(120,200,240,.35)'; g.beginPath(); g.ellipse(P[0],P[1]+3,24,14,0,0,6.3); g.fill();
    var fr=Math.floor(t/400)%2;
    g.fillStyle='rgba(230,248,255,.55)';
    for(var a=0;a<40;a++){ if((a+fr)%3) continue; var an=a/40*6.283; mpx(g,P[0]+Math.cos(an)*21,P[1]+3+Math.sin(an)*12,'rgba(230,248,255,.6)'); }
    var isl=buildIsland(reg.id,z);
    g.drawImage(isl,Math.round(P[0]-26),Math.round(P[1]-17));
    if(!reach){
      for(var q=0;q<FOG.length;q++){ var fo=FOG[q], dx=Math.sin(t/2200+fo.ph)*3;
        g.fillStyle=q%2?'rgba(170,165,195,.9)':'rgba(140,135,170,.9)';
        g.beginPath(); g.arc(Math.round(P[0]+fo.ox+dx),Math.round(P[1]+fo.oy),fo.r,0,6.3); g.fill(); }
      drawLock(g,P[0],P[1]);
    }
    if(cleared){
      var th=THEME[reg.id]||{}, gl=0.5+0.5*Math.sin(t/300);
      g.globalAlpha=0.35+gl*0.3; g.fillStyle='#ffe98a'; g.beginPath(); g.arc(P[0],P[1]-16,5+gl,0,6.3); g.fill(); g.globalAlpha=1;
      mpx(g,P[0]-1,P[1]-17,'#ffffff',3,3);
      mpx(g,P[0]+14,P[1]-16,'#e8e0d0',1,9); mpx(g,P[0]+15,P[1]-16+(Math.floor(t/250)%2),'#66e08a',4,3);
    }
    if(z===curZone){
      var bob=Math.floor(t/220)%2;
      var ax=P[0], ay=P[1]-(cleared?26:22)-bob;
      mpx(g,ax-3,ay,'#ffca4b',7,1); mpx(g,ax-2,ay+1,'#ffca4b',5,1); mpx(g,ax-1,ay+2,'#ffca4b',3,1); mpx(g,ax,ay+3,'#ffca4b',1,1);
      mpx(g,ax-3,ay-1,'#7a4a00',7,1);
    }
  });
  // 나침반
  var cx0=12, cy0=MH-14;
  mpx(g,cx0,cy0-7,'#ffe070',1,6); mpx(g,cx0,cy0+2,'#e8e0d0',1,5); mpx(g,cx0-6,cy0,'#e8e0d0',5,1); mpx(g,cx0+2,cy0,'#e8e0d0',5,1);
  mpx(g,cx0-1,cy0-1,'#ffffff',3,3); mpx(g,cx0-1,cy0-11,'#ffe070',3,1); mpx(g,cx0,cy0-10,'#ffe070');
  var c2=cv.getContext('2d'); c2.imageSmoothingEnabled=false;
  c2.drawImage(mapLo,0,0,cv.width,cv.height);
};
renderMapNodes=function(){
  var cl=G.save['클리어지역']||[];
  document.getElementById('wmap-prog').textContent='코어 '+cl.length+'/5 구출';
  var nb=document.getElementById('wmap-nodes'); nb.innerHTML='';
  G.regions.forEach(function(reg,z){
    var P=ISL[z], cleared=cl.indexOf(reg.id)!==-1, reach=(z===0)||(cl.indexOf(G.regions[z-1].id)!==-1), here=(z===curZone);
    var normals=G.questions.filter(function(q){ return q.region===reg.id&&q.type==='normal'; });
    var solved=normals.filter(function(q){ var st=(G.save['문제상태']||{})[q.id]; return st&&st.solved; }).length;
    var pct=normals.length?Math.round(solved/normals.length*100):0;
    var bc=here?'#ffca4b':(cleared?'#66e08a':(reach?'#8a7ab8':'#3a3448'));
    var status=cleared?'<span style="color:#66e08a">✔ 코어 구출</span>'
      :(reach?('<div style="display:flex;align-items:center;gap:4px"><div style="flex:1;height:4px;background:#241c3c;border-radius:2px;overflow:hidden"><i style="display:block;height:100%;width:'+pct+'%;background:#37e0cf"></i></div><span style="color:#37e0cf">'+pct+'%</span></div>')
      :'<span style="color:#8a84a0">안개에 잠김</span>');
    var hit=document.createElement('div');
    hit.style.cssText='position:absolute;left:'+((P[0]-22)/MW*100)+'%;top:'+((P[1]-18)/MH*100)+'%;width:'+(44/MW*100)+'%;height:'+(34/MH*100)+'%;cursor:'+(reach?'pointer':'default');
    var d=document.createElement('div');
    d.style.cssText='position:absolute;transform:translate(-50%,0);left:'+(P[0]/MW*100)+'%;top:'+((P[1]+16)/MH*100)+'%;cursor:'+(reach?'pointer':'default');
    d.innerHTML='<div style="background:rgba(16,11,26,.92);border:2px solid '+bc+';border-radius:8px;padding:3px 8px;min-width:84px;'+
      'box-shadow:0 3px 0 rgba(0,0,0,.45)'+(here?',0 0 10px rgba(255,202,75,.45)':'')+';font-size:10.5px;color:'+(reach?'#efeaf7':'#8a84a0')+'">'+
      '<div style="white-space:nowrap"><b style="display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;border-radius:50%;background:'+bc+';color:#140c1e;font-size:9px;margin-right:4px">'+(z+1)+'</b>'+reg.name+(here?' <span style="color:#ffca4b">◀</span>':'')+'</div>'+
      '<div style="margin-top:2px;font-size:9.5px">'+status+'</div></div>';
    if(reach){ d.onclick=function(){ warpToIsland(z); }; hit.onclick=function(){ warpToIsland(z); }; }
    nb.appendChild(hit); nb.appendChild(d);
  });
};


/* ═══════════════ HUD 겹침 수정 (v18) ═══════════════
   1) 지역 이름·해방 진행 칩을 화면 가운데 → 오른쪽 미니맵 아래로 옮겨 왼쪽 HUD와 겹치지 않게
   2) 카메라: 플레이어가 맵 위/아래 끝에 가도 HUD·조작 버튼 밑에 숨지 않도록 안전 구역 유지 */
(function(){
  var css=document.createElement('style');
  css.textContent=[
    '#zone-chip{top:120px!important;left:auto!important;right:8px!important;transform:none!important;width:118px;',
    ' text-align:center;font-size:10px!important;padding:3px 4px!important;overflow:hidden;text-overflow:ellipsis}',
    '#prog-chip{top:146px!important;left:auto!important;right:8px!important;transform:none!important;width:118px!important}',
    '#event-badge{top:176px!important;left:auto!important;right:8px!important;transform:none!important;font-size:10px!important}'
  ].join('\n');
  document.head.appendChild(css);
  var SAFE_TOP=200, SAFE_BOT=220;
  var _updCam=update;
  update=function(dt){
    _updCam(dt);
    if(!G.save||!running) return;
    var psy=player.y*TILE-cam.y;
    if(psy<SAFE_TOP) cam.y=player.y*TILE-SAFE_TOP;
    else if(psy>H-SAFE_BOT) cam.y=player.y*TILE-(H-SAFE_BOT);
  };
})();


/* ═══════════════ v19 회원가입 개방 · 상자 쿨타임 ═══════════════ */
(function(){
  /* 가입 화면: 이름 안내 문구 변경 + 반 선택 추가 */
  var _ri=renderIntro;
  renderIntro=function(tab){
    _ri(tab);
    if((tab||'login')!=='signup') return;
    document.querySelectorAll('#intro-body .inlab').forEach(function(l){ if(l.textContent.indexOf('이름')>=0) l.textContent='🧑 이름'; });
    var pw=document.getElementById('su-pw'); if(!pw) return;
    var pwLab=pw.previousElementSibling;
    var lab=document.createElement('div'); lab.className='inlab'; lab.textContent='🏫 반 (명단에 있는 학생은 자동으로 정해져요)';
    var sel=document.createElement('select'); sel.id='su-cls';
    sel.style.cssText='width:100%;padding:12px;font-size:15px;border-radius:6px;border:3px solid var(--line);background:var(--bg2);color:var(--text);margin:5px 0 12px;font-family:var(--font-body)';
    sel.innerHTML='<option value="">선택 안 함 (기타)</option>';
    pw.parentNode.insertBefore(lab,pwLab); pw.parentNode.insertBefore(sel,pwLab);
    try{ srv('signupInfo').then(function(r){
      if(r&&r.ok&&r.classes) r.classes.forEach(function(c){ var o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
    }).catch(function(){}); }catch(err){}
  };
  doSignup=function(){
    var id=(document.getElementById('su-id').value||'').trim();
    var name=(document.getElementById('su-name').value||'').trim();
    var pw=document.getElementById('su-pw').value||'';
    var pw2=document.getElementById('su-pw2').value||'';
    var cs=document.getElementById('su-cls'), cls=cs?cs.value:'';
    if(!id||!name){ inMsg('학번과 이름을 입력하세요.'); return; }
    if(pw.length<4){ inMsg('비밀번호는 4자 이상!'); return; }
    if(pw!==pw2){ inMsg('비밀번호 확인이 달라요.'); return; }
    inMsg('가입 중...');
    srv('signup',id,name,pw,cls).then(function(r){
      if(!r.ok){ inMsg(r.msg||'가입 실패'); return; }
      inMsg(''); toast('✍ <b>가입 완료!</b> 모험을 시작합니다');
      G._pw=pw; loginWith(id,pw);
    }).catch(function(e){ inMsg('서버 오류: '+((e&&e.message)||e)); });
  };

  /* 상자: 1시간(서버 설정값)마다 다시 열림 */
  function chestCdMs(){ var v=G.settings&&G.settings.chestCooldownMin; v=(v===''||v==null||isNaN(Number(v)))?60:Number(v); return v*60000; }
  function chestRemain(e){
    var st=((G.save&&G.save['문제상태'])||{})['chest_'+e.key];
    if(!st||!st.at) return 0;
    var r=chestCdMs()-(Date.now()-st.at); return r>0?r:0;
  }
  var _inter=interactable;
  interactable=function(e){ if(e.type==='chest') return true; return _inter(e); };
  var _doChest=doChest;
  doChest=function(e){
    var rem=chestRemain(e);
    if(rem>0){ toast('📦 빈 상자예요. 다시 채워지기까지 <b>'+Math.ceil(rem/60000)+'분</b>'); return; }
    if(G.guest&&G._gst){ G._gst['문제상태']['chest_'+e.key]={solved:true,at:Date.now()}; }
    _doChest(e);
  };
  var _dc=drawChest;
  drawChest=function(g,cx,cy){
    var e=window.ART&&ART.curE, rem=e?chestRemain(e):0;
    if(rem<=0){ _dc(g,cx,cy); return; }
    g.save(); g.globalAlpha=(g.globalAlpha||1)*0.4; _dc(g,cx,cy); g.restore();
    if(Math.hypot(e.tx-player.x,e.ty-player.y)<2.6){
      var t='⏳ '+Math.ceil(rem/60000)+'분';
      g.save(); g.font='13px DungGeunMo,sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      g.lineWidth=3; g.strokeStyle='#000'; g.fillStyle='#ffe070';
      g.strokeText(t,cx,cy-TILE*0.55); g.fillText(t,cx,cy-TILE*0.55); g.restore();
    }
  };
})();

function setVer(){ try{ var ver=document.getElementById('ver'); if(ver) ver.textContent='빌드 v19 가입개방·상자'; }catch(e){} }
window.addEventListener('DOMContentLoaded',setVer); window.addEventListener('load',setVer);
})();
