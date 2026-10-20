/* Urban Decay · interiors: walkable rooms built from ASCII floor plans (one character = 2 m).
   Only one interior is loaded at a time. It is built far below the city, and while you are inside
   the outdoor world is hidden, its lights are borrowed for ceiling fixtures, and hostiles in the
   rooms chase you along a breadth-first flow field over the floor grid. */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;
const {scene,C,clamp,M,boxUV,Merger,canvasTex}=UD;
const A=UD.Actors,PI=Math.PI,CS=2,WH=3.4,O={x:3000,y:-600,z:3000};
const W1=new THREE.Color(1,1,1);

/* ======================= textures ======================= */
function speck(x,w,h,n,a,dark=60){for(let i=0;i<n;i++){const v=(Math.random()*dark)|0;x.fillStyle=`rgba(${v},${v*.9|0},${v*.8|0},${a*Math.random()})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}}
function streaks(x,w,h,n,a=.32){for(let i=0;i<n;i++){const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(30,22,16,0)');g.addColorStop(1,`rgba(30,22,16,${a})`);x.fillStyle=g;x.fillRect(Math.random()*w,Math.random()*h*.5,1+Math.random()*3,h);}}
function cracks(x,w,h,n){x.strokeStyle='rgba(30,24,18,.45)';x.lineWidth=1;for(let i=0;i<n;i++){let px=Math.random()*w,py=Math.random()*h;x.beginPath();x.moveTo(px,py);for(let j=0;j<6;j++){px+=(Math.random()-.5)*20;py+=(Math.random()-.5)*20;x.lineTo(px,py);}x.stroke();}}
const TX={
  tile:canvasTex(128,128,(x,w,h)=>{for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.fillStyle=(i+j)%2?'#b3ac9e':'#857d70';x.fillRect(i*32,j*32,32,32);}
    x.strokeStyle='rgba(30,26,20,.5)';for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,h);x.stroke();x.beginPath();x.moveTo(0,i*32);x.lineTo(w,i*32);x.stroke();}speck(x,w,h,1600,.35);cracks(x,w,h,3);}),
  wood:canvasTex(128,128,(x,w,h)=>{for(let i=0;i<8;i++){const v=90+(Math.random()*40|0);x.fillStyle=`rgb(${v},${v*.68|0},${v*.42|0})`;x.fillRect(0,i*16,w,16);x.fillStyle='rgba(20,12,6,.6)';x.fillRect(0,i*16,w,1);x.fillRect((Math.random()*w)|0,i*16,1,16);
    for(let k=0;k<30;k++){x.fillStyle='rgba(40,24,12,.18)';x.fillRect(Math.random()*w,i*16+Math.random()*16,10+Math.random()*30,1);}}speck(x,w,h,900,.3);}),
  carpet:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#4a2626';x.fillRect(0,0,w,h);for(let i=0;i<6000;i++){const v=(Math.random()*40)|0;x.fillStyle=`rgba(${80+v},${30+v*.5|0},${30+v*.5|0},.5)`;x.fillRect(Math.random()*w,Math.random()*h,1,1);}
    x.strokeStyle='rgba(180,140,60,.25)';x.lineWidth=2;x.strokeRect(8,8,w-16,h-16);for(let i=0;i<5;i++){x.fillStyle='rgba(20,12,10,.35)';x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*16,5+Math.random()*10,Math.random()*3,0,7);x.fill();}}),
  grate:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#3e413f';x.fillRect(0,0,w,h);x.strokeStyle='#22241f';x.lineWidth=3;for(let i=0;i<=w;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke();}
    x.strokeStyle='rgba(140,140,130,.35)';x.lineWidth=1;for(let i=1;i<=w;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}speck(x,w,h,900,.4);for(let i=0;i<5;i++){x.fillStyle='rgba(120,60,20,.3)';x.fillRect(Math.random()*w,Math.random()*h,6+Math.random()*12,4+Math.random()*10);}}),
  plaster:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#b9ad96';x.fillRect(0,0,w,h);x.fillStyle='#6a5a46';x.fillRect(0,h*.62,w,h*.38);x.fillStyle='#4a3d2e';x.fillRect(0,h*.6,w,4);x.fillRect(0,h-8,w,8);
    speck(x,w,h,1200,.22);streaks(x,w,h,6,.22);cracks(x,w,h*.6,2);}),
  block:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#8c877f';x.fillRect(0,0,w,h);x.strokeStyle='rgba(40,36,30,.55)';x.lineWidth=2;
    for(let y=0;y<h;y+=27){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();const off=(y/27)%2?32:0;for(let k=off;k<=w;k+=64){x.beginPath();x.moveTo(k,y);x.lineTo(k,y+27);x.stroke();}}
    speck(x,w,h,900,.2);streaks(x,w,h,8,.3);}),
  wtile:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#d6d4cb';x.fillRect(0,0,w,h);x.fillStyle='#4f7a74';x.fillRect(0,h*.55,w,6);x.fillStyle='#c4c2b8';x.fillRect(0,h*.58,w,h*.42);
    x.strokeStyle='rgba(90,90,84,.5)';x.lineWidth=1;for(let i=0;i<=w;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}for(let j=0;j<=h;j+=16){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke();}
    speck(x,w,h,1600,.35);streaks(x,w,h,7,.38);cracks(x,w,h,3);}),
  metal:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#5e6560';x.fillRect(0,0,w,h);x.strokeStyle='rgba(20,24,22,.7)';x.lineWidth=2;x.strokeRect(2,2,w-4,h*.48);x.strokeRect(2,h*.5,w-4,h*.38);
    x.fillStyle='#262a28';for(const yy of[6,h*.48-4,h*.5+4,h*.88-6])for(const xx of[6,w-8]){x.beginPath();x.arc(xx,yy,2,0,7);x.fill();}
    for(let i=-20;i<w;i+=20){x.fillStyle='#d9a91c';x.beginPath();x.moveTo(i,h);x.lineTo(i+10,h*.9);x.lineTo(i+20,h*.9);x.lineTo(i+10,h);x.fill();}x.fillStyle='#14110c';x.fillRect(0,h*.9-2,w,2);
    speck(x,w,h,1600,.35);streaks(x,w,h,6,.45);for(let i=0;i<4;i++){x.fillStyle='rgba(120,60,20,.32)';x.fillRect(Math.random()*w,Math.random()*h,4+Math.random()*8,10+Math.random()*30);}}),
  panel:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#5a3a24';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=32){x.fillStyle='rgba(20,10,4,.45)';x.fillRect(i,0,2,h);x.strokeStyle='rgba(200,150,90,.18)';x.strokeRect(i+6,10,20,h*.45);x.strokeRect(i+6,h*.55,20,h*.4);}
    x.fillStyle='#3a2414';x.fillRect(0,h*.5,w,5);speck(x,w,h,1400,.3);streaks(x,w,h,5);}),
  brick:canvasTex(128,218,(x,w,h)=>{x.fillStyle='#6e3d2e';x.fillRect(0,0,w,h);x.strokeStyle='rgba(190,170,140,.35)';x.lineWidth=1;
    for(let y=0;y<h;y+=8){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();for(let k=((y/8)%2)*8;k<w;k+=16){x.beginPath();x.moveTo(k,y);x.lineTo(k,y+8);x.stroke();}}speck(x,w,h,2000,.4);streaks(x,w,h,8,.45);}),
  cfloor:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#6f6a62';x.fillRect(0,0,w,h);for(let i=0;i<14;i++){x.fillStyle=`rgba(${Math.random()<.5?40:150},${Math.random()<.5?36:140},30,.07)`;x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,10+Math.random()*30,8+Math.random()*20,Math.random()*3,0,7);x.fill();}
    speck(x,w,h,700,.18);x.strokeStyle='rgba(30,26,22,.45)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,1);x.lineTo(w,1);x.moveTo(1,0);x.lineTo(1,h);x.stroke();cracks(x,w,h,2);
    x.fillStyle='rgba(30,24,18,.25)';x.beginPath();x.ellipse(w*.6,h*.55,16,10,.4,0,7);x.fill();}),
  ceil:canvasTex(64,64,(x,w,h)=>{x.fillStyle='#55524c';x.fillRect(0,0,w,h);x.strokeStyle='rgba(20,18,16,.6)';x.strokeRect(0,0,w,h);x.strokeRect(0,0,w/2,h/2);x.strokeRect(w/2,h/2,w/2,h/2);speck(x,w,h,500,.4);
    x.fillStyle='rgba(60,40,20,.35)';x.beginPath();x.ellipse(40,20,10,7,0,0,7);x.fill();}),
  paper:canvasTex(32,32,(x,w,h)=>{x.fillStyle='#d8d0bc';x.fillRect(0,0,w,h);x.fillStyle='rgba(40,34,26,.6)';for(let y=5;y<h-3;y+=4)x.fillRect(4,y,w-8-(Math.random()*10|0),1);}),
};


/* ======================= materials ======================= */
const std=o=>new THREE.MeshStandardMaterial(Object.assign({vertexColors:true,roughness:.9},o));
const glowM=(c,e,i=1.4)=>new THREE.MeshStandardMaterial({color:C(c),emissive:C(e),emissiveIntensity:i,roughness:.5});
const MAT={
  f_tile:std({map:TX.tile,roughness:.55}),f_wood:std({map:TX.wood}),f_carpet:std({map:TX.carpet,roughness:1}),f_grate:std({map:TX.grate,roughness:.5,metalness:.5}),f_conc:std({map:TX.cfloor}),
  w_plaster:std({map:TX.plaster}),w_block:std({map:TX.block}),w_tile:std({map:TX.wtile,roughness:.6}),w_metal:std({map:TX.metal,roughness:.55,metalness:.45}),w_panel:std({map:TX.panel}),w_brick:std({map:TX.brick}),
  ceil:std({map:TX.ceil,roughness:1}),
  wood:std({}),metal:std({roughness:.5,metalness:.55}),plain:std({roughness:.85}),cloth:std({roughness:1,side:THREE.DoubleSide}),
  paper:new THREE.MeshStandardMaterial({map:TX.paper,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),
  decal:std({roughness:1,polygonOffset:true,polygonOffsetFactor:-2,transparent:true,opacity:.7,depthWrite:false}),
  glow:glowM(0xfff0c0,0xffd9a0,1.5),dead:std({roughness:.6}),
  screen:glowM(0x0a1a14,0x3ad8a0,.55),amber:glowM(0x2a1a08,0xffa040,1.4),fire:glowM(0x401808,0xff7a20,2.2),
  green:glowM(0x1a2a10,0x9cff5a,1.1),exit:glowM(0x0a2a12,0x3aff6a,1.6),red:glowM(0x2a0808,0xff3a2a,1.4),blue:glowM(0x0a1a2a,0x5ab8ff,1.1),
  dark:new THREE.MeshStandardMaterial({color:0x050505,roughness:1}),
  win:new THREE.MeshStandardMaterial({color:0x111214,emissive:0xffffff,emissiveIntensity:.9,roughness:.2,metalness:.3}),
};
UD.winMat=MAT.win;

/* ======================= themes ======================= */
// amb: hemisphere light · lit: share of ceiling fixtures still working · li: fixture light strength · flick: share that flicker
const THEMES=UD.ITHEMES={
  shelter:{floor:'f_conc',wall:'w_block',amb:.42,lit:1,li:2.2,flick:0,warm:0xffc890,mess:.06},
  tower:{floor:'f_conc',wall:'w_plaster',amb:.48,lit:1,li:2.1,flick:0,warm:0xffd2a0,mess:.05},
  gutted:{floor:'f_conc',wall:'w_block',amb:.32,lit:.5,li:1.8,flick:.4,warm:0xffb070,mess:.5},
  house:{floor:'f_wood',wall:'w_plaster',amb:.2,lit:.4,li:1.6,flick:.5,warm:0xffb070,mess:.35,boards:true},
  shop:{floor:'f_tile',wall:'w_plaster',amb:.22,lit:.45,li:1.7,flick:.5,warm:0xffe0b0,mess:.35,boards:true},
  clinic:{floor:'f_tile',wall:'w_tile',amb:.2,lit:.45,li:1.9,flick:.6,warm:0xe0f0ff,mess:.35},
  office:{floor:'f_carpet',wall:'w_plaster',amb:.2,lit:.35,li:1.7,flick:.5,warm:0xfff0d0,mess:.4},
  industrial:{floor:'f_conc',wall:'w_block',amb:.24,lit:.4,li:2,flick:.4,warm:0xffd090,mess:.4},
  church:{floor:'f_wood',wall:'w_block',amb:.24,lit:.5,li:1.6,flick:.3,warm:0xffb060,mess:.3},
  library:{floor:'f_wood',wall:'w_panel',amb:.2,lit:.4,li:1.6,flick:.4,warm:0xffc070,mess:.4},
  theater:{floor:'f_carpet',wall:'w_panel',amb:.16,lit:.35,li:1.6,flick:.5,warm:0xff9a60,mess:.35},
  vault:{floor:'f_grate',wall:'w_metal',amb:.14,lit:.55,li:2,flick:.45,warm:0xc8e0ff,mess:.3,alarm:true},
};

/* ======================= what each character is ======================= */
// h: how tall it stands (blocks shots and sight below that height) · loot: search table · st: station
const OBJ={
  f:{h:2.1,loot:'food'},w:{h:1.4,loot:'water'},m:{h:2,loot:'medical'},a:{h:1.3,loot:'military'},s:{h:1,loot:'scrap'},t:{h:1.6,loot:'tech'},
  c:{h:2.2,loot:'cloth'},u:{h:1,loot:'fuel'},'$':{h:1,loot:'safe'},n:{h:2,loot:'fridge'},g:{h:2,loot:'armory'},e:{h:.95,loot:'drawers'},
  o:{h:.8},d:{h:1},k:{h:2.2},p:{h:WH},x:{h:1},y:{h:.6},j:{h:.9},q:{h:1.4},N:{h:1,note:true},
  B:{h:1,st:'bench'},W:{h:1,st:'workshop'},V:{h:1,st:'fbench'},K:{h:1,st:'kitchen'},C:{h:.9,st:'stove'},M:{h:1,st:'medbay'},L:{h:2.1,st:'locker'},
  T:{h:2,st:'plan'},R:{h:1.1,st:'radio'},P:{h:2,st:'purifier'},G:{h:1.6,st:'power'},H:{h:2,st:'farm'},D:{h:1.2,st:'defense'},Z:{h:1.2,st:'bed'},
  '^':{h:WH,st:'up'},v:{h:.5,st:'down'},X:{h:WH,st:'exit'},
};
UD.IOBJ=OBJ;
const isWall=ch=>ch==='#'||ch==='='||ch===' ';
const ENEMY={'1':'ghoul','2':'hound','3':'raider','4':'brute'};

/* ======================= state ======================= */
let cur=null;const hidden=[];
const In=UD.In={O,CS,WH,get cur(){return cur;},load,unload,collide,ray,los,passable,cellAt:(x,z)=>cur?cur.cell(x,z):[0,0],update,hideBeacon};

/* ======================= building an interior ======================= */
function load(def){
  unload();
  const rows=def.map,h=rows.length,w=Math.max(...rows.map(r=>r.length));
  const th=THEMES[def.theme]||THEMES.house;
  let sd=(Math.floor(UD.hash(def.seed|0,911)*2147483640)|0)+1;const rnd=()=>{sd=(sd*16807)%2147483647;return(sd-1)/2147483646;};const R=(a,b)=>a+rnd()*(b-a);const pick=a=>a[(rnd()*a.length)|0];
  const x0=O.x-w*CS/2,z0=O.z-h*CS/2;
  const I={id:def.id,def,w,h,th,cells:[],objs:[],fix:[],enemies:[],group:new THREE.Group(),flow:null,fcell:-1,lightT:0,
    ctr:(i,j)=>[x0+(i+.5)*CS,z0+(j+.5)*CS],cell:(x,z)=>[Math.floor((x-x0)/CS),Math.floor((z-z0)/CS)]};
  const at=(i,j)=>i<0||j<0||i>=w||j>=h?' ':(rows[j][i]||' ');
  // NPC spots: the first few ':' cells become survivors, the rest are plain floor
  let npcLeft=def.npcs||0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){let ch=at(i,j);
    if(ch===':'){if(npcLeft>0){npcLeft--;ch='@';}else ch='.';}
    const c={ch,i,j,solid:false,hgt:0};
    if(isWall(ch)||ch==='X'){c.solid=true;c.hgt=WH;}
    else if(ch==='@'){c.solid=true;c.hgt=1.9;}
    else if(OBJ[ch]){c.solid=true;c.hgt=OBJ[ch].h;}
    I.cells.push(c);}
  const C_=(i,j)=>I.cells[j*w+i];
  const open=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&!C_(i,j).solid;
  const mg={};const add=(k,g,m,col=W1)=>(mg[k]||(mg[k]=new Merger())).add(g,m,col);
  // facing: toward the first open neighbour (prefer the one with the most open room behind it)
  const DIRS=[[0,1],[0,-1],[1,0],[-1,0]];
  function faceOf(i,j){let best=null,bs=-1;for(const [dx,dz] of DIRS){if(!open(i+dx,j+dz))continue;let s=1;if(open(i+2*dx,j+2*dz))s++;if(open(i+dx+dz,j+dz+dx))s+=.5;if(s>bs){bs=s;best=[dx,dz];}}return best||[0,1];}
  const Y=O.y;
  // a local frame per object: +z faces the open floor
  function frame(i,j){const [x,z]=I.ctr(i,j),[dx,dz]=faceOf(i,j),yaw=Math.atan2(dx,dz),cs=Math.cos(yaw),sn=Math.sin(yaw);
    return{x,z,yaw,dx,dz,P:(k,g,lx,ly,lz,col=W1,rx=0,ry=0,rz=0)=>add(k,g,M(x+lx*cs+lz*sn,Y+ly,z-lx*sn+lz*cs,rx,yaw+ry,rz),col)};}
  const BX=(a,b,c)=>new THREE.BoxGeometry(a,b,c);
  const col=h=>C(h),tint=(h,v=.15)=>C(h).multiplyScalar(1-v*rnd());

  /* ---- floor, ceiling, walls ---- */
  const fM=th.floor,wM=th.wall;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=C_(i,j),ch=c.ch,[x,z]=I.ctr(i,j);
    if(ch===' ')continue;
    if(isWall(ch)){let near=false;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const n=at(i+di,j+dj);if(!isWall(n)&&n!=='X')near=true;}
      if(!near)continue;add(wM,boxUV(CS,WH,CS,CS,WH,true),M(x,Y+WH/2,z),tint(0xffffff,.12));
      if(ch==='=')for(const [dx,dz] of DIRS){if(!open(i+dx,j+dz)&&!(OBJ[at(i+dx,j+dz)]))continue;const fx=x+dx*(CS/2+.015),fz=z+dz*(CS/2+.015),ry=Math.atan2(dx,dz);
        add('win',new THREE.PlaneGeometry(1.3,1.2),M(fx,Y+1.9,fz,0,ry,0));
        for(const s of[-1,1])add('metal',BX(.08,1.32,.06),M(fx+Math.cos(ry)*s*.66,Y+1.9,fz-Math.sin(ry)*s*.66,0,ry,0),col(0x3a3632));
        add('metal',BX(1.4,.08,.08),M(fx,Y+1.28,fz,0,ry,0),col(0x3a3632));
        if(th.boards)for(let b=0;b<2;b++)add('wood',BX(1.5,.18,.05),M(fx+dx*.03,Y+1.6+b*.55,fz+dz*.03,0,ry,R(-.25,.25)),tint(0x7a5a3a,.3));}
      continue;}
    if(ch==='X')continue;
    if(ch!=='v')add(fM,boxUV(CS,.1,CS,CS,CS,false),M(x,Y-.05,z),tint(0xffffff,.1));
    if(ch!=='^')add('ceil',boxUV(CS,.1,CS,CS,CS,false),M(x,Y+WH+.05,z),W1);}

  /* ---- props: everything a character can be ---- */
  const goods={food:[0xc8462a,0xd8a03a,0x8a6a3a,0xd8c8a0,0x5a7a3a],water:[0x3a7ab8,0x5a9ad8,0x2a5a8a],med:[0xe8e4dc,0xd8d0c4,0xb02a22],tech:[0x3a3e42,0x2a2e30,0x4a4e52]};
  function shelf(P,pal,n=3,wd=1.8){const m=col(0x4a4c4a);for(const sx of[-1,1])for(const sz of[-.78,-.22])P('metal',BX(.05,2.1,.05),sx*wd/2*.97,1.05,sz,m);
    for(let s=0;s<n;s++){const y=.15+s*.68;P('metal',BX(wd,.04,.6),0,y,-.5,m);
      if(pal)for(let k=0;k<5;k++){if(rnd()<.3)continue;const bw=R(.18,.32),bh=R(.18,.4);P('plain',BX(bw,bh,R(.18,.35)),-wd/2+.2+k*(wd-.4)/4,y+.02+bh/2,-.5+R(-.08,.08),tint(pick(pal),.25),0,R(-.3,.3),0);}}}
  function cabinet(P,c,wd=1.6,hh=2.1){P('wood',BX(wd,hh,.65),0,hh/2,-.6,c);P('dark',BX(.02,hh*.9,.02),0,hh/2,-.27,W1);for(const s of[-1,1])P('metal',BX(.04,.2,.04),s*.12,hh*.5,-.26,col(0xb8b2a4));}
  function table(P,wd=1.6,dp=1,top=0x6a4a2e){P('wood',BX(wd,.06,dp),0,.78,0,col(top));for(const sx of[-1,1])for(const sz of[-1,1])P('wood',BX(.06,.76,.06),sx*(wd/2-.08),.38,sz*(dp/2-.08),col(0x3a2a1a));}
  function bed(P,bunk){const fr=col(0x4a4a46);P('metal',BX(1,.3,1.9),0,.35,-.0,fr);P('cloth',BX(.92,.14,1.8),0,.56,0,tint(0x8a8270,.3));P('cloth',BX(.6,.1,.3),0,.68,.68,col(0xd8d0bc));
    if(bunk){for(const sx of[-1,1])for(const sz of[-1,1])P('metal',BX(.05,1.9,.05),sx*.48,.95,sz*.93,fr);P('metal',BX(1,.1,1.9),0,1.45,0,fr);P('cloth',BX(.92,.12,1.8),0,1.56,0,tint(0x6a7258,.3));}
    P('cloth',BX(.94,.05,1.1),0,.64,-.35,tint(pick([0x6a3a2a,0x3a4a6a,0x5a5a3a,0x7a6a4a]),.2));}
  function crates(P,n=3){for(let k=0;k<n;k++){const s=R(.55,.8);P('wood',boxUV(s,s,s,.8,.8,false),R(-.4,.4),s/2+(k>1?.75:0),R(-.4,.3),tint(0x8a6a3a,.3),0,R(-.4,.4),0);}}
  function rubble(P){for(let k=0;k<7;k++){const s=R(.25,.6);P('plain',new THREE.DodecahedronGeometry(s,0),R(-.7,.7),s*.5,R(-.7,.7),tint(0x8a837a,.3),rnd()*3,rnd()*3,0);}
    P('plain',boxUV(1.2,.12,.8,1,1,true),R(-.3,.3),.35,R(-.3,.3),col(0x7a756d),R(-.4,.4),rnd()*3,R(-.3,.3));for(let k=0;k<3;k++)P('metal',BX(.05,R(.8,1.6),.05),R(-.6,.6),.5,R(-.6,.6),col(0x4a3326),R(-.8,.8),0,R(-.8,.8));}
  function stove(P,camp){if(camp){P('metal',BX(.9,.5,.6),0,.25,-.2,col(0x3a3a38));P('metal',new THREE.CylinderGeometry(.18,.18,.12,10),-.2,.56,-.2,col(0x222222));P('fire',new THREE.CylinderGeometry(.12,.12,.03,10),-.2,.63,-.2);
      P('metal',new THREE.CylinderGeometry(.16,.14,.24,10),.2,.62,-.2,col(0x6a6a66));P('metal',new THREE.CylinderGeometry(.22,.22,.6,10),.55,.3,-.55,col(0x8a3a22));return;}
    P('metal',BX(1.8,.92,.7),0,.46,-.6,col(0xb8b4aa));P('metal',BX(1.8,.04,.7),0,.94,-.6,col(0x2a2a2a));for(const sx of[-.5,.5])for(const sz of[-.75,-.45])P('fire',new THREE.CylinderGeometry(.1,.1,.02,10),sx,.97,sz);
    P('metal',new THREE.CylinderGeometry(.2,.18,.28,12),-.5,1.1,-.45,col(0x7a7a76));P('metal',BX(1.8,.6,.08),0,1.3,-.95,col(0x9a968c));P('dark',BX(1.2,.4,.02),0,.42,-.24,W1);}
  function bench(P,heavy){P('wood',BX(1.9,.1,.9),0,.9,-.45,col(heavy?0x4a4e52:0x6a4a2e));for(const sx of[-1,1])for(const sz of[-.85,-.1])P('metal',BX(.08,.88,.08),sx*.88,.44,sz,col(0x3a3a3a));
    P('wood',BX(1.9,1.2,.05),0,1.6,-.95,col(0x7a6a4a));for(let k=0;k<6;k++)P('metal',BX(.05,R(.2,.45),.05),-.7+k*.28,1.7,-.9,col(0xa8a49a),0,0,R(-.3,.3));
    P('metal',BX(.3,.2,.25),.6,1.05,-.5,col(0x3a5a7a));P('plain',BX(.4,.08,.3),-.4,.98,-.4,col(0x8a7a5a));
    if(heavy){P('metal',BX(.6,.4,.4),-.5,1.15,-.55,col(0x5a6a5a));P('metal',new THREE.CylinderGeometry(.06,.06,.5,8),-.1,1.15,-.55,col(0x9a9a9a),0,0,PI/2);P('amber',BX(.08,.08,.02),-.5,1.25,-.34);}}
  function lockers(P){for(let k=0;k<3;k++){P('metal',BX(.58,2,.55),-.6+k*.6,1,-.65,tint(0x4a5a6a,.15));P('dark',BX(.36,.04,.01),-.6+k*.6,1.7,-.37,W1);P('dark',BX(.36,.04,.01),-.6+k*.6,1.6,-.37,W1);P('metal',BX(.04,.14,.03),-.42+k*.6,1.05,-.36,col(0xc8c0a8));}}
  function radio(P){table(P,1.8,.8,0x4a3a2a);P('metal',BX(.9,.5,.4),-.3,1.06,-.15,col(0x3a3e36));P('amber',BX(.5,.14,.02),-.3,1.1,.06);P('screen',BX(.3,.22,.02),.45,1.0,.0);
    P('metal',BX(.04,.9,.04),.7,1.25,-.25,col(0x8a8a8a));P('metal',new THREE.CylinderGeometry(.12,.12,.06,10),.1,.84,.15,col(0x1a1a1a),PI/2,0,0);}
  function board(P){P('wood',BX(.06,2,.06),-.7,1,-.5,col(0x4a3a2a));P('wood',BX(.06,2,.06),.7,1,-.5,col(0x4a3a2a));P('plain',BX(1.6,1.1,.04),0,1.4,-.5,col(0x2a3a5a));
    P('blue',BX(1.4,.9,.01),0,1.4,-.47);for(let k=0;k<4;k++)P('paper',new THREE.PlaneGeometry(.28,.36),-.5+k*.33,1.42+R(-.15,.15),-.455,W1,0,0,R(-.2,.2));}
  function tank(P){P('metal',new THREE.CylinderGeometry(.6,.6,1.9,14),0,.95,-.2,col(0x3a6a9a));P('blue',BX(.12,1.2,.02),0,.95,.41);P('metal',new THREE.CylinderGeometry(.06,.06,1.2,6),.5,2.3,-.5,col(0x8a8a8a));}
  function gen(P){P('metal',BX(1.6,1.2,1.1),0,.6,-.3,col(0xc8a02a));P('metal',BX(1.62,.15,1.12),0,.95,-.3,col(0x2a2a2a));P('red',BX(.12,.12,.02),.55,1.05,.26);P('metal',new THREE.CylinderGeometry(.08,.08,1.4,8),-.6,1.6,-.6,col(0x3a3632));}
  function farm(P){for(let s=0;s<3;s++){P('metal',BX(1.8,.06,.7),0,.4+s*.62,-.4,col(0x5a5a58));P('green',BX(1.6,.03,.5),0,.95+s*.62,-.4);for(let k=0;k<4;k++)P('cloth',new THREE.IcosahedronGeometry(R(.12,.2),0),-.6+k*.4,.55+s*.62,-.4,tint(0x4a8a2a,.3));}
    for(const sx of[-1,1])P('metal',BX(.05,2,.05),sx*.88,1,-.4,col(0x5a5a58));}
  function console_(P,c){P('metal',BX(1.4,1,.6),0,.5,-.3,col(0x4a5236));P('metal',BX(1.4,.06,.5),0,1.05,-.15,col(0x2a2a2a),-.4,0,0);P(c||'screen',BX(.6,.3,.02),0,1.1,.06,W1,-.4,0,0);P('red',BX(.08,.08,.02),.45,1.05,.1);P('amber',BX(.08,.08,.02),.3,1.05,.1);}
  function medtable(P){P('metal',BX(.8,.08,1.9),0,.85,0,col(0xb8b8b0));for(const sx of[-1,1])for(const sz of[-1,1])P('metal',BX(.05,.84,.05),sx*.36,.42,sz*.88,col(0x8a8a86));
    P('cloth',BX(.72,.06,1.7),0,.92,0,col(0xd8e4e0));P('metal',BX(.04,1.8,.04),.6,.9,.7,col(0x9a9a96));P('blue',BX(.16,.24,.06),.6,1.7,.7);}
  function desk(P,withNote){P('wood',BX(1.7,.08,.8),0,.95,-.2,col(0x5a3a22));P('wood',BX(1.6,.9,.7),0,.45,-.25,col(0x4a2e1a));
    if(withNote){P('paper',new THREE.PlaneGeometry(.32,.42),R(-.3,.3),1.0,-.1,W1,-PI/2,0,R(-.4,.4));P('amber',BX(.16,.3,.16),-.6,1.15,-.35);}
    else if(rnd()<.6){P('metal',BX(.46,.34,.06),.2,1.2,-.42,col(0x1a1a1a));P('screen',BX(.4,.28,.02),.2,1.2,-.38,W1);P('plain',BX(.5,.04,.2),.2,1,-.1,col(0x2a2a2a));}}
  function pew(P){P('wood',BX(1.9,.08,.5),0,.5,0,col(0x5a3a22));P('wood',BX(1.9,.6,.06),0,.8,-.25,col(0x4a2e1a));for(const sx of[-1,1])P('wood',BX(.08,.5,.5),sx*.9,.25,0,col(0x3a2414));}
  function safe(P){P('metal',BX(.9,.95,.8),0,.48,-.3,col(0x2e3236));P('metal',new THREE.CylinderGeometry(.12,.12,.05,12),0,.6,.12,col(0xb8a868),PI/2,0,0);P('metal',BX(.04,.2,.04),.25,.45,.12,col(0xb8a868));}
  function fridge(P){P('plain',BX(.9,2,.75),0,1,-.55,tint(0xd8d4c8,.2));P('dark',BX(.9,.02,.02),0,1.3,-.17,W1);P('metal',BX(.04,.5,.04),-.36,1.6,-.15,col(0x8a8a86));P('metal',BX(.04,.4,.04),-.36,.8,-.15,col(0x8a8a86));}
  function rack(P){P('wood',BX(1.7,1.9,.12),0,1.05,-.88,col(0x4a3a2a));for(let k=0;k<4;k++){P('metal',BX(.07,1.3,.07),-.6+k*.4,1.2,-.78,col(0x1a1a1a),0,0,.08);P('wood',BX(.12,.4,.08),-.62+k*.4,.6,-.78,col(0x5a3a1a));}P('metal',BX(1.5,.04,.1),0,1.75,-.8,col(0x6a6a66));}
  function ammo(P){for(let k=0;k<3;k++)P('metal',BX(1,.35,.5),R(-.15,.15),.18+k*.37,-.3,tint(0x4a5236,.2),0,R(-.2,.2),0);P('metal',BX(1.02,.05,.52),0,1.12,-.3,col(0xb8a03a));}
  function drums(P){for(const [x,z] of[[-.4,-.3],[.35,-.4],[.05,.3]]){P('metal',new THREE.CylinderGeometry(.3,.3,.9,12),x,.45,z,tint(0x9a2a1a,.3));P('metal',new THREE.CylinderGeometry(.31,.31,.05,12),x,.72,z,col(0x2a2a2a));}}
  function junk(P){for(let k=0;k<6;k++)P(pick(['metal','plain','wood']),BX(R(.3,.9),R(.06,.25),R(.3,.7)),R(-.5,.5),.1+k*.11,R(-.5,.4),tint(pick([0x7a5a3a,0x6a6a6a,0x8a4a2a]),.3),R(-.3,.3),rnd()*3,R(-.3,.3));
    P('metal',new THREE.CylinderGeometry(.05,.05,1.3,6),0,.5,.1,col(0x5a5a5a),0,0,1.1);P('metal',new THREE.TorusGeometry(.3,.1,6,12),-.4,.12,.3,col(0x111111),PI/2,0,0);}
  function techrack(P){P('metal',BX(.9,1.6,.7),-.35,.8,-.5,col(0x2a2e32));for(let k=0;k<5;k++)P(rnd()<.6?'screen':'amber',BX(.04,.04,.01),-.6+k*.12,1.3,-.14);
    P('wood',BX(.9,.06,.7),.45,.75,-.3,col(0x4a3a2a));P('metal',BX(.5,.35,.4),.45,.97,-.35,col(0x3a3e42));P('metal',BX(.3,.12,.2),.45,.84,0,col(0x2a2a2a));}
  function dresser(P){P('wood',BX(1.4,.92,.55),0,.46,-.65,tint(0x6a4a2e,.2));for(let k=0;k<3;k++)P('dark',BX(1.3,.02,.01),0,.25+k*.28,-.37,W1);P('plain',BX(.3,.2,.2),.4,1.02,-.7,tint(0x8a6a4a,.3));}
  function wardrobe(P){cabinet(P,tint(0x5a3a22,.2),1.5,2.2);}
  function bookshelf(P){cabinet(P,col(0x4a2e1a),1.8,2.2);for(let s=0;s<4;s++)for(let k=0;k<10;k++){if(rnd()<.25)continue;P('plain',BX(.12,R(.25,.38),.3),-.8+k*.17,.35+s*.5,-.48,tint(pick([0x7a2a22,0x2a4a6a,0x5a6a3a,0x8a7a4a,0x4a3a2a]),.3),0,0,R(-.15,.15));}}
  function stairsUp(P){for(let k=0;k<8;k++){const hh=(k+1)*WH/8;P('plain',boxUV(1.8,hh,.25,1,1,true),0,hh/2,.875-k*.25,col(0x8a857c));}for(const s of[-1,1])P('metal',BX(.05,1,.05),s*.9,1,.9,col(0x3a3a3a));P('exit',BX(.36,.12,.02),0,2.9,1.0);}
  function stairsDown(P){P('dark',BX(1.8,.02,1.8),0,-.2,0,W1);for(let k=0;k<4;k++)P('plain',BX(1.6,.12,.3),0,-.15-k*.32,.6-k*.32,col(0x6a655c));
    for(const [lx,lz,a,b] of[[-.92,0,.06,1.8],[.92,0,.06,1.8],[0,-.92,1.8,.06]])P('metal',BX(a,1,b),lx,.5,lz,col(0x3a3a3a));for(const [lx,lz,a,b] of[[-.95,0,.1,1.9],[.95,0,.1,1.9],[0,-.95,1.9,.1]])P('plain',BX(a,.2,b),lx,-.05,lz,col(0x6a655c));}
  function door(P){P(wM,boxUV(CS,WH-2.3,CS,CS,WH-2.3,true),0,(WH+2.3)/2,0,W1);for(const s of[-1,1])P(wM,boxUV(.35,2.3,CS,.35,2.3,true),s*.825,1.15,0,W1);
    P('dark',BX(1.3,2.3,1.6),0,1.15,-.1,W1);P('metal',BX(1.3,2.28,.1),0,1.15,.8,tint(0x6a5a46,.2));P('metal',BX(1,.06,.06),0,1.05,.88,col(0xb8b2a4));P('exit',BX(.5,.18,.06),0,2.55,1.02);}
  function decor(P,ch){
    if(ch==='o')table(P);else if(ch==='d')desk(P,false);else if(ch==='N')desk(P,true);else if(ch==='k')bookshelf(P);
    else if(ch==='p')P('plain',boxUV(.7,WH,.7,1,WH,true),0,WH/2,0,col(0x8a857c));else if(ch==='x')rubble(P);else if(ch==='y')bed(P,false);else if(ch==='j')pew(P);else if(ch==='q')crates(P,(rnd()*3|0)+2);}

  const beacon=[];
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=C_(i,j),ch=c.ch,O_=OBJ[ch];if(!O_&&ch!=='@')continue;const F=frame(i,j),P=F.P;
    if(ch==='X'){door(P);I.objs.push({kind:'exit',st:'exit',i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz});continue;}
    if(ch==='^'){stairsUp(P);I.objs.push({kind:'st',st:'up',i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz});continue;}
    if(ch==='v'){stairsDown(P);I.objs.push({kind:'st',st:'down',i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz});continue;}
    if(ch==='@'){const m=A.humanoid({skin:A.MAT.skin,top:A.MAT.survTop[I.objs.length%4],legs:A.MAT.survPants,gun:I.objs.length%3===0});m.g.position.set(F.x,Y,F.z);m.g.rotation.y=F.yaw;I.group.add(m.g);
      I.objs.push({kind:'npc',i,j,x:F.x,z:F.z,m,ph:rnd()*6,yaw:F.yaw});continue;}
    if(O_.loot){const L=O_.loot;
      if(L==='food')shelf(P,goods.food);else if(L==='water')shelf(P,goods.water,2,1.6);else if(L==='medical'){cabinet(P,col(0xd8d4cc),1.6,2);P('red',BX(.3,.08,.02),0,1.7,-.27);P('red',BX(.08,.3,.02),0,1.7,-.27);}
      else if(L==='military')ammo(P);else if(L==='scrap')junk(P);else if(L==='tech')techrack(P);else if(L==='cloth')wardrobe(P);else if(L==='fuel')drums(P);
      else if(L==='safe')safe(P);else if(L==='fridge')fridge(P);else if(L==='armory')rack(P);else dresser(P);
      const o={kind:'loot',loot:L,i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz,bi:beacon.length/3,by:Y+O_.h+.35};beacon.push(F.x+F.dx*.4,o.by,F.z+F.dz*.4);I.objs.push(o);continue;}
    if(O_.note){desk(P,true);I.objs.push({kind:'note',i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz});continue;}
    if(O_.st){const s=O_.st;
      if(s==='bench')bench(P,false);else if(s==='workshop')bench(P,true);else if(s==='fbench'){bench(P,false);P('metal',BX(.5,.3,.4),-.6,1.1,-.5,col(0x6a2a1a));}
      else if(s==='kitchen')stove(P,false);else if(s==='stove')stove(P,true);else if(s==='medbay')medtable(P);else if(s==='locker')lockers(P);else if(s==='plan')board(P);
      else if(s==='radio')radio(P);else if(s==='purifier')tank(P);else if(s==='power')gen(P);else if(s==='farm')farm(P);else if(s==='defense')console_(P,'red');else if(s==='bed')bed(P,def.theme==='shelter'||def.theme==='tower'||def.theme==='vault');
      I.objs.push({kind:'st',st:s,i,j,x:F.x,z:F.z,fx:F.dx,fz:F.dz});continue;}
    decor(P,ch);}

  /* ---- ceiling fixtures (some dead), the borrowed lights follow the nearest live ones ---- */
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=C_(i,j);if(isWall(c.ch)||c.ch==='X'||c.ch==='^'||c.ch==='v')continue;
    let ok=true;for(const f of I.fix)if(Math.abs(f.i-i)<3&&Math.abs(f.j-j)<3){ok=false;break;}if(!ok)continue;
    const [x,z]=I.ctr(i,j),on=rnd()<th.lit;I.fix.push({i,j,x,z,on,fl:on&&rnd()<th.flick,ph:rnd()*10});
    add(on?'glow':'dead',BX(.9,.06,.4),M(x,Y+WH-.04,z),on?W1:col(0x3a3a36));add('metal',BX(1,.03,.5),M(x,Y+WH-.005,z),col(0x5a5a56));
    if(!on&&rnd()<.5)add('metal',BX(.9,.04,.4),M(x+.2,Y+WH-.5,z,0,0,.9),col(0x5a5a56));}
  if(th.alarm)for(let k=0;k<4;k++){const f=pick(I.fix);if(f)add('red',new THREE.SphereGeometry(.12,8,6),M(f.x+.6,Y+WH-.15,f.z),W1);}

  /* ---- floor clutter: papers, stains, cans ---- */
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=C_(i,j);if(c.solid||c.ch==='v'||rnd()>th.mess)continue;const [x,z]=I.ctr(i,j),r=rnd();
    if(r<.45)add('paper',new THREE.PlaneGeometry(.32,.42),M(x+R(-.8,.8),Y+.012,z+R(-.8,.8),-PI/2,0,rnd()*6));
    else if(r<.75)add('decal',new THREE.CircleGeometry(R(.3,.8),12),M(x+R(-.5,.5),Y+.008,z+R(-.5,.5),-PI/2,0,0),C(0x14100c));
    else add('plain',new THREE.CylinderGeometry(.04,.04,.1,8),M(x+R(-.8,.8),Y+.04,z+R(-.8,.8),PI/2,rnd()*6,0),tint(0x9a8a6a,.4));}

  for(const k in mg){const mesh=new THREE.Mesh(mg[k].build(),MAT[k]);I.group.add(mesh);}
  // little glints over things you have not searched yet
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(beacon.length?beacon:[0,-9999,0],3));
  I.beacons=new THREE.Points(bg,new THREE.PointsMaterial({size:.5,map:UD.glowTex,color:C(0xffe48a),transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));I.beacons.frustumCulled=false;I.group.add(I.beacons);

  // hostiles
  if(def.enemies)for(let j=0;j<h;j++)for(let i=0;i<w;i++){const t=ENEMY[at(i,j)];if(!t)continue;const [x,z]=I.ctr(i,j);spawnEnemy(I,t,x+R(-.3,.3),z+R(-.3,.3),rnd()*6);}

  cur=I;
  // hide the outdoor world while we are inside
  for(const o of scene.children){if(o===I.group||o.isLight||o.isCamera||o.userData.always||!o.visible)continue;if(!(o.isMesh||o.isPoints||o.isLine||o.isGroup||o.isSprite))continue;o.visible=false;hidden.push(o);}
  scene.add(I.group);UD.inside=true;
  return I;
}
function hideBeacon(o){if(!cur||o.bi===undefined)return;const p=cur.beacons.geometry.attributes.position;p.setY(o.bi,-9999);p.needsUpdate=true;}
function spawnEnemy(I,type,x,z,yaw){const T=UD.ETYPES[type],m=T.mk();if(type==='brute')m.g.scale.setScalar(1.2);m.g.position.set(x,O.y,z);I.group.add(m.g);
  const e={type,T,m,x,y:O.y,z,yaw,hp:T.hp,dead:false,deadT:0,cd:.6+Math.random(),ph:Math.random()*6,alert:0,inside:true,canSee:false,losT:0,spd:0,atk:0,voiceT:2+Math.random()*4,stuckT:0,sx:0,sz:0};
  A.list.push(e);I.enemies.push(e);return e;}

function unload(){
  if(!cur)return;
  for(const e of cur.enemies){const k=A.list.indexOf(e);if(k>=0)A.list.splice(k,1);}
  scene.remove(cur.group);cur.group.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose();});
  for(const o of hidden)o.visible=true;hidden.length=0;
  for(const l of UD.fireLights){l.intensity=0;l.distance=22;l.decay=2;l.color.setHex(0xff8a3a);}
  cur=null;UD.inside=false;
}

/* ======================= physics on the grid ======================= */
function solidIJ(i,j){if(!cur||i<0||j<0||i>=cur.w||j>=cur.h)return true;return cur.cells[j*cur.w+i].solid;}
function passable(i,j){return!solidIJ(i,j);}
function collide(p,r){if(!cur)return false;let hit=false;
  for(let it=0;it<2;it++){const [ci,cj]=cur.cell(p.x,p.z);
    for(let j=cj-1;j<=cj+1;j++)for(let i=ci-1;i<=ci+1;i++){if(!solidIJ(i,j))continue;const [x,z]=cur.ctr(i,j),h=CS/2;
      if(p.x>x-h-r&&p.x<x+h+r&&p.z>z-h-r&&p.z<z+h+r){hit=true;const l=p.x-(x-h-r),rr=(x+h+r)-p.x,u=p.z-(z-h-r),d=(z+h+r)-p.z,m=Math.min(l,rr,u,d);
        if(m===l)p.x=x-h-r;else if(m===rr)p.x=x+h+r;else if(m===u)p.z=z-h-r;else p.z=z+h+r;}}}
  return hit;}
// distance a ray travels before it hits a wall, furniture taller than the ray, the floor or the ceiling
function ray(o,d,range){if(!cur)return range;for(let t=.2;t<range;t+=.15){const x=o.x+d.x*t,y=o.y+d.y*t-O.y,z=o.z+d.z*t;if(y<0||y>WH)return t;
  const [i,j]=cur.cell(x,z);if(i<0||j<0||i>=cur.w||j>=cur.h)return t;const c=cur.cells[j*cur.w+i];if(c.solid&&y<c.hgt)return t;}return range;}
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
function los(ax,ay,az,bx,by,bz){_a.set(ax,ay,az);_b.set(bx-ax,by-ay,bz-az);const L=_b.length();if(L<.01)return true;_b.divideScalar(L);return ray(_a,_b,L)>=L-.05;}

/* ======================= flow field toward the player ======================= */
function buildFlow(pi,pj){const n=cur.w*cur.h,D=cur.flow&&cur.flow.length===n?cur.flow:new Float32Array(n);D.fill(1e9);
  if(solidIJ(pi,pj))return D;const q=[pi+pj*cur.w];D[q[0]]=0;
  for(let h=0;h<q.length;h++){const k=q[h],i=k%cur.w,j=(k/cur.w)|0,d0=D[k];
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(solidIJ(ni,nj))continue;if(di&&dj&&(solidIJ(i+di,j)||solidIJ(i,j+dj)))continue;
      const nk=ni+nj*cur.w,nd=d0+(di&&dj?1.414:1);if(nd<D[nk]){D[nk]=nd;q.push(nk);}}}
  return D;}

/* ======================= per-frame: hostiles, lights ======================= */
const _v=new THREE.Vector3();
function update(dt,t,ctx){
  if(!cur)return;const I=cur;
  // borrowed lights sit on the nearest working fixtures
  I.lightT-=dt;if(I.lightT<=0){I.lightT=.2;const live=I.fix.filter(f=>f.on).map(f=>[f,(f.x-ctx.px)**2+(f.z-ctx.pz)**2]).sort((a,b)=>a[1]-b[1]);
    UD.fireLights.forEach((l,k)=>{const n=live[k];l.userData.fix=n?n[0]:null;if(n){l.position.set(n[0].x,O.y+WH-.45,n[0].z);l.distance=13;l.decay=1.7;l.color.setHex(I.th.warm);}});}
  UD.fireLights.forEach(l=>{const f=l.userData.fix;if(!f){l.intensity=0;return;}let k=I.th.li;if(f.fl){const s=Math.sin(t*17+f.ph)+Math.sin(t*5.3+f.ph*2);k*=s>1.2?.15:s>.9?.6:1;}l.intensity=k;});
  // flow field refresh when the player changes cell
  const [pi,pj]=I.cell(ctx.px,ctx.pz),pk=pi+pj*I.w;if(pk!==I.fcell){I.fcell=pk;I.flow=buildFlow(pi,pj);}
  for(const e of I.enemies){const T=e.T,m=e.m;
    if(e.dead){e.deadT+=dt;const k=Math.min(1,e.deadT/.45);if(m.quad)m.g.rotation.z=k*PI/2;else{m.g.rotation.x=-k*PI/2*e.fallDir;m.g.position.y=O.y+k*.2;}continue;}
    const dx=ctx.px-e.x,dz=ctx.pz-e.z,d=Math.hypot(dx,dz);
    e.cd-=dt;e.atk=Math.max(0,e.atk-dt);e.losT-=dt;
    if(e.losT<=0){e.losT=.25;e.canSee=!ctx.hidden&&d<30&&los(e.x,e.y+T.hy*.9,e.z,ctx.px,ctx.py,ctx.pz);}
    if(!ctx.hidden&&((e.canSee&&d<13)||d<3.2))e.alert=Math.max(e.alert,4);
    if(e.canSee&&e.alert>0)e.alert=Math.max(e.alert,2);
    e.alert-=dt;
    let mx=0,mz=0,spd=0;
    if(e.alert>0&&!ctx.hidden){
      const ux=dx/(d||1),uz=dz/(d||1);
      let hold=false;
      if(T.ranged&&e.canSee&&d<14){hold=true;if(d<4){mx=-ux;mz=-uz;spd=T.walk;}else{const s=Math.sin(e.ph*.25)>0?1:-1;mx=-uz*s;mz=ux*s;spd=T.walk*.6;}}
      if(!hold){
        if(e.canSee&&d<5){mx=ux;mz=uz;}
        else{const [ei,ej]=I.cell(e.x,e.z);let best=I.flow[ei+ej*I.w],bi=ei,bj=ej;
          for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ni=ei+di,nj=ej+dj;if(solidIJ(ni,nj))continue;if(di&&dj&&(solidIJ(ei+di,ej)||solidIJ(ei,ej+dj)))continue;const v=I.flow[ni+nj*I.w];if(v<best){best=v;bi=ni;bj=nj;}}
          const [tx,tz]=I.ctr(bi,bj);let wx=tx-e.x,wz=tz-e.z;const wl=Math.hypot(wx,wz);if(wl>.05){mx=wx/wl;mz=wz/wl;}else{mx=ux;mz=uz;}}
        spd=d>T.reach*.8||T.ranged?T.run*.85:0;if(!T.ranged&&d<=T.reach*.8)spd=0;}
      e.yaw=Math.atan2(-dx,-dz);
      if(T.ranged){if(e.canSee&&d<26&&e.cd<=0){e.cd=T.cd*(.8+Math.random()*.6);ctx.enemyShot(e,d);}}
      else if(d<T.reach&&e.cd<=0){e.cd=T.cd;e.atk=.3;ctx.hitPlayer(T.dmg,e);}
      e.voiceT-=dt;if(e.voiceT<=0){e.voiceT=3+Math.random()*4;ctx.voice(e,d);}
    }
    if(e.stuckT>0){e.stuckT-=dt;mx=e.sx;mz=e.sz;}
    const ox=e.x,oz=e.z;_v.set(e.x+mx*spd*dt,0,e.z+mz*spd*dt);collide(_v,Math.min(.6,T.r*m.g.scale.y));e.x=_v.x;e.z=_v.z;
    const moved=Math.hypot(e.x-ox,e.z-oz);
    if(spd>0&&moved<spd*dt*.3&&e.stuckT<=0){e.stuckT=.4+Math.random()*.5;const s=Math.random()<.5?1:-1;e.sx=-mz*s;e.sz=mx*s;}
    e.spd+=(moved/Math.max(dt,1e-4)-e.spd)*Math.min(1,dt*8);
    m.g.position.set(e.x,O.y,e.z);
    if(e.alert<=0)e.yaw+=Math.sin(t*.4+e.ph)*dt*.3;
    let dy=e.yaw-m.g.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));m.g.rotation.y+=dy*Math.min(1,dt*10);
    e.ph+=dt*(2+e.spd*2.2);const amp=Math.min(1,e.spd/3)*.8;
    if(m.quad){m.legs.forEach((l,k)=>l.rotation.x=Math.sin(e.ph*1.4+(k===0||k===3?0:PI))*amp*1.1);m.tail.rotation.z=Math.sin(e.ph*3)*.4;m.body.position.y=Math.abs(Math.sin(e.ph*1.4))*.08*amp;m.head.rotation.x=e.atk>0?-.5:0;}
    else{m.legL.rotation.x=Math.sin(e.ph)*amp;m.legR.rotation.x=-Math.sin(e.ph)*amp;
      if(m.hunch){m.armL.rotation.x=1.2+Math.sin(e.ph*.7)*.15+(e.atk>0?.5:0);m.armR.rotation.x=1.25+Math.cos(e.ph*.6)*.15+(e.atk>0?.5:0);}
      else if(m.gun&&e.alert>0){m.armR.rotation.x=1.5;m.armL.rotation.x=1.2;m.armL.rotation.z=-.4;}
      else{m.armL.rotation.x=-Math.sin(e.ph)*amp*.7;m.armR.rotation.x=Math.sin(e.ph)*amp*.7;m.armL.rotation.z=0;}
      m.body.position.y=Math.abs(Math.sin(e.ph))*.05*amp;}
  }
  // survivors idle
  for(const o of I.objs)if(o.kind==='npc'){o.ph+=dt;o.m.g.rotation.y=o.yaw+Math.sin(o.ph*.3)*.5;o.m.armL.rotation.x=Math.sin(o.ph*.8)*.08;o.m.body.position.y=Math.sin(o.ph*1.1)*.01;if(o.m.gun)o.m.armR.rotation.x=.5;}
}
})();
