/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v12 도트 아트 엔진 (art.js)
   외부 이미지 파일 없이, 코드 안에 직접 찍은 픽셀 맵으로
   지형·벽·나무·캐릭터·몬스터·NPC를 전부 새로 그립니다.

   설치: index.html 맨 끝에 (remaster.js를 쓰는 경우 그 뒤에)
     <script src="art.js"></script>
   remaster.js 없이 단독으로도 동작합니다. 서버 변경 없음.
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof drawGround!=='function'||typeof drawHero!=='function'){ console.warn('art.js: 원본 엔진을 찾지 못함'); return; }

var ART={ curE:null, cache:{} };
window.ART=ART;
ART.v=14;
var OUTLINE='#140c1e';

/* ───────────── 기본 도구 ───────────── */
function mk(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function dot(g,x,y,c){ g.fillStyle=c; g.fillRect(x,y,1,1); }
function box(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(x,y,w,h); }
function sh(hex,f){ return (typeof shade==='function')?shade(hex,f):hex; }
function now(){ return performance.now(); }
/* 픽셀 맵 그리기: rows의 각 글자를 pal 색으로. '.'은 투명 */
function paint(g,rows,x0,y0,pal){
  for(var y=0;y<rows.length;y++){ var r=rows[y];
    for(var x=0;x<r.length;x++){ var ch=r.charAt(x); if(ch==='.'||ch===' ') continue;
      var c=pal[ch]; if(!c) continue; g.fillStyle=c; g.fillRect(x0+x,y0+y,1,1); } }
}
/* 불투명 픽셀 둘레에 1px 외곽선 */
function outline(c,col){
  try{
    var g=c.getContext('2d'), w=c.width, h=c.height, id=g.getImageData(0,0,w,h), d=id.data, o=new Uint8Array(w*h);
    for(var i=0;i<w*h;i++) o[i]=d[i*4+3]>0?1:0;
    var oc=parseInt(col.slice(1),16), R=(oc>>16)&255, Gc=(oc>>8)&255, B=oc&255;
    for(var y=0;y<h;y++) for(var x=0;x<w;x++){
      var k=y*w+x; if(o[k]) continue;
      if((x>0&&o[k-1])||(x<w-1&&o[k+1])||(y>0&&o[k-w])||(y<h-1&&o[k+w])){
        d[k*4]=R; d[k*4+1]=Gc; d[k*4+2]=B; d[k*4+3]=255; }
    }
    g.putImageData(id,0,0);
  }catch(e){}
}
/* 스프라이트 캐시: rows+pal → 외곽선 포함 캔버스 */
function sprite(key,rows,pal,noOutline){
  if(ART.cache[key]) return ART.cache[key];
  var w=0; rows.forEach(function(r){ w=Math.max(w,r.length); });
  var c=mk(w+2,rows.length+2), g=c.getContext('2d');
  paint(g,rows,1,1,pal);
  if(!noOutline) outline(c,OUTLINE);
  return (ART.cache[key]=c);
}
function blit(g,c,x,y,k,flip){
  var sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=false;
  if(flip){ g.save(); g.translate(Math.round(x+c.width*k),Math.round(y)); g.scale(-1,1); g.drawImage(c,0,0,c.width*k,c.height*k); g.restore(); }
  else g.drawImage(c,Math.round(x),Math.round(y),c.width*k,c.height*k);
  g.imageSmoothingEnabled=sm;
}
function K(){ return Math.max(1,Math.round(TILE/16)); }

/* 타일 크기를 48(=16px 도트 × 3배)로 고정 → 모든 도트가 선명한 정수배 */
var _resize=resize;
resize=function(){ _resize(); TILE=48; };
window.resize=resize;

/* ═══════════════ 1. 지형 타일 (16×16 절차 생성, 캐시) ═══════════════ */
var GP={ r1:{b:'#4c8a3e',d:'#3d7434',l:'#5fa04a',x:'#7cc05a'},
         r2:{b:'#3a3350',d:'#2e2842',l:'#48405f',x:'#221c30'},
         r3:{b:'#c9a266',d:'#b08a52',l:'#dcb67c',x:'#9c7644'},
         r4:{b:'#3f8a4c',d:'#357a42',l:'#4c9a58',x:'#62b46c'},
         r5:{b:'#4a4058',d:'#3a3148',l:'#5a4f6a',x:'#2c2438'} };
var PP={ r1:{b:'#a67c4a',d:'#8a6538',l:'#c0955c',x:'#d8c098'},
         r2:{b:'#554a70',d:'#443b5c',l:'#685e86',x:'#7e74a4'},
         r3:{b:'#b88a50',d:'#9a7040',l:'#cc9e62',x:'#e0c090'},
         r4:{b:'#a07a4c',d:'#86643c',l:'#b48e5c',x:'#efe8d8'},
         r5:{b:'#8a2a3a',d:'#6a1e2c',l:'#a8384a',x:'#d8a840'} };
var TC={};
function tile(key,fn){ if(TC[key]) return TC[key]; var c=mk(16,16),g=c.getContext('2d'); fn(g,rng(hashStr(key))); return (TC[key]=c); }

function genGround(g,R,reg,alt){
  var p=GP[reg], base=(reg==='r4'&&alt)?'#478f53':p.b;
  box(g,0,0,16,16,base);
  var i,x,y;
  for(i=0;i<34;i++) dot(g,R()*16|0,R()*16|0,R()<0.55?p.d:p.l);
  if(reg==='r1'||reg==='r4'){
    for(i=0;i<6;i++){ x=R()*15|0; y=2+(R()*13|0); dot(g,x,y,p.x); dot(g,x,y-1,p.x); dot(g,x+1,y,p.d); }
  } else if(reg==='r2'){
    x=R()*16|0; y=R()*16|0;
    for(i=0;i<7;i++){ dot(g,x,y,p.x); x+=(R()<0.5?1:0); y+=(R()<0.6?1:-1); x=(x+16)%16; y=(y+16)%16; }
    for(i=0;i<2;i++){ x=1+(R()*13|0); y=1+(R()*13|0); box(g,x,y,2,1,p.l); box(g,x,y+1,2,1,p.x); }
  } else if(reg==='r3'){
    [3,9,14].forEach(function(yy,j){ var off=(R()*6|0);
      for(var xx=0;xx<16;xx++){ if((xx+off)%7<4){ dot(g,xx,yy,p.l); dot(g,xx,yy+1,p.d); } } });
  } else if(reg==='r5'){
    box(g,0,0,16,1,p.x); box(g,0,8,16,1,p.x);
    var s1=(R()*8|0), s2=(s1+8)%16;
    box(g,s1,0,1,8,p.x); box(g,s2,8,1,8,p.x);
    box(g,(s1+1)%16,1,5,1,p.l); box(g,(s2+1)%16,9,5,1,p.l);
    for(i=0;i<3;i++) dot(g,R()*16|0,R()*16|0,p.x);
  }
}
function genPath(g,R,reg,edge){
  var p=PP[reg], gp=GP[reg], i;
  box(g,0,0,16,16,p.b);
  if(reg==='r5'){                                        // 성: 붉은 융단
    for(i=0;i<16;i+=4){ box(g,i,4,2,1,p.l); box(g,i+2,11,2,1,p.l); }
    if(edge==='top'){ box(g,0,0,16,2,gp.b); box(g,0,2,16,1,p.x); box(g,0,3,16,1,p.d); }
    if(edge==='bot'){ box(g,0,14,16,2,gp.b); box(g,0,13,16,1,p.x); box(g,0,12,16,1,p.d); }
    return;
  }
  for(i=0;i<26;i++) dot(g,R()*16|0,R()*16|0,R()<0.5?p.d:p.l);
  for(i=0;i<3;i++){ var x=R()*15|0,y=R()*15|0; dot(g,x,y,p.x); dot(g,x,y+1,p.d); }
  if(reg==='r4'&&edge==='bot'){ box(g,0,7,16,1,p.x); }   // 트랙 흰 선
  var gc=gp.b;
  for(var xx=0;xx<16;xx++){
    var hgt=1+(R()*3|0);
    if(edge==='top'){ box(g,xx,0,1,hgt,gc); dot(g,xx,hgt,p.d); if(R()<0.3) dot(g,xx,hgt-1,gp.l); }
    if(edge==='bot'){ box(g,xx,16-hgt,1,hgt,gc); dot(g,xx,15-hgt,p.l); }
  }
}
function genWater(g,R,frame,foam){
  box(g,0,0,16,16,'#2a5c92');
  for(var i=0;i<10;i++) dot(g,R()*16|0,R()*16|0,'#244f82');
  var off=frame?3:0;
  [[2,3],[9,6],[4,11],[12,13]].forEach(function(w){ var x=(w[0]+off)%14; box(g,x,w[1],3,1,'#5a96cc'); dot(g,x+3,w[1]+1,'#3d74ac'); });
  if(foam==='R'){ for(var y=0;y<16;y++){ var f=1+((y+frame*2)%4===0?1:0)+(R()<0.3?1:0); box(g,16-f,y,f,1,'#d8f0ff'); dot(g,15-f,y,'#8ec4ec'); } }
  if(foam==='L'){ for(var y2=0;y2<16;y2++){ var f2=1+((y2+frame*2)%4===0?1:0)+(R()<0.3?1:0); box(g,0,y2,f2,1,'#d8f0ff'); dot(g,f2,y2,'#8ec4ec'); } }
}
function genBridge(g,R,edge){
  box(g,0,0,16,16,'#8a6038');
  for(var x=0;x<16;x+=4){ box(g,x,0,1,16,'#6a4626'); box(g,x+1,0,1,16,'#a0744a'); }
  for(var i=0;i<6;i++) dot(g,R()*16|0,R()*16|0,'#5a3a1e');
  if(edge==='top'){ box(g,0,0,16,2,'#4a2e16'); box(g,0,2,16,1,'#6a4626'); box(g,2,0,2,4,'#3a2410'); box(g,10,0,2,4,'#3a2410'); }
  if(edge==='bot'){ box(g,0,14,16,2,'#4a2e16'); box(g,0,13,16,1,'#6a4626'); box(g,2,12,2,4,'#3a2410'); box(g,10,12,2,4,'#3a2410'); }
}

/* ═══════════════ 2. 벽 (윗면 + 앞면 3/4 시점 오토타일) ═══════════════ */
var WP={ r2:{t:'#4a4066',tl:'#5e5480',td:'#3a3254',f:'#342c4a',fd:'#261f38',fl:'#40385a',acc:'#8fe8ff'},
         r3:{t:'#9a6a38',tl:'#b8844a',td:'#7a5028',f:'#7e5028',fd:'#5e3a1c',fl:'#946034',acc:'#e0b070'},
         r4:{t:'#4a5a7a',tl:'#62749a',td:'#3a4868',f:'#c8c0b0',fd:'#a09888',fl:'#e0d8c8',acc:'#3a5a8a'},
         r5:{t:'#6a5f7e',tl:'#877c9c',td:'#4e4462',f:'#54496a',fd:'#2e2640',fl:'#655a7c',acc:'#ff9a4a'} };
function genWallTop(g,R,reg,y0,y1){
  var p=WP[reg], i, x, y;
  box(g,0,y0,16,y1-y0,p.t);
  if(reg==='r4'){                                         // 지붕 기와
    for(y=y0;y<y1;y+=3){ box(g,0,y,16,1,p.td); for(x=(y/3%2)*2;x<16;x+=4) dot(g,x,y+1,p.tl); }
    return;
  }
  if(reg==='r5'){                                         // 성벽 윗돌
    for(y=y0;y<y1;y+=5){ box(g,0,y,16,1,p.td); var o=(R()*6|0); box(g,o,y,1,5,p.td); box(g,(o+8)%16,y,1,5,p.td); box(g,0,y+1,16,1,p.tl); }
    return;
  }
  for(i=0;i<(y1-y0)*2;i++) dot(g,R()*16|0,y0+(R()*(y1-y0)|0),R()<0.5?p.td:p.tl);
  for(i=0;i<3;i++){ x=R()*13|0; y=y0+(R()*(y1-y0-1)|0); box(g,x,y,3,1,p.tl); box(g,x,y+1,3,1,p.td); }
}
function genWallFront(g,R,reg,y0,v){
  var p=WP[reg], x, y;
  box(g,0,y0,16,16-y0,p.f);
  if(reg==='r2'){
    for(x=0;x<16;x+=3){ var len=2+(R()*5|0); box(g,x+(R()*2|0),y0+1+(R()*3|0),1,len,p.fd); }
    box(g,0,y0,16,1,p.fl);
    if(v===1){ box(g,6,y0+2,2,4,p.acc); dot(g,7,y0+1,'#ffffff'); box(g,9,y0+4,1,3,p.acc); }
  } else if(reg==='r3'){
    for(y=y0+1;y<16;y+=3){ box(g,0,y,16,1,p.fd); box(g,0,y+1,16,1,p.fl); }
    for(var i=0;i<4;i++) dot(g,R()*16|0,y0+(R()*(16-y0)|0),p.fd);
  } else if(reg==='r4'){
    box(g,0,y0,16,1,p.fd);
    box(g,5,y0+2,6,5,'#2a2a3a'); box(g,6,y0+3,4,3,v===1?'#ffe08a':p.acc); box(g,6,y0+3,4,1,v===1?'#fff6c8':'#5a7aaa'); box(g,8,y0+3,1,3,'#2a2a3a');
  } else if(reg==='r5'){
    for(y=y0;y<16;y+=3){ box(g,0,y,16,1,p.fd); var off=((y-y0)/3%2)?0:4; for(x=off;x<16;x+=8) box(g,x,y,1,3,p.fd); box(g,0,y+1,16,1,p.fl); }
  }
  box(g,0,15,16,1,'rgba(0,0,0,0.45)');
}
function wallTile(reg,front,rT,rL,rR,v){
  var key='w|'+reg+'|'+front+rT+rL+rR+v;
  return tile(key,function(g,R){
    if(front){ genWallTop(g,R,reg,0,7); box(g,0,7,16,1,WP[reg].tl); genWallFront(g,R,reg,8,v); }
    else genWallTop(g,R,reg,0,16);
    if(rT){ box(g,0,0,16,1,WP[reg].tl); }
    if(rL){ box(g,0,0,1,front?8:16,WP[reg].td); }
    if(rR){ box(g,15,0,1,front?8:16,WP[reg].td); }
  });
}

/* ═══════════════ 3. 나무 · 장식 스프라이트 ═══════════════ */
var TREE_ROUND=[
"......LLLL......","....LLLMMLLL....","...LLMMMMMMLL...","..LLMMMMLMMMML..",".LLMMLMMMMMMMMD.",
".LMMMMMMMMMLMMD.","LLMMMMMMMMMMMMMD","LMMMLMMMMMMMMDMD","LMMMMMMMMLMMMMMD",".MMMMMMMMMMMMMD.",
".DMMMDMMMMMMDMD.","..DDMMMMMMMDDD..","...DDDDMMDDD....",".....DDBbDD.....","......BBb.......",
"......BBb.......","......BBb.......",".....BBBbb......","....BB.Bb.B....."];
var TREE_PINE=[
".......L........","......LMD.......",".....LMMMD......","......LMD.......",".....LMMMD......",
"....LMMMMMD.....","...LMMMMMMMD....",".....LMMMD......","....LMMMMMD.....","...LMMMMMMMD....",
"..LMMMMMMMMMD...","....LMMMMMD.....","...LMMMMMMMD....","..LMMMMMMMMMD...",".LMMMMMMMMMMMD..",
"..DDDDDDDDDDD...","......BBb.......","......BBb.......",".....BBBbb......"];
var TREE_PAL=[
 {L:'#6cbc52',M:'#3f8a3a',D:'#27602c',B:'#6e4a26',b:'#4a3018'},
 {L:'#58a848',M:'#2f7434',D:'#1d4e26',B:'#6e4a26',b:'#4a3018'},
 {L:'#f0b048',M:'#c8742a',D:'#8a4a1a',B:'#6e4a26',b:'#4a3018'} ];
var DECOR={
 flower:["........","..P.....",".PYP..P.","..P..PYP","..g...P.","..g..g..",".gg.gg..","........"],
 tuft:  ["........","........","..G.....","..G..G..","g.GG.G..",".gGg.G.g","..gggg..","........"],
 mush:  ["........","..RRRR..",".RWRRWR.",".RRRRRR.","...SS...","...SS...","..SSSS..","........"],
 stone: ["........","........","........","...LL...","..LMML..",".DMMMMD.","..DDDD..","........"],
 crystal:["....C...","...CW...","..CCW.C.","..CCC.CW",".DCCCDCC",".DDCCDDC","..DDDDD.","........"],
 skull: ["........","..WWWW..",".WWWWWW.",".WxWWxW.",".WWWWWW.","..WxxW..","..W..W..","........"],
 bone:  ["........","........","W......W","WWWWWWWW","W......W","........","..W..W..","..WWWW.."],
 cactus:["...G....","..GgG...","G.GgG...","GGGgG.G.","..GgGGG.","..GgG...","..GgG...",".DDDDD.."],
 torch: ["...Y....","..YOY...","..ORO...","...R....","..TTT...","...T....","...T....","...T....","...T....","..TTT...",".TTTTT.."],
 lamp:  ["..YYYY..",".YWWWWY.","..YYYY..","...TT...","...TT...","...TT...","...TT...","...TT...","...TT...","...TT...","..TTTT..",".TTTTTT."]
};
var DPAL={
 flower:[{P:'#ff8ab8',Y:'#ffe070',g:'#2f6b32'},{P:'#ffffff',Y:'#ffca4b',g:'#2f6b32'},{P:'#b8a0ff',Y:'#fff0a0',g:'#2f6b32'}],
 tuft:{G:'#7cc05a',g:'#3d7434'}, mush:{R:'#d8423a',W:'#ffffff',S:'#efe6d0'},
 stone:{L:'#b8b0c0',M:'#8a8298',D:'#5a5468'}, crystal:[{C:'#8fe8ff',W:'#ffffff',D:'#3a6a8a'},{C:'#c98cff',W:'#ffffff',D:'#5a3a8a'}],
 skull:{W:'#e8e0d0',x:'#2a2030'}, bone:{W:'#e8e0d0'}, cactus:{G:'#4f8a3a',g:'#6fae52',D:'#8a6a3a'},
 torch:{Y:'#ffe070',O:'#ff9a2e',R:'#e0421e',T:'#4a4050'}, lamp:{Y:'#8a8aa0',W:'#fff0b0',T:'#3a3a48'}
};
function decorFor(reg,v){
  if(reg==='r1') return v<0.45?['flower',Math.floor(v*6.6)%3]:(v<0.7?['tuft']:(v<0.85?['mush']:['stone']));
  if(reg==='r2') return v<0.4?['crystal',v<0.2?0:1]:(v<0.7?['stone']:['bone']);
  if(reg==='r3') return v<0.4?['cactus']:(v<0.7?['stone']:['skull']);
  if(reg==='r4') return v<0.15?['lamp']:(v<0.6?['flower',Math.floor(v*9)%3]:['tuft']);
  return v<0.35?['torch']:(v<0.65?['skull']:['stone']);
}
function pushLight(x,y,r,c){ if(window.RM&&RM.lights) RM.lights.push({x:x,y:y,r:r,c:c}); }

/* ═══════════════ 4. drawGround / drawObject 교체 ═══════════════ */
function isWall(lz,x,y){ return blockedLocal(lz,x,y)&&!isWater(lz,x,y); }
drawGround=function(g,regId,tx,ty,sx,sy,reach){
  var T=TILE, k=K();
  if(!reach){ box(g,sx,sy,T,T,'#110c18'); return; }
  var lz=Math.floor(tx/ZC), ltx=tx-lz*ZC, c;
  if(isWater(lz,ltx,ty)){
    var fr=(Math.floor(now()/520)+tx+ty)%2;
    var foam=(ltx===1)?'R':(ltx===ZC-2?'L':'');
    c=tile('wa|'+fr+foam+'|'+((tx*7+ty*3)%4),function(gg,R){ genWater(gg,R,fr,foam); });
    g.drawImage(c,sx,sy,T,T); return;
  }
  var road=(ty===ROAD||ty===ROAD-1);
  if(road&&(ltx<2||ltx>ZC-3)){
    var be=(ty===ROAD-1)?'top':'bot';
    c=tile('br|'+be+'|'+(tx%3),function(gg,R){ genBridge(gg,R,be); });
    g.drawImage(c,sx,sy,T,T); return;
  }
  var v=(tx*13+ty*7)%4;
  if(road){
    var e=(ty===ROAD-1)?'top':'bot';
    c=tile('p|'+regId+'|'+e+'|'+v,function(gg,R){ genPath(gg,R,regId,e); });
  } else {
    var alt=(regId==='r4')?(Math.floor(tx/2)%2):0;
    c=tile('g|'+regId+'|'+alt+'|'+v,function(gg,R){ genGround(gg,R,regId,alt); });
  }
  g.drawImage(c,sx,sy,T,T);
  if(blockedLocal(lz,ltx,ty)) return;
  // 위쪽 벽/나무 그림자
  if(ty>0&&regId!=='r1'&&isWall(lz,ltx,ty-1)){
    g.fillStyle='rgba(10,4,20,.34)'; g.fillRect(sx,sy,T,k*3);
    g.fillStyle='rgba(10,4,20,.16)'; g.fillRect(sx,sy+k*3,T,k*2);
  }
  if(road) return;
  var h=hash(tx*17+3,ty*29+7);
  if(h<0.085){
    var d=decorFor(regId,h/0.085), name=d[0], pal=DPAL[name];
    if(Array.isArray(pal)) pal=pal[d[1]||0];
    var spr=sprite('dc|'+name+'|'+(d[1]||0),DECOR[name],pal);
    var ox=sx+((hash(tx,ty*5)*6)|0)*k, oy=sy+T-spr.height*k-k;
    blit(g,spr,ox,oy,k);
    if(name==='torch'){ var fl=Math.sin(now()/70+tx)*k; box(g,ox+4*k,oy+k-fl,k*2,k*2,'rgba(255,230,120,.85)'); pushLight(ox+4*k,oy+2*k,T*2.1,'#ff9a4a'); }
    if(name==='lamp') pushLight(ox+4*k,oy+2*k,T*2.3,'#fff0b0');
    if(name==='crystal') pushLight(ox+4*k,oy+4*k,T*1.4,d[1]?'#c98cff':'#8fe8ff');
  }
};
drawObject=function(g,regId,tx,ty,cx,cy){
  var T=TILE, k=K(), sx=cx-T/2, sy=cy-T/2;
  var lz=Math.floor(tx/ZC), ltx=tx-lz*ZC;
  if(isWater(lz,ltx,ty)) return;
  if(regId==='r1'){
    var v=hash(tx*11+5,ty*13+2);
    var rows=v<0.62?TREE_ROUND:TREE_PINE, pi=v<0.3?0:(v<0.85?1:2);
    var spr=sprite('tree|'+(rows===TREE_ROUND?'r':'p')+pi,rows,TREE_PAL[pi]);
    g.fillStyle='rgba(10,20,10,.35)'; g.beginPath(); g.ellipse(cx,sy+T-k*2,k*6,k*2,0,0,6.29); g.fill();
    blit(g,spr,sx+(T-spr.width*k)/2,sy+T-spr.height*k+k,k);
    return;
  }
  var below=isWall(lz,ltx,ty+1)||ty+1>ZR-1;
  var front=below?0:1;
  var rT=isWall(lz,ltx,ty-1)?0:1, rL=isWall(lz,ltx-1,ty)?0:1, rR=isWall(lz,ltx+1,ty)?0:1;
  var vv=(hash(tx*3,ty*11)<0.18)?1:0;
  g.drawImage(wallTile(regId,front,rT,rL,rR,vv),sx,sy,T,T);
  if(front&&vv&&regId==='r2') pushLight(cx,sy+T*0.7,T*1.5,'#8fe8ff');
  if(front&&vv&&regId==='r4') pushLight(cx,sy+T*0.75,T*1.4,'#ffe08a');
  if(front&&regId==='r5'&&hash(tx*5,ty*3)<0.22){          // 벽 횃불
    var fl=Math.sin(now()/70+tx)*k;
    box(g,cx-k,sy+T*0.55,k*2,k*4,'#4a4050');
    box(g,cx-k*1.5,sy+T*0.55-k*3-fl,k*3,k*3+fl,'#ff7a2e'); box(g,cx-k*0.5,sy+T*0.55-k*2-fl,k,k*2,'#ffe070');
    pushLight(cx,sy+T*0.45,T*2.2,'#ff9a4a');
  }
};

/* ═══════════════ 5. 주인공 (16×19 도트 + 장비 레이어) ═══════════════ */
var HERO_BODY=[
".....hhhhhh.....","...hhHHHHHHhh...","..hHHHHHHHHHHh..",".hHHHHHHHHHHHHh.",".hHHHHHHHhHHHHh.",
".hHHHhSSSSSSHHh.",".hHHhSSSSSSSSHh.",".hHhSSSEwSSEwSh.","..hhSSSEESSEESs.","...hsSSSSSSSSs..",
"....ssSSSmSSs...",".....TTTTTTT....","...SbBBBLBBBbS..","..SSbBBBLBBBbSS.","..ssbBBTTTBBbss.",
"....bbbbbbbbb..."];
var LEGS=[
 ["....PPp...PPp...","....KKk...KKk...","...KKKk..KKKk..."],
 ["...PPp....PPp...","...KKk.....KKk..","..KKKk.....KKKk."],
 [".....PPpPPp.....",".....KKkKKk.....","....KKKkKKKk...."] ];
var HAIR_OV={
 taro:[{x:0,y:4,r:["..AAAAAAAAAAA...","AA..............","A..............."]}],
 mir: [{x:0,y:-1,r:["....h..hh..h...."]}],
 hana:[{x:0,y:2,r:[".h..............","hHh.............","hHh.............","hHh.............",".hH.............",".hh.............","..h............."]}],
 yuri:[{x:0,y:7,r:["h..............h","hH............Hh","hH............Hh","hHh..........hHh",".hh..........hh."]},{x:0,y:2,r:["...........AA...","..........AAA..."]}],
 leon:[{x:0,y:3,r:[".TTTTTTTTTTTTTT.",".......A........"]}]
};
var BODY_OV={ mir:[{x:0,y:11,r:["..TTTTTTTTTTTT..","..TT........TT.."]}] };
var HAT={
 wizard:{y:-6,r:["..........xX....",".........xXX....","........xXXX....",".......xXXXXX...","......xXXXYXXX..",".....xXXXXXXXXX.","..xxxxXXXXXXXXXx","..xxxxxxxxxxxxx."]},
 crown: {y:-3,r:["...Y...Y...Y....","...X..XXX..X....","...XXXXXXXXX....","...XYXXYXXYX....","...xxxxxxxxx...."]},
 horns: {y:-4,r:["W..............W","WW............WW",".WW..........WW.","..WxXXXXXXXXXW..","..xXXXXXXXXXXx..","..xXXXXYXXXXXx..","..xxxxxxxxxxxx.."]},
 flower:{y:1,r:["..GYGRGYGRGYG...",".G.G.G.G.G.G.G.."]},
 phones:{y:0,r:["...xxxxxxxxx....","..x.........x...","..x.........x...","..x.........x...","..x.........x...",".XX.........XX..",".XY.........YX..",".XX.........XX.."]},
 halo:  {y:-4,r:["....YYYYYYYY....","...Y........Y...","....YYYYYYYY...."]},
 fox:   {y:5,r:["...WWWWWWWWWW...","..WWWWWWWWWWWW..","..WWRRWWWWRRWW..","..WWWWWWWWWWWW..","...WWWWxWWWWW...",".....WWWW......."]},
 owl:   {y:-2,r:["..X..........X..","..XX........XX..","..XXXXXXXXXXXX..","..xXXXXYXXXXXx..","..xxxxxxxxxxxx.."]},
 brim:  {y:-2,r:["......XXXX......",".....XXXXXX.....","....YYYYYYYY....","..xxxxxxxxxxxx.."]}
};
var HAT_OF={
 cos_hat1:['wizard',{X:'#4a6ad0',x:'#33489a',Y:'#ffe070'}], cos_hat7:['wizard',{X:'#3a3a9a',x:'#26266a',Y:'#ffe070'}],
 cos_hat2:['crown',{X:'#ffd040',x:'#b08a20',Y:'#ff5a8a'}], cos_hat13:['crown',{X:'#ffd040',x:'#b08a20',Y:'#ffffff'}],
 cos_hat11:['crown',{X:'#c03a1a',x:'#7a2210',Y:'#ffca4b'}], cos_hat12:['crown',{X:'#8fd8ff',x:'#4a8ab0',Y:'#ffffff'}],
 cos_hat5:['horns',{X:'#7a828e',x:'#4a5260',Y:'#aab2c0',W:'#e8e2d4'}], cos_hat10:['horns',{X:'#6a2a2a',x:'#3a1616',Y:'#ff7a2e',W:'#e0e0d0'}],
 cos_hat6:['flower',{G:'#3a7a3a',Y:'#ffe070',R:'#ff9ac4'}], cos_hat8:['phones',{x:'#2a2a34',X:'#e04a6a',Y:'#ff8aa0'}],
 cos_hat9:['halo',{Y:'#ffe98a'}], cos_hat4:['fox',{W:'#f4f0ea',R:'#c03a3a',x:'#2a2030'}],
 cos_owl:['owl',{X:'#8a6a3e',x:'#5a4228',Y:'#e0a030'}]
};
var CAPE={x:-1,y:11,r:["..CC............",".CCCc...........","cCCCc...........","cCCCc...........","cCCCCc..........","cCCCCc..........",".cCCCc..........","..ccc..........."]};
var WING={x:-5,y:6,r:["......wW.","....wWWW.","..wWWWWW.",".wWWWWWw.","wWWWWww..","wWWww....",".ww......"]};
var CAPE_COL={cos_cape1:'#c03a3a',cos_cape2:'#9b7be0',cos_cape3:'#e0b040',cos_cape4:'#2a2036',cos_cape5:'#ff6ad0',cos_cape8:'#5ad8c0'};
var WING_COL={cos_cape6:['#f4f8ff','#b8c8e8'],cos_cape7:['#ff9a2e','#d8421e'],cos_cape9:['#fff0a8','#d8b048']};
var ROBE={x:0,y:15,r:["...bBBBBBBBBBb..","...bBBBBBBBBBb..","..bBBBBBBBBBBBb.","..bbbbbbbbbbbb.."]};
var AURA_COL={cos_aura1:'#ff7a2e',cos_aura2:'#8fd0ff',cos_aura3:'#c05aff',cos_aura4:'#7fe8ff',cos_aura5:null,cos_aura6:'#ffe14d',cos_aura7:'#ff9ac4',cos_aura8:'#ff6a2e'};

var HW=28, HH=27, HOX=6, HOY=7;
function heroSprite(id,frame,eq){
  var key='hero|'+id+'|'+frame+'|'+(eq.w?eq.w.id:'')+'|'+(eq.a?eq.a.id:'')+'|'+(eq.acc?eq.acc.id:'')+'|'+(eq.hat?eq.hat.id:'')+'|'+(eq.cape?eq.cape.id:'')+'|'+(eq.dye||'')+'|'+(eq.custom?JSON.stringify(eq.custom):'');
  if(ART.cache[key]) return ART.cache[key];
  var c=mk(HW,HH), g=c.getContext('2d');
  var base=(typeof HERO!=='undefined'&&HERO[id])||{skin:'#f4c896',hair:'#6a4420',suit:'#e0a83c',accent:'#fff2c0',trim:'#a86e18'};
  var suit=base.suit, trim=base.trim, robe=0;
  if(eq.dye){ suit=eq.dye; trim=sh(eq.dye,0.6); }
  else if(eq.a&&typeof AART!=='undefined'&&AART[eq.a.id]){ suit=AART[eq.a.id][0]; trim=AART[eq.a.id][1]; robe=AART[eq.a.id][2]; }
  var cu=eq.custom||{}, hair=cu.hair||base.hair, skin=cu.skin||base.skin;
  var pal={H:hair,h:sh(hair,0.68),S:skin,s:sh(skin,0.84),E:cu.eye?sh(cu.eye,0.55):'#2a2030',w:'#ffffff',m:'#c86060',
    B:suit,b:sh(suit,0.72),L:base.accent,T:trim,A:base.accent,P:'#3a3050',p:'#2a2238',K:'#5a3a22',k:'#7a5232'};
  function lay(o,p){ paint(g,o.r,HOX+(o.x||0),HOY+o.y,p); }
  // 망토/날개 (몸 뒤)
  if(eq.cape){
    if(WING_COL[eq.cape.id]){ var wc=WING_COL[eq.cape.id]; lay(WING,{W:wc[0],w:wc[1]}); }
    else { var cc=CAPE_COL[eq.cape.id]||'#c03a3a'; lay(CAPE,{C:cc,c:sh(cc,0.65)}); }
  }
  // 몸
  paint(g,HERO_BODY,HOX,HOY,pal);
  paint(g,LEGS[frame]||LEGS[0],HOX,HOY+16,pal);
  (HAIR_OV[cu.style||id]||HAIR_OV[id]||[]).forEach(function(o){ lay(o,pal); });
  (BODY_OV[id]||[]).forEach(function(o){ lay(o,pal); });
  if(robe) lay(ROBE,pal);
  // 장신구
  if(eq.acc){
    var ai=eq.acc.id, it=G.itemById&&G.itemById[ai], tc=(it&&typeof tierColor==='function')?tierColor(it):'#ffe070';
    if(ai==='ac_crown'&&!eq.hat) lay(HAT.crown,{X:'#ffd040',x:'#b08a20',Y:'#ff5a8a'});
    else if(ai==='ac_halo'&&!eq.hat) lay(HAT.halo,{Y:'#e8d0ff'});
    else if(ai==='ac_glass') paint(g,["YYYY.YYYY","Y..Y.Y..Y"],HOX+5,HOY+7,{Y:'#cfe8ff'});
    else { dot(g,HOX+8,HOY+11,'#ffe070'); box(g,HOX+8,HOY+12,1,2,tc.charAt(0)==='#'?tc:'#ffe070'); }
  }
  // 모자
  if(eq.hat){
    var hs=HAT_OF[eq.hat.id]||['brim',{X:'#d0a850',x:'#8a6a30',Y:'#a5763f'}];
    lay(HAT[hs[0]],hs[1]);
  }
  // 무기 (앞)
  if(eq.w&&typeof WART!=='undefined'){
    var wa=WART[eq.w.id]||['#6a4a26','#c9ccd8',1,'s'];
    var bl=(wa[1]==='RAINBOW')?'#ff8ae0':wa[1], hi=(wa[1]==='RAINBOW')?'#fff0ff':sh(bl,1.35), hd=wa[0], gd='#e0c060';
    function P(x,y,col){ dot(g,HOX+x,HOY+y,col); }
    var L=Math.round(6*wa[2]), ty=wa[3], y;
    if(ty==='p'){ for(y=17;y>=13-L;y--) P(14,y,hd); P(14,12-L,bl); P(13,11-L,bl); P(14,11-L,hi); P(15,11-L,bl); P(14,10-L,hi); P(15,14-L,'#ffe070'); }
    else if(ty==='o'){ for(y=17;y>=14-L;y--) P(14,y,hd); P(13,12-L,bl); P(14,12-L,bl); P(15,12-L,bl); P(13,13-L,bl); P(14,13-L,hi); P(15,13-L,bl); P(14,11-L,bl); P(13,12-L,'#ffffff'); }
    else if(ty==='g'){ P(14,14,hd); P(14,15,hd); for(var gx=11;gx<=17;gx++) P(gx,13,gd); for(y=12;y>=12-L;y--){ P(13,y,sh(bl,0.8)); P(14,y,bl); P(15,y,hi); } P(14,11-L,bl); }
    else if(ty==='d'){ L=Math.round(4*wa[2]); P(14,14,hd); for(var dx=13;dx<=15;dx++) P(dx,13,gd); for(y=12;y>12-L;y--){ P(14,y,bl); P(15,y,hi); } P(14,12-L,bl); }
    else { P(14,14,hd); P(14,15,hd); for(var sx2=12;sx2<=16;sx2++) P(sx2,13,gd); for(y=12;y>12-L;y--){ P(14,y,bl); P(15,y,hi); } P(14,12-L,bl); }
    P(13,14,pal.S);                                       // 무기 쥔 손
  }
  outline(c,OUTLINE);
  return (ART.cache[key]=c);
}
drawHero=function(g,id,cx,cy,h,dir,walk,eq){
  eq=(eq&&typeof eq==='object')?eq:{};
  var k=Math.max(1,Math.round(h/19)), t=now();
  var frame=walk?1+(Math.floor(t/150)%2):0;
  if(eq.aura){
    var ac=AURA_COL[eq.aura.id]; if(!ac) ac='hsl('+((t/8)%360)+',90%,65%)';
    g.save(); g.globalAlpha=(g.globalAlpha||1)*(0.3+0.15*Math.sin(t/240)); g.fillStyle=ac;
    g.beginPath(); g.ellipse(cx,cy+9*k,8*k,2.6*k,0,0,6.29); g.fill(); g.restore();
  }
  var c=heroSprite(id,frame,eq);
  var sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=false;
  g.save(); g.translate(Math.round(cx),0); if(dir<0) g.scale(-1,1);
  g.drawImage(c,-14*k,Math.round(cy-16.5*k),HW*k,HH*k);
  g.restore(); g.imageSmoothingEnabled=sm;
};

/* ═══════════════ 6. 몬스터 ═══════════════ */
var MON={
 wolf:{f:[
  ["...L.L..........","..LMLM..........",".LMMMMM......L..","LMEMMMMLLLLLLMD.","WMMMMMMMMMMMMMMD",".DMMMMMMMMMMMMD.","..DDMMMMMMMMMD..","...DMD.DDD.DMD..","...DD...D..DD...","...D....D...D...","..WW...WW..WW..."],
  ["...L.L..........","..LMLM..........",".LMMMMM.......L.","LMEMMMMLLLLLLMD.","WMMMMMMMMMMMMMMD",".DMMMMMMMMMMMMD.","..DDMMMMMMMMMD..","...DMD.DDDDMD...","..DD.....DD.D...","..D......D...D..",".WW......WW..WW."]], horns:[[2,0],[4,0]] },
 spider:{f:[
  ["......LLLL......","....LMMMMMML....","...LMMMMMMMMM...","..EMEMMMMMMMMD..","D.MMMMMMMMMMMD.D",".D.DMMMMMMMMD.D.","D.D.DDDDDDDD.D.D",".D.D..D..D..D.D.","D...D.D..D.D...D","...D..D..D..D..."],
  ["......LLLL......","....LMMMMMML....","...LMMMMMMMMM...","..EMEMMMMMMMMD..",".DMMMMMMMMMMMMD.","D..DMMMMMMMMD..D",".D.DDDDDDDDDD.D.","D.D..D....D..D.D",".D..D......D..D.","D..D........D..D"]], horns:[[6,0],[9,0]] },
 bat:{f:[
  ["D..............D","DD............DD","DMD...L..L...DMD",".DMD.LMLLML.DMD.",".DMMDMEMMEMDMMD.","..DMMMMMMMMMMD..","...DD.MWWM.DD...","......MMMM......",".......DD.......","................"],
  ["................","................","......L..L......",".....LMLLML.....","..DDDMEMMEMDDD..",".DMMMMMMMMMMMMD.","DMMDD.MWWM.DDMMD","DMD...MMMM...DMD","DD.....DD.....DD","D..............D"]], horns:[[6,1],[9,1]], fly:1 },
 slime:{f:[
  ["......LL......","....LLMMLL....","...LMMMMMMM...","..LMMMMMMMMMD.","..MMEMMMMEMMD.",".LMMEMMMMEMMMD",".MMMMMMMMMMMMD",".MMMMWWWWMMMMD","DMMMMMMMMMMMMD","DDMMMMMMMMMMDD",".DDDDDDDDDDDD."],
  ["..............","......LL......","....LLMMLL....","..LLMMMMMMML..",".LMMEMMMMEMMMD",".LMMEMMMMEMMMD","LMMMMMMMMMMMMMD","LMMMMWWWWMMMMMD","DMMMMMMMMMMMMMD","DDMMMMMMMMMMMDD",".DDDDDDDDDDDDD."]], horns:[[5,0],[8,0]] },
 golem:{f:[
  [".....LLLLLL.....","....LMMMMMMD....","....MEMMMEMD....","....MMMMMMMD....","..LLDMMMMMMDLL..",".LMMMDDDDDDMMMD.","LMMMMMMLMMMMMMMD","LMMDMMMMMMMMDMMD","LMMDMMMLMMMMDMMD",".MMD.MMMMMMM.DD.",".WW..MMMMMMM.WW.",".....MMD.MMD....",".....MMD.MMD....","....LMMD.LMMD...","....DDDD.DDDD..."],
  [".....LLLLLL.....","....LMMMMMMD....","....MEMMMEMD....","....MMMMMMMD....","..LLDMMMMMMDLL..",".LMMMDDDDDDMMMD.","LMMMMMMLMMMMMMMD","LMMDMMMMMMMMDMMD",".WWDMMMLMMMMDWW.","...D.MMMMMMM.D..",".....MMMMMMM....","....MMD..MMD....","....MMD...MMD...","...LMMD...LMMD..","...DDDD...DDDD.."]], horns:[[5,0],[10,0]] }
};
var BODY={ r1:['wolf','slime','bat'], r2:['spider','slime','spider'], r3:['spider','golem','wolf'],
           r4:['wolf','wolf','golem'], r5:['wolf','golem','bat'] };
var MONCOL={
 r1:[['#3a3f52','#6a7390'],['#3a6a2a','#6ac04a'],['#3a2a4a','#6a4a8a']],
 r2:[['#2a1a3a','#5a3a7a'],['#2a4a3a','#4a8a5a'],['#5a2a2a','#a04a3a']],
 r3:[['#6a3a10','#b0702a'],['#5a4a3a','#8a7a5a'],['#5a5a1a','#9a9a3a']],
 r4:[['#4a3a2a','#8a6a4a'],['#3a2a2a','#7a4a3a'],['#3a4450','#6a7a8a']],
 r5:[['#6a1a0a','#c04a1a'],['#3a1a3a','#7a2a5a'],['#1a0a2a','#4a2a6a']] };
var EYE={r1:'#c9aef5',r2:'#66e08a',r3:'#ffca4b',r4:'#8fa3ff',r5:'#ff6b6b'};
function monSprite(reg,sp,tier,frame){
  var key='mon|'+reg+'|'+sp+'|'+tier+'|'+frame;
  if(ART.cache[key]) return ART.cache[key];
  var body=MON[(BODY[reg]||BODY.r1)[sp]||'wolf'], col=(MONCOL[reg]||MONCOL.r1)[sp]||['#444','#888'];
  var pal={D:col[0],M:col[1],L:sh(col[1],1.35),E:tier===2?'#ff3b3b':(EYE[reg]||'#ffe14d'),W:'#f4f0e0'};
  var rows=body.f[frame%body.f.length];
  var w=0; rows.forEach(function(r){ w=Math.max(w,r.length); });
  var c=mk(w+2,rows.length+4), g=c.getContext('2d');
  paint(g,rows,1,3,pal);
  if(tier>=1){ var hc=tier===2?'#ffca4b':'#e8e8f8';
    (body.horns||[]).forEach(function(p){ dot(g,1+p[0],3+p[1]-1,hc); dot(g,1+p[0],3+p[1]-2,hc); if(tier===2) dot(g,1+p[0],3+p[1]-3,'#fff6c0'); }); }
  outline(c,OUTLINE);
  return (ART.cache[key]=c);
}
drawBeast=function(g,cx,cy,regId,tier,sp){
  var e=ART.curE, t=now();
  var ph=e?(e.tx*1.7+e.ty):cx*0.05;
  var frame=Math.floor(t/210+ph)%2;
  var body=MON[(BODY[regId]||BODY.r1)[sp||0]||'wolf'];
  var k=K()+(tier===2?1:0);
  var spr=monSprite(regId,sp||0,tier||0,frame);
  var w=spr.width*k, h=spr.height*k;
  var bottom=cy+TILE*0.4-(body.fly?TILE*0.3+Math.sin(t/200+ph)*k*2:0);
  if(tier===2){ g.save(); g.globalAlpha=0.28+0.12*Math.sin(t/240); g.fillStyle='#ff3b3b';
    g.beginPath(); g.ellipse(cx,cy+TILE*0.3,w*0.5,h*0.2,0,0,6.29); g.fill(); g.restore(); }
  var faceRight=e&&(player.x>e.tx+0.5);
  blit(g,spr,cx-w/2,bottom-h,k,faceRight);
};
var BOSS_ROWS=[
"R......................R","RR....................RR",".RR......LLLLLL......RR.","..RR...LLMMMMMMLL...RR..","...RDDLMMMMMMMMMMLDDR...",
"....DMMMMMMMMMMMMMMD....","...DMMEEEMMMMMMEEEMMD...","...DMMEEEMMMMMMEEEMMD...","..DMMMMMMMMMMMMMMMMMMD..","..DMMMDDMMMMMMMMDDMMMD..",
".DMMMDWDWDWDWDWDWDMMMMD.",".DMMMD.W.W.W.W.W.DMMMMD.","DMMMMMDDDDDDDDDDDMMMMMMD","DMLMMMMMMMMMMMMMMMMMLMMD","DMMLMMMMMLLLLMMMMMLMMMMD",
".DMMMMMMLLLLLLMMMMMMMMD.","..DMMMMMLLLLLLMMMMMMMD..","...DDMMMMMMMMMMMMMMDD...","....WWD.WWD..WWD.WWD....","....DD..DD....DD..DD...."];
var BOSSCOL={r1:['#2a2440','#5a4a8a'],r2:['#1a3a2a','#3a7a4a'],r3:['#5a3010','#a0601e'],r4:['#1a2a4a','#3a5a9a'],r5:['#4a0a14','#9a1e2a']};
drawBoss=function(g,cx,cy,regId){
  var t=now(), col=BOSSCOL[regId]||BOSSCOL.r1, k=K();
  var spr=sprite('boss|'+regId,BOSS_ROWS,{D:col[0],M:col[1],L:sh(col[1],1.4),E:'#ff3b3b',W:'#f4f0e0',R:'#e8dcc0'});
  var w=spr.width*k, h=spr.height*k, bob=Math.sin(t/500)*k;
  g.save(); g.globalAlpha=0.35+0.15*Math.sin(t/300); g.fillStyle=EYE[regId]||'#ff3b3b';
  g.beginPath(); g.ellipse(cx,cy+TILE*0.42,w*0.55,h*0.14,0,0,6.29); g.fill(); g.restore();
  blit(g,spr,cx-w/2,cy+TILE*0.45-h+bob,k);
  g.save(); g.globalAlpha=0.5+0.5*Math.sin(t/180); g.fillStyle='#ffe0e0';
  box(g,Math.round(cx-w/2+8*k),Math.round(cy+TILE*0.45-h+bob+8*k),k,k,'#ffe0e0');
  box(g,Math.round(cx-w/2+17*k),Math.round(cy+TILE*0.45-h+bob+8*k),k,k,'#ffe0e0');
  g.restore();
};
var GUARD_ROWS=[
"....LLLLLL....","...LMMMMMMD...","..LMMMMMMMMD..","..LMEEMMEEMD..","..LMEEMMEEMD..","..LMMMMMMMMD..",
"..LMMMRRMMMD..","LLDMMRMMRMMDDD","LMDMMMRRMMMDMD","LMDMMMMMMMMDMD","DD.LMMMMMMMD.D","...LMMMMMMMD..",
"...LMMDDMMMD..","...LMD..LMMD..","..DDDD..DDDD.."];
drawGuardian=function(g,cx,cy,regId){
  var t=now(), k=K(), ec=EYE[regId]||'#ffca4b';
  var spr=sprite('guard|'+regId,GUARD_ROWS,{L:'#a8a8b8',M:'#72727f',D:'#44444f',E:ec,R:sh(ec,0.8)});
  var w=spr.width*k, h=spr.height*k, x=cx-w/2, y=cy+TILE*0.42-h;
  blit(g,spr,x,y,k);
  g.save(); g.globalAlpha=0.35+0.3*Math.sin(t/300); g.fillStyle=ec;
  g.beginPath(); g.arc(x+w/2,y+5.5*k,k*4,0,6.29); g.fill(); g.restore();
};

/* ═══════════════ 7. NPC · 상자 · 모닥불 ═══════════════ */
var VILL=[
"....hhhh....","...hHHHHh...","..hHHHHHHh..","..hHSSSSHh..","..hSEwSEwh..","...SSSSSS...","....ssss....",
"...ABBBBA...","..SBBBBBBS..","..SBBTTBBS..","...BBBBBB...","...bBBBBb...","...bBBBBb...","..bbBBBBbb..","..bbbbbbbb..","...KK..KK..."];
var HAIRS=['#3a2a1a','#8a5a2a','#c0c0c8','#2a2a3a','#a04a2a','#e0c070'];
drawVillager=function(g,cx,cy,npc){
  var id=(npc&&npc.id)||'x', c=(typeof villColor==='function')?villColor(id):['#7a4a9a','#b088d0'];
  var hr=HAIRS[hashStr(id)%HAIRS.length], k=K();
  var spr=sprite('vil|'+id,VILL,{H:hr,h:sh(hr,0.7),S:'#f0c090',s:'#d8a878',E:'#2a2030',w:'#fff',B:c[0],b:sh(c[0],0.72),A:c[1],T:c[1],K:'#4a3222'});
  var bob=(Math.floor(now()/600+(hashStr(id)%7))%2)*k;
  blit(g,spr,cx-spr.width*k/2,cy+TILE*0.4-spr.height*k+bob,k);
};
var CHEST=["..DDDDDDDDDD..",".DMMMMMMMMMMD.",".DLLLLLLLLLLD.",".DMMMMGGMMMMD.","DDDDDDGGDDDDDD","DMMMMMYYMMMMMD","DMMMMMGGMMMMMD","DLLLLLLLLLLLLD","DMMMMMMMMMMMMD","DDDDDDDDDDDDDD"];
drawChest=function(g,cx,cy){
  var k=K(), spr=sprite('chest',CHEST,{D:'#5a3416',M:'#8a5a2a',L:'#b07a3a',G:'#e0b040',Y:'#fff0a0'});
  var t=now(), sp=Math.floor(t/140)%18;
  blit(g,spr,cx-spr.width*k/2,cy+TILE*0.36-spr.height*k,k);
  if(sp<3){ box(g,Math.round(cx+(sp-1)*k*3),Math.round(cy-TILE*0.3-sp*k),k,k,'#ffffff'); }
};
var LOGS=["..DD......DD..",".DMMD....DMMD.","DMLLMDDDDMLLMD","DDMMDMMMMDMMDD",".DDDDDDDDDDDD."];
var FLAME=[
 ["....Y.....","...YO.....","..YOOY..Y.","..OORRY.O.",".OORRROOO.",".ORRWWROO.","ORRWWWRRO.",".RRWWWRRR.","..RRRRRR.."],
 [".....Y....",".....OY...",".Y..YOOY..",".O.YRROO..",".OOORRROO.",".OORWWRRO.",".ORRWWWRRO",".RRRWWWRR.","..RRRRRR.."]];
drawFire=function(g,cx,cy){
  var k=K(), t=now(), fr=Math.floor(t/120)%2;
  var logs=sprite('logs',LOGS,{D:'#3a2414',M:'#6e4a26',L:'#9a6a3a'});
  var fl=sprite('flame'+fr,FLAME[fr],{Y:'#ffca4b',O:'#ff8a2e',R:'#e0421e',W:'#fff4b0'},true);
  var bx=cx-logs.width*k/2, by=cy+TILE*0.4-logs.height*k;
  blit(g,fl,cx-fl.width*k/2,by-fl.height*k+2*k,k);
  blit(g,logs,bx,by,k);
  if(Math.floor(t/90)%5===0) box(g,Math.round(cx+((t/37)%9-4)*k),Math.round(by-12*k-((t/20)%10)*k),k,k,'#ffca4b');
  pushLight(cx,cy,TILE*3,'#ff9a3a');
};

/* 몬스터 방향 전환용: 지금 그리는 엔티티 기억 */
var _des=drawEntitySprite;
drawEntitySprite=function(g,e,cx,cy,T){ ART.curE=e; try{ _des(g,e,cx,cy,T); } finally { ART.curE=null; } };

ART.lib={mk:mk,paint:paint,outline:outline,sh:sh,HAT_OF:HAT_OF,HAIR_OV:HAIR_OV};

/* 이미 그려진 아바타(캐릭터 선택·랭킹)도 새 도트로 다시 그리기 */
setTimeout(function(){ try{ if(typeof paintHeroAvatars==='function') paintHeroAvatars(document); }catch(e){} },300);
try{ var ver=document.getElementById('ver'); if(ver) ver.textContent='빌드 v12 도트 아트'; }catch(e){}
})();
