/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v26 조립식 캐릭터 일러스트 (hero.js)
   - 캐릭터 선택 · 캐릭터 상세 · 랭킹 구경: 부위별 그림(parts.png)을 조립한 일러스트 하나로 통일
   - 장착한 무기(손에 쥠) · 모자 · 망토/날개 · 장신구가 그림 자체로 바뀜
   - 방어구: 옷 색이 방어구 색으로 · 오라: 빛 효과
   - 꾸미기: 머리색 · 옷 색 · 망토 색 · 코디 3칸 (서버 저장)
   - 필드의 작은 캐릭터는 그대로
   필요 파일: parts.png (저장소 최상위 또는 chars 폴더)
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof drawHero!=='function'||typeof renderCharDetail!=='function'){ console.warn('hero.js: 원본 엔진을 찾지 못함'); return; }

function mk(w,h){ var c=document.createElement('canvas'); c.width=Math.max(1,w); c.height=Math.max(1,h); return c; }
function now(){ return performance.now(); }
var normC=mk(1,1).getContext('2d');
function hexOf(col){
  if(/^#[0-9a-f]{6}$/i.test(col)) return col;
  try{ normC.fillStyle='#000000'; normC.fillStyle=col; var v=normC.fillStyle; if(/^#[0-9a-f]{6}$/i.test(v)) return v; }catch(e){}
  return '#888888';
}
function rgb(hex){ var n=parseInt(hexOf(hex).slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function sh(hex,f){ return (typeof shade==='function')?shade(hexOf(hex),f):hex; }

/* ───────────── 부위 그림 (parts.png) ───────────── */
var RECTS={"base_hana":[0,0,140,335],"mask_cloth_hana":[142,0,140,335],"mask_hair_hana":[284,0,140,335],"base_taro":[426,0,184,333],"mask_cloth_taro":[612,0,184,333],"mask_hair_taro":[798,0,184,333],"base_mir":[0,337,186,331],"mask_cloth_mir":[188,337,186,331],"mask_hair_mir":[376,337,186,331],"base_leon":[564,337,154,323],"mask_cloth_leon":[720,337,154,323],"mask_hair_leon":[0,670,154,323],"base_yuri":[156,670,175,316],"mask_cloth_yuri":[333,670,175,316],"mask_hair_yuri":[510,670,175,316],"w_moon":[687,670,37,173],"w_cosmos":[726,670,34,172],"w_sage":[762,670,38,167],"w_t3":[802,670,28,164],"w_thunder":[832,670,29,164],"w_spark":[863,670,31,159],"w_curse":[896,670,48,158],"w_phoenix":[946,670,40,156],"w_abyss":[0,995,39,155],"w_flame":[41,995,44,155],"w_aurora":[87,995,38,152],"w_t5b":[127,995,39,149],"w_t1":[168,995,37,147],"w_t5":[207,995,37,146],"w_glow":[246,995,29,143],"w_t2":[277,995,34,143],"w_orb2":[313,995,50,142],"w_rain":[365,995,30,142],"w_orb3":[397,995,49,138],"w_t4":[448,995,37,137],"w_orb1":[487,995,49,134],"w_orb4":[538,995,49,133],"w_star":[589,995,28,129],"cos_cape1":[619,995,106,126],"cos_cape2":[727,995,100,126],"w_frost":[829,995,32,126],"w_wolf":[863,995,29,126],"cos_cape4":[894,995,97,122],"cos_cape8":[0,1152,99,122],"cos_cape3":[101,1152,97,121],"w_t1b":[200,1152,31,121],"cos_cape5":[233,1152,95,120],"cos_cape6":[330,1152,153,115],"cos_cape9":[485,1152,234,113],"cos_cape7":[721,1152,185,109],"ac_dragon":[908,1152,70,93],"ac_sage":[0,1276,70,93],"ac_spider":[72,1276,90,93],"ac_cosmos":[164,1276,56,92],"ac_halo":[222,1276,109,87],"ac_star":[333,1276,61,82],"ac_phoenix":[396,1276,72,80],"cos_hat5":[470,1276,82,77],"cos_hat1":[554,1276,97,76],"cos_hat10":[653,1276,85,76],"cos_hat2":[740,1276,75,75],"cos_hat7":[817,1276,90,74],"cos_hat4":[909,1276,73,71],"cos_owl":[0,1371,86,71],"cos_hat11":[88,1371,81,60],"cos_hat3":[171,1371,93,60],"cos_hat12":[266,1371,79,59],"cos_hat8":[347,1371,79,55],"cos_hat13":[428,1371,85,54],"ac_glass":[515,1371,95,42],"cos_hat6":[612,1371,76,42],"ac_crown":[690,1371,48,38],"cos_hat9":[740,1371,65,30]};
var ATLAS={img:new Image(),ok:false};
(function(){
  var tries=['parts.png?v=26','chars/parts.png?v=26'], ti=0;
  ATLAS.img.onload=function(){ ATLAS.ok=true; };
  ATLAS.img.onerror=function(){ ti++; if(ti<tries.length) ATLAS.img.src=tries[ti]; };
  ATLAS.img.src=tries[0];
})();
var partC={};
function part(n){
  if(partC[n]) return partC[n];
  var r=RECTS[n]; if(!r||!ATLAS.ok) return null;
  var c=mk(r[2],r[3]); c.getContext('2d').drawImage(ATLAS.img,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);
  return (partC[n]=c);
}
/* 명암을 살린 채 색 바꾸기: mask가 있으면 그 영역만, 없으면 불투명한 곳 전부 */
function recolor(src,maskName,target){
  var w=src.width,h=src.height,c=mk(w,h),g=c.getContext('2d'); g.drawImage(src,0,0);
  if(!target) return c;
  var id=g.getImageData(0,0,w,h), d=id.data, m=null;
  if(maskName){ var mc=part(maskName); if(!mc) return c; m=mc.getContext('2d').getImageData(0,0,w,h).data; }
  var sum=0,n=0,i;
  for(i=0;i<w*h;i++){ if(d[i*4+3]<128) continue; if(m&&m[i*4+3]<128) continue;
    sum+=(d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11); n++; }
  if(!n) return c;
  var ref=sum/n, t=rgb(target);
  for(i=0;i<w*h;i++){ if(d[i*4+3]<128) continue; if(m&&m[i*4+3]<128) continue;
    var L=(d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11)/ref;
    d[i*4]=Math.min(255,t[0]*L); d[i*4+1]=Math.min(255,t[1]*L); d[i*4+2]=Math.min(255,t[2]*L); }
  g.putImageData(id,0,0);
  return c;
}

/* ───────────── 캐릭터별 기준점 (부위 그림 좌표) ───────────── */
var A={ taro:{face:[88,52],top:3, hand:[30,163]},
        mir: {face:[92,55],top:3, hand:[40,172]},
        hana:{face:[70,55],top:18,hand:[17,165]},
        yuri:{face:[85,48],top:3, hand:[27,152]},
        leon:{face:[72,50],top:3, hand:[14,168]} };
/* 머리 기준점: 그림에서 직접 측정한 '두 눈의 한가운데(cx)'와 '눈높이(ey)'. 정수리·머리 폭은 그림에서 읽어 자동 계산 */
var HEAD={ taro:{cx:95,ey:55}, mir:{cx:110,ey:55}, hana:{cx:82,ey:62}, yuri:{cx:94,ey:56}, leon:{cx:88,ey:56} };
var headC={};
function headInfo(id,raw){
  if(headC[id]) return headC[id];
  var H0=HEAD[id]||HEAD.taro, w=raw.width, h=Math.min(raw.height,130), d=raw.getContext('2d').getImageData(0,0,w,h).data, cx=H0.cx;
  function op(x,y){ return x>=0&&x<w&&y>=0&&y<h&&d[(y*w+x)*4+3]>128; }
  var ht=0, found=false;
  for(;ht<h&&!found;ht++){ for(var x=cx-8;x<=cx+8;x++){ if(op(x,ht)){ found=true; break; } } }
  ht=Math.max(0,ht-1);
  function wAt(y){ if(!op(cx,y)) return 0; var l=cx,r=cx; while(op(l-1,y)) l--; while(op(r+1,y)) r++; return r-l+1; }
  var Wh=(wAt(ht+20)+wAt(H0.ey)*0.85)/2;                 // 머리(정수리 폭과 눈높이 폭의 평균)
  return (headC[id]={cx:cx,ey:H0.ey,ht:ht,Wh:Wh,wEar:wAt(H0.ey+4),wAt:wAt,
    domeRow:function(width){ for(var dd=0;dd<70;dd++){ if(wAt(ht+dd)>=width) return dd; } return 30; }});   // 머리 둘레가 이 폭이 되는 지점(정수리로부터)
}
var BODY_CX={ taro:91, mir:102, hana:70, yuri:88, leon:81 };      // 몸통(허리·발) 중심 — 날개와 망토는 머리가 아니라 몸에 맞춘다
var BUILTIN_CAPE={ taro:1, mir:1 };            // 기본 복장에 큰 망토가 있는 캐릭터
var HAT_KIND={cos_hat2:'crown',cos_hat11:'crown',cos_hat12:'crown',cos_hat13:'crown',ac_crown:'crown',
  cos_hat1:'brim',cos_hat7:'brim',cos_hat3:'brim2',cos_hat5:'helm',cos_hat10:'helm',cos_hat4:'mask',cos_hat6:'wreath',
  cos_hat8:'phones',cos_hat9:'halo',ac_halo:'ring',cos_owl:'owl'};
/** 모자·왕관·고리를 그 캐릭터의 머리 크기와 정수리 모양에 맞춰 앉힌다 */
function seatHeadgear(put,ox,oy,HD,h,hid){
  var kind=HAT_KIND[hid]||'brim', Wh=HD.Wh, cx=HD.cx, ht=HD.ht;
  function atBottom(wPx,bottom){ var sc=wPx/h.width; put(h,ox+cx-wPx/2,oy+bottom-h.height*sc,sc); }
  function atTop(wPx,top){ var sc=wPx/h.width; put(h,ox+cx-wPx/2,oy+top,sc); }
  if(kind==='crown'){                                                   // 머리 둘레와 폭이 같아지는 높이에 밴드를 걸친다 → 쓴 것처럼 보임
    var wPx=(hid==='ac_crown'?0.62:0.84)*Wh, row=HD.domeRow(wPx*1.14); atBottom(wPx,ht+row+3);   // 머리가 왕관보다 조금 넓어지는 지점에 밴드를 두어 머리를 감싼 모양으로
  } else if(kind==='brim') atBottom(1.28*Wh,ht+26);
  else if(kind==='brim2') atBottom(1.22*Wh,ht+28);
  else if(kind==='helm') atBottom(1.1*Wh,ht+34);
  else if(kind==='mask') atBottom(1.0*Wh,ht+34);
  else if(kind==='wreath') atTop(1.0*Wh,ht+7);
  else if(kind==='halo') atBottom(0.95*Wh,ht-3);                       // 가는 금빛 고리: 머리 바로 위에 떠 있음
  else if(kind==='ring') atBottom(0.92*Wh,ht+8);                       // 성좌의 고리(큰 장식 고리): 정수리를 감싸듯 가까이
  else if(kind==='owl') atBottom(1.05*Wh,ht+24);
  else if(kind==='phones'){                                             // 이어컵이 귀(눈높이 아래)에 오고 머리 폭보다 조금 넓게
    var sc2=Math.min(1.5,Math.max(1.2,(HD.wEar+34)/h.width)); put(h,ox+cx-h.width*sc2/2,oy+HD.ey+6-h.height*0.66*sc2,sc2);
  }
}
var WINGS={cos_cape6:1,cos_cape7:1,cos_cape9:1};
var LONG={w_t3:1,w_thunder:1,w_spark:1,w_sage:1,w_moon:1,w_orb1:1,w_orb2:1,w_orb3:1,w_orb4:1};
var AURAS={cos_aura1:'#ff7a2e',cos_aura2:'#8fd0ff',cos_aura3:'#c05aff',cos_aura4:'#7fe8ff',cos_aura5:'#ff8ae0',cos_aura6:'#ffe14d',cos_aura7:'#ff9ac4',cos_aura8:'#ff6a2e'};
var W_ANG=-18*Math.PI/180, W_SC=1.35, PAD=140;

function clothColor(eq){
  var cu=eq.custom||{};
  if(cu.top) return cu.top;
  if(eq.dye) return eq.dye;
  if(eq.a&&typeof AART!=='undefined'&&AART[eq.a.id]) return AART[eq.a.id][0];
  return null;
}
var compC={}, compN=0;
function compose(id,eq){
  if(!ATLAS.ok) return null;
  var cu=eq.custom||{}, cloth=clothColor(eq);
  var key=[id,eq.w&&eq.w.id,eq.hat&&eq.hat.id,eq.cape&&eq.cape.id,eq.acc&&eq.acc.id,cu.hair,cloth,cu.cape].join('|');
  if(compC[key]) return compC[key];
  if(++compN>80){ compC={}; compN=0; }
  var raw=part('base_'+id); if(!raw) return null;
  var base=recolor(raw,'mask_hair_'+id,cu.hair||null);
  if(cloth) base=recolor(base,'mask_cloth_'+id,cloth);
  var a=A[id]||A.taro, HD=headInfo(id,raw), fx=BODY_CX[id]||HD.cx;
  var c=mk(base.width+PAD*2,base.height+PAD*2), g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  var ox=PAD, oy=PAD;
  function put(im,x,y,s){ s=s||1; g.drawImage(im,Math.round(x),Math.round(y),Math.round(im.width*s),Math.round(im.height*s)); }
  // 1) 망토 · 날개 (몸 뒤)
  if(eq.cape){
    var cp=part(eq.cape.id);
    if(cp){
      if(cu.cape&&!WINGS[eq.cape.id]) cp=recolor(cp,null,cu.cape);
      if(WINGS[eq.cape.id]){ var s1=1.35; put(cp,ox+fx-cp.width*s1/2,oy+75-cp.height*s1/3,s1); }
      else { var s2=BUILTIN_CAPE[id]?1.9:1.45; put(cp,ox+fx-cp.width*s2/2,oy+(BUILTIN_CAPE[id]?64:78),s2); }   // 원래 망토가 큰 캐릭터는 더 크게 펼쳐 바깥으로 드러나게
    }
  }
  // 2) 몸
  put(base,ox,oy);
  // 3) 무기 (손잡이를 손에 맞추고 바깥쪽으로 기울임) + 주먹 다시 덮기
  var blade=null;
  if(eq.w){
    var wi=part(eq.w.id);
    if(wi){
      var gyr=LONG[eq.w.id]?0.62:0.84, hx=ox+a.hand[0], hy=oy+a.hand[1];
      g.save(); g.translate(hx,hy); g.rotate(W_ANG); g.scale(W_SC,W_SC);
      g.drawImage(wi,Math.round(-wi.width/2),Math.round(-wi.height*gyr)); g.restore();
      g.save(); g.beginPath(); g.ellipse(hx,hy,10,9,0,0,6.2832); g.clip(); put(base,ox,oy); g.restore();
      var L=wi.height*gyr*W_SC; blade=[hx,hy,hx-Math.sin(-W_ANG)*L,hy-Math.cos(W_ANG)*L];
    }
  }
  // 4) 장신구
  if(eq.acc){
    var ai=part(eq.acc.id), id2=eq.acc.id;
    if(ai){
      if(id2==='ac_glass'){ var gs=0.78*HD.Wh/ai.width; put(ai,ox+HD.cx-ai.width*gs/2,oy+HD.ey+2-ai.height*gs/2,gs); }       // 눈높이에 안경
      else if(id2==='ac_crown'||id2==='ac_halo'){ if(!eq.hat) seatHeadgear(put,ox,oy,HD,ai,id2); }
      else if(id2==='ac_phoenix'){ var ps=0.5*HD.Wh/ai.width; put(ai,ox+HD.cx+0.1*HD.Wh,oy+HD.ht+24-ai.height*ps,ps); }       // 머리 오른쪽 위에 깃털
      else if(id2==='ac_spider'){ var ss=0.62; put(ai,ox+HD.cx-ai.width*ss/2,oy+HD.ey+30,ss); }                                // 목도리: 위쪽 고리가 목에 감기고 끝자락이 가슴으로
      else { var ns=0.55; put(ai,ox+HD.cx-ai.width*ns/2,oy+HD.ey+34,ns); }                                                    // 목걸이는 가슴
    }
  }
  // 5) 모자
  if(eq.hat){ var h=part(eq.hat.id); if(h) seatHeadgear(put,ox,oy,HD,h,eq.hat.id); }
  var out={c:c,bw:base.width,bh:base.height,blade:blade};
  return (compC[key]=out);
}

/* ───────────── 그리기 (오라 · 무기 광채는 실시간) ───────────── */
function drawHeroArt(g,id,eq,cx,groundY,H){
  var o=compose(id,eq); if(!o) return false;
  var t=now(), s=H/o.bh, bob=Math.round(Math.sin(t/600)*2);
  var x0=cx-(PAD+o.bw/2)*s, y0=groundY-(PAD+o.bh)*s+bob, iw=o.bw*s;
  if(eq.aura){
    var ac=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    var cg=g.createLinearGradient(0,groundY-H,0,groundY); cg.addColorStop(0,'rgba(0,0,0,0)'); cg.addColorStop(1,ac);
    g.globalAlpha=0.28+0.1*Math.sin(t/300); g.fillStyle=cg; g.fillRect(cx-iw*0.6,groundY-H*0.75,iw*1.2,H*0.75);
    var rg=g.createRadialGradient(cx,groundY,4,cx,groundY,iw*0.8); rg.addColorStop(0,ac); rg.addColorStop(1,'rgba(0,0,0,0)');
    g.globalAlpha=0.5; g.fillStyle=rg; g.beginPath(); g.ellipse(cx,groundY,iw*0.8,18,0,0,6.29); g.fill();
    g.restore();
  }
  var sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=(s<0.95);
  g.drawImage(o.c,x0,y0,o.c.width*s,o.c.height*s);
  g.imageSmoothingEnabled=sm;
  if(o.blade&&eq.w&&typeof WART!=='undefined'){
    var wa=WART[eq.w.id]||['#6a4a26','#c9ccd8',1,'s'], bc=hexOf(wa[1]==='RAINBOW'?'hsl('+((t/8)%360)+',90%,65%)':wa[1]);
    var lv=eq.w.lvl||0, it=G.itemById&&G.itemById[eq.w.id], strong=lv>=3||(it&&(Number(it.tier)>=3||Number(it.price)<=0));
    var b=o.blade;
    g.save(); g.globalCompositeOperation='lighter';
    for(var q=0.2;q<=1;q+=0.1){
      var gx=x0+(b[0]+(b[2]-b[0])*q)*s, gy=y0+(b[1]+(b[3]-b[1])*q)*s, r=((strong?14:8)+lv*2)*s;
      var gr=g.createRadialGradient(gx,gy,0,gx,gy,r); gr.addColorStop(0,bc); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.globalAlpha=(strong?0.3:0.15)+0.1*Math.sin(t/200+q*9); g.fillStyle=gr; g.fillRect(gx-r,gy-r,r*2,r*2);
    }
    for(var k=0;k<Math.min(8,1+lv*2);k++){
      var ph=((t/900)+k/8)%1, qq=0.3+((k*0.37)%0.7);
      var sx=x0+(b[0]+(b[2]-b[0])*qq)*s+Math.sin(t/300+k)*6, sy=y0+(b[1]+(b[3]-b[1])*qq)*s-ph*30;
      g.globalAlpha=1-ph; g.fillStyle=k%2?'#ffffff':bc; g.fillRect(Math.round(sx),Math.round(sy),2,2);
    }
    g.restore();
  }
  if(eq.aura){
    var ac2=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    for(var i=0;i<22;i++){ var p2=(t/1500+i/22)%1; g.globalAlpha=(1-p2)*0.9; g.fillStyle=i%3?ac2:'#ffffff';
      g.fillRect(Math.round(cx+Math.sin(i*2.1+t/700)*iw*0.6),Math.round(groundY-p2*H*0.9),2,2); }
    g.restore();
  }
  return true;
}
window.drawHeroArt=drawHeroArt;
window.HeroArt={part:part};                                  // 도감 등에서 장비 그림을 쓰기 위해

/* ── 무대 배경 ── */
function drawStage(g,W,H,col,t){
  col=hexOf(col);
  var bg=g.createRadialGradient(W/2,H*0.45,10,W/2,H*0.45,H*0.8);
  bg.addColorStop(0,sh(col,0.45)); bg.addColorStop(0.45,'#1c1438'); bg.addColorStop(1,'#08050f');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.save(); g.translate(W/2,H*0.42); g.rotate(t/9000); g.globalCompositeOperation='lighter';
  for(var i=0;i<16;i++){ g.rotate(Math.PI*2/16); g.globalAlpha=0.07+0.04*Math.sin(t/400+i); g.fillStyle=col;
    g.beginPath(); g.moveTo(0,0); g.lineTo(-10,-H); g.lineTo(10,-H); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalCompositeOperation='lighter';
  var sp=g.createLinearGradient(0,0,0,H); sp.addColorStop(0,'#ffffff'); sp.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.1; g.fillStyle=sp;
  g.beginPath(); g.moveTo(W/2-26,0); g.lineTo(W/2+26,0); g.lineTo(W/2+100,H); g.lineTo(W/2-100,H); g.closePath(); g.fill();
  for(var j=0;j<22;j++){ var py=(H-((t/18+j*53)%(H+20))), pxx=W/2+Math.sin(t/900+j*1.7)*(W*0.42);
    g.globalAlpha=0.55; g.fillStyle=j%3?col:'#ffffff'; g.fillRect(Math.round(pxx),Math.round(py),2,2); }
  g.restore();
  var fy=H-24;
  g.save(); g.globalCompositeOperation='lighter';
  var fl=g.createRadialGradient(W/2,fy,4,W/2,fy,100); fl.addColorStop(0,col); fl.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.35; g.fillStyle=fl; g.beginPath(); g.ellipse(W/2,fy,100,22,0,0,6.29); g.fill(); g.restore();
  g.save(); g.strokeStyle=col; g.globalAlpha=0.8; g.lineWidth=2; g.setLineDash([6,5]); g.lineDashOffset=-t/50;
  g.beginPath(); g.ellipse(W/2,fy,84,15,0,0,6.29); g.stroke();
  g.setLineDash([2,6]); g.lineDashOffset=t/40; g.globalAlpha=0.5; g.beginPath(); g.ellipse(W/2,fy,64,11,0,0,6.29); g.stroke(); g.restore();
  return fy;
}
function loadingText(g,W,H){ g.save(); g.fillStyle='#a99cc4'; g.font='12px DungGeunMo,sans-serif'; g.textAlign='center'; g.fillText('그림 불러오는 중…',W/2,H/2); g.restore(); }

/* ═══════════════ 외형 저장 (서버 우선, 체험판은 기기) ═══════════════ */
function localKey(){ return 'cs_cust_'+((G&&G.hakbun)||'guest'); }
function localGet(){ try{ return JSON.parse(localStorage.getItem(localKey())||'{}')||{}; }catch(e){ return {}; } }
function localSet(c){ try{ localStorage.setItem(localKey(),JSON.stringify(c)); }catch(e){} }
function serverLook(){ var st=(G.save&&G.save['문제상태'])||{}; return st.__look||null; }
function stripSets(o){ var c=JSON.parse(JSON.stringify(o||{})); delete c.__sets; return c; }
function getCust(){ var s=serverLook(); return (s&&Object.keys(s).length)?s:stripSets(localGet()); }
function lookSets(){ var st=(G.save&&G.save['문제상태'])||{}; return st.__lookSets||{}; }
var _pushT=null;
function pushLook(c,slot){
  var l=localGet(), keep=l.__sets; var nc=stripSets(c); if(keep) nc.__sets=keep; localSet(nc);
  if(G.save&&G.save['문제상태']) G.save['문제상태'].__look=stripSets(c);
  if(G.guest) return;
  clearTimeout(_pushT);
  _pushT=setTimeout(function(){
    try{ srv('setLook',G.hakbun,stripSets(c),slot||0).then(function(r){
      if(r&&r.ok&&r.save){ G.save=r.save; if(slot) toast('👗 코디 '+slot+' 저장 완료!');
        if(document.getElementById('chardetail').classList.contains('open')) renderCustomUI(); }
      else if(r&&r.msg) toast(r.msg);
    }).catch(function(){}); }catch(e){}
  },slot?0:700);
}
function setCust(k,v){
  var c=stripSets(getCust());
  if(v) c[k]=v; else delete c[k];
  pushLook(c); if(typeof sfx==='function') sfx('buy'); renderCustomUI();
}
window.setHeroCust=setCust;
var _heroEq=heroEq;
heroEq=function(){ var e=_heroEq(); var c=getCust(); if(Object.keys(c).length) e.custom=c; return e; };
var _l2e=lookToEq;
lookToEq=function(lk){ var e=_l2e(lk); if(e&&lk&&lk.cu) e.custom=lk.cu; return e; };

/* 필드 캐릭터 색도 새 그림과 맞춤 */
if(typeof HERO!=='undefined'){
  HERO.taro={skin:'#f4c896',hair:'#8a5530',suit:'#2e5aa8',accent:'#f4f0ea',trim:'#6a4428'};
  HERO.mir ={skin:'#f0c090',hair:'#8a5530',suit:'#4a7a3a',accent:'#e8e0c8',trim:'#6a4428'};
  HERO.hana={skin:'#f4c896',hair:'#d0302a',suit:'#2a2030',accent:'#d0302a',trim:'#6a4428'};
  HERO.yuri={skin:'#f8d8c0',hair:'#d8ccd8',suit:'#3a3a9a',accent:'#f4f0ea',trim:'#e0b040'};
  HERO.leon={skin:'#f0c8a0',hair:'#a8a4a4',suit:'#f0ece4',accent:'#2a2030',trim:'#e0b040'};
}

/* ═══════════════ 장비 슬롯 (그림 양옆) ═══════════════ */
function renderSlotsOverlay(eq,show){
  var st=document.getElementById('cd-stage'); if(!st) return;
  var box=document.getElementById('cd-eqslots');
  if(!box){ box=document.createElement('div'); box.id='cd-eqslots'; box.style.cssText='position:absolute;inset:0;pointer-events:none'; st.appendChild(box); }
  if(!show){ box.innerHTML=''; return; }
  var Lc=[['weapon','w','⚔️'],['armor','a','🛡️'],['acc','acc','💍']], Rc=[['hat','hat','🎩'],['cape','cape','🧣'],['aura','aura','✨']];
  function cell(sl,y,side){
    var info=eq[sl[1]], it=info&&G.itemById?G.itemById[info.id]:null;
    var ra=(it&&typeof rarityOf==='function')?rarityOf(it):{c:'#3a3050',n:''};
    var ic=it?((typeof iconImg==='function')?iconImg(it,34):sl[2]):'<span style="opacity:.35;font-size:16px">'+sl[2]+'</span>';
    var lv=info&&info.lvl?'<b style="position:absolute;right:-4px;bottom:-6px;font-size:10px;color:#ffca4b;text-shadow:1px 1px 0 #000">+'+info.lvl+'</b>':'';
    return '<div style="position:absolute;'+side+':6px;top:'+y+'px;width:40px;height:40px;border-radius:7px;border:2px solid '+(it?ra.c:'#3a3050')+
      ';background:rgba(16,11,26,.78);display:flex;align-items:center;justify-content:center;'+(it?'box-shadow:0 0 8px '+ra.c+'66':'')+'">'+ic+lv+'</div>';
  }
  var h=''; Lc.forEach(function(sl,i){ h+=cell(sl,70+i*50,'left'); }); Rc.forEach(function(sl,i){ h+=cell(sl,70+i*50,'right'); });
  box.innerHTML=h;
}

/* ═══════════════ 캐릭터 상세 화면 ═══════════════ */
var _rcd=renderCharDetail;
renderCharDetail=function(p){
  _rcd(p);
  if(_cdTimer){ cancelAnimationFrame(_cdTimer); _cdTimer=null; }
  var old=document.getElementById('cd-modebar'); if(old) old.remove();
  var mine=!p, charId=mine?G.save['캐릭터']:p.charId;
  var cv2=document.getElementById('cd-canvas'); if(!cv2) return;
  cv2.width=300; cv2.height=360;
  var g=cv2.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[charId])||'#9b7be0');
  var lastKey='';
  (function anim(){
    if(!document.getElementById('chardetail').classList.contains('open')){ _cdTimer=null; renderSlotsOverlay({},false); return; }
    var t=now(), eq=mine?heroEq():(lookToEq(p.look)||{});
    var fy=drawStage(g,cv2.width,cv2.height,col,t);
    if(!drawHeroArt(g,charId,eq,cv2.width/2,fy+4,300)) loadingText(g,cv2.width,cv2.height);
    var k=JSON.stringify([eq.w,eq.a,eq.acc,eq.hat,eq.cape,eq.aura]);
    if(k!==lastKey){ lastKey=k; renderSlotsOverlay(eq,true); }
    _cdTimer=requestAnimationFrame(anim);
  })();
  var box=document.getElementById('cd-custom');
  if(!box){ box=document.createElement('div'); box.id='cd-custom';
    var dye=document.getElementById('cd-dye'); dye.parentNode.insertBefore(box,dye.nextSibling); }
  box.style.display=mine?'block':'none';
  var dyeBox=document.getElementById('cd-dye'); if(dyeBox) dyeBox.style.display='none';   // '옷 색' 탭으로 통합
  if(mine) renderCustomUI();
};

/* ── 꾸미기 UI ── */
var HAIR_COLS=['#8a5530','#3a2a22','#2a2030','#d8ccd8','#e0b040','#d0302a','#e06aa0','#8a64c0','#3a6ad0','#1f7a64','#5ad0a0','#f4f0e0'];
var CLOTH_COLS=['#2e5aa8','#c03a3a','#4a7a3a','#37a0a0','#8a64c0','#ff9ac4','#e0a83c','#f0f0f0','#3a3a48','#1e2a4a','#8a5a2a','#e8c040'];
var TABS=[['hair','머리색',HAIR_COLS],['top','옷 색',CLOTH_COLS],['cape','망토 색',CLOTH_COLS],['sets','코디']];
var _cuTab='hair';
window.heroCustTab=function(t){ _cuTab=t; renderCustomUI(); };
function btn(on,bg,onclick,label){
  return '<button onclick="'+onclick+'" style="min-width:34px;height:34px;padding:0 9px;border-radius:6px;border:3px solid var(--line);'+
    (on?'outline:3px solid var(--gold);':'')+'background:'+bg+';color:#fff;font-size:11px;font-family:var(--font-body)">'+(label||'')+'</button>';
}
function renderCustomUI(){
  var box=document.getElementById('cd-custom'); if(!box||!G.save) return;
  var cu=getCust();
  var h='<div style="margin-top:12px;font-size:12px;color:var(--gold)">✂ 꾸미기 <span style="color:var(--muted);font-size:10px">'+(G.guest?'(체험판: 이 기기에만 저장)':'(서버 저장 · 친구에게도 보여요)')+'</span></div>'+
    '<div style="display:flex;gap:5px;margin:6px 0">'+
    TABS.map(function(tb){ var on=_cuTab===tb[0]; return '<button onclick="heroCustTab(\''+tb[0]+'\')" style="flex:1;padding:8px 4px;border-radius:6px;border:3px solid '+(on?'var(--gold)':'var(--line)')+';background:var(--bg2);color:'+(on?'var(--gold)':'var(--muted)')+';font-size:11px;font-family:var(--font-body)">'+tb[1]+'</button>'; }).join('')+
    '</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  var tab=TABS.filter(function(x){ return x[0]===_cuTab; })[0];
  if(tab&&tab[2]){
    h+=btn(!cu[_cuTab],'linear-gradient(135deg,#888 45%,#fff 50%,#888 55%)',"setHeroCust('"+_cuTab+"','')",'기본');
    tab[2].forEach(function(cl){ h+=btn(cu[_cuTab]===cl,cl,"setHeroCust('"+_cuTab+"','"+cl+"')",''); });
    if(_cuTab==='top') h+='<div style="width:100%;font-size:10px;color:var(--muted)">기본은 원래 옷 색이에요. 방어구를 입으면 방어구 색으로 바뀌고, 여기서 고른 색이 가장 우선이에요.</div>';
    if(_cuTab==='cape') h+='<div style="width:100%;font-size:10px;color:var(--muted)">망토 코스튬을 장착했을 때 보여요. 날개는 색이 바뀌지 않아요.</div>';
  } else {
    var sets=G.guest?(localGet().__sets||{}):lookSets();
    [1,2,3].forEach(function(n){
      var has=!!sets[n];
      h+='<div style="display:flex;align-items:center;gap:6px;width:100%;background:var(--panel2);border:2px solid var(--line);border-radius:6px;padding:6px 8px">'+
        '<span style="flex:1;font-size:12px">👗 코디 '+n+(has?' <small style="color:var(--good)">저장됨</small>':' <small style="color:var(--muted)">비어 있음</small>')+'</span>'+
        '<button class="btn ghost" style="padding:6px 10px;font-size:11px" onclick="heroSaveSet('+n+')">지금 색 저장</button>'+
        (has?'<button class="btn gold" style="padding:6px 10px;font-size:11px" onclick="heroLoadSet('+n+')">입기</button>':'')+'</div>';
    });
  }
  box.innerHTML=h+'</div>';
}
window.heroSaveSet=function(n){
  var c=stripSets(getCust());
  if(G.guest){ var l=localGet(); l.__sets=l.__sets||{}; l.__sets[n]=c; localSet(l); toast('👗 코디 '+n+' 저장!'); renderCustomUI(); return; }
  pushLook(c,n); toast('👗 코디 '+n+' 저장 중…');
};
window.heroLoadSet=function(n){
  var sets=G.guest?(localGet().__sets||{}):lookSets(); var c=sets[n]; if(!c) return;
  pushLook(JSON.parse(JSON.stringify(c)));
  if(typeof sfx==='function') sfx('relic'); toast('👗 코디 '+n+'(으)로 갈아입었어요!'); renderCustomUI();
};

/* 기기에만 있던 옛 꾸미기를 서버로 한 번 옮기기 */
var _sync=syncFromSave, migrated=false;
syncFromSave=function(){
  _sync.apply(this,arguments);
  if(migrated||!G.save||G.guest||!G.hakbun) return;
  migrated=true;
  var s=serverLook(), l=stripSets(localGet());
  if((!s||!Object.keys(s).length)&&Object.keys(l).length) pushLook(l);
};

/* ═══════════════ 캐릭터 선택 화면 ═══════════════ */
drawSelBig=function(id){
  var c=document.getElementById('sel-big'); if(!c) return;
  c.width=190; c.height=250;
  var ch=(G.characters||[]).filter(function(x){ return x.id===id; })[0];
  var nm=document.getElementById('sel-name');
  if(nm) nm.innerHTML=ch?('<b>'+ch.name+'</b> · <span style="color:var(--energy)">'+(ch.job||ch.type||'')+'</span><br><span style="font-size:10px;color:var(--muted)">'+((STORY.charLine||{})[id]||'')+'</span>'):'';
  if(_selT) cancelAnimationFrame(_selT);
  var g=c.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[id])||'#9b7be0');
  (function anim(){
    if(!document.getElementById('sel-big')){ _selT=null; return; }
    var fy=drawStage(g,c.width,c.height,col,now());
    if(!drawHeroArt(g,id,{},c.width/2,fy+3,210)) loadingText(g,c.width,c.height);
    _selT=requestAnimationFrame(anim);
  })();
};

function setVer(){ try{ var v=document.getElementById('ver'); if(v) v.textContent='빌드 v33 꾸미기'; }catch(e){} }
window.addEventListener('DOMContentLoaded',setVer); window.addEventListener('load',setVer);
})();
