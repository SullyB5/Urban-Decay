/* Urban Decay · core: renderer, math helpers, merged-geometry chunks, colliders, ground height.
   Everything shared lives on window.UD so the other scripts can stay small and focused. */
(function(){
'use strict';
const UD=window.UD={};
const $=UD.$=id=>document.getElementById(id);
UD.fail=msg=>{UD.failed=true;document.body.insertAdjacentHTML('beforeend','<div class="err">'+msg+'</div>');};
if(!window.THREE){UD.fail('The 3D engine failed to load. Reload the page to try again.');return;}

/* ---------- deterministic random + noise ---------- */
let seed=4471;
const rng=UD.rng=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
UD.setSeed=s=>{seed=s|0;};
UD.R=(a,b)=>a+rng()*(b-a);
UD.pick=a=>a[(rng()*a.length)|0];
const clamp=UD.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sstep=UD.sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
UD.lerp=(a,b,t)=>a+(b-a)*t;
// Math.random-based helpers for gameplay (world generation keeps the seeded rng)
UD.rr=(a,b)=>a+Math.random()*(b-a);
UD.rpick=a=>a[(Math.random()*a.length)|0];
function hash(x,y){let h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
UD.hash=hash;
UD.vnoise=function(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
UD.C=h=>new THREE.Color(h).convertSRGBToLinear();
UD.coarse=matchMedia('(pointer:coarse)').matches;
UD.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- renderer / scene / camera ---------- */
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:!UD.coarse,powerPreference:'high-performance'});}
catch(e){UD.fail('This browser could not start WebGL, which the city needs to render.');return;}
UD.renderer=renderer;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,UD.coarse?1.4:1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);
const scene=UD.scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(new THREE.Color(),0.003);
const camera=UD.camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.1,3200);
camera.rotation.order='YXZ';
scene.add(camera);

/* ---------- textures + geometry helpers ---------- */
UD.canvasTex=function(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;};
UD.glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
UD.softTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.55,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
UD.boxUV=function(w,h,d,su,sv,solidTop){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;
    if(solidTop&&(f===2||f===3))uv.setXY(k,.02,.02);else uv.setXY(k,uv.getX(k)*dims[f][0]/su,uv.getY(k)*dims[f][1]/sv);}
  return g;
};
class Merger{
  constructor(){this.p=[];this.n=[];this.u=[];this.c=[];}
  add(g,m,col){const ng=g.index?g.toNonIndexed():g.clone();ng.applyMatrix4(m);
    const P=ng.attributes.position.array,Nn=ng.attributes.normal.array,U=ng.attributes.uv?ng.attributes.uv.array:null;
    for(let i=0;i<P.length;i++){this.p.push(P[i]);this.n.push(Nn[i]);}
    if(U)for(let i=0;i<U.length;i++)this.u.push(U[i]);else for(let i=0;i<P.length/3;i++)this.u.push(0,0);
    for(let i=0;i<P.length/3;i++)this.c.push(col.r,col.g,col.b);}
  get empty(){return this.p.length===0;}
  build(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.computeBoundingSphere();return g;}
}
UD.Merger=Merger;
const _q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3();
UD.ONE=new THREE.Vector3(1,1,1);
UD.M=function(x,y,z,rx=0,ry=0,rz=0,s=UD.ONE){_e.set(rx,ry,rz);_q.setFromEuler(_e);return new THREE.Matrix4().compose(_v.set(x,y,z),_q,s);};
// A box of height h standing on (x,y0,z), tilted by rx/rz around its base rather than its center
UD.Mbase=function(x,y0,z,h,rx,rz,ry=0){return UD.M(x-Math.sin(rz)*h/2,y0+h/2*Math.cos(rx)*Math.cos(rz),z+Math.sin(rx)*h/2,rx,ry,rz);};

/* ---------- world layout constants ---------- */
const N=13,CELL=48,ROAD=12;
Object.assign(UD,{N,CELL,ROAD,LOT:CELL-ROAD,BUILD:CELL-ROAD-6,EXT:N*CELL,CH:4});
UD.CHSZ=2*UD.EXT/UD.CH;
UD.GZ={x:192,z:-192};          // ground zero: the bomb hit east of downtown
UD.CRATER=70;UD.RIM=104;       // glassed floor radius, outer edge of the blast rim
UD.TOWER={x:24,z:24,w:22,d:22,fh:4.2,slots:10};UD.TOWER.door={x:24,z:37.2};
UD.gzDist=(x,z)=>Math.hypot(x-UD.GZ.x,z-UD.GZ.z);
UD.towerDist=(x,z)=>Math.hypot(x-UD.TOWER.x,z-UD.TOWER.z);

/* ---------- scorch: everything darkens toward ground zero ---------- */
const soot=UD.C(0x1d1712);
UD.scorchF=function(x,z){const d=UD.gzDist(x,z);let f;
  if(d<UD.RIM)f=.18;else if(d<240)f=UD.lerp(.24,.42,(d-UD.RIM)/(240-UD.RIM));else if(d<540)f=UD.lerp(.42,.8,(d-240)/300);else f=.86;
  return clamp(f*(.86+.28*UD.vnoise(x*.025+9,z*.025-4)),.12,1);};
UD.scorch=function(col,x,z){const f=UD.scorchF(x,z);return col.clone().multiplyScalar(f).lerp(soot,(1-f)*.25);};
const chunks=UD.chunks={};
UD.mg=function(mat,x,z,raw){const cx=clamp(Math.floor((x+UD.EXT)/UD.CHSZ),0,UD.CH-1),cz=clamp(Math.floor((z+UD.EXT)/UD.CHSZ),0,UD.CH-1),k=mat+'|'+cx+'|'+cz;
  const m=chunks[k]||(chunks[k]=new Merger());return raw?m:{add:(g,mm,col)=>m.add(g,mm,UD.scorch(col,x,z))};};

/* ---------- colliders (axis-aligned footprints with a height) ---------- */
const colliders=UD.colliders=[],GRID=UD.GRID=new Map();
const gkey=(gx,gz)=>(gx+64)*256+(gz+64);
UD.addCollider=function(x0,x1,z0,z1,h){const c={x0,x1,z0,z1,h};colliders.push(c);
  for(let gx=Math.floor(x0/CELL);gx<=Math.floor(x1/CELL);gx++)for(let gz=Math.floor(z0/CELL);gz<=Math.floor(z1/CELL);gz++){const k=gkey(gx,gz);(GRID.get(k)||GRID.set(k,[]).get(k)).push(c);}
  return c;};
UD.collide=function(p,r,feetY){
  const gx=Math.floor(p.x/CELL),gz=Math.floor(p.z/CELL);let hit=false;
  for(let ax=gx-1;ax<=gx+1;ax++)for(let az=gz-1;az<=gz+1;az++){const list=GRID.get(gkey(ax,az));if(!list)continue;
    for(const b of list){if(feetY>=b.h-.05)continue;
      if(p.x>b.x0-r&&p.x<b.x1+r&&p.z>b.z0-r&&p.z<b.z1+r){hit=true;
        const l=p.x-(b.x0-r),rr=(b.x1+r)-p.x,u=p.z-(b.z0-r),d=(b.z1+r)-p.z,m=Math.min(l,rr,u,d);
        if(m===l)p.x=b.x0-r;else if(m===rr)p.x=b.x1+r;else if(m===u)p.z=b.z0-r;else p.z=b.z1+r;}}}
  const lim=UD.EXT+250;p.x=clamp(p.x,-lim,lim);p.z=clamp(p.z,-lim,lim);
  return hit;};
UD.solidAt=function(x,y,z){const list=GRID.get(gkey(Math.floor(x/CELL),Math.floor(z/CELL)));if(!list)return false;
  for(const b of list)if(y<b.h&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1)return true;return false;};
UD.los=function(ax,ay,az,bx,by,bz){const dx=bx-ax,dy=by-ay,dz=bz-az,L=Math.hypot(dx,dy,dz),n=Math.ceil(L/1.5);
  for(let i=1;i<n;i++){const t=i/n;if(UD.solidAt(ax+dx*t,ay+dy*t,az+dz*t))return false;}return true;};

/* ---------- ground height: lots are raised curbs, the crater has a rim you can climb ---------- */
UD.onLot=function(x,z){const lx=((x%CELL)+CELL)%CELL,lz=((z%CELL)+CELL)%CELL;return Math.abs(x)<UD.EXT&&Math.abs(z)<UD.EXT&&lx>ROAD/2&&lx<CELL-ROAD/2&&lz>ROAD/2&&lz<CELL-ROAD/2;};
UD.rimH=function(d){if(d<UD.CRATER)return .3;if(d<88)return .3+6.4*sstep(UD.CRATER,88,d);if(d<UD.RIM+16)return 6.7*(1-sstep(88,UD.RIM+16,d));return 0;};
UD.groundAt=function(x,z){const d=UD.gzDist(x,z);const lot=UD.onLot(x,z)?.25:0;return d<UD.RIM+16?Math.max(lot,UD.rimH(d)):lot;};

addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
})();
