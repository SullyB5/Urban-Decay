/* Urban Decay · world: the city after the bomb.
   Blast damage scales with distance from ground zero: a glassed crater, a ring of flattened
   stumps and bare steel frames, then sheared and leaning towers, then sooty but standing blocks. */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;
const {rng,R,pick,clamp,C,M,Mbase,boxUV,Merger,canvasTex,mg,addCollider,N,CELL,ROAD,LOT,BUILD,EXT,GZ,CRATER,RIM,TOWER,gzDist,towerDist,scene,renderer,vnoise}=UD;
UD.setSeed(4471);
const PI=Math.PI,W=C(0xffffff);
const tint=(hex,v=.12)=>C(hex).multiplyScalar(1-v*rng());

/* ======================= textures ======================= */
function grime(x,w,h,n,a){for(let i=0;i<n;i++){const v=(rng()*70)|0;x.fillStyle=`rgba(${v},${v*.9|0},${v*.8|0},${a*rng()})`;x.fillRect(rng()*w,rng()*h,1+rng()*3,1+rng()*3);}
  for(let i=0;i<10;i++){const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(30,22,16,0)');g.addColorStop(1,'rgba(30,22,16,.4)');x.fillStyle=g;x.fillRect(rng()*w,rng()*h*.4,1+rng()*4,h);}}
// facade sheets: 4x4 window bays; fire-scorch plumes above some windows; a few rooms still smoulder at night
function facade(base,frame,winFn,emberChance,brick){
  const lit=[];const tex=canvasTex(128,128,(x,w,h)=>{
    x.fillStyle=base;x.fillRect(0,0,w,h);
    if(brick){x.strokeStyle='rgba(40,20,14,.35)';x.lineWidth=1;for(let y=0;y<h;y+=4){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();for(let xx=(y/4%2)*4;xx<w;xx+=8){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+4);x.stroke();}}}
    grime(x,w,h,1800,.34);
    const soot=[];
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const X=6+c*32,Y=6+r*32,k=rng();
      x.fillStyle=frame;x.fillRect(X-2,Y-2,24,24);
      x.fillStyle=winFn(k);x.fillRect(X,Y,20,20);
      if(k>.7){x.fillStyle=base;x.beginPath();x.moveTo(X,Y+20);x.lineTo(X+5+rng()*10,Y+10+rng()*8);x.lineTo(X+20,Y+20);x.fill();}
      if(rng()<.38)soot.push([X,Y]);
      if(rng()<emberChance)lit.push([X,Y]);}
    for(const [X,Y] of soot){const g=x.createLinearGradient(0,Y+8,0,Y-30);g.addColorStop(0,'rgba(10,8,6,.92)');g.addColorStop(1,'rgba(10,8,6,0)');
      x.fillStyle=g;x.beginPath();x.moveTo(X-3,Y+8);x.lineTo(X+23,Y+8);x.lineTo(X+15,Y-30);x.lineTo(X+5,Y-30);x.closePath();x.fill();}
  });
  const em=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(const [X,Y] of lit){const g=x.createRadialGradient(X+10,Y+17,1,X+10,Y+12,18);g.addColorStop(0,'#ff7a1a');g.addColorStop(1,'#2a0800');x.fillStyle=g;x.fillRect(X,Y,20,20);}});
  return{tex,em};
}
const FAC={
  office:facade('#8f9497','#3c4246',k=>k<.55?'#14181b':k<.8?'#232c33':'#070808',.05),
  brick:facade('#7d4434','#b9ad98',k=>k<.6?'#16130f':'#090807',.06,true),
  plaster:facade('#b4a589','#7c6c56',k=>k<.6?'#19150f':'#090807',.05),
  glass:facade('#55697a','#262d33',k=>k<.5?'#1a2730':k<.85?'#2c3f4c':'#08090b',.03),
};
const corrTex=canvasTex(64,64,(x,w,h)=>{for(let i=0;i<w;i+=4){x.fillStyle=i%8?'#7d8085':'#5f6266';x.fillRect(i,0,4,h);}grime(x,w,h,600,.5);
  for(let i=0;i<6;i++){x.fillStyle='rgba(120,60,30,.35)';x.fillRect(rng()*w,rng()*h,R(4,12),R(6,20));}});
const concreteTex=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#8a857d';x.fillRect(0,0,w,h);grime(x,w,h,2800,.4);
  x.strokeStyle='rgba(40,34,28,.5)';for(let i=0;i<6;i++){let px=rng()*w,py=rng()*h;x.beginPath();x.moveTo(px,py);for(let j=0;j<7;j++){px+=R(-14,14);py+=R(-14,14);x.lineTo(px,py);}x.stroke();}});
const charTex=canvasTex(64,64,(x,w,h)=>{x.fillStyle='#2a2420';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=(rng()*50)|0;x.fillStyle=`rgba(${v+20},${v+10},${v},.6)`;x.fillRect(rng()*w,rng()*h,1+rng()*2,1+rng()*2);}
  for(let i=0;i<10;i++){x.fillStyle='rgba(120,55,25,.4)';x.fillRect(rng()*w,rng()*h,R(2,8),R(2,8));}});
const walkTex=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#837c74';x.fillRect(0,0,w,h);grime(x,w,h,2600,.4);x.strokeStyle='rgba(40,32,26,.5)';
  for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,h);x.stroke();x.beginPath();x.moveTo(0,i*32);x.lineTo(w,i*32);x.stroke();}
  for(let i=0;i<6;i++){x.fillStyle='rgba(70,66,60,.45)';x.beginPath();x.ellipse(rng()*w,rng()*h,R(8,24),R(4,12),rng()*3,0,7);x.fill();}});
const asphaltTex=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#2b2927';x.fillRect(0,0,w,h);
  for(let i=0;i<9000;i++){const v=30+(rng()*40)|0;x.fillStyle=`rgb(${v},${v-2},${v-4})`;x.fillRect(rng()*w,rng()*h,1,1);}
  x.strokeStyle='rgba(8,6,5,.85)';for(let i=0;i<12;i++){let px=rng()*w,py=rng()*h;x.beginPath();x.moveTo(px,py);for(let j=0;j<10;j++){px+=R(-14,14);py+=R(-14,14);x.lineTo(px,py);}x.stroke();}
  for(let i=0;i<9;i++){x.fillStyle='rgba(120,112,100,.18)';x.beginPath();x.ellipse(rng()*w,rng()*h,R(10,30),R(4,14),rng()*3,0,7);x.fill();}});
const grassTex=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#4f4636';x.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const g=50+(rng()*60)|0;x.fillStyle=`rgba(${g+24},${g+12},${g*.5|0},.6)`;x.fillRect(rng()*w,rng()*h,1,2);}
  for(let i=0;i<8;i++){x.fillStyle='rgba(40,36,32,.4)';x.beginPath();x.ellipse(rng()*w,rng()*h,R(6,18),R(4,10),rng()*3,0,7);x.fill();}});
const dirtTex=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#4f483f';x.fillRect(0,0,w,h);for(let i=0;i<12000;i++){const v=45+(rng()*60)|0;x.fillStyle=`rgba(${v+16},${v+8},${v*.75|0},.5)`;x.fillRect(rng()*w,rng()*h,1+rng()*2,1+rng()*2);}
  for(let i=0;i<14;i++){x.fillStyle='rgba(150,142,130,.12)';x.beginPath();x.ellipse(rng()*w,rng()*h,R(10,40),R(6,20),rng()*3,0,7);x.fill();}});
const glassTex=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#16201a';x.fillRect(0,0,w,h);for(let i=0;i<4000;i++){const v=(rng()*40)|0;x.fillStyle=`rgba(${v+20},${v+50},${v+25},.5)`;x.fillRect(rng()*w,rng()*h,1+rng()*3,1);}
  x.strokeStyle='rgba(110,200,90,.35)';x.lineWidth=1;for(let i=0;i<24;i++){let px=rng()*w,py=rng()*h;x.beginPath();x.moveTo(px,py);for(let j=0;j<8;j++){px+=R(-20,20);py+=R(-20,20);x.lineTo(px,py);}x.stroke();}});
const SIGNS=['PHARMACY','DINER','HARDWARE','LAUNDRY','PAWN SHOP','GROCERY','MOTEL','LIQUOR','BAKERY','CINEMA','BARBER','BOOKS','DONUTS','PIZZA','BANK','TAVERN',
  'GARAGE','FLORIST','ARCADE','CAFE','DELI','TOYS','RADIO SHACK','NEWS','MARKET','HOTEL','GYM','FUEL','AUTO PARTS','NOODLES','TACOS','OPEN 24 HRS'];
const SCH=[['#9a2a22','#e6d8bc'],['#24466e','#e2e2e2'],['#c9a12e','#1b1b1b'],['#2e6a47','#e4dfd0'],['#e4dfd0','#1b3a6b'],['#1b1b1b','#e8c04a'],['#5e2e6c','#efd8e6'],['#b85a2b','#efe4d0']];
const signAtlas=canvasTex(1024,512,(x)=>{
  for(let i=0;i<32;i++){const cx=(i%4)*256,cy=((i/4)|0)*64,[bg,fg]=pick(SCH);
    x.fillStyle=bg;x.fillRect(cx,cy,256,64);x.strokeStyle=fg;x.lineWidth=3;x.strokeRect(cx+4,cy+4,248,56);
    let txt=SIGNS[i];if(rng()<.45){const k=(rng()*txt.length)|0;if(txt[k]!==' ')txt=txt.slice(0,k)+' '+txt.slice(k+1);}
    x.fillStyle=fg;let fs=40;x.font=`900 ${fs}px Impact, 'Arial Black', Arial, sans-serif`;while(x.measureText(txt).width>228&&fs>14){fs-=2;x.font=`900 ${fs}px Impact, 'Arial Black', Arial, sans-serif`;}
    x.textAlign='center';x.textBaseline='middle';x.fillText(txt,cx+128,cy+34);
    for(let k=0;k<260;k++){x.fillStyle=`rgba(20,14,10,${rng()*.5})`;x.fillRect(cx+rng()*256,cy+rng()*64,1+rng()*3,1+rng()*3);}
    const g=x.createLinearGradient(0,cy,0,cy+64);g.addColorStop(0,'rgba(15,10,8,.55)');g.addColorStop(.5,'rgba(15,10,8,0)');x.fillStyle=g;x.fillRect(cx,cy,256,64);
  }});
const shelterTex=canvasTex(256,64,(x,w,h)=>{x.fillStyle='#d9a91c';x.fillRect(0,0,w,h);x.fillStyle='#14110c';x.fillRect(0,0,w,6);x.fillRect(0,h-6,w,6);
  x.beginPath();x.arc(30,32,18,0,7);x.fill();x.fillStyle='#d9a91c';for(let k=0;k<3;k++){x.beginPath();x.moveTo(30,32);x.arc(30,32,15,k*2.094+.52,k*2.094+1.57);x.fill();}
  x.fillStyle='#14110c';x.beginPath();x.arc(30,32,4,0,7);x.fill();
  x.font="900 25px Impact, 'Arial Black', sans-serif";x.textBaseline='middle';x.fillText('FALLOUT SHELTER',58,34);grime(x,w,h,300,.4);});

/* ======================= materials ======================= */
const facMat=(f,rough,metal=0)=>new THREE.MeshStandardMaterial({map:f.tex,emissiveMap:f.em,emissive:0xffffff,emissiveIntensity:0,vertexColors:true,roughness:rough,metalness:metal});
const MATS=UD.MATS={
  office:facMat(FAC.office,.85),brick:facMat(FAC.brick,.92),plaster:facMat(FAC.plaster,.9),glass:facMat(FAC.glass,.4,.25),
  corr:new THREE.MeshStandardMaterial({map:corrTex,vertexColors:true,roughness:.75,metalness:.3}),
  concrete:new THREE.MeshStandardMaterial({map:concreteTex,vertexColors:true,roughness:.95}),
  char:new THREE.MeshStandardMaterial({map:charTex,vertexColors:true,roughness:.95,metalness:.25}),
  plain:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),
  metal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.55}),
  dark:new THREE.MeshStandardMaterial({color:0x0a0909,roughness:.95}),
  sign:new THREE.MeshStandardMaterial({map:signAtlas,vertexColors:true,roughness:.75}),
  shelter:new THREE.MeshStandardMaterial({map:shelterTex,emissiveMap:shelterTex,emissive:0xffffff,emissiveIntensity:.15,roughness:.7}),
  glow:new THREE.MeshStandardMaterial({color:C(0xfff0c0),emissive:C(0xffc070),emissiveIntensity:1.2,roughness:.5}),
  rad:new THREE.MeshStandardMaterial({color:C(0x3b4a16),emissive:C(0x8cff3a),emissiveIntensity:.9,roughness:.45}),
};
UD.signAtlas=signAtlas;

/* ======================= blast model ======================= */
// lvl 0 crater · 1 obliterated · 2 heavy · 3 damaged · 4 light
function blast(x,z){const d=gzDist(x,z);const lvl=d<RIM+10?0:d<235?1:d<400?2:d<560?3:4;
  const hs=lvl===1?R(.05,.16):lvl===2?R(.3,.62):lvl===3?R(.6,.9):lvl===4?R(.85,1):0;return{d,lvl,hs};}
UD.blast=blast;
function leanOf(x,z,d){if(d<190||d>440)return[0,0];const a=.08*(1-(d-190)/250)*R(.3,1);const dx=(x-GZ.x)/d,dz=(z-GZ.z)/d;return[dz*a,-dx*a];}

/* ======================= world registries ======================= */
const rubble=[],trees=[],props=[],lampsPos=[];
const cars=[];            // [x,z,ry,flip,burnt,type]  type 0 sedan 1 van 2 bus 3 truck 4 police 5 army
const loot=UD.loot=[];   // searchable spots
const fires=UD.fires=[]; // burning barrels, wrecks, smouldering stumps
const radSpots=UD.radSpots=[];
const camps=UD.camps=[];
const POIS=UD.POIS=[];
const lotType={},lmAt={},lmName={};
UD.lotType=lotType;UD.lmAt=lmAt;UD.lmName=lmName;
const DNAME=UD.DNAME={downtown:'Downtown',commercial:'Market District',residential:'Old Suburbs',industrial:'Ironworks',park:'Ash Park',outskirts:'Outer Wastes',crater:'Ground Zero',home:'Meridian Block'};
UD.tierAt=(x,z)=>gzDist(x,z)<RIM+30?5:1+Math.min(3,Math.floor(towerDist(x,z)/165));
function addLoot(x,z,type,y=0,extra){if(towerDist(x,z)<26&&type!=='bunker')return null;const s={x,z,y,type,tier:UD.tierAt(x,z),got:false,...extra};loot.push(s);return s;}
// a reachable spot on the sidewalk band around a block
function edgePos(cx,cz){const s=BUILD/2+2.4,t=R(-s+2,s-2),f=(rng()*4)|0;return f===0?[cx+t,cz+s]:f===1?[cx+t,cz-s]:f===2?[cx+s,cz+t]:[cx-s,cz+t];}
function addFire(x,y,z,s=1){fires.push({x,y,z,s});}
// walk-in doors: p is the spot just outside the door, n the outward direction
const doors=UD.doors=[];
const FN=[[0,1],[0,-1],[1,0],[-1,0]];
// blast level without touching the seeded rng (so adding doors never reshuffles the city)
function blv(x,z){const d=gzDist(x,z);return d<RIM+10?0:d<235?1:d<400?2:d<560?3:4;}
const dhash=(x,z,k=0)=>UD.hash(Math.round(x*7)+k*131,Math.round(z*7)-k*71);
function addDoor(x,z,nx,nz,tpl,name,extra){const id=tpl+'_'+Math.round(x)+'_'+Math.round(z);if(doors.some(d=>d.id===id))return;
  doors.push({id,x,z,nx,nz,tpl,name:name||null,tier:UD.tierAt(x,z),...extra});}

/* ======================= districts + landmarks ======================= */
function district(i,j){
  const cx=(i+.5),cz=(j+.5),d=Math.hypot(cx,cz),nz=vnoise(i*.35+3,j*.35-7);
  if(d<3.4)return'downtown';
  if(i>4&&j<-1&&nz>.35)return'industrial';
  if(i<-6&&j>2&&nz>.45)return'industrial';
  if(nz<.13)return'park';
  if(d<6.5||(i%4===0||j%4===0)&&d<10)return'commercial';
  return'residential';
}
const LM=[['home',0,0],['church',-3,2],['clocktower',0,-1],['stadium',7,7],['gasstation',-2,-5],['theater',2,1],['watertower',-8,-4],['radiomast',-9,-8],['ferris',-8,6],
  ['monument',-1,0],['gasstation',6,3],['church',5,-9],['library',-4,-2],['hospital',-5,4],['market',3,5],['heli',1,-3]];
const LMNAME={home:'Meridian Tower',church:'St. Brigid Church',clocktower:'Old Clock Tower',stadium:'Municipal Stadium',gasstation:'Fuel Stop',theater:'Palace Theater',watertower:'Water Works',
  radiomast:'Radio Mast',ferris:'Pier Park Wheel',monument:'Founders Monument',library:'Public Library',hospital:'St. Jude Hospital',market:'MegaMart',heli:'Downed Gunship'};
const FOCUS={church:'cloth · food',clocktower:'scrap · parts',stadium:'ammo · raider stronghold',gasstation:'fuel',theater:'cloth · scrap',watertower:'water · parts',radiomast:'electronics · parts',
  ferris:'scrap · food',monument:'scrap',library:'cloth · parts',hospital:'meds · rad-away',market:'food · water · cloth',heli:'ammo · weapon parts',gz:'rare tech · lethal radiation',
  ironworks:'scrap · fuel',checkpoint:'ammo · meds',bunker:'walk-in vault · armory, pantry · needs a pry bar',camp:'raider loot',highway:'scrap'};
for(const [k,i,j] of LM){lmAt[i+','+j]=k;lmName[i+','+j]=LMNAME[k];}
lmName['5,-9']='Shattered Chapel';lmName['6,3']='Eastside Fuel';

/* ======================= building kits ======================= */
function debris(x,z,w,d,n,big=1){for(let i=0;i<n;i++)rubble.push([x+R(-w/2-3,w/2+3),z+R(-d/2-3,d/2+3),R(.3,1.4)*big]);}
function damageTop(mat,x,base,z,w,d,h,col,ox0=0,oz0=0){
  const n=2+(rng()*3)|0;
  for(let i=0;i<n;i++){const cw=w*R(.25,.6),cd=d*R(.25,.6),ch=Math.max(1,h*R(.2,.9));
    const ox=ox0+R(-1,1)*(w-cw)/2,oz=oz0+R(-1,1)*(d-cd)/2;
    mg(mat,x,z).add(boxUV(cw,ch,cd,4,3.6,true),M(x+ox,base+ch/2,z+oz),col);
    for(let r=0;r<3;r++){const L=R(.8,3);mg('char',x,z).add(new THREE.BoxGeometry(.08,L,.08),M(x+ox+R(-cw/2,cw/2),base+ch+L/2-.2,z+oz+R(-cd/2,cd/2),R(-.5,.5),0,R(-.5,.5)),C(0x4a3326));}}
}
function holes(x,z,w,d,h,n){for(let i=0;i<n;i++){const side=(rng()*4)|0,hw=R(2,6),hh=R(2,5),y=R(3,Math.max(4,h-3));
  const px=side<2?x+(side?1:-1)*(w/2+.05):x+R(-w/2+hw,w/2-hw),pz=side<2?z+R(-d/2+hw,d/2-hw):z+(side===2?1:-1)*(d/2+.05);
  mg('dark',x,z).add(new THREE.BoxGeometry(side<2?.3:hw,hh,side<2?hw:.3),M(px,y,pz),W);}}
// bare steel frame where a tower used to be
function skeleton(x,z,w,d,y0,y1){
  const nx=Math.max(2,Math.round(w/5)),nz=Math.max(2,Math.round(d/5)),col=C(0x3b2a20),tops=[];
  for(let i=0;i<=nx;i++)for(let k=0;k<=nz;k++){if(i>0&&i<nx&&k>0&&k<nz)continue;if(rng()<.3)continue;
    const px=x-w/2+i*w/nx,pz=z-d/2+k*d/nz,hh=(y1-y0)*R(.3,1),tx=R(-.08,.08),tz=R(-.08,.08);
    mg('char',x,z).add(new THREE.BoxGeometry(.4,hh,.4),Mbase(px,y0,pz,hh,tx,tz),col);tops.push(hh);}
  const lv=Math.floor((y1-y0)*.55/4.2);
  for(let f=1;f<=lv;f++){const y=y0+f*4.2;
    for(let s=0;s<4;s++){if(rng()<.45)continue;const along=s<2,L=(along?w:d)*R(.35,1),off=(s%2?1:-1)*(along?d:w)/2;
      const g=new THREE.BoxGeometry(along?L:.3,.35,along?.3:L);
      const px=along?x-w/2+L/2:x+off,pz=along?z+off:z-d/2+L/2;mg('char',x,z).add(g,M(px,y,pz,along?0:R(-.08,.08),0,along?R(-.08,.08):0),col);}
    if(rng()<.35){const sw=w*R(.3,.6),sd=d*R(.3,.6);mg('concrete',x,z).add(boxUV(sw,.35,sd,4,4,true),M(x+R(-1,1)*(w-sw)/2,y,z+R(-1,1)*(d-sd)/2,R(-.25,.25),0,R(-.25,.25)),tint(0x8a857d));}}
}
function rubbleField(x,z,w,d){debris(x,z,w,d,26,1.4);for(let i=0;i<4;i++)mg('concrete',x,z).add(boxUV(R(3,8),R(.4,.9),R(3,8),4,4,true),M(x+R(-w/2,w/2),R(.4,1.2),z+R(-d/2,d/2),R(-.4,.4),rng()*3,R(-.4,.4)),tint(0x7a756d));}
function sign(x,y,z,face,w,fallen){
  const idx=(rng()*32)|0,u0=(idx%4)/4,v0=1-(((idx/4)|0)+1)/8;
  const g=new THREE.PlaneGeometry(w,w/4);const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*.25,v0+uv.getY(i)*.125);
  const ry=[0,PI,PI/2,-PI/2][face];
  if(fallen)mg('sign',x,z).add(g,M(x,.32,z,-PI/2+R(-.15,.15),ry+R(-.4,.4),0),W);
  else mg('sign',x,z).add(g,M(x,y,z,R(-.06,.06),ry,rng()<.3?R(-.35,.35):R(-.03,.03)),W);
}
function faceOffset(face,x,z,w,d,o){return face===0?[x,z+d/2+o]:face===1?[x,z-d/2-o]:face===2?[x+w/2+o,z]:[x-w/2-o,z];}
function shop(x,z,w,d,h,face,mat,col,door){
  const b=blast(x,z);if(!b.lvl)return;
  if(b.lvl===1){const hh=R(.8,2.8);mg(mat,x,z).add(boxUV(w,hh,d,4,3.6,true),M(x,hh/2+.25,z),col);debris(x,z,w,d,6);addCollider(x-w/2,x+w/2,z-d/2,z+d/2,hh+.25);
    if(rng()<.3){const [sx,sz]=faceOffset(face,x,z,w,d,1.5);sign(sx,0,sz,face,Math.min(face<2?w:d,10)*.8,true);}return;}
  if(b.lvl===2)h*=R(.6,.9);
  mg(mat,x,z).add(boxUV(w,h,d,4,3.6,true),M(x,h/2+.25,z),col);
  const [fx,fz]=faceOffset(face,x,z,w,d,.06),along=face<2;
  mg('dark',x,z).add(new THREE.BoxGeometry(along?w*.86:.12,2.6,along?.12:d*.86),M(fx,1.55,fz),W);
  if(rng()<(b.lvl===2?.4:.8)){const [ax,az]=faceOffset(face,x,z,w,d,.9),sag=b.lvl<4?R(.2,.6):0;
    mg('plain',x,z).add(new THREE.BoxGeometry(along?w*.9:1.8,.14,along?1.8:d*.9),M(ax,3.2-sag,az,face===0?.28+sag:face===1?-.28-sag:R(-.2,.2),0,face===2?-.28-sag:face===3?.28+sag:R(-.2,.2)),tint(pick([0x8a2a22,0x2a5a3e,0x283f6a,0xa8832e,0x553a6a]),.3));}
  const [sx,sz]=faceOffset(face,x,z,w,d,.12),fell=rng()<(b.lvl===2?.4:.12);
  if(rng()<.85){if(fell){const [gx,gz]=faceOffset(face,x,z,w,d,1.6);sign(gx,0,gz,face,Math.min(along?w:d,10)*.8,true);}else sign(sx,Math.min(h-.6,4.3),sz,face,Math.min(along?w:d,10)*.85);}
  mg('concrete',x,z).add(boxUV(w+.4,.5,d+.4,4,4,true),M(x,h+.5,z),tint(0x9a9288));
  if(b.lvl<=2)debris(x,z,w,d,4);
  if(door!==false){const hs=dhash(x,z,1),tpl=typeof door==='string'?door:hs<.3?['grocery','pharmacy','diner','hardware','pawn'][Math.min(4,Math.floor(hs/.3*5))]:null;
    if(tpl){const [px,pz]=faceOffset(face,x,z,w,d,1.1);addDoor(px,pz,FN[face][0],FN[face][1],tpl,typeof door==='string'?shop.name_:null);}}
  addCollider(x-w/2,x+w/2,z-d/2,z+d/2,h+.5);
}
function tower(x,z,w,d,h,col,mat,noDoor){
  const b=blast(x,z);
  if(b.lvl===0){rubbleField(x,z,w,d);return;}
  if(b.lvl===1){const st=Math.max(2.5,h*R(.06,.16));mg(mat,x,z).add(boxUV(w,st,d,4,3.6,true),M(x,st/2+.25,z),col.clone().multiplyScalar(.6));
    if(h>18)skeleton(x,z,w*.96,d*.96,st+.25,st+h*R(.25,.55));
    debris(x,z,w,d,14,1.3);if(rng()<.12)addFire(x+R(-w/3,w/3),st+.6,z+R(-d/3,d/3),1.4);
    addCollider(x-w/2,x+w/2,z-d/2,z+d/2,st+.25);return;}
  const full=h;h*=b.hs;
  const [rx,rz]=b.lvl===2&&h>16?leanOf(x,z,b.d):[0,0];
  const missing=rng()<(b.lvl===2?.55:.4),base=h*R(.6,.88);
  if(missing){const a=R(.45,.7);
    mg(mat,x,z).add(boxUV(w,base,d*a,4,3.6,true),Mbase(x,.25,z-d*(1-a)/2,base,rx,rz),col);
    mg(mat,x,z).add(boxUV(w*R(.35,.6),base*R(.4,.8),d*(1-a),4,3.6,true),M(x-w*.2,base*.3+.25,z+d*a/2),col);
  }else mg(mat,x,z).add(boxUV(w,base,d,4,3.6,true),Mbase(x,.25,z,base,rx,rz),col);
  damageTop(mat,x,base+.25,z,w,d,h-base,col,-Math.sin(rz)*base,Math.sin(rx)*base);
  if(b.lvl===2&&full>30&&rng()<.5)skeleton(x-Math.sin(rz)*base,z+Math.sin(rx)*base,w*.9,d*.9,base+.25,base+(full-h)*R(.2,.5));
  holes(x,z,w,d,base,(rng()*(b.lvl===2?8:5))|0);
  let made=!!noDoor;
  for(const face of[0,2]){if(rng()<.6){const [fx,fz]=faceOffset(face,x,z,w,d,.08),along=face<2;
    if(!made&&dhash(x,z,face+2)<.4){made=true;const [px,pz]=faceOffset(face,x,z,w,d,1.1);addDoor(px,pz,FN[face][0],FN[face][1],'office');}
    mg('dark',x,z).add(new THREE.BoxGeometry(along?w*.9:.14,3,along?.14:d*.9),M(fx,1.75,fz),W);
    const [sx,sz]=faceOffset(face,x,z,w,d,.16);sign(sx,4.2,sz,face,Math.min(10,(along?w:d)*.6),b.lvl===2&&rng()<.4);}}
  if(b.lvl===2){debris(x,z,w,d,10,1.2);if(rng()<.08)addFire(x+R(-w/3,w/3),.8,z+d/2+1,1);}
  addCollider(x-w/2,x+w/2,z-d/2,z+d/2,base);
}
function house(x,z,w,d,col,roofCol,burnt){
  const b=blast(x,z);if(!b.lvl)return;
  if(b.lvl===1){const h=R(.5,1.6),c=col.clone().multiplyScalar(.3);
    for(const [ww,dd,ox,oz] of[[w,.3,0,d/2],[w,.3,0,-d/2],[.3,d,w/2,0],[.3,d,-w/2,0]]){if(rng()<.25)continue;const hh=h*R(.4,1);
      mg('plaster',x,z).add(boxUV(ww,hh,dd,4,3.4,true),M(x+ox,hh/2+.25,z+oz),c);addCollider(x+ox-ww/2,x+ox+ww/2,z+oz-dd/2,z+oz+dd/2,hh+.25);}
    if(rng()<.6){const ch=R(2,5);mg('brick',x,z).add(boxUV(.9,ch,.9,2,2,true),M(x+w*.3,ch/2+.25,z-d*.2),W);addCollider(x+w*.3-.45,x+w*.3+.45,z-d*.2-.45,z-d*.2+.45,ch);}
    debris(x,z,w,d,8);return;}
  burnt=burnt||b.lvl===2;
  const h=R(3.2,6.4);
  mg('plaster',x,z).add(boxUV(w,h,d,4,3.4,true),M(x,h/2+.25,z),burnt?col.clone().multiplyScalar(.35):col);
  if(!burnt||rng()<.4){const roof=new THREE.CylinderGeometry(.01,1,1,4,1);roof.rotateY(PI/4);
    const rh=R(1.6,3),tilt=burnt?R(-.25,.25):0;mg('plain',x,z).add(roof,M(x,h+.25+rh/2,z,tilt,0,tilt*.5,new THREE.Vector3(w*.78,rh,d*.78)),burnt?roofCol.clone().multiplyScalar(.3):roofCol);}
  else damageTop('char',x,h+.25,z,w*.9,d*.9,1.2,C(0x3a302a));
  if(rng()<.4)mg('plain',x,z).add(new THREE.BoxGeometry(.9,2.4,.9),M(x+w*.3,h+1.2,z-d*.2),tint(0x7a4b3a));
  mg('dark',x,z).add(new THREE.BoxGeometry(1.2,2.1,.1),M(x,1.3,z+d/2+.05),W);
  if(burnt)holes(x,z,w,d,h,2);
  addCollider(x-w/2,x+w/2,z-d/2,z+d/2,h);
}
function warehouse(x,z,w,d,col){
  const b=blast(x,z);if(!b.lvl){rubbleField(x,z,w,d);return;}
  if(b.lvl===1){skeleton(x,z,w,d,.25,R(7,11));mg('corr',x,z).add(boxUV(w*R(.3,.6),R(2,4),.3,6,6,true),M(x,1.5,z+d/2,R(-.2,.2),0,R(-.1,.1)),col.clone().multiplyScalar(.5));
    debris(x,z,w,d,16,1.2);for(let k=0;k<5;k++)mg('corr',x,z).add(boxUV(R(2,5),.08,R(3,6),6,6,true),M(x+R(-w/2,w/2),.4,z+R(-d/2,d/2),R(-.3,.3),rng()*3,R(-.3,.3)),col);return;}
  const h=R(8,13)*(b.lvl===2?.8:1);mg('corr',x,z).add(boxUV(w,h,d,6,6,true),M(x,h/2+.25,z),col);
  const teeth=Math.max(2,(d/7)|0);for(let k=0;k<teeth;k++){const g=new THREE.CylinderGeometry(.01,1,1,3,1);g.rotateZ(PI/2);
    if(rng()<(b.lvl===2?.4:.85))mg('corr',x,z).add(g,M(x,h+1.6+.25,z-d/2+(k+.5)*d/teeth,0,0,0,new THREE.Vector3(3.2,w*.98,d/teeth*.55)),col);}
  for(let k=0;k<3;k++)mg('dark',x,z).add(new THREE.BoxGeometry(4,4.4,.12),M(x-w/2+(k+1)*w/4,2.45,z+d/2+.06),W);
  if(dhash(x,z,5)<.4)addDoor(x-w/4,z+d/2+1.2,0,1,'warehouse');
  if(rng()<.5){const r=R(1,1.8),hh=R(14,26)*(b.lvl===2?R(.4,.8):1);mg('brick',x,z).add(new THREE.CylinderGeometry(r*.8,r,hh,10),M(x+w*.35,hh/2,z-d*.3),W);}
  holes(x,z,w,d,h,(rng()*(b.lvl===2?6:3))|0);addCollider(x-w/2,x+w/2,z-d/2,z+d/2,h+3);
}
function container(x,y,z,ry,col){mg('corr',x,z).add(boxUV(2.5,2.6,6.1,2,2,true),M(x,y+1.3,z,0,ry,0),col);}
function tent(x,z,ry,col){const g=new THREE.CylinderGeometry(.01,1,1,3,1);g.rotateZ(PI/2);mg('plain',x,z).add(g,M(x,1,z,0,ry,0,new THREE.Vector3(2.2,3.2,2.4)),col);}
function sandbags(x,z,ry,len){for(let t=-len/2;t<len/2;t+=.9)for(let r=0;r<2;r++)mg('plain',x,z).add(new THREE.BoxGeometry(.85,.32,.5),M(x+Math.cos(ry)*t,.4+r*.32,z-Math.sin(ry)*t,0,ry+R(-.1,.1),0),tint(0x8a7a58,.2));
  const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));addCollider(x-c*len/2-.3-s*.3,x+c*len/2+.3+s*.3,z-s*len/2-.3-c*.3,z+s*len/2+.3+c*.3,1);}
function barrier(x,z,ry){mg('concrete',x,z).add(boxUV(3,.9,.6,3,1,true),M(x,.7,z,0,ry,0),tint(0xb8b2a6));}

/* ======================= landmarks ======================= */
function landmark(kind,cx,cz,i,j){
  if(kind==='home')return homeTower(cx,cz);
  const b=blast(cx,cz);
  if(kind==='heli')return gunship(cx,cz);
  if(b.lvl===0){rubbleField(cx,cz,30,30);return;}
  if(b.lvl===1){rubbleField(cx,cz,26,26);skeleton(cx,cz,18,18,.25,R(8,20));
    if(kind==='church'){mg('concrete',cx,cz).add(boxUV(7,R(9,14),7,4,4,true),M(cx,6,cz+12,R(-.08,.08),0,R(-.08,.08)),tint(0x8a8070));addCollider(cx-3.5,cx+3.5,cz+8.5,cz+15.5,12);}
    addFire(cx+R(-6,6),.8,cz+R(-6,6),1.2);return;}
  if(kind==='church'){const col=tint(0xb9ad98);mg('concrete',cx,cz).add(boxUV(14,12,26,4,4,true),M(cx,6.25,cz),col);
    const r=new THREE.CylinderGeometry(.01,1,1,4,1);r.rotateY(PI/4);if(rng()<.5)mg('plain',cx,cz).add(r,M(cx,12.25+3,cz,0,0,0,new THREE.Vector3(11,6,20)),C(0x4b4038));else damageTop('char',cx,12.25,cz,12,24,3,C(0x3a302a));
    mg('concrete',cx,cz).add(boxUV(7,24,7,4,4,true),M(cx,12.25,cz+15),col);mg('plain',cx,cz).add(new THREE.ConeGeometry(4.6,12,4),M(cx,30.25,cz+15,.05,PI/4,.04),C(0x3b3330));
    mg('metal',cx,cz).add(new THREE.BoxGeometry(.4,3.4,.4),M(cx+.6,37.9,cz+15,0,0,.25),C(0x9a8a6a));mg('metal',cx,cz).add(new THREE.BoxGeometry(1.8,.4,.4),M(cx+.9,38.6,cz+15,0,0,.25),C(0x9a8a6a));
    mg('dark',cx,cz).add(new THREE.CircleGeometry(2.2,16),M(cx,9,cz-13.06,0,PI,0),W);
    addCollider(cx-7,cx+7,cz-13,cz+13,12);addCollider(cx-3.5,cx+3.5,cz+11.5,cz+18.5,24);addDoor(cx,cz-14.2,0,-1,'church',lmName[i+','+j]);return;}
  if(kind==='clocktower'){const col=tint(0xa89a84),[rx,rz]=leanOf(cx,cz,b.d).map(v=>v*1.6);mg('concrete',cx,cz).add(boxUV(9,52,9,4,4,true),Mbase(cx,.25,cz,52,rx,rz),col);
    const tx=cx-Math.sin(rz)*42,tz=cz+Math.sin(rx)*42;
    for(let f=0;f<4;f++){const a=f*PI/2;mg('dark',cx,cz).add(new THREE.CircleGeometry(3,24),M(tx+Math.sin(a)*4.56,42,tz+Math.cos(a)*4.56,0,a,0),W);}
    damageTop('concrete',cx,52.25,cz,9,9,4,col,-Math.sin(rz)*52,Math.sin(rx)*52);addCollider(cx-4.5,cx+4.5,cz-4.5,cz+4.5,52);return;}
  if(kind==='stadium'){const col=tint(0xa7a29a);const segs=40;for(let k=0;k<segs;k++){if(rng()<.22)continue;const a=k/segs*6.283,r=15,hh=R(5,15);
      mg('concrete',cx,cz).add(boxUV(3,hh,2.6,4,4,true),M(cx+Math.cos(a)*r,hh/2,cz+Math.sin(a)*r,0,-a,0),col);addCollider(cx+Math.cos(a)*r-1.4,cx+Math.cos(a)*r+1.4,cz+Math.sin(a)*r-1.4,cz+Math.sin(a)*r+1.4,hh);}
    mg('plain',cx,cz).add(new THREE.CircleGeometry(12,32),M(cx,.3,cz,-PI/2,0,0),C(0x4a4a34));
    for(const s of[[-1,-1],[1,1]])mg('metal',cx,cz).add(new THREE.BoxGeometry(.6,26,.6),M(cx+s[0]*17,13,cz+s[1]*17,0,0,s[0]*.1),C(0x777777));
    // raider stronghold inside the bowl
    for(let k=0;k<5;k++){const a=k/5*6.283+.3;tent(cx+Math.cos(a)*7,cz+Math.sin(a)*7,a,tint(pick([0x5a4a3a,0x4a5a3a,0x6a3a2a]),.2));}
    for(let k=0;k<6;k++){const a=k/6*6.283;mg('corr',cx,cz).add(boxUV(4,R(2,3),.15,6,6,true),M(cx+Math.cos(a)*11,1.3,cz+Math.sin(a)*11,0,-a+PI/2,R(-.1,.1)),tint(0x8a7a62));}
    addFire(cx,.9,cz,1.6);addFire(cx+5,.9,cz-3,1);camps.push({x:cx,z:cz,n:5,name:'Municipal Stadium'});return;}
  if(kind==='gasstation'){const col=C(0xe8e3d8);for(const s of[[-1,-1],[1,-1],[-1,1],[1,1]])mg('metal',cx,cz).add(new THREE.BoxGeometry(.5,5,.5),M(cx+s[0]*6,2.75,cz+s[1]*4,0,0,s[0]===1&&s[1]===1?.3:0),C(0x9a9a9a));
    mg('plain',cx,cz).add(new THREE.BoxGeometry(16,.8,12),M(cx,5.4,cz,.06,0,R(-.12,.12)),C(0x8a2a22));
    for(const s of[-3,3])mg('plain',cx,cz).add(new THREE.BoxGeometry(.9,1.7,.6),M(cx+s,1.1,cz),C(0xd8d2c4));
    shop.name_=lmName[i+','+j];shop(cx,cz+12,12,7,4,1,'plaster',tint(0xe6dfd2),'gasshop');
    mg('metal',cx,cz).add(new THREE.BoxGeometry(.4,9,.4),M(cx-9,4.75,cz-8),C(0x777777));
    const g=new THREE.PlaneGeometry(5,3);const uv=g.attributes.uv;const idx=27;for(let q=0;q<uv.count;q++)uv.setXY(q,(idx%4)/4+uv.getX(q)*.25,1-(((idx/4)|0)+1)/8+uv.getY(q)*.125);
    mg('sign',cx,cz).add(g,M(cx-9,9.5,cz-7.8,0,0,.12),W);addCollider(cx-3.5,cx+3.5,cz-.4,cz+.4,2);return;}
  if(kind==='theater'){const col=tint(0x7a3b30);tower(cx,cz+4,26,18,R(14,20),col,'brick',true);addDoor(cx,cz-6.2,0,-1,'theater',lmName[i+','+j]);
    mg('plain',cx,cz).add(new THREE.BoxGeometry(16,3,4),M(cx,6,cz-7.5,0,0,.08),C(0x1b1b1b));
    const g=new THREE.PlaneGeometry(14,2.6);const uv=g.attributes.uv;const idx=9;for(let q=0;q<uv.count;q++)uv.setXY(q,(idx%4)/4+uv.getX(q)*.25,1-(((idx/4)|0)+1)/8+uv.getY(q)*.125);
    mg('sign',cx,cz).add(g,M(cx,6,cz-9.55,0,PI,.08),W);return;}
  if(kind==='watertower'){for(const s of[[-1,-1],[1,-1],[-1,1],[1,1]])mg('metal',cx,cz).add(new THREE.BoxGeometry(.5,22,.5),M(cx+s[0]*3.5,11,cz+s[1]*3.5,s[1]*.08,0,-s[0]*.08),C(0x6e5a48));
    mg('metal',cx,cz).add(new THREE.CylinderGeometry(6,6,7,16),M(cx,25,cz,0,0,.06),C(0x7d6550));mg('metal',cx,cz).add(new THREE.ConeGeometry(6.4,3,16),M(cx,30,cz,0,0,.06),C(0x5f4c3e));
    for(const s of[[-1,-1],[1,-1],[-1,1],[1,1]])addCollider(cx+s[0]*3.5-.4,cx+s[0]*3.5+.4,cz+s[1]*3.5-.4,cz+s[1]*3.5+.4,22);
    warehouse(cx+3,cz+10,22,14,tint(0x7a7f86));return;}
  if(kind==='radiomast'){for(let k=0;k<12;k++){const y=k*8;mg('metal',cx,cz).add(new THREE.CylinderGeometry(.9-k*.05,1-k*.05,8,4,1,true),M(cx,y+4,cz,0,k*.4,0),C(0xa5483a));}
    mg('glow',cx,cz).add(new THREE.SphereGeometry(.9,8,6),M(cx,97,cz),W);for(let k=0;k<3;k++){const a=k*2.094;mg('metal',cx,cz).add(new THREE.BoxGeometry(.06,60,.06),M(cx+Math.cos(a)*14,30,cz+Math.sin(a)*14,Math.sin(a)*.42,0,-Math.cos(a)*.42),C(0x555555));}
    addCollider(cx-1,cx+1,cz-1,cz+1,96);
    mg('corr',cx,cz).add(boxUV(8,3,6,6,6,true),M(cx+8,1.75,cz+6),tint(0x7a7f86));addCollider(cx+4,cx+12,cz+3,cz+9,3.3);return;}
  if(kind==='ferris'){const R0=16,cy=R0+4;mg('metal',cx,cz).add(new THREE.TorusGeometry(R0,.35,6,48),M(cx,cy-1,cz,0,0,.18),C(0xb8b2a4));
    for(let k=0;k<16;k++){const a=k/16*6.283;if(rng()<.2)continue;mg('metal',cx,cz).add(new THREE.BoxGeometry(.2,R0,.2),M(cx+Math.cos(a)*R0/2,cy+Math.sin(a)*R0/2,cz,0,0,a+PI/2),C(0xa8a296));
      if(rng()<.6)mg('plain',cx,cz).add(new THREE.BoxGeometry(2,2,2),M(cx+Math.cos(a)*R0,cy+Math.sin(a)*R0-1.4,cz),tint(pick([0x8a2a22,0x2a5a8a,0xa8902e,0x2a7a4a]),.4));}
    for(let k=0;k<3;k++)mg('plain',cx,cz).add(new THREE.BoxGeometry(2,2,2),M(cx+R(-8,8),1.25,cz+R(-6,6),R(-.5,.5),rng()*3,R(-.5,.5)),tint(pick([0x8a2a22,0x2a5a8a,0xa8902e]),.4));
    for(const s of[-1,1]){mg('metal',cx,cz).add(new THREE.BoxGeometry(.6,cy*1.1,.6),M(cx+s*5,cy*.5,cz+2,0,0,s*.28),C(0x8a847a));addCollider(cx+s*5-.6,cx+s*5+.6,cz+1.4,cz+2.6,6);}return;}
  if(kind==='monument'){mg('concrete',cx,cz).add(boxUV(6,3,6,4,4,true),M(cx,1.75,cz),tint(0xb0a898));mg('concrete',cx,cz).add(boxUV(2,24,2,4,4,true),Mbase(cx,3.25,cz,24,-.06,.08),tint(0xcfc7b6));
    for(let k=0;k<12;k++){const a=k/12*6.283;if(rng()<.3)continue;mg('concrete',cx,cz).add(boxUV(.6,R(.8,1.2),.6,1,1,true),M(cx+Math.cos(a)*9,.75,cz+Math.sin(a)*9,R(-.3,.3),0,R(-.3,.3)),tint(0x9a9288));}
    addCollider(cx-3,cx+3,cz-3,cz+3,26);return;}
  if(kind==='library'){const col=tint(0xd9d0bf);mg('concrete',cx,cz).add(boxUV(26,12,18,4,4,true),M(cx,6.25,cz),col);
    for(let k=0;k<8;k++)if(rng()<.75)mg('concrete',cx,cz).add(new THREE.CylinderGeometry(.7,.8,10,10),M(cx-10.5+k*3,5.25,cz-10.5),col);else debris(cx-10.5+k*3,cz-11,1,1,3);
    const g=new THREE.CylinderGeometry(.01,1,1,3,1);g.rotateZ(PI/2);g.rotateY(PI/2);mg('concrete',cx,cz).add(g,M(cx,13.6,cz-10,0,0,.04,new THREE.Vector3(26,3.2,3)),col);
    mg('concrete',cx,cz).add(boxUV(26,1,4,4,4,true),M(cx,11.3,cz-10.5),col);holes(cx,cz,26,18,12,3);addCollider(cx-13,cx+13,cz-9,cz+9,12);addDoor(cx,cz-10.2,0,-1,'library',lmName[i+','+j]);return;}
  if(kind==='hospital'){const col=tint(0xd8d4cc);mg('office',cx,cz).add(boxUV(28,22,16,4,3.6,true),M(cx,11.25,cz-4),col);mg('office',cx,cz).add(boxUV(12,9,12,4,3.6,true),M(cx-6,4.75,cz+10),col);
    damageTop('office',cx,22.25,cz-4,28,16,4,col);holes(cx,cz-4,28,16,22,5);
    mg('plain',cx,cz).add(new THREE.BoxGeometry(4,1,.2),M(cx+4,18,cz+4.12),C(0xb02a22));mg('plain',cx,cz).add(new THREE.BoxGeometry(1,4,.2),M(cx+4,18,cz+4.12),C(0xb02a22));
    for(let k=0;k<3;k++)cars.push([cx+8+k*3,cz+12,PI/2+R(-.2,.2),false,rng()<.4,1]);
    addCollider(cx-14,cx+14,cz-12,cz+4,22);addCollider(cx-12,cx,cz+4,cz+16,9);addDoor(cx+6,cz+5.2,0,1,'hospital',lmName[i+','+j]);return;}
  if(kind==='market'){const col=tint(0xc8c0b0);mg('concrete',cx,cz).add(boxUV(30,8,22,4,4,true),M(cx,4.25,cz-4),col);
    mg('dark',cx,cz).add(new THREE.BoxGeometry(18,3,.15),M(cx,1.75,cz+7.08),W);
    const g=new THREE.PlaneGeometry(14,3.5);const uv=g.attributes.uv;const idx=24;for(let q=0;q<uv.count;q++)uv.setXY(q,(idx%4)/4+uv.getX(q)*.25,1-(((idx/4)|0)+1)/8+uv.getY(q)*.125);
    mg('sign',cx,cz).add(g,M(cx,6.6,cz+7.12,0,0,-.06),W);damageTop('concrete',cx,8.25,cz-4,30,22,2,col);
    for(let k=0;k<10;k++)cars.push([cx+R(-14,14),cz+R(10,16),rng()*6,rng()<.06,rng()<.5,rng()<.3?1:0]);
    addCollider(cx-15,cx+15,cz-15,cz+7,8.25);addDoor(cx,cz+8.2,0,1,'market',lmName[i+','+j]);return;}
}
function gunship(cx,cz){const col=C(0x3d4636);
  mg('metal',cx,cz).add(new THREE.CylinderGeometry(1.6,1.4,9,10),M(cx,1.6,cz,PI/2,.4,.35),col);
  mg('metal',cx,cz).add(new THREE.CylinderGeometry(.5,.8,7,8),M(cx+Math.sin(.4)*7,1.4,cz+Math.cos(.4)*7,PI/2-.15,.4,0),col);
  for(let k=0;k<4;k++)mg('metal',cx,cz).add(new THREE.BoxGeometry(.35,.08,R(4,7)),M(cx+R(-5,5),R(.3,3),cz+R(-5,5),R(-.5,.5),rng()*3,R(-.5,.5)),C(0x2a2a2a));
  mg('dark',cx,cz).add(new THREE.BoxGeometry(2.2,1.2,.2),M(cx-Math.sin(.4)*4.2,2.2,cz-Math.cos(.4)*4.2,0,.4,0),W);
  rubbleField(cx,cz,20,20);addFire(cx+2,1.6,cz+2,1.3);addCollider(cx-3,cx+3,cz-4,cz+4,3);}

/* ---------- the home tower: Meridian civil-defense tower, fallout shelter in the basement ---------- */
UD.towerStatic=null;
function homeTower(cx,cz){
  const T=TOWER,w=T.w,d=T.d,col=C(0x8a857c);
  // fortified lobby (floor 0) with the shelter's blast door on the south face
  UD.mg('concrete',cx,cz,true).add(boxUV(w,4.2,d,4,4,true),M(cx,2.35,cz),col);
  UD.mg('dark',cx,cz,true).add(new THREE.BoxGeometry(3.4,3,.2),M(cx,1.75,cz+d/2+.02),W);
  UD.mg('metal',cx,cz,true).add(new THREE.CylinderGeometry(1.35,1.35,.3,20),M(cx,1.7,cz+d/2+.18,PI/2,0,0),C(0x6a6a5e));
  UD.mg('metal',cx,cz,true).add(new THREE.CylinderGeometry(.25,.25,.5,10),M(cx,1.7,cz+d/2+.4,PI/2,0,0),C(0x8a7a3a));
  const sg=new THREE.PlaneGeometry(6,1.5);UD.mg('shelter',cx,cz,true).add(sg,M(cx,3.7,cz+d/2+.06),W);
  for(const s of[-1,1]){UD.mg('glow',cx,cz,true).add(new THREE.BoxGeometry(.6,.3,.4),M(cx+s*3,3.4,cz+d/2+.3),W);}
  // shell above: corner columns and the stair core run the full height; floors are added in game.js
  const top=.25+(T.slots+1)*T.fh;
  for(const [sx,sz] of[[-1,-1],[1,-1],[-1,1],[1,1]])UD.mg('concrete',cx,cz,true).add(boxUV(1.3,top-4.45,1.3,4,4,true),M(cx+sx*(w/2-.65),4.45+(top-4.45)/2,cz+sz*(d/2-.65)),col);
  UD.mg('concrete',cx,cz,true).add(boxUV(5,top-4.45+2,5,4,4,true),M(cx-4,4.45+(top-4.45+2)/2,cz-4),col.clone().multiplyScalar(.92));
  // courtyard: sandbag walls with a gap toward the street, a burning barrel, a floodlight
  sandbags(cx-7.5,cz+d/2+5.5,0,7);sandbags(cx+7.5,cz+d/2+5.5,0,7);sandbags(cx-12.5,cz+d/2+2.5,PI/2,5);sandbags(cx+12.5,cz+d/2+2.5,PI/2,5);
  addFire(cx+5,1.1,cz+d/2+3,.9);
  mg('metal',cx,cz).add(new THREE.CylinderGeometry(.35,.4,1,10),M(cx+5,.75,cz+d/2+3),C(0x5a4030));
  mg('metal',cx,cz).add(new THREE.BoxGeometry(.15,7,.15),M(cx-9,3.75,cz+d/2+1.5),C(0x555555));
  mg('metal',cx,cz).add(new THREE.BoxGeometry(.15,.15,1.4),M(cx-9,7.2,cz+d/2+1.9),C(0x555555));
  UD.mg('glow',cx,cz,true).add(new THREE.BoxGeometry(.8,.5,.4),M(cx-9,7.1,cz+d/2+2.6),W);
  addCollider(cx-w/2,cx+w/2,cz-d/2,cz+d/2,top+2);
  UD.towerTop=top;
}

/* ======================= lay out every block ======================= */
const roofCols=[0x5b3a2c,0x3a3e47,0x343f30,0x6a5a45,0x4a3030,0x2a2f38].map(C),houseCols=[0xc9bda8,0xb4a38a,0xa7b2b4,0xc1a78c,0x98a58a,0xd0c6b4,0xb9998c].map(C);
const lots=[];
for(let i=-N;i<N;i++)for(let j=-N;j<N;j++){
  const cx=(i+.5)*CELL,cz=(j+.5)*CELL,b=blast(cx,cz);
  let dist=district(i,j);if(b.d<RIM+6)dist='crater';
  lotType[i+','+j]=dist;
  const lm=lmAt[i+','+j];if(lm==='home')lotType[i+','+j]='home';
  if(dist!=='crater'||b.d>RIM-20)lots.push({cx,cz,ground:dist==='park'||dist==='residential'?'grass':'walk'});
  if(dist==='crater')continue;
  if(lm){landmark(lm,cx,cz,i,j);
    if(lm!=='home'){for(let k=0;k<14;k++)rubble.push([cx+R(-17,17),cz+R(-17,17),R(.2,.9)]);POIS.push({id:lm+i+'_'+j,kind:lm,name:lmName[i+','+j],x:cx,z:cz,focus:FOCUS[lm]});lmLoot(lm,cx,cz);}
    continue;}
  const H=BUILD/2;
  if(dist==='downtown'){
    const big=rng()<.3,hmax=110*(1-Math.hypot(cx,cz)/(EXT*.6))+25;
    if(big){const w=R(20,28),d=R(20,28);tower(cx,cz,w,d,R(.5,1)*hmax,tint(pick([0xb8b6b0,0xa9a39a,0xc5bda9,0x9aa5ad])),pick(['office','office','glass','plaster']));}
    else for(const sx of[-1,1])for(const sz of[-1,1]){if(rng()<.15){for(let k=0;k<20;k++)rubble.push([cx+sx*H/2+R(-6,6),cz+sz*H/2+R(-6,6),R(.4,1.6)]);continue;}
      const w=R(10,14),d=R(10,14);tower(cx+sx*(H-w/2),cz+sz*(H-d/2),w,d,R(.25,1)*hmax,tint(pick([0xb8b6b0,0xa9a39a,0xc5bda9,0x9aa5ad,0xd6c6a8])),pick(['office','brick','plaster','glass']));}
  }else if(dist==='commercial'){
    for(const face of[0,1,2,3]){let t=-H;
      while(t<H-6){const w=R(7,13);if(t+w>H)break;const d=R(9,13),h=rng()<.25?R(7,11):R(4,6.5),mat=pick(['brick','plaster','plaster','brick','office']);
        const along=t+w/2,off=H-d/2;const [x,z]=face===0?[cx+along,cz+off]:face===1?[cx+along,cz-off]:face===2?[cx+off,cz+along]:[cx-off,cz+along];
        if(rng()<.85)shop(x,z,face<2?w:d,face<2?d:w,h,face,mat,tint(pick([0xffffff,0xf0e6d8,0xe6d6c4,0xd8d0c8])));
        else for(let k=0;k<8;k++)rubble.push([x+R(-4,4),z+R(-4,4),R(.3,1.2)]);
        t+=w+R(.2,1.5);}}
    for(let k=0;k<7;k++)if(rng()<.7)cars.push([cx+R(-8,8),cz+R(-8,8),rng()*.3+(rng()<.5?0:PI/2),rng()<(b.lvl<=1?.4:.06),b.lvl<=2||rng()<.3,rng()<.25?1:0]);
  }else if(dist==='residential'){
    for(const sx of[-1,0,1])for(const sz of[-1,1]){if(rng()<.12)continue;
      const w=R(7,10),d=R(7,9),x=cx+sx*10.5,z=cz+sz*9;house(x,z,w,d,pick(houseCols),pick(roofCols),rng()<.3);
      if(sz===1&&blv(x,z)>=2){const hs=dhash(x,z,3);if(hs<.2)addDoor(x,z+d/2+1.1,0,1,hs<.1?'houseA':'houseB');}
      if(rng()<.5)trees.push([x+R(-4,4),z+sz*7,R(.7,1.3),b.lvl>=4&&rng()<.35]);
      if(rng()<.4)cars.push([x+R(-3,3),z+sz*6.5,rng()<.5?0:PI/2,rng()<(b.lvl<=1?.4:.05),b.lvl<=2||rng()<.25,rng()<.3?1:0]);}
    for(const sz of[-1,1])for(let k=-14;k<=14;k+=2)if(rng()<(b.lvl<=2?.3:.65))props.push(['fence',cx+k,cz+sz*16.5,0]);
  }else if(dist==='industrial'){
    const w=R(22,30),d=R(16,24);warehouse(cx+R(-2,2),cz-H+d/2,w,d,tint(pick([0x8a8f96,0x9a7e62,0x6e7c86,0x8e8070])));
    for(let k=0;k<6;k++){const col=tint(pick([0xb3412f,0x2c6aa0,0x3a7a52,0xc9922e,0x7a7a7a]),.3);const x=cx+R(-12,12),z=cz+R(4,12),ry=b.lvl<=1?rng()*3:rng()<.5?0:PI/2;
      container(x,0,z,ry,col);if(rng()<.4&&b.lvl>1)container(x+R(-.3,.3),2.6,z+R(-.3,.3),ry+R(-.1,.1),tint(pick([0xb3412f,0x2c6aa0,0xc9922e]),.3));addCollider(x-3.1,x+3.1,z-3.1,z+3.1,2.6);}
    if(rng()<.5&&b.lvl>1){const r=R(4,6),h=R(9,14);mg('metal',cx,cz).add(new THREE.CylinderGeometry(r,r,h,16),M(cx+12,h/2,cz+12),tint(0xb8b2a6));addCollider(cx+12-r,cx+12+r,cz+12-r,cz+12+r,h);}
    for(let k=0;k<2;k++){const [x,z]=edgePos(cx,cz);addLoot(x,z,rng()<.6?'scrap':'fuel');}
    if(rng()<.3)POIS.some(p=>p.kind==='ironworks')||POIS.push({id:'ironworks',kind:'ironworks',name:'Ironworks',x:cx,z:cz,focus:FOCUS.ironworks});
  }else if(dist==='park'){
    for(let k=0;k<16;k++)trees.push([cx+R(-H,H),cz+R(-H,H),R(.8,1.6),b.lvl>=4&&rng()<.25]);
    for(let k=0;k<4;k++)props.push(['bench',cx+R(-10,10),cz+R(-10,10),rng()*3]);
    if(rng()<.5){mg('concrete',cx,cz).add(new THREE.TorusGeometry(4,.6,6,24),M(cx,.5,cz,PI/2,0,0),tint(0x9a9288));mg('plain',cx,cz).add(new THREE.CircleGeometry(3.6,24),M(cx,.45,cz,-PI/2,0,0),C(0x3a3a2a));}
  }
  for(let k=0;k<(dist==='downtown'?18:8);k++)rubble.push([cx+R(-H-3,H+3),cz+R(-H-3,H+3),R(.15,.8)]);
  if(rng()<(dist==='downtown'||dist==='commercial'?.34:.22)){const [x,z]=edgePos(cx,cz);
    addLoot(x,z,dist==='commercial'?pick(['cache','food','food','medical','cache']):dist==='residential'?pick(['cache','food','water','cache']):pick(['cache','scrap','cache','tech']));}
  // raider camps in dangerous lots
  if(dist!=='downtown'&&towerDist(cx,cz)>210&&b.lvl>=2&&camps.length<9&&rng()<.03)raiderCamp(cx,cz);
}
function lmLoot(kind,cx,cz){const T={church:['food','food','cache'],clocktower:['scrap','scrap','tech'],stadium:['military','military','cache','scrap','food'],gasstation:['fuel','fuel','fuel','scrap'],
  theater:['cache','cache'],watertower:['water','water','water','scrap'],radiomast:['tech','tech','tech'],ferris:['scrap','food'],monument:['cache'],library:['cache','cache','tech'],
  hospital:['medical','medical','medical','medical','cache'],market:['food','food','food','water','water','cache'],heli:['military','military','military']}[kind]||['cache'];
  for(const t of T){const [x,z]=edgePos(cx,cz);addLoot(x,z,t);}}
function raiderCamp(cx,cz){const ox=cx+R(-6,6),oz=cz+R(-6,6);
  for(let k=0;k<3;k++)tent(ox+Math.cos(k*2.1)*5,oz+Math.sin(k*2.1)*5,k*2.1,tint(pick([0x5a4a3a,0x4a5a3a,0x6a3a2a]),.2));
  for(let k=0;k<4;k++){const a=k*1.57+.4;mg('corr',ox,oz).add(boxUV(5,2.4,.15,6,6,true),M(ox+Math.cos(a)*9,1.45,oz+Math.sin(a)*9,0,-a+PI/2,R(-.1,.1)),tint(0x8a7a62));}
  addFire(ox,.9,oz,1.2);mg('metal',ox,oz).add(new THREE.CylinderGeometry(.35,.4,1,10),M(ox,.75,oz),C(0x5a4030));
  const [lx,lz]=edgePos(cx,cz);addLoot(ox+3,oz+2,'cache');addLoot(lx,lz,pick(['military','scrap']));
  camps.push({x:ox,z:oz,n:3,name:'Raider camp'});
  POIS.push({id:'camp'+camps.length,kind:'camp',name:'Raider Camp',x:ox,z:oz,focus:FOCUS.camp});
}

/* ======================= roads: dead traffic, debris, lamps, checkpoints ======================= */
const LANES=[-4.3,-1.5,1.5,4.3],CARLEN=[4.4,5,12,7.5,4.6,7];
function roadClear(x,z){return gzDist(x,z)>RIM+8&&Math.hypot(x-TOWER.door.x,z-(TOWER.door.z+9))>15;}
function carType(){const r=rng();return r<.58?0:r<.78?1:r<.84?2:r<.92?3:4;}
for(let k=-N;k<=N;k++){
  // lamps
  for(let t=-EXT;t<EXT;t+=30){const local=((t%CELL)+CELL)%CELL;if(local<ROAD/2+3||local>CELL-ROAD/2-3)continue;
    const side=((t/30)|0)%2?1:-1;
    for(const [x,z,ry] of[[k*CELL+side*(ROAD/2+.6),t,side>0?PI:0],[t,k*CELL+side*(ROAD/2+.6),side>0?PI*1.5:PI/2]]){const bl=blast(x,z);if(bl.lvl<=1)continue;lampsPos.push([x,z,ry,bl.lvl]);}}
  // traffic jams: bumper-to-bumper lines of the evacuation that never moved
  for(const axis of[0,1]){
    const segs=2+((rng()*3)|0);
    for(let s=0;s<segs;s++){
      const start=R(-EXT,EXT-40),len=R(40,150),lanes=LANES.filter(()=>rng()<.65),dir=rng()<.5?1:-1;
      for(const lane of lanes){let t=start+R(0,6);
        while(t<start+len){const ty=carType(),L=CARLEN[ty];
          const x=axis?t:k*CELL+lane,z=axis?k*CELL+lane:t;
          if(roadClear(x,z)){const bl=blast(x,z);let ry=(axis?PI/2:0)+(lane>0?0:PI)+(dir<0?PI:0);
            let flip=false,burnt=bl.lvl<=2||rng()<.25;
            if(bl.lvl===1){ry=Math.atan2(x-GZ.x,z-GZ.z)+R(-.8,.8);flip=rng()<.45;}
            else if(bl.lvl===2){ry+=R(-.5,.5);flip=rng()<.12;}else ry+=R(-.12,.12);
            if(rng()<.08)ry+=R(-.9,.9);
            cars.push([x,z,ry,flip,burnt,ty]);
            if(!flip&&bl.lvl>=2&&burnt&&rng()<.03)addFire(x,1.3,z,1);
            if(!flip&&rng()<.11){const fx=-Math.sin(ry),fz=-Math.cos(ry);addLoot(x+fx*(L/2+.7)+(axis?0:R(-.4,.4)),z+fz*(L/2+.7),'car');}}
          t+=L+R(.6,2.2);}}
    }
  }
  // scattered wrecks, rubble, junk
  for(let n=0;n<10;n++){const along=R(-EXT,EXT),off=R(-ROAD/2+1.5,ROAD/2-1.5),x=rng()<.5;const px=x?k*CELL+off:along,pz=x?along:k*CELL+off;
    if(!roadClear(px,pz))continue;const bl=blast(px,pz);cars.push([px,pz,rng()*6,rng()<(bl.lvl<=1?.5:.15),bl.lvl<=2||rng()<.4,carType()]);}
  for(let n=0;n<80;n++){const along=R(-EXT,EXT),off=R(-ROAD/2,ROAD/2);const [px,pz]=rng()<.5?[k*CELL+off,along]:[along,k*CELL+off];
    if(gzDist(px,pz)<CRATER)continue;rubble.push([px,pz,R(.1,.6)*(blast(px,pz).lvl<=1?2:1)]);}
  for(let n=0;n<26;n++){const along=R(-EXT,EXT),off=R(-ROAD/2+.5,ROAD/2-.5);const [px,pz]=rng()<.5?[k*CELL+off,along]:[along,k*CELL+off];
    if(gzDist(px,pz)<RIM)continue;props.push([pick(['tire','barrel','paper','paper','cone','paper']),px,pz,rng()*6]);}
}
// blast-thrown debris in the ring around the crater
for(let n=0;n<1600;n++){const a=rng()*6.283,r=R(RIM+4,330),x=GZ.x+Math.cos(a)*r,z=GZ.z+Math.sin(a)*r;rubble.push([x,z,R(.15,.9)*(1.4-r/400)]);}
// outskirts: dead wasteland ring
for(let k=0;k<900;k++){const a=rng()*6.283,r=R(EXT+20,EXT+260),x=Math.cos(a)*r,z=Math.sin(a)*r;if(rng()<.6)rubble.push([x,z,R(.3,2)]);else trees.push([x,z,R(.8,1.5),false]);}
for(let k=0;k<110;k++){const a=rng()*6.283,r=R(EXT+20,EXT+220),x=Math.cos(a)*r,z=Math.sin(a)*r;cars.push([x,z,rng()*6,rng()<.3,true,carType()]);if(rng()<.15)addLoot(x+2.6,z,'car');}
// highway: intact far from the blast, collapsed near it, vaporised at the crater
(function(){const x0=5*CELL,col=tint(0x9a958c);
  for(let z=-EXT-100;z<EXT+100;z+=36){const zc=z+18,d=gzDist(x0,zc);
    if(d<RIM+24){debris(x0,zc,16,36,10,1.4);continue;}
    if(d<235){mg('concrete',x0,z).add(boxUV(16,1.6,36.2,6,6,true),M(x0+R(-3,3),R(1,3),zc,R(-.3,.3),R(-.15,.15),R(-.25,.25)),col);debris(x0,zc,16,36,8,1.3);addCollider(x0-8,x0+8,zc-17,zc+17,2.4);continue;}
    mg('concrete',x0,z).add(boxUV(16,1.6,36.2,6,6,true),M(x0,12,zc),col);
    for(const s of[-8,8])mg('concrete',x0,z).add(boxUV(.6,1.2,36.2,6,6,true),M(x0+s,13.4,zc),col);
    for(const s of[-1,1]){mg('concrete',x0,z).add(boxUV(2,11.2,2,4,4,true),M(x0+s*5,5.6,z),col);addCollider(x0+s*5-1,x0+s*5+1,z-1,z+1,11.2);}
    if(rng()<.6)for(let c=0;c<4;c++)cars.push(['hw',x0+pick(LANES),zc+R(-15,15),rng()<.5?0:PI,false,true,carType()]);}})();
// military checkpoints at two intersections
for(const [kx,kz] of[[-2,4],[6,2]]){const x=kx*CELL,z=kz*CELL;
  for(const s of[-1,1]){barrier(x+s*3,z-8,0);barrier(x+s*3,z+8,0);addCollider(x+s*3-1.6,x+s*3+1.6,z-8.4,z-7.6,.9);addCollider(x+s*3-1.6,x+s*3+1.6,z+7.6,z+8.4,.9);}
  sandbags(x-5,z,PI/2,6);sandbags(x+5,z-2,PI/2,4);
  tent(x+8,z+8,0,tint(0x4a5236,.15));tent(x-8,z-8,PI/2,tint(0x4a5236,.15));
  cars.push([x+2,z+11,0,false,false,5],[x-3,z-12,PI,false,true,5]);
  mg('metal',x,z).add(new THREE.BoxGeometry(.15,6,.15),M(x+6,3,z-6),C(0x555555));
  addLoot(x+7.5,z+5,'military');addLoot(x-7.5,z-5,'medical');addLoot(x+1,z-4,'military');
  addFire(x-2,.9,z+3,.8);
  POIS.push({id:'check'+kx,kind:'checkpoint',name:kx<0?'West Checkpoint':'East Checkpoint',x,z,focus:FOCUS.checkpoint});}
// sealed bunkers out in the wastes (revealed by the radio room)
const BUNKERS=[['Vault Kilo',-700,-430],['Bunker 7',735,260],['Shelter Delta',-210,735]];
for(const [name,x,z] of BUNKERS){
  mg('concrete',x,z).add(boxUV(9,.6,9,4,4,true),M(x,.3,z),tint(0x8a857d));
  mg('metal',x,z).add(new THREE.CylinderGeometry(1.5,1.5,.4,20),M(x,.75,z),C(0x6a6a5e));
  mg('metal',x,z).add(new THREE.BoxGeometry(.3,.4,1.2),M(x,1,z),C(0x8a7a3a));
  for(const s of[-1,1]){mg('metal',x,z).add(new THREE.CylinderGeometry(.25,.25,2.2,10),M(x+s*3.4,1.4,z+3),C(0x5a5a50));mg('metal',x,z).add(new THREE.CylinderGeometry(.35,.35,.4,10),M(x+s*3.4,2.6,z+3),C(0x3a3a34));}
  mg('metal',x,z).add(new THREE.BoxGeometry(.1,6,.1),M(x-3.6,3,z-3.6),C(0x555555));mg('glow',x,z).add(new THREE.SphereGeometry(.25,8,6),M(x-3.6,6.1,z-3.6),W);
  const s=addLoot(x,z,'bunker',.5,{name});addDoor(x,z,0,1,{'Vault Kilo':'vaultKilo','Bunker 7':'vault7','Shelter Delta':'vaultDelta'}[name],name,{hatch:true,hidden:true});
  POIS.push({id:'bunker_'+name,kind:'bunker',name,x,z,focus:FOCUS.bunker,hidden:true,spot:s});}
// ground zero itself
POIS.push({id:'gz',kind:'gz',name:'Ground Zero',x:GZ.x,z:GZ.z,focus:FOCUS.gz});
for(let k=0;k<5;k++){const a=rng()*6.283,r=R(8,CRATER-8);addLoot(GZ.x+Math.cos(a)*r,GZ.z+Math.sin(a)*r,'tech',.3);}
// starter caches a short walk from home
for(const [x,z,t] of[[24,-30,'cache'],[90,40,'food'],[-40,70,'water'],[70,-60,'scrap']])addLoot(x,z,t);
// rad barrel clusters
for(let n=0;n<34;n++){let x,z;
  if(n<14){const a=rng()*6.283,r=R(RIM+20,320);x=GZ.x+Math.cos(a)*r;z=GZ.z+Math.sin(a)*r;}
  else{x=R(-EXT,EXT);z=R(-EXT,EXT);}
  if(towerDist(x,z)<90)continue;
  const list=[];for(let k=0;k<3+((rng()*4)|0);k++)list.push([x+R(-3,3),z+R(-3,3),rng()<.25]);
  radSpots.push({x,z,r:10,str:1.5,barrels:list});}

/* ======================= build merged chunks ======================= */
for(const k in UD.chunks){const mat=k.split('|')[0];const ch=UD.chunks[k];if(ch.empty)continue;const mesh=new THREE.Mesh(ch.build(),MATS[mat]);
  mesh.castShadow=mat!=='sign'&&mat!=='glow'&&mat!=='shelter';mesh.receiveShadow=true;scene.add(mesh);}

/* ======================= ground ======================= */
const roadW=2*EXT+ROAD;
{const g=new THREE.PlaneGeometry(roadW,roadW);g.attributes.uv.array.forEach((v,i,a)=>a[i]=v*roadW/12);
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:asphaltTex,roughness:.95}));m.rotation.x=-PI/2;m.receiveShadow=true;scene.add(m);}
{const g=new THREE.PlaneGeometry(6400,6400);g.attributes.uv.array.forEach((v,i,a)=>a[i]=v*320);
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:dirtTex,roughness:1}));m.rotation.x=-PI/2;m.position.y=-.04;m.receiveShadow=true;scene.add(m);}
{const walk=new Merger(),grass=new Merger();
 for(const L of lots)(L.ground==='grass'?grass:walk).add(boxUV(LOT,.25,LOT,4,4,false),M(L.cx,.125,L.cz),UD.scorch(W,L.cx,L.cz));
 const wm=new THREE.Mesh(walk.build(),new THREE.MeshStandardMaterial({map:walkTex,vertexColors:true,roughness:1}));wm.receiveShadow=true;scene.add(wm);
 const gm=new THREE.Mesh(grass.build(),new THREE.MeshStandardMaterial({map:grassTex,vertexColors:true,roughness:1}));gm.receiveShadow=true;scene.add(gm);}
// blast scar: a huge soot stain with streaks pointing away from ground zero
{const sc=canvasTex(512,512,(x,w,h)=>{const g=x.createRadialGradient(256,256,30,256,256,256);g.addColorStop(0,'rgba(8,6,4,.95)');g.addColorStop(.45,'rgba(14,10,8,.7)');g.addColorStop(1,'rgba(20,14,10,0)');
   x.fillStyle=g;x.fillRect(0,0,w,h);for(let i=0;i<220;i++){const a=rng()*6.283,r0=R(60,120),r1=r0+R(40,140);x.strokeStyle=`rgba(6,4,3,${R(.15,.45)})`;x.lineWidth=R(1,5);
   x.beginPath();x.moveTo(256+Math.cos(a)*r0,256+Math.sin(a)*r0);x.lineTo(256+Math.cos(a)*r1,256+Math.sin(a)*r1);x.stroke();}},true);
 sc.wrapS=sc.wrapT=THREE.ClampToEdgeWrapping;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({map:sc,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-4}));
 m.rotation.x=-PI/2;m.position.set(GZ.x,.27,GZ.z);m.receiveShadow=true;scene.add(m);}
// lane dashes, faded and broken
{const dashes=[];for(let k=-N;k<=N;k++)for(let t=-EXT;t<EXT;t+=6){const local=((t%CELL)+CELL)%CELL;if(local<ROAD/2+1.5||local>CELL-ROAD/2-1.5)continue;
   if(rng()>.4&&gzDist(k*CELL,t)>RIM+10)dashes.push([k*CELL,t,0]);if(rng()>.4&&gzDist(t,k*CELL)>RIM+10)dashes.push([t,k*CELL,PI/2]);}
 const g=new THREE.PlaneGeometry(.22,2.6);g.rotateX(-PI/2);
 const m=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:C(0x8a7a4a),roughness:1,polygonOffset:true,polygonOffsetFactor:-2}),dashes.length);
 dashes.forEach((d,i)=>m.setMatrixAt(i,M(d[0],.015,d[1],0,d[2],0)));m.receiveShadow=true;scene.add(m);}

/* ======================= the crater ======================= */
const craterMats={};
{const pts=[];for(let i=0;i<=24;i++){const r=CRATER+(RIM+16-CRATER)*i/24;pts.push(new THREE.Vector2(r,UD.rimH(r)+.02));}pts.reverse();
 const rim=new THREE.Mesh(new THREE.LatheGeometry(pts,96),new THREE.MeshStandardMaterial({map:dirtTex,color:C(0xb8a48c),roughness:1}));
 rim.geometry.attributes.uv.array.forEach((v,i,a)=>a[i]=v*(i%2?4:30));
 rim.position.set(GZ.x,0,GZ.z);rim.receiveShadow=true;rim.castShadow=true;scene.add(rim);
 const fm=craterMats.floor=new THREE.MeshStandardMaterial({map:glassTex,color:C(0x9aa890),roughness:.25,metalness:.3,emissive:C(0x1c5a10),emissiveIntensity:.35});
 glassTex.repeat.set(6,6);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(CRATER+1,64),fm);floor.rotation.x=-PI/2;floor.position.set(GZ.x,.3,GZ.z);floor.receiveShadow=true;scene.add(floor);
 // twisted slag at the centre, glowing pools, fused shards
 const sl=new Merger();
 for(let k=0;k<9;k++){const h=R(4,16),a=rng()*6.283,r=R(0,6);sl.add(new THREE.ConeGeometry(R(.6,1.8),h,5),UD.M(GZ.x+Math.cos(a)*r,h/2,GZ.z+Math.sin(a)*r,R(-.5,.5),rng()*3,R(-.5,.5)),C(0x2a2622));}
 for(let k=0;k<40;k++){const a=rng()*6.283,r=R(10,CRATER-4);sl.add(new THREE.TetrahedronGeometry(R(.6,2.2)),UD.M(GZ.x+Math.cos(a)*r,.6,GZ.z+Math.sin(a)*r,rng()*3,rng()*3,rng()*3),C(0x24302a));}
 const slag=new THREE.Mesh(sl.build(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.4}));slag.castShadow=true;scene.add(slag);
 const pl=new Merger();for(let k=0;k<12;k++){const a=rng()*6.283,r=R(6,CRATER-10);pl.add(new THREE.CircleGeometry(R(2,6),18),UD.M(GZ.x+Math.cos(a)*r,.34,GZ.z+Math.sin(a)*r,-PI/2,0,0),W);}
 const pools=new THREE.Mesh(pl.build(),MATS.rad);scene.add(pools);
 UD.addCollider(GZ.x-3,GZ.x+3,GZ.z-3,GZ.z+3,10);}

/* ======================= instanced props ======================= */
{const m=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),rubble.length);
 const cols=[0x8f877e,0x7a6f64,0x9c8f80,0x5e5048,0x6e6458,0x4a3f36].map(C);
 rubble.forEach((r,i)=>{m.setMatrixAt(i,M(r[0],r[2]*.35+UD.groundAt(r[0],r[1])*.9,r[1],rng()*6,rng()*6,rng()*6,new THREE.Vector3(r[2]*R(.8,1.4),r[2]*R(.4,.9),r[2]*R(.8,1.4))));m.setColorAt(i,UD.scorch(pick(cols),r[0],r[1]));});
 m.castShadow=m.receiveShadow=true;scene.add(m);}
// vehicles: six body kits, each its own instanced mesh
(function(){
  const kits=[];
  const wheel=(g,x,z,r=.35)=>{for(const s of[-1,1])g.add(new THREE.CylinderGeometry(r,r,.25,6),M(s*x,r,z,0,0,PI/2),C(0x111111));};
  {const g=new Merger();g.add(boxUV(1.9,.85,4.4,2,2,true),M(0,.75,0),W);g.add(boxUV(1.7,.72,2.3,2,2,true),M(0,1.5,.15),C(0x15181a));wheel(g,.9,1.4);wheel(g,.9,-1.4);kits.push(g);}
  {const g=new Merger();g.add(boxUV(2.1,1.9,5,2,2,true),M(0,1.3,0),W);g.add(boxUV(2.0,.8,.1,2,2,true),M(0,1.75,-2.52),C(0x15181a));wheel(g,1,1.7,.4);wheel(g,1,-1.7,.4);kits.push(g);}
  {const g=new Merger();g.add(boxUV(2.6,2.9,12,2,2,true),M(0,1.85,0),W);for(let k=-5;k<=4;k++)g.add(new THREE.BoxGeometry(2.64,.8,.9),M(0,2.3,k*1.15),C(0x15181a));wheel(g,1.2,4,.5);wheel(g,1.2,-4,.5);kits.push(g);}
  {const g=new Merger();g.add(boxUV(2.4,2,2.4,2,2,true),M(0,1.45,-2.4),W);g.add(boxUV(2.5,2.8,5,2,2,true),M(0,1.95,1.1),C(0xb8b2a6));wheel(g,1.15,-2.4,.5);wheel(g,1.15,2.2,.5);kits.push(g);}
  {const g=new Merger();g.add(boxUV(1.9,.85,4.6,2,2,true),M(0,.75,0),W);g.add(boxUV(1.7,.72,2.3,2,2,true),M(0,1.5,.15),C(0x15181a));g.add(new THREE.BoxGeometry(1.94,.3,1.6),M(0,.95,.3),C(0xe8e4dc));
    g.add(new THREE.BoxGeometry(1.2,.16,.3),M(0,1.94,.3),C(0x2a3a8a));wheel(g,.9,1.4);wheel(g,.9,-1.4);kits.push(g);}
  {const g=new Merger();g.add(boxUV(2.4,2.2,2.4,2,2,true),M(0,1.55,-2.6),W);g.add(boxUV(2.5,.4,5,2,2,true),M(0,1.2,1.1),W);
    const arc=new THREE.CylinderGeometry(1.4,1.4,5,10,1,true,0,PI);arc.rotateX(PI/2);arc.rotateZ(PI/2);g.add(arc,M(0,1.5,1.1,0,0,0),C(0x4a5236));wheel(g,1.15,-2.6,.5);wheel(g,1.15,2.4,.5);kits.push(g);}
  const cols=[0x7a3b2a,0x5a5f66,0x8a7a5a,0x3e4d5c,0x6a2a24,0x8e8a80,0x4a5a3a,0x2a2a2a,0xa89a5a].map(C),busC=[0xc9a12e,0xd9d2c4,0x4a6a8a].map(C),burnt=C(0x2a2420),army=C(0x4a5236);
  for(let t=0;t<6;t++){const list=cars.filter(c=>(c[0]==='hw'?c[6]:c[5])===t);if(!list.length)continue;
    const mesh=new THREE.InstancedMesh(kits[t].build(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.35}),list.length);
    list.forEach((c,i)=>{const hw=c[0]==='hw';const x=hw?c[1]:c[0],z=hw?c[2]:c[1],ry=hw?c[3]:c[2],flip=hw?false:c[3],bt=hw?c[5]:c[4];
      const y=hw?12.8:UD.groundAt(x,z);const hgt=t===2?3.4:t>=3?2.9:t===1?2.2:1.9;
      mesh.setMatrixAt(i,M(x,y+(flip?hgt:0),z,flip?PI:R(-.03,.03),ry,flip?R(-.2,.2):R(-.05,.05)));
      let col=t===2?pick(busC):t===4?C(0xe8e4dc):t===5?army:pick(cols);if(bt)col=burnt.clone().lerp(col,R(0,.25));mesh.setColorAt(i,UD.scorch(col,x,z));
      if(!hw){const r=t===2?3.2:t>=3?2.6:t===1?2:1.8;addCollider(x-r,x+r,z-r,z+r,flip?1.2:hgt*.8);}});
    mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}
})();
{const tr=trees,trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.3,1,6).translate(0,.5,0),new THREE.MeshStandardMaterial({roughness:1}),tr.length);
 const leafy=tr.filter(t=>t[3]),crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({roughness:.95,flatShading:true}),Math.max(1,leafy.length));
 const lc=[0x5a5a30,0x6a6232,0x4f4f2a,0x7a6a3a,0x6a5232].map(C);let li=0;
 tr.forEach((t,i)=>{const bl=blast(t[0],t[1]).lvl,h=(bl<=1?R(.8,2):R(3,7))*t[2];trunk.setMatrixAt(i,M(t[0],0,t[1],bl<=2?R(-.3,.3):R(-.08,.08),0,bl<=2?R(-.3,.3):R(-.08,.08),new THREE.Vector3(t[2],h,t[2])));
   trunk.setColorAt(i,bl<=2?C(0x1c1612):C(0x3e3228));t.h=h;
   if(t[3]){crown.setMatrixAt(li,M(t[0],h,t[1],0,rng()*3,0,new THREE.Vector3(R(1.4,2.4)*t[2],R(1.2,2)*t[2],R(1.4,2.4)*t[2])));crown.setColorAt(li++,pick(lc));}});
 crown.count=li;trunk.castShadow=crown.castShadow=true;scene.add(trunk,crown);
 const dead=tr.filter(t=>!t[3]&&t.h>2.2),br=new THREE.InstancedMesh(new THREE.CylinderGeometry(.04,.1,1,4).translate(0,.5,0),new THREE.MeshStandardMaterial({color:C(0x2a221c),roughness:1}),Math.max(1,dead.length*3));
 dead.forEach((t,i)=>{for(let b=0;b<3;b++)br.setMatrixAt(i*3+b,M(t[0],R(.55,.9)*t.h,t[1],R(-1,1),rng()*6,R(-1,1),new THREE.Vector3(t[2],R(1.5,3)*t[2],t[2])));});
 br.count=dead.length*3;br.castShadow=true;scene.add(br);}
{const by=k=>props.filter(p=>p[0]===k);
 const inst=(list,geo,mat,fn)=>{if(!list.length)return;const m=new THREE.InstancedMesh(geo,mat,list.length);list.forEach((p,i)=>m.setMatrixAt(i,fn(p)));m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
 inst(by('fence'),new THREE.BoxGeometry(2,.9,.08),new THREE.MeshStandardMaterial({color:C(0x5a4a3a),roughness:1}),p=>M(p[1],.7,p[2],0,p[3]+R(-.15,.15),rng()<.3?R(-.9,.9):0));
 inst(by('bench'),new THREE.BoxGeometry(2,.5,.6),new THREE.MeshStandardMaterial({color:C(0x4a3a2a),roughness:1}),p=>M(p[1],.5,p[2],0,p[3],rng()<.2?.6:0));
 inst(by('tire'),new THREE.TorusGeometry(.38,.14,6,12),new THREE.MeshStandardMaterial({color:0x111111,roughness:.9}),p=>M(p[1],.15,p[2],PI/2+R(-.2,.2),0,p[3]));
 const bars=by('barrel');inst(bars,new THREE.CylinderGeometry(.32,.32,.9,10),new THREE.MeshStandardMaterial({color:C(0x6a3a22),roughness:.7,metalness:.4}),p=>rng()<.4?M(p[1],.32,p[2],PI/2,p[3],0):M(p[1],.45,p[2]));
 inst(by('cone'),new THREE.ConeGeometry(.22,.7,8),new THREE.MeshStandardMaterial({color:C(0xc85a1a),roughness:.8}),p=>rng()<.5?M(p[1],.2,p[2],PI/2,p[3],0):M(p[1],.35,p[2]));
 const paper=new THREE.MeshStandardMaterial({color:C(0xcfc8b8),roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3});
 inst(by('paper'),new THREE.PlaneGeometry(.5,.36),paper,p=>M(p[1],.03,p[2],-PI/2+R(-.1,.1),0,p[3]));}
// street lamps: bent and dead
{const lg=new Merger();lg.add(new THREE.CylinderGeometry(.08,.12,6,6),M(0,3,0),C(0x3d3d3d));lg.add(new THREE.BoxGeometry(.08,.08,1.6),M(0,6,.75),C(0x3d3d3d));lg.add(new THREE.BoxGeometry(.4,.18,.7),M(0,5.92,1.5),C(0x2a2a2a));
 const m=new THREE.InstancedMesh(lg.build(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.4}),lampsPos.length);
 lampsPos.forEach((p,i)=>{const bend=p[3]===2?(rng()<.5?R(-.7,.7):0):rng()<.18?R(-.4,.4):0;const fallen=p[3]===2&&rng()<.2;
   m.setMatrixAt(i,fallen?M(p[0],.12,p[1],PI/2,p[2],0):M(p[0],0,p[1],bend,p[2],bend*.3));});
 m.castShadow=true;scene.add(m);}
// traffic lights
{const tg=new Merger(),met=C(0x2e2a28);tg.add(new THREE.CylinderGeometry(.11,.15,5.4,8),M(0,2.7,0),met);tg.add(new THREE.BoxGeometry(3.4,.14,.14),M(1.7,5.2,0),met);tg.add(new THREE.BoxGeometry(.5,1.5,.45),M(3.2,4.45,0),C(0x1c1816));
 const mats=[];for(let k=-N;k<=N;k++)for(let l=-N;l<=N;l++){if(rng()<.4)continue;const sx=rng()<.5?-1:1,sz=rng()<.5?-1:1,px=k*CELL+sx*(ROAD/2+1.3),pz=l*CELL+sz*(ROAD/2+1.3);
   const bl=blast(px,pz).lvl;if(bl<=1)continue;
   const fallen=rng()<(bl===2?.5:.18),ry=sx>0?PI:0;mats.push(fallen?M(px,.15,pz,0,ry+R(-.4,.4),(rng()<.5?1:-1)*1.45):M(px,.25,pz,R(-.06,.06),ry,R(-.08,.08)));
   if(!fallen)addCollider(px-.25,px+.25,pz-.25,pz+.25,5);}
 const im=new THREE.InstancedMesh(tg.build(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.5}),mats.length);mats.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=true;scene.add(im);}
// distant ruined skyline beyond the wastes
{const far=new Merger();for(let i=0;i<140;i++){const a=rng()*6.283,r=R(1300,2100),w=R(20,60),h=R(20,150)*(rng()<.35?.35:1);
   far.add(new THREE.BoxGeometry(w,h,w*R(.6,1.2)),M(Math.cos(a)*r,h/2-2,Math.sin(a)*r,R(-.06,.06),rng()*3,rng()<.3?R(-.2,.2):0),W);
   if(rng()<.4)far.add(new THREE.BoxGeometry(w*.5,h*.3,w*.4),M(Math.cos(a)*r+R(-w/3,w/3),h+h*.12,Math.sin(a)*r,0,rng()*3,R(-.4,.4)),W);}
 UD.farMat=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});scene.add(new THREE.Mesh(far.build(),UD.farMat));}

/* ======================= loot visuals ======================= */
const LOOT_COL={cache:0xd9f07a,medical:0xff6b6b,fuel:0xffae42,scrap:0xd8c8a8,military:0x9fe04a,water:0x5ac8ff,food:0xffd27a,tech:0x7af0ff,car:0xb8ad98,bunker:0xffe14a,drop:0xff9a5a};
UD.LOOT_COL=LOOT_COL;
(function(){
  const kit={};
  {const g=new Merger();g.add(boxUV(1.1,.8,.8,1,1,false),M(0,.4,0),C(0x5d6a3a));g.add(new THREE.BoxGeometry(1.16,.12,.86),M(0,.82,0),C(0x3a4226));g.add(new THREE.BoxGeometry(.3,.02,.3),M(0,.89,0),C(0xc9b25a));kit.cache=g;}
  {const g=new Merger();g.add(boxUV(.8,.5,.6,1,1,false),M(0,.25,0),C(0xd8d4cc));g.add(new THREE.BoxGeometry(.4,.02,.12),M(0,.51,0),C(0xb02a22));g.add(new THREE.BoxGeometry(.12,.02,.4),M(0,.51,0),C(0xb02a22));
    g.add(boxUV(.6,.36,.5,1,1,false),M(.6,.18,.3,0,.5,0),C(0xc8c4bc));kit.medical=g;}
  {const g=new Merger();for(const [x,z,c] of[[0,0,0x9a2a1a],[.7,.2,0x8a6a1a]]){g.add(new THREE.CylinderGeometry(.3,.3,.9,12),M(x,.45,z),C(c));g.add(new THREE.CylinderGeometry(.31,.31,.05,12),M(x,.7,z),C(0x2a2a2a));}kit.fuel=g;}
  {const g=new Merger();for(let k=0;k<5;k++)g.add(boxUV(R(.6,1.2),.05,R(.4,.9),1,1,false),M(R(-.4,.4),.1+k*.08,R(-.3,.3),R(-.3,.3),rng()*3,R(-.3,.3)),C(pick([0x7a5a3a,0x6a6a6a,0x8a4a2a])));
    g.add(new THREE.CylinderGeometry(.06,.06,1.4,6),M(0,.4,.2,0,0,1.1),C(0x5a5a5a));kit.scrap=g;}
  {const g=new Merger();g.add(boxUV(1.5,.5,.6,1,1,false),M(0,.25,0),C(0x4a5236));g.add(new THREE.BoxGeometry(1.52,.06,.62),M(0,.4,0),C(0xb8a03a));g.add(boxUV(1.5,.5,.6,1,1,false),M(.1,.75,.05,0,.15,0),C(0x434a30));kit.military=g;}
  {const g=new Merger();for(const [x,z] of[[0,0],[.45,.1],[.2,.42]]){g.add(new THREE.CylinderGeometry(.18,.2,.55,10),M(x,.28,z),C(0x3a6a9a));g.add(new THREE.CylinderGeometry(.06,.06,.1,6),M(x,.6,z),C(0x2a3a5a));}kit.water=g;}
  {const g=new Merger();g.add(boxUV(.7,.5,.5,1,1,false),M(0,.25,0),C(0x9a7a4a));g.add(boxUV(.6,.45,.5,1,1,false),M(.1,.73,0,0,.3,0),C(0x8a6a3a));g.add(boxUV(.5,.4,.4,1,1,false),M(.65,.2,.1,0,.6,0),C(0xa88a5a));kit.food=g;}
  {const g=new Merger();g.add(boxUV(.7,.6,.5,1,1,false),M(0,.3,0),C(0x3a3e42));g.add(new THREE.BoxGeometry(.04,.5,.04),M(.25,.85,.15),C(0x2a2a2a));g.add(new THREE.BoxGeometry(.5,.08,.02),M(0,.45,.26),C(0x2a5a4a));kit.tech=g;}
  const byType={};loot.forEach((s,i)=>{if(!kit[s.type])return;(byType[s.type]||(byType[s.type]=[])).push(s);});
  for(const t in byType){const list=byType[t],mesh=new THREE.InstancedMesh(kit[t].build(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}),list.length);
    list.forEach((s,i)=>{s.mat=M(s.x,UD.groundAt(s.x,s.z),s.z,0,rng()*6,0);mesh.setMatrixAt(i,s.mat);s.inst={mesh,i};});mesh.castShadow=true;mesh.frustumCulled=false;mesh.userData.keep=true;scene.add(mesh);}
  const pos=[],col=[];const c=new THREE.Color();
  loot.forEach((s,i)=>{s.bi=i;const y=UD.groundAt(s.x,s.z)+(s.type==='bunker'?1.6:1.5);pos.push(s.x,y,s.z);c.set(LOOT_COL[s.type]).convertSRGBToLinear().multiplyScalar(s.type==='car'?.6:1.4);col.push(c.r,c.g,c.b);s.by=y;});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const beacons=new THREE.Points(g,new THREE.PointsMaterial({size:1.1,map:UD.glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  beacons.frustumCulled=false;scene.add(beacons);UD.beacons=beacons;
})();
{const pos=[];for(const d of doors)pos.push(d.x-d.nx*.9,d.hatch?1.4:2.7,d.z-d.nz*.9);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 const p=new THREE.Points(g,new THREE.PointsMaterial({size:.9,map:UD.glowTex,color:C(0xffd29a).multiplyScalar(1.6),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));p.frustumCulled=false;scene.add(p);}
UD.setLootVisible=function(s,on){
  if(s.inst){s.inst.mesh.setMatrixAt(s.inst.i,on?s.mat:new THREE.Matrix4().makeScale(0,0,0));s.inst.mesh.instanceMatrix.needsUpdate=true;}
  const p=UD.beacons.geometry.attributes.position;p.setY(s.bi,on?s.by:-999);p.needsUpdate=true;
};

/* ======================= spatial buckets for instanced meshes =======================
   three r128 culls an InstancedMesh by its base geometry's bounding sphere at the origin, which
   hides whole batches when you look away from downtown. Split each batch into map-sized buckets
   that share GPU buffers but carry their own bounds, so culling is correct and cheaper. */
function rebucket(m){
  const BUCK=480,n=m.count,B=new Map(),mat=new THREE.Matrix4(),p=new THREE.Vector3(),col=new THREE.Color();
  for(let i=0;i<n;i++){m.getMatrixAt(i,mat);p.setFromMatrixPosition(mat);const k=Math.floor((p.x+3000)/BUCK)*1000+Math.floor((p.z+3000)/BUCK);(B.get(k)||B.set(k,[]).get(k)).push(i);}
  const src=m.geometry;
  for(const idx of B.values()){const g=new THREE.BufferGeometry();for(const a in src.attributes)g.setAttribute(a,src.attributes[a]);if(src.index)g.setIndex(src.index);
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y1=0;
    const out=new THREE.InstancedMesh(g,m.material,idx.length);
    idx.forEach((i,j)=>{m.getMatrixAt(i,mat);out.setMatrixAt(j,mat);p.setFromMatrixPosition(mat);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);y1=Math.max(y1,p.y);
      if(m.instanceColor){m.getColorAt(i,col);out.setColorAt(j,col);}});
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3((x0+x1)/2,y1/2,(z0+z1)/2),Math.hypot(x1-x0,z1-z0,y1)/2+14);
    out.castShadow=m.castShadow;out.receiveShadow=m.receiveShadow;scene.add(out);}
  scene.remove(m);
}

/* ======================= rad barrels ======================= */
{const all=[];for(const r of radSpots)for(const b of r.barrels)all.push(b);
 const m=new THREE.InstancedMesh(new THREE.CylinderGeometry(.32,.32,.9,10),new THREE.MeshStandardMaterial({color:C(0x8a7a1a),roughness:.6,metalness:.4,emissive:C(0x2a5a0a),emissiveIntensity:.4}),all.length);
 all.forEach((b,i)=>m.setMatrixAt(i,b[2]?M(b[0],.32+UD.groundAt(b[0],b[1]),b[1],PI/2,rng()*6,0):M(b[0],.45+UD.groundAt(b[0],b[1]),b[1])));m.castShadow=true;scene.add(m);
 const pos=[];for(const r of radSpots){pos.push(r.x,.6+UD.groundAt(r.x,r.z),r.z);}for(let k=0;k<26;k++){const a=k/26*6.283;pos.push(GZ.x+Math.cos(a)*R(10,60),.8,GZ.z+Math.sin(a)*R(10,60));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 UD.radGlow=new THREE.PointsMaterial({size:9,map:UD.softTex,color:C(0x7dff3a),transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending});
 const pts=new THREE.Points(g,UD.radGlow);pts.frustumCulled=false;scene.add(pts);}

for(const m of scene.children.filter(o=>o.isInstancedMesh&&!o.userData.keep))rebucket(m);

/* ======================= fires, smoke, ground-zero column, crows ======================= */
const FP=6,fpos=new Float32Array(fires.length*FP*3),flife=new Float32Array(fires.length*FP);
for(let i=0;i<fires.length*FP;i++)flife[i]=Math.random();
const fireGeo=new THREE.BufferGeometry();fireGeo.setAttribute('position',new THREE.BufferAttribute(fpos,3));
const fireMat=new THREE.PointsMaterial({size:1.5,map:UD.glowTex,color:C(0xff8a2a).multiplyScalar(2.2),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
const firePts=new THREE.Points(fireGeo,fireMat);firePts.frustumCulled=false;scene.add(firePts);
const fireLights=UD.fireLights=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xff8a3a,0,22,2);scene.add(l);fireLights.push(l);}
// smoke plumes: from big fires and from ground zero
const plumes=[{x:GZ.x,y:4,z:GZ.z,big:true}];
fires.filter(f=>f.s>=1.2).slice(0,14).forEach(f=>plumes.push({x:f.x,y:f.y+1,z:f.z}));
const SP=26,BIGP=160;
function mkSmoke(n,size,col,op){const pos=new Float32Array(n*3),life=new Float32Array(n);for(let i=0;i<n;i++)life[i]=Math.random();
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const m=new THREE.PointsMaterial({size,map:UD.softTex,color:col,transparent:true,opacity:op,depthWrite:false,fog:true});const p=new THREE.Points(g,m);p.frustumCulled=false;scene.add(p);return{pos,life,g,m};}
const smoke=mkSmoke((plumes.length-1)*SP,9,C(0x2a2622),.4),column=mkSmoke(BIGP,46,C(0x3a332c),.32);
// crows wheel over landmarks
const flocks=POIS.filter(p=>p.kind!=='bunker').slice(0,9).map(p=>({x:p.x,z:p.z,r:R(10,26),h:R(26,46),sp:R(.25,.45)*(rng()<.5?1:-1)}));
const CROWS=7,crowGeo=new THREE.BufferGeometry();
crowGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.3, -.9,.15,.1, 0,0,.25,  0,0,-.3, .9,.15,.1, 0,0,.25],3));crowGeo.computeVertexNormals();
const crows=new THREE.InstancedMesh(crowGeo,new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.DoubleSide}),flocks.length*CROWS);crows.frustumCulled=false;crows.userData.keep=true;scene.add(crows);
const _m=new THREE.Matrix4(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_qq=new THREE.Quaternion(),_ee=new THREE.Euler();
let lightT=0;
UD.animWorld=function(t,dt,cam,wind){
  // flames
  for(let f=0;f<fires.length;f++){const F=fires[f];for(let k=0;k<FP;k++){const i=f*FP+k;flife[i]+=dt*(1.4+k*.15);if(flife[i]>1)flife[i]-=1;const l=flife[i];
    fpos[i*3]=F.x+Math.sin(k*2.1+t*3)*.25*F.s*(1-l);fpos[i*3+1]=F.y+l*1.6*F.s;fpos[i*3+2]=F.z+Math.cos(k*1.7+t*2.6)*.25*F.s*(1-l);}}
  fireGeo.attributes.position.needsUpdate=true;fireMat.size=1.3+Math.sin(t*11)*.15;
  if(!UD.inside){lightT-=dt;if(lightT<=0){lightT=.5;const near=fires.map(F=>[F,(F.x-cam.x)**2+(F.z-cam.z)**2]).sort((a,b)=>a[1]-b[1]);
    fireLights.forEach((l,i)=>{const n=near[i];if(n&&n[1]<90*90){l.position.set(n[0].x,n[0].y+1,n[0].z);l.userData.on=1;}else l.userData.on=0;});}
  fireLights.forEach((l,i)=>{l.intensity=l.userData.on?(1.6+Math.sin(t*13+i*3)*.35+Math.sin(t*7.3+i)*.25)*UD.fireBoost:0;});}
  // smoke
  for(let p=1;p<plumes.length;p++){const P=plumes[p];for(let k=0;k<SP;k++){const i=(p-1)*SP+k;smoke.life[i]+=dt*.06;if(smoke.life[i]>1)smoke.life[i]-=1;const l=smoke.life[i];
    smoke.pos[i*3]=P.x+wind.x*l*40+Math.sin(k*3.1+t*.3)*l*4;smoke.pos[i*3+1]=P.y+l*48;smoke.pos[i*3+2]=P.z+wind.z*l*40+Math.cos(k*2.3+t*.25)*l*4;}}
  smoke.g.attributes.position.needsUpdate=true;
  for(let k=0;k<BIGP;k++){column.life[k]+=dt*.012;if(column.life[k]>1)column.life[k]-=1;const l=column.life[k],a=k*2.399,spread=l<.7?6+l*30:6+21+(l-.7)*420;
    column.pos[k*3]=GZ.x+Math.cos(a)*spread*((k%7)/7+.3)+wind.x*l*90;column.pos[k*3+1]=8+l*300;column.pos[k*3+2]=GZ.z+Math.sin(a)*spread*((k%5)/5+.3)+wind.z*l*90;}
  column.g.attributes.position.needsUpdate=true;
  // crows
  let ci=0;for(const F of flocks)for(let k=0;k<CROWS;k++){const a=t*F.sp+k*.9,rr=F.r+Math.sin(t*.4+k)*4;
    _p.set(F.x+Math.cos(a)*rr,F.h+Math.sin(t*.7+k*1.3)*3,F.z+Math.sin(a)*rr);_ee.set(0,-a+(F.sp>0?0:PI),Math.sin(t*.9+k)*.3);_qq.setFromEuler(_ee);
    const flap=.55+.45*Math.abs(Math.sin(t*(7+k*.4)+k));_s.set(flap,1+(1-flap)*.6,1);_m.compose(_p,_qq,_s);crows.setMatrixAt(ci++,_m);}
  crows.instanceMatrix.needsUpdate=true;
  // crater + barrels breathe
  const pulse=.5+.5*Math.sin(t*1.3);MATS.rad.emissiveIntensity=.6+.5*pulse;UD.radGlow.opacity=.22+.18*pulse;craterMats.floor.emissiveIntensity=.25+.25*pulse;
};
UD.fireBoost=1;
UD.smokeMats=[smoke.m,column.m];
})();
