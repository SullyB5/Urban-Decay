/* Urban Decay · game: survival, the tower, expeditions, combat, HUD.
   Loop: prepare in the tower → pick an expedition → scavenge and survive → come home → build upward. */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;
const {$,scene,camera,renderer,C,clamp,sstep,lerp,rr,rpick,TOWER,GZ,CRATER,RIM,CELL,ROAD,EXT,N,gzDist,towerDist,M,boxUV,Merger}=UD;
const A=UD.Actors,S=UD.sfx,In=UD.In,ROOMS=UD.ROOMS,PI=Math.PI;
const coarse=UD.coarse,reduceMotion=UD.reduceMotion;

/* ======================= definitions ======================= */
const RES=[['food','Canned food',1],['meat','Raw meat',1],['water','Clean water',1],['dirty','Dirty water',1],['meds','Medkits',1],['radaway','Rad-Away',.5],
  ['ammo','Ammo',.1],['fuel','Fuel',2],['scrap','Scrap',1],['parts','Parts',1],['cloth','Cloth',.5]];
const RK=RES.map(r=>r[0]),RL=Object.fromEntries(RES.map(r=>[r[0],r[1]])),RW=Object.fromEntries(RES.map(r=>[r[0],r[2]]));
const MODS={
  quarters:{name:'Living Quarters',cost:{scrap:18,cloth:8},repeat:true,desc:'Bunks for 3 more survivors. Resting here heals faster.'},
  storage:{name:'Storage Hall',cost:{scrap:22,parts:2},repeat:true,desc:'Raises every stash limit.'},
  workshop:{name:'Workshop',cost:{scrap:28,parts:4},desc:'Firearms, armor, rucksacks, ammo pressing.'},
  kitchen:{name:'Kitchen',cost:{scrap:18,fuel:2},desc:'Cook meat into meals. Meat stops spoiling.'},
  purifier:{name:'Water Purifier',cost:{scrap:24,parts:6},power:2,desc:'Purifies 1 dirty water an hour. Roof catchers collect rain.'},
  medbay:{name:'Medical Room',cost:{scrap:20,cloth:10,meds:1},desc:'Medkits, Rad-Away, rad suits. Heals and flushes rads while home.'},
  generator:{name:'Generator Room',cost:{scrap:30,parts:8},repeat:true,desc:'+6 power. Burns 1 fuel every 3 hours.'},
  solar:{name:'Solar Deck',cost:{scrap:26,parts:12},repeat:true,req:'workshop',desc:'+3 power in daylight. No fuel.'},
  farm:{name:'Hydroponic Farm',cost:{scrap:26,parts:6,water:4},power:2,repeat:true,req:'purifier',desc:'Grows 1 food every 4 hours from 1 clean water.'},
  defense:{name:'Defense Platform',cost:{scrap:36,parts:10,ammo:30},power:1,req:'workshop',desc:'Roof turrets shoot hostiles near the tower and break raids.'},
  radio:{name:'Radio Room',cost:{scrap:24,parts:14},power:1,req:'generator',desc:'Finds sealed bunkers and draws survivors to the tower.'},
};
const RECIPES=[
  {id:'boil',at:'bunker',field:'stove',name:'Boil water',cost:{dirty:2,fuel:1},give:{water:2}},
  {id:'roast',at:'bunker',field:'stove',name:'Roast meat',cost:{meat:1,fuel:1},give:{food:1}},
  {id:'stew',at:'bunker',field:'stove',name:'Wasteland stew',cost:{meat:1,dirty:1,fuel:1},give:{food:2},desc:'A long boil makes the dirty water safe.'},
  {id:'handload',at:'bunker',field:'bench',name:'Hand-load ammo',cost:{scrap:4,parts:1},give:{ammo:8}},
  {id:'prybar',at:'bunker',field:'bench',name:'Makeshift pry bar',cost:{scrap:8},gear:'prybar',desc:'Forces open sealed vault hatches.'},
  {id:'machete',at:'bunker',field:'bench',name:'Rebar machete',cost:{scrap:10,cloth:2},gear:'machete',desc:'Replaces the knife. Twice the bite, longer reach.'},
  {id:'filter',at:'bunker',field:'bench',name:'Charcoal canteen filter',cost:{cloth:4,scrap:4,parts:1},gear:'filter',desc:'Dirty water stops giving you rads.'},
  {id:'snares',at:'bunker',name:'Snare line',cost:{scrap:6,cloth:4},gear:'snares',desc:'Traps on the lower floors catch 1–2 meat each dawn.'},
  {id:'pack1',at:'bunker',name:'Scrap backpack',cost:{cloth:10,scrap:6},gear:'pack1',desc:'Carry 65 instead of 40.'},
  {id:'coat',at:'bunker',name:'Insulated coat',cost:{cloth:14},gear:'coat',desc:'No cold damage at night.'},
  {id:'cook',at:'kitchen',name:'Cook a meal batch',cost:{meat:2},give:{food:3}},
  {id:'press',at:'workshop',name:'Ammo press run',cost:{scrap:6,parts:1},give:{ammo:20}},
  {id:'shotgun',at:'workshop',name:'Scrap shotgun',cost:{scrap:24,parts:8},gear:'shotgun',desc:'Eight pellets. Brutal up close.'},
  {id:'rifle',at:'workshop',name:'Hunting rifle',cost:{scrap:30,parts:12},gear:'rifle',desc:'One heavy round, long reach.'},
  {id:'vest',at:'workshop',name:'Plate vest',cost:{scrap:26,cloth:8},gear:'vest',desc:'Takes 35% off every hit.'},
  {id:'pack2',at:'workshop',name:'Military rucksack',cost:{cloth:16,parts:6},gear:'pack2',req:'pack1',desc:'Carry 100.'},
  {id:'turret2',at:'workshop',name:'Turret servos',cost:{parts:20,scrap:20},gear:'turret2',req:'defense',desc:'Turrets hit twice as hard.'},
  {id:'medkit',at:'medbay',name:'Medkit',cost:{cloth:3,parts:1},give:{meds:1}},
  {id:'radaway',at:'medbay',name:'Rad-Away',cost:{meds:1,parts:2},give:{radaway:2}},
  {id:'suit',at:'medbay',name:'Rad suit',cost:{cloth:18,parts:6},gear:'suit',desc:'Cuts radiation exposure by 65%.'},
];
const STATION={bunker:'Shelter bench',kitchen:'Kitchen',workshop:'Workshop',medbay:'Medical Room'};
const FIELD={stove:'Camp stove',bench:'Scrap workbench'};
const GEARNAME={prybar:'pry bar',coat:'insulated coat',vest:'plate vest',suit:'rad suit',machete:'rebar machete',filter:'canteen filter',shotgun:'scrap shotgun',rifle:'hunting rifle'};
const WEAP={
  knife:{name:'Combat knife',melee:true,dmg:24,rate:.5,range:2.6},
  machete:{name:'Rebar machete',melee:true,dmg:48,rate:.55,range:2.9},
  pistol:{name:'Pipe pistol',dmg:26,rate:.3,cap:8,spread:.012,range:90,reload:1.3,pellets:1,snd:'pistol'},
  shotgun:{name:'Scrap shotgun',dmg:14,rate:.85,cap:4,spread:.065,range:30,reload:2.1,pellets:8,snd:'shotgun'},
  rifle:{name:'Hunting rifle',dmg:75,rate:1.05,cap:5,spread:.002,range:170,reload:1.9,pellets:1,snd:'rifle'},
};
const LOOT_T={
  cache:{food:[0,2],water:[0,2],ammo:[0,8],scrap:[1,4],cloth:[0,2],meds:[0,1,.25],fuel:[0,1,.2]},
  medical:{meds:[1,2],radaway:[0,2,.6],cloth:[1,3]},
  fuel:{fuel:[1,3],scrap:[0,2]},
  scrap:{scrap:[3,7],parts:[0,2,.5]},
  military:{ammo:[8,20],meds:[0,1,.4],parts:[1,2],radaway:[0,1,.3]},
  water:{water:[1,3],dirty:[1,4]},
  food:{food:[2,4],water:[0,1,.5]},
  tech:{parts:[2,5],scrap:[1,3]},
  car:{scrap:[1,3],fuel:[0,1,.5],cloth:[0,1,.4],food:[0,1,.3],ammo:[0,6,.3],meds:[0,1,.12]},
  bunker:{food:[8,14],water:[8,14],meds:[3,6],radaway:[2,4],ammo:[40,70],parts:[10,18],fuel:[4,8],cloth:[6,10]},
  cloth:{cloth:[2,4],scrap:[0,1,.4]},
  fridge:{food:[1,2],meat:[0,2,.4],water:[0,1,.5]},
  safe:{ammo:[4,12],meds:[0,1,.5],parts:[1,3],radaway:[0,1,.3]},
  armory:{ammo:[12,26],parts:[1,3]},
  drawers:{cloth:[0,2],scrap:[0,2],meds:[0,1,.2],ammo:[0,6,.3],food:[0,1,.3]},
};
const IN_NAME={food:'shelves',water:'water jugs',medical:'medicine cabinet',military:'ammo crates',scrap:'scrap pile',tech:'electronics',cloth:'wardrobe',fuel:'fuel drums',safe:'safe',fridge:'fridge',armory:'gun rack',drawers:'drawers'};
const LOOT_NAME={cache:'supply cache',medical:'medical supplies',fuel:'fuel drums',scrap:'scrap pile',military:'military crate',water:'water jugs',food:'food boxes',tech:'electronics',car:'car trunk',bunker:'sealed bunker hatch',drop:'dropped pack'};
const TIERMUL=[1,1,1.3,1.65,2,2.6];
const DANGER=['','Low','Moderate','High','Extreme','Lethal'];
const CYCLE=720; // real seconds per in-game day

/* ======================= state + save ======================= */
const SAVE_KEY='urbanDecay.save.v2';
const zero=()=>Object.fromEntries(RK.map(k=>[k,0]));
function newState(){return{v:2,t:7.2,hp:100,food:85,water:85,rads:0,sta:100,
  stash:{food:5,meat:0,water:5,dirty:4,meds:2,radaway:0,ammo:24,fuel:3,scrap:14,parts:2,cloth:4},pack:zero(),
  floors:[],pop:1,gear:{},weapon:'pistol',mag:{pistol:8,shotgun:0,rifle:0},lootGot:{},route:null,loc:{id:'tower',fl:-1},ins:{},opened:{},
  stormAt:24+14+Math.floor(rr(0,8)),stormEnd:0,fuelAcc:0,farmAcc:0,rainAcc:0,intro:true,inBase:false,radioFound:false,kills:0,trips:0,deepest:1,lastRaid:0};}
let G=newState();
UD.G=G;
function hasSave(){try{return!!localStorage.getItem(SAVE_KEY);}catch(e){return false;}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(G));}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.v===2){G=Object.assign(newState(),s);G.stash=Object.assign(zero(),s.stash);G.pack=Object.assign(zero(),s.pack);
  if(!('loc' in s))G.loc=s.inBase?{id:'tower',fl:-1}:null;G.inBase=false;G.ins=G.ins||{};G.opened=G.opened||{};UD.G=G;return true;}}catch(e){}return false;}
const day=()=>Math.floor(G.t/24)+1,tod=()=>G.t%24;
const count=m=>G.floors.filter(f=>f===m).length,built=m=>count(m)>0;
const stormActive=()=>G.t>=G.stormAt&&G.t<G.stormEnd;
const capOf=k=>(k==='ammo'?300:60)+count('storage')*(k==='ammo'?240:80);
const packCap=()=>G.gear.pack2?100:G.gear.pack1?65:40;
const packLoad=()=>RK.reduce((s,k)=>s+G.pack[k]*RW[k],0);
const owned=()=>[G.gear.machete?'machete':'knife','pistol',...(G.gear.shotgun?['shotgun']:[]),...(G.gear.rifle?['rifle']:[])];
const inside=()=>!!In.cur;
const atHome=()=>!!(G.loc&&G.loc.id==='tower'&&In.cur);
const insState=id=>G.ins[id]||(G.ins[id]={l:{},clr:0});
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const roofY=()=>.25+(G.floors.length+1)*TOWER.fh;
const popCap=()=>2+3*count('quarters');
function powerState(){const nG=count('generator'),nS=count('solar'),daylight=tod()>7&&tod()<18&&!stormActive();
  const solar=daylight?3*nS:0,gen=nG&&(G.stash.fuel>0||G.fuelAcc<1)?6*nG:0;let dem=0;for(const f of G.floors)dem+=MODS[f].power||0;
  return{sup:solar+gen,solar,gen,dem,ok:solar+gen>=dem};}

/* ======================= sky, lights ======================= */
const skyU={top:{value:new THREE.Color()},hor:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color()},glowAmt:{value:1}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(2600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 vDir;uniform vec3 top,hor,sunDir,sunCol;uniform float glowAmt;
  void main(){vec3 d=normalize(vDir);float y=max(d.y,0.0);
    vec3 c=mix(hor,top,pow(smoothstep(0.0,1.0,y),0.5));
    float s=max(dot(d,sunDir),0.0);
    c+=sunCol*(pow(s,6.0)*0.4*glowAmt+pow(s,60.0)*0.6*glowAmt)+sunCol*2.0*smoothstep(0.9993,0.9996,s)*step(-0.05,sunDir.y);
    if(d.y<0.0)c=hor;
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`}));
sky.renderOrder=-1;scene.add(sky);
const starGeo=new THREE.BufferGeometry(),starPos=[];
for(let i=0;i<1400;i++){const u=Math.random()*2-1,a=Math.random()*6.283,r=Math.sqrt(1-u*u);if(u<.08)continue;starPos.push(Math.cos(a)*r*2400,u*2400,Math.sin(a)*r*2400);}
starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({size:2,sizeAttenuation:false,color:0xffffff,transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(stars);
const moon=new THREE.Mesh(new THREE.SphereGeometry(40,20,14),new THREE.MeshBasicMaterial({color:C(0xd9d2c0),fog:false,transparent:true}));scene.add(moon);
const hemi=new THREE.HemisphereLight(0xffffff,0x3a332a,.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2);sun.castShadow=true;
sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);
Object.assign(sun.shadow.camera,{left:-110,right:110,top:110,bottom:-110,near:1,far:900});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;
scene.add(sun,sun.target);
const moonLight=new THREE.DirectionalLight(C(0x9fb0d0),0);scene.add(moonLight,moonLight.target);
const flash=new THREE.SpotLight(0xfff1d6,0,55,.42,.5,1.4);flash.position.set(.15,-.1,0);camera.add(flash);const flashT=new THREE.Object3D();flashT.position.set(0,-.4,-10);camera.add(flashT);flash.target=flashT;
const K={nightTop:C(0x05060a),nightHor:C(0x16110d),dayTop:C(0x5e5c55),dayHor:C(0xb39574),duskTop:C(0x3a2a2a),duskHor:C(0xc45a2a),
  warm:C(0xff9a5a),white:C(0xffe2c2),stormTop:C(0x262b1c),stormHor:C(0x5d6640)};
const _c1=new THREE.Color(),_c2=new THREE.Color(),sunDir=new THREE.Vector3();
let night=0,stormMix=0,lightning=0;const wind={x:.5,z:.2};
function applyTime(){
  const td=tod(),ang=(td-6)/12*PI;sunDir.set(Math.cos(ang)*.82,Math.sin(ang),.42).normalize();
  const sy=sunDir.y,dayF=sstep(-.08,.28,sy),tw=clamp(1-Math.abs(sy)/.32,0,1);night=1-sstep(-.18,.02,sy);
  _c1.copy(K.nightTop).lerp(K.dayTop,dayF).lerp(K.duskTop,tw*.55);_c2.copy(K.nightHor).lerp(K.dayHor,dayF).lerp(K.duskHor,tw*.75);
  if(stormMix>0){_c1.lerp(K.stormTop.clone().multiplyScalar(.25+.75*dayF),stormMix*.85);_c2.lerp(K.stormHor.clone().multiplyScalar(.2+.8*dayF),stormMix*.85);}
  if(lightning>0){_c1.lerp(K.white,lightning*.6);_c2.lerp(K.white,lightning*.7);}
  skyU.top.value.copy(_c1);skyU.hor.value.copy(_c2);skyU.sunDir.value.copy(sunDir);skyU.sunCol.value.copy(K.warm).lerp(K.white,sstep(.05,.5,sy)).multiplyScalar(1-stormMix*.8);skyU.glowAmt.value=sstep(-.15,.05,sy);
  const fog=scene.fog;fog.color.copy(_c2).multiplyScalar(.9);fog.density=.0034+.0012*night+.0075*stormMix;scene.background=fog.color;
  UD.farMat.color.copy(fog.color).multiplyScalar(.6);
  sun.intensity=1.9*sstep(-.02,.18,sy)*(1-stormMix*.75);sun.color.copy(K.warm).lerp(K.white,sstep(.05,.5,sy));sun.castShadow=sun.intensity>.05;
  moonLight.intensity=.32*night*(1-stormMix*.7);hemi.intensity=.15+.5*dayF+lightning*2.5;hemi.color.copy(_c1).lerp(K.white,.5);hemi.groundColor.setRGB(.06,.05,.045).lerp(C(0x4a4236),dayF);
  stars.material.opacity=night*(1-stormMix);moon.material.opacity=night*(1-stormMix);
  const lit=sstep(.1,.9,night);for(const k of['office','brick','plaster','glass'])UD.MATS[k].emissiveIntensity=lit*1.4;UD.MATS.shelter.emissiveIntensity=.1+lit*.5;
  towerWall.emissiveIntensity=.15+lit*1.6;UD.fireBoost=.4+.6*night;
  renderer.toneMappingExposure=1.02+.3*night;
  for(const m of UD.smokeMats)m.color.setRGB(.06+.12*dayF,.055+.11*dayF,.05+.1*dayF);
  UD.winMat.emissive.copy(_c2).multiplyScalar(.75+lightning*.8);
  if(UD.inside&&In.cur){const th=In.cur.th;sun.intensity=0;sun.castShadow=false;moonLight.intensity=0;
    hemi.intensity=th.amb+lightning*.3;hemi.color.setHex(0xfff0dc);hemi.groundColor.setRGB(.09,.08,.07);
    fog.density=.016;fog.color.setRGB(.03,.026,.022);scene.background=fog.color;renderer.toneMappingExposure=1.08;}
}
function ambientTemp(){const td=tod();const day=Math.max(0,Math.sin(PI*(td-6)/14));return Math.round(-4+46*Math.pow(day,1.1)-stormMix*9);}

/* ======================= the tower's floors ======================= */
const wallTex=UD.canvasTex(128,96,(x,w,h)=>{x.fillStyle='#857f75';x.fillRect(0,0,w,h);for(let i=0;i<1500;i++){const v=(Math.random()*60)|0;x.fillStyle=`rgba(${v},${v},${v*.9|0},.25)`;x.fillRect(Math.random()*w,Math.random()*h,2,2);}
  for(const X of[14,78]){x.fillStyle='#3a3a36';x.fillRect(X-3,24,42,46);x.fillStyle='#1d1a16';x.fillRect(X,27,36,40);x.fillStyle='#5a5a52';for(let k=0;k<4;k++)x.fillRect(X,30+k*10,36,3);}});
const wallEm=UD.canvasTex(128,96,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(const X of[14,78]){const g=x.createLinearGradient(0,27,0,67);g.addColorStop(0,'#ffb060');g.addColorStop(1,'#a04a10');x.fillStyle=g;x.fillRect(X,27,36,40);x.fillStyle='#000';for(let k=0;k<4;k++)x.fillRect(X,30+k*10,36,3);}});
const towerWall=new THREE.MeshStandardMaterial({map:wallTex,emissiveMap:wallEm,emissive:0xffffff,emissiveIntensity:.2,roughness:.85});
const hazardTex=UD.canvasTex(64,16,(x,w,h)=>{x.fillStyle='#d9a91c';x.fillRect(0,0,w,h);x.fillStyle='#14110c';for(let i=-16;i<w;i+=16){x.beginPath();x.moveTo(i,h);x.lineTo(i+8,0);x.lineTo(i+16,0);x.lineTo(i+8,h);x.fill();}});
const crossTex=UD.canvasTex(64,64,(x,w,h)=>{x.fillStyle='#e8e4dc';x.fillRect(0,0,w,h);x.fillStyle='#b02a22';x.fillRect(24,8,16,48);x.fillRect(8,24,48,16);});
const TW={
  slab:new THREE.MeshStandardMaterial({map:UD.MATS.concrete.map,vertexColors:true,roughness:.95}),wall:towerWall,
  ruin:new THREE.MeshStandardMaterial({map:UD.MATS.concrete.map,vertexColors:true,roughness:1}),steel:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.6}),
  wood:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),grow:new THREE.MeshStandardMaterial({color:C(0x2a3a1a),emissive:C(0xb0ff6a),emissiveIntensity:1.1,roughness:.6}),
  hazard:new THREE.MeshStandardMaterial({map:hazardTex,roughness:.7}),cross:new THREE.MeshStandardMaterial({map:crossTex,roughness:.8,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:C(0xfff0c0),emissive:C(0xffc070),emissiveIntensity:1.6}),
  solar:new THREE.MeshStandardMaterial({color:C(0x1a2a4a),roughness:.25,metalness:.7}),
  cloth:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),
};
const towerGroup=new THREE.Group();scene.add(towerGroup);
let turrets=[],turretShots=0;
function srand(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
function rebuildTower(){
  while(towerGroup.children.length)towerGroup.remove(towerGroup.children[0]);
  turrets=[];const mgs={},W=new THREE.Color(1,1,1);
  const add=(k,g,m,col=W)=>(mgs[k]||(mgs[k]=new Merger())).add(g,m,col);
  const T=TOWER,w=T.w,d=T.d,x=T.x,z=T.z,nb=G.floors.length;
  for(let f=1;f<=T.slots;f++){const y0=.25+f*T.fh,mod=G.floors[f-1],r=srand(f*7919);
    if(mod){add('slab',boxUV(w+.6,.45,d+.6,4,4,true),M(x,y0+.22,z),C(0x9a958c));
      for(const [ww,dd,ox,oz] of[[w,.3,0,d/2-.15],[w,.3,0,-d/2+.15],[.3,d,w/2-.15,0],[.3,d,-w/2+.15,0]])add('wall',boxUV(ww,3.75,dd,5.5,3.75,false),M(x+ox,y0+.45+1.875,z+oz));
      add('slab',boxUV(w*.8,.25,2.2,4,4,true),M(x,y0+.32,z+d/2+1.1),C(0x8a857c));
      for(let k=-1;k<=1;k+=2)add('steel',new THREE.BoxGeometry(.06,1,.06),M(x+k*w*.4,y0+.95,z+d/2+2.15),C(0x555555));
      add('steel',new THREE.BoxGeometry(w*.8,.06,.06),M(x,y0+1.45,z+d/2+2.15),C(0x555555));
      dress(add,mod,x,y0,z,w,d,r);
    }else{
      for(let k=0;k<2;k++){const sw=w*(.3+r()*.4),sd=d*(.25+r()*.35);if(r()<.35)continue;
        add('ruin',boxUV(sw,.4,sd,4,4,true),M(x+(r()-.5)*(w-sw),y0+.2,z+(r()-.5)*(d-sd),(r()-.5)*.3,0,(r()-.5)*.3),C(0x5a554e));}
      for(let k=0;k<5;k++)add('steel',new THREE.BoxGeometry(.06,1+r()*2,.06),M(x+(r()-.5)*w,y0+.8,z+(r()-.5)*d,(r()-.5)*1.2,0,(r()-.5)*1.2),C(0x4a3326));
      if(f===nb+1){for(const [sx,sz] of[[-1,1],[1,1],[-1,-1],[1,-1],[0,1]])add('wood',new THREE.BoxGeometry(.18,T.fh,.18),M(x+sx*(w/2+.9),y0+T.fh/2,z+sz*(d/2+.9)),C(0x8a6a3a));
        for(let k=0;k<3;k++)add('wood',new THREE.BoxGeometry(w+2,.12,.5),M(x,y0+.3+k*1.4,z+d/2+.9),C(0x9a7a4a));
        add('hazard',new THREE.BoxGeometry(w+2,.4,.05),M(x,y0+3.6,z+d/2+1.2));}
    }}
  // roof gear sits on top of the highest finished floor and climbs as the tower grows
  const ry=roofY();
  if(built('purifier')){for(const s of[-1,1]){add('steel',new THREE.ConeGeometry(1.4,1.2,12,1,true),M(x+s*5,ry+1.6,z+5,PI,0,0),C(0x6a7a8a));add('steel',new THREE.CylinderGeometry(.9,.9,1.4,12),M(x+s*5,ry+.7,z+5),C(0x3a5a7a));}}
  if(built('solar'))for(let k=0;k<count('solar')*2&&k<6;k++)add('solar',new THREE.BoxGeometry(3,.08,1.8),M(x-6+k%3*4,ry+1,z-3-((k/3)|0)*2.6,-.5,0,0));
  if(built('radio')){add('steel',new THREE.CylinderGeometry(.08,.14,14,6),M(x-4,ry+7,z-4),C(0x8a8a8a));add('glow',new THREE.SphereGeometry(.25,8,6),M(x-4,ry+14.1,z-4));
    add('steel',new THREE.CylinderGeometry(1.4,.2,.6,14,1,true),M(x+6,ry+1.6,z-6,.6,.8,0),C(0xb8b8b0));}
  add('steel',new THREE.CylinderGeometry(.05,.05,6,6),M(x+8,ry+3,z+8),C(0x777777));add('cloth',new THREE.PlaneGeometry(2.2,1.3),M(x+9.1,ry+5.2,z+8,0,.3,0),C(0x8a2a22));
  for(const k in mgs){const mesh=new THREE.Mesh(mgs[k].build(),TW[k]);mesh.castShadow=k!=='glow'&&k!=='grow';mesh.receiveShadow=true;towerGroup.add(mesh);}
  if(built('defense'))for(const [sx,sz] of[[-1,-1],[1,1],[1,-1],[-1,1]].slice(0,2+Math.min(2,count('defense')))){
    const g=new THREE.Group();g.position.set(x+sx*(w/2-1.6),ry,z+sz*(d/2-1.6));
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,.8,10),new THREE.MeshStandardMaterial({color:C(0x4a5236),roughness:.7}));base.position.y=.4;base.castShadow=true;g.add(base);
    const head=new THREE.Group();head.position.y=1.1;g.add(head);
    const box=new THREE.Mesh(new THREE.BoxGeometry(.8,.5,.9),base.material);box.castShadow=true;head.add(box);
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.6,8),new THREE.MeshStandardMaterial({color:0x151515,metalness:.6,roughness:.4}));bar.rotation.x=PI/2;bar.position.z=-1;head.add(bar);
    towerGroup.add(g);turrets.push({g,head,x:g.position.x,y:ry+1.1,z:g.position.z,cd:Math.random()});}
  A.setSurvivors(Math.min(G.pop-1,8),ry);
}
function dress(add,mod,x,y0,z,w,d,r){const fz=z+d/2,ex=x+w/2;
  if(mod==='quarters'){add('steel',new THREE.BoxGeometry(.05,.05,w*.7),M(x,y0+2.6,fz+1.9,0,PI/2,0),C(0x555555));for(let k=0;k<6;k++)add('cloth',new THREE.PlaneGeometry(.8,1),M(x-w*.3+k*1.5,y0+2.1,fz+1.9,0,0,(r()-.5)*.2),new THREE.Color().setHSL(r(),.3,.35));}
  if(mod==='storage')for(let k=0;k<4;k++)add('wood',boxUV(1.1,.9,.9,1,1,true),M(x-6+k*3.6,y0+.9,fz+1.2,0,r()*.4,0),C(0x6a5a3a));
  if(mod==='workshop'){add('steel',new THREE.BoxGeometry(5,.3,.3),M(ex+2.3,y0+3.6,z),C(0xb8902a));add('steel',new THREE.BoxGeometry(.04,2.6,.04),M(ex+4.6,y0+2.3,z),C(0x333333));add('steel',new THREE.BoxGeometry(.5,.4,.5),M(ex+4.6,y0+.9,z),C(0x6a6a6a));}
  if(mod==='kitchen'){add('steel',new THREE.CylinderGeometry(.25,.25,5,8),M(ex+.4,y0+3,z+4),C(0x5a5a5a));add('steel',new THREE.CylinderGeometry(.4,.25,.5,8),M(ex+.4,y0+5.7,z+4),C(0x3a3a3a));}
  if(mod==='purifier')for(const s of[-1,1]){add('steel',new THREE.CylinderGeometry(.7,.7,1.8,12),M(x+s*4,y0+1.35,fz+1.1),C(0x3a6a9a));add('steel',new THREE.CylinderGeometry(.08,.08,3,6),M(x+s*4,y0+2.5,fz+.4),C(0x7a7a7a));}
  if(mod==='medbay')add('cross',new THREE.PlaneGeometry(3,3),M(x,y0+2.4,fz+.02));
  if(mod==='generator'){add('hazard',new THREE.BoxGeometry(w+.1,.35,d+.1),M(x,y0+.62,z));add('steel',new THREE.CylinderGeometry(.35,.35,6,8),M(ex+.4,y0+3.2,z-5),C(0x3a3632));add('glow',new THREE.BoxGeometry(.4,.4,.1),M(x+3,y0+2.4,fz+.05));}
  if(mod==='solar')for(let k=0;k<3;k++)add('solar',new THREE.BoxGeometry(3.6,.06,1.6),M(x-6+k*6,y0+1.4,fz+1.4,-.6,0,0));
  if(mod==='farm'){add('grow',new THREE.BoxGeometry(w-1,2.3,.05),M(x,y0+2.2,fz+.02));for(let k=0;k<6;k++){add('wood',new THREE.BoxGeometry(1.2,.4,.6),M(x-7+k*2.8,y0+.65,fz+1.3),C(0x5a4a2a));add('cloth',new THREE.IcosahedronGeometry(.45,0),M(x-7+k*2.8,y0+1.1,fz+1.3),C(0x4a7a2a));}}
  if(mod==='defense'){for(let k=-4;k<=4;k++)add('wood',new THREE.BoxGeometry(.9,.35,.5),M(x+k*1.9,y0+.65,fz+1.9),C(0x8a7a58));add('steel',new THREE.CylinderGeometry(.06,.06,1.6,6),M(x,y0+1.1,fz+2.6,PI/2,0,0),C(0x151515));}
  if(mod==='radio')add('steel',new THREE.CylinderGeometry(1.1,.15,.5,14,1,true),M(ex+.6,y0+2.6,z+3,0,0,-PI/2+.3),C(0xb8b8b0));
}

/* ======================= player + view model ======================= */
const player=new THREE.Vector3(TOWER.door.x,1.7,TOWER.door.z+3);
let yaw=PI,pitch=0,groundY=0,bob=0,vel=new THREE.Vector3(),recoil=0;
const keys={},joy={x:0,y:0,bx:0,by:0};
const vm=new THREE.Group();camera.add(vm);vm.scale.setScalar(.62);
const VM={};
{const mk=(parts)=>{const g=new THREE.Group();for(const [geo,col,pos,rot] of parts){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:C(col),roughness:.5,metalness:.5}));m.position.set(...pos);if(rot)m.rotation.set(...rot);g.add(m);}g.visible=false;vm.add(g);return g;};
 VM.knife=mk([[new THREE.BoxGeometry(.03,.025,.3),0xb8b8b8,[0,.02,-.2]],[new THREE.BoxGeometry(.045,.05,.14),0x2a1e16,[0,0,0]]]);
 VM.machete=mk([[new THREE.BoxGeometry(.035,.09,.46),0x9a9a94,[0,.03,-.28]],[new THREE.BoxGeometry(.05,.06,.16),0x3a2a1e,[0,0,0]],[new THREE.BoxGeometry(.04,.02,.4),0x6a3a22,[0,.08,-.26]]]);
 VM.pistol=mk([[new THREE.BoxGeometry(.07,.1,.3),0x2a2a28,[0,.02,-.12]],[new THREE.BoxGeometry(.06,.16,.08),0x3a2a1e,[0,-.08,-.02],[.25,0,0]],[new THREE.CylinderGeometry(.018,.018,.22,8),0x4a4a46,[0,.04,-.32],[PI/2,0,0]]]);
 VM.shotgun=mk([[new THREE.BoxGeometry(.08,.1,.5),0x3a2a1e,[0,0,-.1]],[new THREE.CylinderGeometry(.03,.03,.6,8),0x2a2a28,[0,.05,-.5],[PI/2,0,0]],[new THREE.CylinderGeometry(.03,.03,.5,8),0x2a2a28,[0,-.01,-.45],[PI/2,0,0]]]);
 VM.rifle=mk([[new THREE.BoxGeometry(.06,.09,.6),0x4a3220,[0,0,-.1]],[new THREE.CylinderGeometry(.016,.016,.7,8),0x222222,[0,.04,-.6],[PI/2,0,0]],[new THREE.CylinderGeometry(.03,.03,.28,10),0x151515,[0,.11,-.2],[PI/2,0,0]]]);}
const muzzle=new THREE.PointLight(0xffb060,0,14,2);muzzle.position.set(0,.05,-.7);vm.add(muzzle);
let fireCd=0,reloadT=0,firing=false,useHeld=false,useT=0,swingT=0,flashOn=false,hurtT=0,radT=0,geigerAcc=0;

/* ======================= HUD helpers ======================= */
let toastT=0;function toast(t,long){$('toast').textContent=t;$('toast').classList.add('on');toastT=long?4.2:2.6;}
const fmt=(o)=>Object.entries(o).filter(([,v])=>v>0).map(([k,v])=>`+${v} ${RL[k].toLowerCase()}`).join(' · ');
function costHTML(cost,from=G.stash){return Object.entries(cost).map(([k,v])=>`<span class="cost${(from[k]||0)<v?' short':''}">${v} ${RL[k].toLowerCase()}</span>`).join('');}
const afford=(cost,from=G.stash)=>Object.entries(cost).every(([k,v])=>(from[k]||0)>=v);
const pay=(cost,from=G.stash)=>{for(const [k,v] of Object.entries(cost))from[k]-=v;};

/* ======================= loot + packs ======================= */
function roll(type,tier){const T=LOOT_T[type],out={},mul=TIERMUL[tier]||1;
  for(const [k,[a,b,ch]] of Object.entries(T)){if(ch!==undefined&&Math.random()>ch)continue;const n=Math.round((a+Math.floor(Math.random()*(b-a+1)))*mul);if(n>0)out[k]=n;}
  if(!Object.keys(out).length)out.scrap=1;return out;}
function addToPack(items){const got={},left={};let room=packCap()-packLoad();
  for(const [k,v] of Object.entries(items)){const fit=Math.min(v,Math.floor(room/RW[k]+1e-6));if(fit>0){G.pack[k]+=fit;got[k]=fit;room-=fit*RW[k];}if(fit<v)left[k]=v-fit;}
  return{got,left};}
const drops=[];
const dropMat=new THREE.MeshStandardMaterial({color:C(0x4a3a2a),roughness:1});
function dropLoot(x,z,items,y,ins){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.35,0),dropMat);m.position.set(x,(y!==undefined?y:UD.groundAt(x,z))+.3,z);m.scale.y=.7;m.castShadow=true;scene.add(m);
  const b=new THREE.Sprite(new THREE.SpriteMaterial({map:UD.glowTex,color:C(0xff9a5a),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));b.scale.setScalar(.9);b.position.set(x,m.position.y+1.1,z);scene.add(b);
  drops.push({x,z,items,m,b,t:0,inside:!!ins});}
function removeInsideDrops(){for(const d of[...drops])if(d.inside)removeDrop(d);}
function removeDrop(d){scene.remove(d.m);scene.remove(d.b);drops.splice(drops.indexOf(d),1);}
function restoreLoot(){for(const [i,dv] of Object.entries(G.lootGot)){const s=UD.loot[+i];if(!s)continue;if(dv<=day()){delete G.lootGot[i];s.got=false;UD.setLootVisible(s,true);}else{s.got=true;UD.setLootVisible(s,false);}}}

/* ======================= interaction ======================= */
let target=null,tgtT=0;
// instant actions (doors, stairs, benches) fire on the press itself; searches still need a hold
function useNow(){if(G.inBase||G.dead)return;const nt=findTarget();if(nt&&!nt.dur){target=nt;doInteract();target=null;tgtT=0;useHeld=false;}else{target=nt||target;useHeld=true;}}
const doorName=d=>d.name||(ROOMS.P[d.tpl]||{}).name||'building';
function findTarget(){
  if(G.inBase)return null;
  const px=player.x,pz=player.z,ins=inside();
  for(const d of drops)if(d.inside===ins&&Math.hypot(d.x-px,d.z-pz)<2.4)return{kind:'drop',d,label:'Take '+LOOT_NAME.drop,dur:.5};
  if(ins)return findInside(px,pz);
  if(Math.hypot(px-TOWER.door.x,pz-TOWER.door.z)<4.5)return{kind:'door',label:'Enter Meridian Tower',dur:0};
  let bdr=null,bdd=1e9;for(const dr of UD.doors){const dd=Math.hypot(dr.x-px,dr.z-pz);if(dd<(dr.hatch?2.8:2.3)&&dd<bdd){bdd=dd;bdr=dr;}}
  if(bdr){if(bdr.hatch&&!G.opened[bdr.id]){if(!G.gear.prybar)return{kind:'locked',label:'Sealed hatch · craft a pry bar first',dur:0};return{kind:'force',dr:bdr,label:'Force open '+doorName(bdr),dur:3};}
    return{kind:'enter',dr:bdr,label:(bdr.hatch?'Climb down into ':'Enter ')+doorName(bdr),dur:0};}
  let best=null,bd=2.7;for(const s of UD.loot){if(s.got||s.type==='bunker')continue;const dd=Math.hypot(s.x-px,s.z-pz);if(dd<bd){bd=dd;best=s;}}
  if(best)return{kind:'loot',s:best,label:'Search '+LOOT_NAME[best.type],dur:best.type==='car'?1.4:1.1};
  return null;}
const ST_LABEL={bench:'Use the shelter bench',workshop:'Use the workshop bench',kitchen:'Cook at the kitchen range',medbay:'Use the medical station',locker:'Open the stash lockers',
  plan:'Tower plans · build floors',purifier:'Drink from the purifier',power:'Check the power',farm:'Check the crops',defense:'Turret console',fbench:'Use the scrap workbench'};
function findInside(px,pz){const I=In.cur;let best=null,bs=1e9;const hx=-Math.sin(yaw),hz=-Math.cos(yaw);
  for(const o of I.objs){const dx=o.x-px,dz=o.z-pz,d=Math.hypot(dx,dz);if(d>2.3)continue;const fd=(dx*hx+dz*hz)/(d||1);if(fd<-.25&&d>1.3)continue;const s=d-fd*.9;if(s<bs){bs=s;best=o;}}
  if(!best)return null;const o=best;
  if(o.kind==='loot'){const v=insState(I.id).l[o.i+','+o.j];if(v&&v>day())return{kind:'none',label:IN_NAME[o.loot]+' · searched',dur:0};
    return{kind:'iloot',o,label:'Search the '+IN_NAME[o.loot],dur:o.loot==='safe'?2:1.1};}
  if(o.kind==='note')return{kind:'note',o,label:'Read the note',dur:0};
  if(o.kind==='npc')return{kind:'npc',o,label:'Talk to the survivor',dur:0};
  if(o.kind==='exit')return{kind:'exit',label:G.loc.id==='tower'?'Step out into the street':'Leave · back to the street',dur:0};
  const st=o.st;
  if(st==='up')return{kind:'st',o,label:'Climb to '+floorLabel(G.loc.fl+1),dur:0};
  if(st==='down')return{kind:'st',o,label:'Go down to '+floorLabel(G.loc.fl-1),dur:0};
  if(st==='bed')return{kind:'st',o,label:canSleep()?'Sleep until dawn':'Bed · sleep after 19:00',dur:0};
  if(st==='stove')return{kind:'st',o,label:G.loc.id==='tower'?'Use the camp stove':'Cook on the camp stove',dur:0};
  if(st==='radio')return{kind:'st',o,label:G.loc.id==='tower'?'Radio · plan an expedition':'Tune the radio set',dur:0};
  return{kind:'st',o,label:ST_LABEL[st]||st,dur:0};}
function doInteract(){if(!target)return;
  if(target.kind==='none')return;
  if(target.kind==='door'){enterTower();return;}
  if(target.kind==='enter'){enterDoor(target.dr);return;}
  if(target.kind==='force'){G.opened[target.dr.id]=true;S.build();toast(doorName(target.dr)+' · hatch forced open',true);enterDoor(target.dr);return;}
  if(target.kind==='exit'){exitPlace();return;}
  if(target.kind==='iloot'){searchInside(target.o);return;}
  if(target.kind==='note'){showNote(target.o);return;}
  if(target.kind==='npc'){S.click();toast('“'+rpick(ROOMS.NPC_LINES)+'”',true);return;}
  if(target.kind==='st'){station(target.o);return;}
  if(target.kind==='locked'){S.deny();toast('Needs a pry bar · craft one at the shelter bench');return;}
  if(target.kind==='drop'){const r=addToPack(target.d.items);finishLoot(r);removeDrop(target.d);return;}
  if(target.kind==='loot'){const s=target.s,i=UD.loot.indexOf(s);s.got=true;UD.setLootVisible(s,false);
    G.lootGot[i]=s.type==='bunker'?1e9:day()+2+Math.floor(Math.random()*3);
    const items=roll(s.type,s.tier);const r=addToPack(items);finishLoot(r);
    if(s.type==='bunker')toast(s.name+' cracked open · '+fmt(r.got),true);}
}
function finishLoot(r,extra=''){S.pickup();const g=fmt(r.got);const l=Object.keys(r.left).length;
  toast((g||'Nothing you can carry')+extra+(l?' · pack full, left the rest':''),l>0||!!extra);}
function searchInside(o){const I=In.cur,st=insState(I.id),key=o.i+','+o.j,vault=!!here.vault;
  st.l[key]=vault?1e9:day()+2+Math.floor(Math.random()*3);In.hideBeacon(o);
  const r=addToPack(roll(o.loot,here.tier));let extra='';
  if(o.loot==='armory'){const want=['shotgun','rifle','vest','suit'].filter(g=>!G.gear[g]);
    if(want.length&&Math.random()<(vault?1:.35)){const g=want[0];G.gear[g]=true;if(WEAP[g])G.mag[g]=WEAP[g].cap;extra=' · found a '+GEARNAME[g]+'!';S.build();}}
  finishLoot(r,extra);save();}

/* ======================= combat ======================= */
const _o=new THREE.Vector3(),_d=new THREE.Vector3(),_f=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3(),_end=new THREE.Vector3();
const actx={
  hitPlayer(dmg,e){if(G.dead)return;if(G.inBase){if(atHome())return;closePanel();}const tier=inside()?here.tier:UD.tierAt(player.x,player.z);hurt(dmg*(1+.12*(Math.max(1,tier)-1))*(G.gear.vest?.65:1));},
  enemyShot(e,d,atTower){const o=new THREE.Vector3(e.x,e.y+1.55,e.z);S.enemyShot(clamp(1-d/90,.1,1));
    if(atTower){A.tracer(o,new THREE.Vector3(TOWER.x+rr(-6,6),rr(1,8),TOWER.z+TOWER.d/2),0xffb060);return;}
    const moving=Math.hypot(vel.x,vel.z)/6;const hit=Math.random()<clamp(.55-d*.008-moving*.18-(stormActive()?.1:0),.08,.6);
    const tgt=new THREE.Vector3(player.x+(hit?0:rr(-1.6,1.6)),player.y-.4+(hit?0:rr(-.5,1)),player.z+(hit?0:rr(-1.6,1.6)));A.tracer(o,tgt,0xffb060);
    if(hit)actx.hitPlayer(e.T.dmg,e);},
  voice(e,d){const v=clamp(1-d/60,0,1);if(v<=0)return;if(e.type==='hound')S.bark(v);else if(e.type!=='raider')S.growl(v);},
  raidSteal(e){const have=RK.filter(k=>G.stash[k]>0&&k!=='ammo');const lost={};for(let i=0;i<2&&have.length;i++){const k=rpick(have);const n=Math.max(1,Math.round(G.stash[k]*.15));G.stash[k]-=n;lost[k]=(lost[k]||0)+n;}
    if(Object.keys(lost).length)toast('Raiders looted the stash · '+Object.entries(lost).map(([k,v])=>`-${v} ${RL[k].toLowerCase()}`).join(' · '),true);if(G.inBase)renderBase();},
  onKill(e){G.kills++;const items={};for(const [k,r] of Object.entries(e.T.drops)){if(!r)continue;const n=r[0]+Math.floor(Math.random()*(r[1]-r[0]+1));if(n>0)items[k]=n;}
    if(Object.keys(items).length)dropLoot(e.x,e.z,items,e.inside?e.y:undefined,e.inside);S.kill();},
};
function hurt(dmg){if(G.dead)return;G.hp-=dmg;hurtT=.6;S.hurt();if(G.hp<=0)die();}
function aimDir(spread){camera.getWorldDirection(_f);_r.set(1,0,0).applyQuaternion(camera.quaternion);_u.set(0,1,0).applyQuaternion(camera.quaternion);
  const a=Math.random()*6.283,s=spread*Math.sqrt(Math.random());return _d.copy(_f).addScaledVector(_r,Math.cos(a)*s).addScaledVector(_u,Math.sin(a)*s).normalize();}
function wallDist(o,d,range){if(inside())return In.ray(o,d,range);for(let t=1;t<range;t+=1.5){if(UD.solidAt(o.x+d.x*t,o.y+d.y*t,o.z+d.z*t))return t;if(o.y+d.y*t<UD.groundAt(o.x+d.x*t,o.z+d.z*t))return t;}return range;}
function fire(){
  if(fireCd>0||reloadT>0||G.inBase||G.dead)return;
  const W=WEAP[G.weapon];camera.getWorldPosition(_o);
  if(W.melee){fireCd=W.rate;swingT=.25;S.swing();const d=aimDir(0);const h=A.hitscan(_o,d,W.range);if(h){A.damage(h.e,W.dmg,actx);S.hit();hitMark();}return;}
  if(G.mag[G.weapon]<=0){S.click();fireCd=.25;startReload();return;}
  G.mag[G.weapon]--;fireCd=W.rate;recoil=Math.min(.12,recoil+(G.weapon==='rifle'?.07:G.weapon==='shotgun'?.08:.035));muzzle.intensity=4;S.shot(W.snd);
  const gun=new THREE.Vector3(.22,-.15,-.9).applyMatrix4(camera.matrixWorld);let any=false;
  for(let p=0;p<W.pellets;p++){const d=aimDir(W.spread).clone();const wd=wallDist(_o,d,W.range);const h=A.hitscan(_o,d,wd);
    if(h){A.damage(h.e,W.dmg*(h.head?2:1),actx);any=true;_end.copy(_o).addScaledVector(d,h.t);}else _end.copy(_o).addScaledVector(d,wd);
    if(p<3)A.tracer(gun,_end.clone(),0xffd08a);}
  if(any){S.hit();hitMark();}
  for(const e of A.list)if(!e.dead&&Math.hypot(e.x-player.x,e.z-player.z)<70)e.alert=Math.max(e.alert,6);
  if(G.mag[G.weapon]===0&&G.pack.ammo>0)setTimeout(startReload,200);
}
function startReload(){const W=WEAP[G.weapon];if(W.melee||reloadT>0||G.mag[G.weapon]>=W.cap)return;if(G.pack.ammo<=0){toast('Out of ammo · switch to the knife (Q)');return;}reloadT=W.reload;S.reload();}
function swapWeapon(dir=1){const o=owned();let i=o.indexOf(G.weapon);i=(i+dir+o.length)%o.length;G.weapon=o[i];reloadT=0;fireCd=.3;S.click();}
let hitT=0;function hitMark(){hitT=.15;}

/* ======================= tower: enter, leave, build, craft ======================= */
let baseTab='tower',buildOpen=false,pctx={},needReload=false;
/* ---------- places: the tower's floors and every walk-in building ---------- */
let here=null; // {name, room, tier, vault, theme, door}
function floorKind(fl){const n=G.floors.length;return fl===-1?'shelter':fl===0?'lobby':fl<=n?G.floors[fl-1]:'gutted';}
function floorLabel(fl){const k=floorKind(fl);return fl===-1?'the shelter (B1)':fl===0?'the lobby':k==='gutted'?`floor ${fl} · gutted`:`floor ${fl} · ${MODS[k].name}`;}
function survivorsOn(fl){const crew=Math.min(G.pop-1,8),order=[0,-1];for(let f=1;f<=G.floors.length;f++)order.push(f);
  const cap=order.map(f=>(ROOMS.TF[floorKind(f)].join('').match(/:/g)||[]).length),got=order.map(()=>0);let left=crew;
  while(left>0){let any=false;for(let k=0;k<order.length&&left>0;k++)if(got[k]<cap[k]){got[k]++;left--;any=true;}if(!any)break;}
  const k=order.indexOf(fl);return k<0?0:got[k];}
function placeDef(loc){
  if(loc.id==='tower'){const n=G.floors.length,fl=clamp(loc.fl,-1,Math.min(n+1,TOWER.slots)),kind=floorKind(fl);loc.fl=fl;
    const canUp=fl<=n&&fl<TOWER.slots;
    here={name:'Meridian Tower',room:fl===-1?'Fallout Shelter · B1':fl===0?'Lobby':kind==='gutted'?`Floor ${fl} · gutted`:`Floor ${fl} · ${MODS[kind].name}`,tier:0,vault:false};
    return{id:'tower@'+fl,map:ROOMS.towerMap(kind,fl,canUp),theme:kind==='shelter'?'shelter':kind==='gutted'?'gutted':'tower',seed:fl*97+13,enemies:false,npcs:survivorsOn(fl)};}
  const dr=UD.doors.find(d=>d.id===loc.id);if(!dr)return null;const P=ROOMS.P[dr.tpl],st=insState(dr.id);
  here={name:doorName(dr),room:P.vault?'Sealed vault':'Indoors',tier:P.vault?Math.max(4,dr.tier):dr.tier,vault:!!P.vault,theme:P.theme,door:dr};
  return{id:dr.id,map:P.map,theme:P.theme,seed:Math.floor(UD.hash(Math.round(dr.x),Math.round(dr.z))*1e6),enemies:!st.clr||day()>=st.clr+3};}
function enterPlace(loc,arrive,keep){
  const def=placeDef(loc);if(!def){G.loc={id:'tower',fl:-1};return enterPlace(G.loc,'up');}
  G.loc=loc;flying=false;vert=0;firing=false;useHeld=false;reloadT=0;removeInsideDrops();
  const I=In.load(def);
  let spot=arrive&&I.objs.find(o=>arrive==='exit'?o.kind==='exit':o.st===arrive);
  if(!spot)spot=I.objs.find(o=>o.kind==='exit')||I.objs.find(o=>o.st==='up'||o.st==='down')||I.objs[0];
  player.set(spot.x+spot.fx*1.9,In.O.y+1.7,spot.z+spot.fz*1.9);yaw=Math.atan2(-spot.fx,-spot.fz);pitch=0;vel.set(0,0,0);groundY=In.O.y;
  if(keep&&In.passable(...In.cellAt(keep.x,keep.z))){player.x=keep.x;player.z=keep.z;yaw=keep.yaw;pitch=keep.pitch;}
  const st=insState(def.id);for(const o of I.objs)if(o.kind==='loot'){const v=st.l[o.i+','+o.j];if(v&&v>day())In.hideBeacon(o);}
  target=null;lastKey='';applyTime();save();return I;}
function enterTower(){
  const dep={};for(const k of RK){const room=capOf(k)-G.stash[k];const n=Math.min(room,G.pack[k]);if(n>0){G.stash[k]+=n;G.pack[k]-=n;dep[k]=n;}}
  enterPlace({id:'tower',fl:0},'exit');S.door();const g=fmt(dep);toast('Meridian Tower'+(g?' · stashed '+g.replace(/\+/g,''):''),true);}
function enterDoor(dr){enterPlace({id:dr.id},'exit');S.door();
  const I=In.cur,n=I.enemies.length;toast(here.name+(here.vault?' · sealed for years':'')+(n?' · something moves in the dark':''),true);}
function exitPlace(){
  const fromTower=G.loc&&G.loc.id==='tower',dr=here&&here.door;
  In.unload();removeInsideDrops();G.loc=null;flying=false;
  if(fromTower||!dr){
    if(packLoad()===0){const want={ammo:40,meds:1,water:2,food:1};for(const [k,v] of Object.entries(want)){const n=Math.min(v,G.stash[k]);if(n>0){G.stash[k]-=n;G.pack[k]+=n;}}}
    const W=WEAP[G.weapon];if(!W.melee&&G.mag[G.weapon]<W.cap){const n=Math.min(W.cap-G.mag[G.weapon],G.pack.ammo);G.mag[G.weapon]+=n;G.pack.ammo-=n;}
    G.intro=false;G.trips++;player.set(TOWER.door.x,1.7,TOWER.door.z+3.5);yaw=PI;}
  else{player.set(dr.x+dr.nx*.7,UD.groundAt(dr.x,dr.z)+1.7,dr.z+dr.nz*.7);yaw=Math.atan2(-dr.nx,-dr.nz);}
  groundY=player.y-1.7;pitch=0;vel.set(0,0,0);here=null;target=null;lastKey='';S.door();applyTime();save();
  if(night>.5)toast('Dark out there · F for your flashlight');else if(stormActive())toast('Toxic storm outside · radiation is up',true);}
function reloadHere(){if(!G.loc)return;const keep={x:player.x,z:player.z,yaw,pitch};enterPlace(G.loc,null,keep);}
/* ---------- stations ---------- */
function station(o){const home=G.loc.id==='tower';
  switch(o.st){
    case 'up':S.door();enterPlace({id:'tower',fl:G.loc.fl+1},'down');toast(here.room);return;
    case 'down':S.door();enterPlace({id:'tower',fl:G.loc.fl-1},'up');toast(here.room);return;
    case 'bench':return openPanel('craft',{station:'bunker'});
    case 'stove':return home?openPanel('craft',{station:'bunker'}):openPanel('craft',{field:'stove'});
    case 'fbench':return home?openPanel('craft',{station:'bunker'}):openPanel('craft',{field:'bench'});
    case 'kitchen':case 'workshop':case 'medbay':return openPanel('craft',{station:o.st});
    case 'locker':return openPanel('stash');
    case 'plan':return openPanel('tower');
    case 'radio':if(home)return openPanel('exp');
      if(!G.radioFound){G.radioFound=true;S.build();toast('The set still works · three bunker beacons logged on your map',true);}else{S.click();toast('Static, then a faint loop: Meridian Tower, civil defense, all survivors welcome.',true);}save();return;
    case 'purifier':if(G.stash.water>0){consume('water');toast('Cold, clean water · '+G.stash.water+' left in the tanks');}else{S.deny();toast('Tanks are dry · the purifier needs power and dirty water');}return;
    case 'power':{const P=powerState();S.click();toast(`Power ${P.sup} / ${P.dem}`+(count('generator')?` · ${G.stash.fuel} fuel`:'')+(P.ok?' · all floors running':' · short, some floors are dark'),true);return;}
    case 'farm':S.click();toast(powerState().ok?`Grow lights on · ${count('farm')} farm floor${count('farm')>1?'s':''} turning clean water into food`:'Grow lights dark · no power',true);return;
    case 'defense':S.click();toast((built('defense')&&powerState().ok?'Turrets armed':'Turrets offline')+` · ${G.stash.ammo} rounds in the stash`+(G.gear.turret2?' · servos fitted':''),true);return;
    case 'bed':return trySleep();
  }}
function trySleep(){if(!canSleep()){S.deny();toast('Too early to sleep · after 19:00');return;}
  if(In.cur&&In.cur.enemies.some(e=>!e.dead)){S.deny();toast('Not with hostiles in the building');return;}
  sleep();}
function openPanel(tab,ctx={}){pctx=ctx;G.inBase=true;firing=false;useHeld=false;try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}
  baseTab=tab;buildOpen=false;$('base').hidden=false;document.body.classList.add('inbase');vm.visible=false;renderBase();baseBody.scrollTop=0;S.click();}
function closePanel(){if(!G.inBase)return;G.inBase=false;$('base').hidden=true;document.body.classList.remove('inbase');vm.visible=true;
  if(needReload){needReload=false;reloadHere();}save();}
function buildFloor(mod){const n=G.floors.length+1;if(n>TOWER.slots)return;const cost=floorCost(mod,n);if(!afford(cost)){S.deny();return;}
  pay(cost);G.floors.push(mod);S.build();rebuildTower();toast(`Floor ${n} · ${MODS[mod].name} built`,true);needReload=true;
  if(mod==='radio'&&!G.radioFound){G.radioFound=true;setTimeout(()=>toast('Radio picked up three bunker beacons · check Expeditions',true),2600);}
  buildOpen=false;renderBase();save();}
function floorCost(mod,n){const m=1+.2*(n-1);return Object.fromEntries(Object.entries(MODS[mod].cost).map(([k,v])=>[k,Math.ceil(v*m)]));}
function reqOk(req){return!req||(MODS[req]?built(req):!!G.gear[req]);}
const craftHere=r=>pctx.field?r.field===pctx.field:pctx.station===r.at&&(r.at==='bunker'||built(r.at));
function craft(id){const r=RECIPES.find(x=>x.id===id);if(!r)return;const field=!!pctx.field,src=field?G.pack:G.stash;
  if(!craftHere(r)||!reqOk(r.req)||(r.gear&&G.gear[r.gear])||!afford(r.cost,src)){S.deny();return;}
  if(r.give){if(field){const w=k=>RW[k];const after=packLoad()-Object.entries(r.cost).reduce((a,[k,v])=>a+v*w(k),0)+Object.entries(r.give).reduce((a,[k,v])=>a+v*w(k),0);
      if(after>packCap()+1e-6){toast('Not enough room in your pack');S.deny();return;}}
    else for(const [k,v] of Object.entries(r.give))if(G.stash[k]+v>capOf(k)){toast('Stash is full for '+RL[k].toLowerCase());S.deny();return;}}
  pay(r.cost,src);if(r.give)for(const [k,v] of Object.entries(r.give))src[k]+=v;
  if(r.gear){G.gear[r.gear]=true;if(r.gear==='turret2')rebuildTower();if(r.gear==='machete'&&G.weapon==='knife')G.weapon='machete';}
  S.build();toast(r.name+(r.give?' · '+fmt(r.give):' · ready'));renderBase();save();}
function consume(k,from){const src=from==='pack'?G.pack:G.stash;if(src[k]<=0){S.deny();return;}
  src[k]--;if(k==='food')G.food=Math.min(100,G.food+32);else if(k==='water')G.water=Math.min(100,G.water+38);
  else if(k==='meat'){G.food=Math.min(100,G.food+20);G.rads+=6;toast('Raw meat · +6 rads');}
  else if(k==='dirty'){G.water=Math.min(100,G.water+25);if(G.gear.filter)toast('Filtered through the canteen · no rads');else{G.rads+=8;toast('Dirty water · +8 rads');}}
  else if(k==='meds')G.hp=Math.min(100,G.hp+40);else if(k==='radaway')G.rads=Math.max(0,G.rads-40);
  S.pickup();}
function canSleep(){const t=tod();return t>=19||t<5;}
function sleep(){if(!canSleep()){S.deny();return;}
  const home=atHome(),before={...G.stash};const target=G.t+((30-tod())%24||24);let raid=null;
  while(G.t<target-1e-6){const nextH=Math.floor(G.t)+1;G.t=Math.min(target,nextH);if(G.t===nextH){const r=onHour(nextH,true);if(r)raid=r;}}
  lastHour=Math.floor(G.t);G.hp=Math.min(100,G.hp+(home?15+8*count('quarters')+(built('medbay')?15:0):8));
  toast(`Slept until dawn · day ${day()}`+(home?'':' · stiff, but alive')+(raid?' · '+raid:''),true);restoreLoot();if(G.inBase)renderBase();save();}
/* ---------- notes ---------- */
function showNote(o){const pool=ROOMS.NOTES[here.vault?'vault':(here.theme||'house')]||ROOMS.NOTES.house;
  const k=Math.floor(UD.hash(o.i*31+o.j,(In.cur.id.length*17)|0)*pool.length);S.click();
  $('noteTxt').textContent=pool[k%pool.length];$('noteov').hidden=false;try{document.exitPointerLock();}catch(e){}firing=false;}

/* ======================= hourly + daily simulation ======================= */
let lastHour=0;
function onHour(h,asleep){const hod=h%24;let note=null;
  const home=atHome(),outsideHeat=!inside()&&ambientTemp()>36;
  G.food=clamp(G.food-3.4*(home?.7:1)*(asleep?.6:1),0,100);G.water=clamp(G.water-4.8*(home?.7:1)*(outsideHeat?1.8:1)*(asleep?.6:1),0,100);
  if(home){G.rads=Math.max(0,G.rads-(built('medbay')?6:1.5));if(G.food>15&&G.water>15)G.hp=Math.min(100,G.hp+2+2*Math.min(1,count('quarters'))+(built('medbay')?4:0));}
  const P=powerState();
  if(count('generator')&&P.dem>P.solar){G.fuelAcc+=count('generator')/3;while(G.fuelAcc>=1&&G.stash.fuel>0){G.stash.fuel--;G.fuelAcc-=1;}if(G.stash.fuel<=0)G.fuelAcc=Math.min(G.fuelAcc,1);}
  if(P.ok){if(built('purifier')&&G.stash.dirty>0&&G.stash.water<capOf('water')){G.stash.dirty--;G.stash.water++;}
    if(built('farm')){G.farmAcc+=count('farm')/4;while(G.farmAcc>=1){G.farmAcc-=1;if(G.stash.water>0&&G.stash.food<capOf('food')){G.stash.water--;G.stash.food++;}}}}
  if(built('purifier')){G.rainAcc+=stormActive()?1:1/4;while(G.rainAcc>=1){G.rainAcc-=1;if(G.stash.dirty<capOf('dirty'))G.stash.dirty++;}}
  // storms
  if(h===G.stormAt-1&&!asleep)toast('Radio static · toxic storm front within the hour',true);
  if(h===G.stormAt){G.stormEnd=h+2+Math.floor(Math.random()*3);if(!asleep)toast('Toxic storm · get under cover or wear a rad suit',true);}
  if(h===G.stormEnd){G.stormAt=h+16+Math.floor(Math.random()*22);if(!asleep)toast('The storm has passed');}
  if(hod===6)note=dawn(asleep)||note;
  if(hod===22){const r=maybeRaid(asleep);if(r)note=r;}
  if(hod===19&&!asleep&&!inside())toast('Night is falling · cold and ghouls come with it',true);
  if(G.inBase&&$('base')&&!$('base').hidden)renderBaseSoft();
  save();return note;}
function dawn(asleep){const msgs=[];const crew=G.pop-1;
  if(crew>0){let short=false;for(const k of['food','water']){if(G.stash[k]>=crew)G.stash[k]-=crew;else{G.stash[k]=0;short=true;}}
    if(short){G.pop--;msgs.push('a survivor left · not enough food or water');}
    else{const got={scrap:2*crew};for(let i=0;i<crew;i++){const k=rpick(['cloth','dirty','parts','food','fuel']);got[k]=(got[k]||0)+1;}for(const [k,v] of Object.entries(got))G.stash[k]=Math.min(capOf(k),G.stash[k]+v);msgs.push('survivors scavenged '+fmt(got).replace(/\+/g,''));}}
  if(G.gear.snares){const n=1+(Math.random()<.5?1:0);G.stash.meat=Math.min(capOf('meat'),G.stash.meat+n);msgs.push(`snares caught ${n} meat`);}
  if(!built('kitchen')&&G.stash.meat>0){const lost=Math.ceil(G.stash.meat*.4);G.stash.meat-=lost;msgs.push(`${lost} meat spoiled`);}
  const P=powerState();
  if(G.pop<popCap()&&G.stash.food>=G.pop&&G.stash.water>=G.pop&&Math.random()<(built('radio')&&P.ok?.55:.12)){G.pop++;msgs.push('a new survivor arrived');rebuildTower();}
  restoreLoot();
  const m=msgs.join(' · ');if(m&&!asleep)toast('Dawn · '+m,true);return m||null;}
function maybeRaid(asleep){if(day()<3||G.lastRaid===day())return null;if(Math.random()>.28+.04*G.pop)return null;G.lastRaid=day();
  const n=Math.min(10,3+Math.floor(day()/2));
  if(asleep){if(built('defense')&&powerState().ok){G.stash.ammo=Math.max(0,G.stash.ammo-6);return'turrets drove off a night raid';}
    const lost={};for(let i=0;i<3;i++){const k=rpick(['food','water','scrap','fuel','parts']);const v=Math.max(1,Math.round(G.stash[k]*.15));if(G.stash[k]>0){G.stash[k]-=Math.min(v,G.stash[k]);lost[k]=v;}}
    return'raiders hit the stash in the night';}
  A.spawnRaid(n);toast(`Raid · ${n} hostiles converging on the tower`,true);return null;}

/* ======================= death ======================= */
function die(){if(G.dead)return;closePanel();G.dead=true;firing=false;try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}
  const lost=fmt(G.pack).replace(/\+/g,'');G.pack=zero();
  $('deathTxt').textContent=(G.pop>1?'Survivors found you and dragged you home. ':'You came to on the shelter floor. ')+(lost?'Your pack is gone: '+lost+'.':'');
  $('death').hidden=false;}
function respawn(){G.dead=false;$('death').hidden=true;G.hp=55;G.rads=Math.max(0,G.rads-30);G.food=Math.max(G.food,40);G.water=Math.max(G.water,40);
  const target=G.t+((30-tod())%24||24);while(G.t<target-1e-6){const nh=Math.floor(G.t)+1;G.t=Math.min(target,nh);if(G.t===nh)onHour(nh,true);}lastHour=Math.floor(G.t);
  for(const e of[...A.list])if(!e.raid&&!e.inside)A.remove(e);enterPlace({id:'tower',fl:-1},'up');S.door();}

/* ======================= base panel UI ======================= */
const baseBody=$('baseBody');
function chip(t,cls=''){return`<span class="chip ${cls}">${t}</span>`;}
function renderHead(){const P=powerState();
  if(!atHome()){$('baseHead').innerHTML=`<div class="bt"><b>${esc((here&&here.name||'').toUpperCase())}</b><span>Day ${day()} · ${clockText()}</span></div>
    <div class="chips">${chip('Pack '+Math.round(packLoad())+'/'+packCap())}${stormActive()?chip('Storm outside','bad'):''}</div>
    <div class="vitmini">${vit('HP',G.hp,'hp')}${vit('FOOD',G.food,'food')}${vit('WATER',G.water,'water')}${vit('RADS',G.rads,'rad')}</div>`;return;}
  $('baseHead').innerHTML=`<div class="bt"><b>MERIDIAN TOWER</b><span>Day ${day()} · ${clockText()}</span></div>
  <div class="chips">${chip('Floors '+G.floors.length+'/'+TOWER.slots)}${chip('Survivors '+G.pop+'/'+popCap())}${P.dem||P.sup?chip('Power '+P.sup+'/'+P.dem,P.ok?'ok':'bad'):''}${stormActive()?chip('Storm','bad'):''}</div>
  <div class="vitmini">${vit('HP',G.hp,'hp')}${vit('FOOD',G.food,'food')}${vit('WATER',G.water,'water')}${vit('RADS',G.rads,'rad')}</div>`;}
function vit(l,v,c){return`<div class="vm"><span>${l}</span><i class="bar ${c}"><b style="width:${clamp(v,0,100)}%"></b></i></div>`;}
function renderBase(){renderHead();
  document.querySelectorAll('#baseTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===baseTab));
  $('baseTabs').hidden=!atHome();$('sleepBtn').hidden=!atHome();
  let h='';
  if(baseTab==='tower'){
    if(G.intro)h+=`<div class="card intro"><b>The shelter held.</b><p>The bomb hit east of downtown. Meridian Tower is a gutted shell above you, but the fallout shelter in its basement survived. Every floor you rebuild is a step back toward civilisation. Head out, scavenge, come home, build upward.</p></div>`;
    h+=`<p class="note">Each floor you build becomes rooms you can walk: take the stairs in the north-west corner. The next floor to fit out is the gutted one at the top.</p>`;
    const P=powerState(),n=G.floors.length+1;
    if(n<=TOWER.slots){h+=`<div class="floor next"><div class="fl">F${n}</div><div class="fi"><b>Floor ${n} · gutted</b><span>Clear it and fit it out.</span></div><button data-act="toggleBuild" class="sm">${buildOpen?'Close':'Build'}</button></div>`;
      if(buildOpen){h+='<div class="opts">';for(const id in MODS){const m=MODS[id];if(!m.repeat&&built(id))continue;const ok=reqOk(m.req);const cost=floorCost(id,n);
        h+=`<div class="opt${ok?'':' locked'}"><div><b>${m.name}</b>${m.power?`<em>uses ${m.power} power</em>`:''}<p>${m.desc}</p>${ok?costHTML(cost):`<span class="cost short">Needs ${MODS[m.req].name}</span>`}</div>
        <button data-act="build" data-id="${id}" class="sm"${ok&&afford(cost)?'':' disabled'}>Build</button></div>`;}h+='</div>';}}
    else h+=`<div class="card"><b>Every floor rebuilt.</b><p>The tower stands again. More floors are coming in a future build.</p></div>`;
    for(let f=G.floors.length;f>=1;f--){const id=G.floors[f-1],m=MODS[id];h+=`<div class="floor"><div class="fl">F${f}</div><div class="fi"><b>${m.name}</b><span>${status(id,P)}</span></div></div>`;}
    h+=`<div class="floor bunker"><div class="fl">B1</div><div class="fi"><b>Fallout Shelter</b><span>Bunk, stove, workbench. Always safe.</span></div></div>`;
  }else if(baseTab==='craft'){
    const recipe=(r,ok,src)=>{const have=r.gear&&G.gear[r.gear],rq=reqOk(r.req);
      return`<div class="opt${ok&&rq?'':' locked'}"><div><b>${r.name}</b>${r.give?`<em>→ ${fmt(r.give).replace(/\+/g,'')}</em>`:''}<p>${r.desc||''}</p>${have?'<span class="cost owned">Owned</span>':rq?costHTML(r.cost,src):`<span class="cost short">Needs ${MODS[r.req]?MODS[r.req].name:'Scrap backpack'}</span>`}</div>
        <button data-act="craft" data-id="${r.id}" class="sm"${ok&&rq&&!have&&afford(r.cost,src)?'':' disabled'}>${have?'✓':'Make'}</button></div>`;};
    if(pctx.field){h+=`<h4>${FIELD[pctx.field]} <em>· uses what is in your pack</em></h4>`;for(const r of RECIPES.filter(x=>x.field===pctx.field))h+=recipe(r,true,G.pack);
      h+=`<p class="note">Pack <b>${Math.round(packLoad())}</b> / ${packCap()}. Bigger jobs need the benches back at Meridian Tower.</p>`;}
    else for(const st in STATION){if(pctx.station&&pctx.station!==st)continue;const ok=st==='bunker'||built(st),here_=pctx.station===st;
      h+=`<h4>${STATION[st]}${!ok?' <em>· build a '+MODS[st].name+'</em>':here_?' <em>· uses the stash</em>':' <em>· walk to it to craft</em>'}</h4>`;
      for(const r of RECIPES.filter(x=>x.at===st))h+=recipe(r,ok&&here_,G.stash);}
  }else if(baseTab==='stash'){
    h+=`<div class="packline">Pack <b>${Math.round(packLoad())}</b> / ${packCap()} · moves between the stash and your pack</div><div class="stash">`;
    for(const k of RK){const step=k==='ammo'?10:1;h+=`<div class="srow"><span class="sn">${RL[k]}</span><span class="sv">${G.stash[k]}<em>/${capOf(k)}</em></span>
      <button data-act="give" data-k="${k}" data-n="${step}" class="xs" aria-label="Move ${RL[k]} to the stash">−</button><span class="pv">${G.pack[k]}</span><button data-act="take" data-k="${k}" data-n="${step}" class="xs" aria-label="Pack ${RL[k]}">+</button></div>`;}
    h+=`</div><div class="row2"><button data-act="eat" class="sm">Eat</button><button data-act="drink" class="sm">Drink</button><button data-act="heal" class="sm">Medkit</button><button data-act="flush" class="sm">Rad-Away</button></div>`;
  }else if(baseTab==='exp'){
    h+=`<p class="note">Pick a destination to mark it on your compass and map. Farther out is richer and deadlier.</p>`;
    const list=UD.POIS.filter(p=>!p.hidden||G.radioFound).map(p=>({p,d:towerDist(p.x,p.z),tier:UD.tierAt(p.x,p.z)})).sort((a,b)=>a.d-b.d);
    for(const {p,d,tier} of list){const dr=p.kind==='bunker'&&UD.doors.find(x=>x.name===p.name),done=dr&&G.ins[dr.id]&&G.ins[dr.id].clr;h+=`<div class="opt${G.route===p.id?' route':''}"><div><b>${p.name}</b><em class="t${tier}">${DANGER[tier]}</em><p>${Math.round(d)} m · ${p.focus}${done?' · cleared':''}</p></div>
      <button data-act="route" data-id="${p.id}" class="sm">${G.route===p.id?'Clear':'Route'}</button></div>`;}
    if(!G.radioFound)h+=`<p class="note">Sealed bunkers out in the wastes stay hidden until you build a Radio Room.</p>`;
  }
  baseBody.innerHTML=h;
  $('sleepBtn').disabled=!canSleep();$('sleepBtn').textContent=canSleep()?'Sleep till dawn':'Sleep (after 19:00)';
}
let softT=0;function renderBaseSoft(){if(baseTab==='tower'||baseTab==='stash')renderBase();else renderHead();}
function status(id,P){
  const pw=MODS[id].power&&!P.ok?' · no power':'';
  return{quarters:'Bunks for 3',storage:'Stash limits raised',workshop:'Crafting unlocked',kitchen:'Meals, no spoilage',purifier:'1 water / hour'+pw,medbay:'Heals while home',
    generator:G.stash.fuel>0?'Running · '+G.stash.fuel+' fuel left':'Out of fuel',solar:tod()>7&&tod()<18&&!stormActive()?'+3 power':'Idle (dark)',farm:'1 food / 4 hours'+pw,
    defense:(P.ok?'Turrets armed':'Turrets offline')+(G.gear.turret2?' · servos':''),radio:P.ok?'Listening':'Silent · no power'}[id];}
$('baseTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;baseTab=b.dataset.tab;buildOpen=false;renderBase();baseBody.scrollTop=0;});
baseBody.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const a=b.dataset.act;
  if(a==='toggleBuild'){buildOpen=!buildOpen;renderBase();}
  else if(a==='build')buildFloor(b.dataset.id);
  else if(a==='craft')craft(b.dataset.id);
  else if(a==='take'||a==='give'){const k=b.dataset.k,n=+b.dataset.n;
    if(a==='take'){let m=Math.min(n,G.stash[k]);while(m>0&&packLoad()+m*RW[k]>packCap()+1e-6)m--;if(m<=0){S.deny();return;}G.stash[k]-=m;G.pack[k]+=m;}
    else{let m=Math.min(n,G.pack[k],capOf(k)-G.stash[k]);if(m<=0){S.deny();return;}G.pack[k]-=m;G.stash[k]+=m;}S.click();renderBase();}
  else if(a==='eat')consume('food');else if(a==='drink')consume('water');else if(a==='heal')consume('meds');else if(a==='flush')consume('radaway');
  else if(a==='route'){G.route=G.route===b.dataset.id?null:b.dataset.id;renderBase();}
  if(['eat','drink','heal','flush'].includes(a))renderBase();
  save();});
$('outBtn').addEventListener('click',closePanel);
$('noteClose').addEventListener('click',()=>{$('noteov').hidden=true;});
$('introBtn').addEventListener('click',()=>{$('introov').hidden=true;});
$('sleepBtn').addEventListener('click',sleep);
$('deathBtn').addEventListener('click',respawn);

/* ======================= bag (field inventory) ======================= */
function openBag(){if(G.inBase||G.dead)return;try{document.exitPointerLock();}catch(e){}firing=false;renderBag();$('bag').hidden=false;}
function renderBag(){let h=`<div class="packline">Pack <b>${Math.round(packLoad())}</b> / ${packCap()}</div><div class="stash">`;
  for(const k of RK)if(G.pack[k]>0)h+=`<div class="srow"><span class="sn">${RL[k]}</span><span class="sv">${G.pack[k]}</span>${['food','water','meds','radaway','meat','dirty'].includes(k)?`<button data-k="${k}" class="sm">Use</button>`:'<span></span>'}</div>`;
  h+='</div>';if(packLoad()===0)h+='<p class="note">Your pack is empty.</p>';
  h+=`<p class="note">Gear: ${['prybar','machete','filter','coat','vest','suit'].filter(g=>G.gear[g]).map(g=>GEARNAME[g]).join(', ')||'nothing special yet'}</p>`;
  $('bagBody').innerHTML=h;}
$('bagBody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;consume(b.dataset.k,'pack');renderBag();});
$('bagClose').addEventListener('click',()=>{$('bag').hidden=true;});

/* ======================= map ======================= */
const mapCv=$('mapCv');let mapScale=1,mapCx=0,mapCy=0;
function openMap(){try{document.exitPointerLock();}catch(e){}firing=false;$('mapov').hidden=false;drawMap();}
function mapPos(){if(!inside())return[player.x,player.z,false];if(here&&here.door)return[here.door.x,here.door.z,false];return[TOWER.x,TOWER.z,true];}
function drawMap(){const W=mapCv.clientWidth,H=mapCv.clientHeight,dpr=Math.min(2,devicePixelRatio||1);mapCv.width=W*dpr;mapCv.height=H*dpr;const x=mapCv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
  const span=EXT+260;mapScale=Math.min(W,H)/(2*span)*.96;mapCx=W/2;mapCy=H/2;const P=(wx,wz)=>[mapCx+wx*mapScale,mapCy+wz*mapScale];
  x.fillStyle='#16130f';x.fillRect(0,0,W,H);
  const col={downtown:'#3a3530',commercial:'#35302a',residential:'#2c2a24',industrial:'#33302c',park:'#2a2b20',crater:'#1e2a18',home:'#4a3a1a'};
  for(let i=-N;i<N;i++)for(let j=-N;j<N;j++){const t=UD.lotType[i+','+j];const [a,b]=P(i*CELL+ROAD/2,j*CELL+ROAD/2);x.fillStyle=col[t]||'#2a2824';x.fillRect(a,b,(CELL-ROAD)*mapScale,(CELL-ROAD)*mapScale);}
  const [gx,gy]=P(GZ.x,GZ.z);const gr=x.createRadialGradient(gx,gy,0,gx,gy,(RIM+40)*mapScale);gr.addColorStop(0,'rgba(140,255,60,.35)');gr.addColorStop(1,'rgba(140,255,60,0)');x.fillStyle=gr;x.beginPath();x.arc(gx,gy,(RIM+40)*mapScale,0,7);x.fill();
  x.strokeStyle='rgba(140,255,60,.6)';x.beginPath();x.arc(gx,gy,CRATER*mapScale,0,7);x.stroke();
  x.fillStyle='rgba(140,255,60,.5)';for(const r of UD.radSpots){const [a,b]=P(r.x,r.z);x.beginPath();x.arc(a,b,2.5,0,7);x.fill();}
  x.strokeStyle='rgba(243,236,226,.18)';x.lineWidth=1;x.strokeRect(...P(-EXT,-EXT),2*EXT*mapScale,2*EXT*mapScale);
  x.font='600 11px "JetBrains Mono",monospace';x.textAlign='center';
  for(const p of UD.POIS){if(p.hidden&&!G.radioFound)continue;const [a,b]=P(p.x,p.z),sel=G.route===p.id;
    x.fillStyle=p.kind==='bunker'?'#ffe14a':p.kind==='camp'||p.kind==='stadium'?'#ff6a4a':p.kind==='gz'?'#9fff5a':'#d8cdb8';x.beginPath();x.arc(a,b,sel?6:3.5,0,7);x.fill();
    if(sel){x.strokeStyle='#f2b84b';x.lineWidth=2;x.beginPath();x.arc(a,b,10,0,7);x.stroke();}
    if(p.kind!=='camp'||sel){x.fillStyle=sel?'#f2b84b':'rgba(243,236,226,.75)';x.fillText(p.name,a,b-9);}}
  const [tx,ty]=P(TOWER.x,TOWER.z);x.fillStyle='#f2b84b';x.fillRect(tx-6,ty-6,12,12);x.fillStyle='#16130f';x.fillRect(tx-2,ty-2,4,4);x.fillStyle='#f2b84b';x.fillText('HOME',tx,ty+20);
  if(!(G.inBase&&atHome())){const [mx0,mz0]=mapPos(),[px,py]=P(mx0,mz0);x.save();x.translate(px,py);x.rotate(-yaw);x.fillStyle='#fff';x.beginPath();x.moveTo(0,-9);x.lineTo(6,7);x.lineTo(0,3);x.lineTo(-6,7);x.closePath();x.fill();x.restore();}
  const [qx,qz]=mapPos(),r=routePoi();if(r){const [a,b]=P(r.x,r.z),[c,d]=P(qx,qz);x.setLineDash([5,5]);x.strokeStyle='rgba(242,184,75,.8)';x.lineWidth=1.5;x.beginPath();x.moveTo(c,d);x.lineTo(a,b);x.stroke();x.setLineDash([]);}
  $('mapInfo').textContent=r?`Route: ${r.name} · ${Math.round(Math.hypot(r.x-qx,r.z-qz))} m · ${DANGER[UD.tierAt(r.x,r.z)]} danger`:'Tap a place to set a route · lamps over doors mark buildings you can walk into';}
mapCv.addEventListener('click',e=>{const rc=mapCv.getBoundingClientRect(),mx=e.clientX-rc.left,my=e.clientY-rc.top;let best=null,bd=22;
  for(const p of UD.POIS){if(p.hidden&&!G.radioFound)continue;const d=Math.hypot(mapCx+p.x*mapScale-mx,mapCy+p.z*mapScale-my);if(d<bd){bd=d;best=p;}}
  if(best){G.route=G.route===best.id?null:best.id;S.click();drawMap();if(G.inBase&&baseTab==='exp')renderBase();save();}});
$('mapClose').addEventListener('click',()=>{$('mapov').hidden=true;});
const routePoi=()=>G.route?UD.POIS.find(p=>p.id===G.route):null;

/* ======================= pause =======================
   The button under the minimap, Esc or P on PC. Esc first releases the mouse on PC (the browser keeps that key press),
   so the mouse being released mid-game pauses too, and so does switching tabs. Esc still closes an open panel first.
   While paused, time, hunger, enemies and sound all stand still, and the game is saved. */
let pausedAt=0,wasLocked=false;
const canPause=()=>running&&!paused&&!G.dead&&!G.inBase&&!uiOpen();
function pauseGame(){if(!canPause())return;
  paused=true;pausedAt=performance.now();firing=false;useHeld=false;for(const k in keys)keys[k]=false;
  try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}
  $('pauseTxt').textContent=(matchMedia('(pointer:coarse)').matches?'Tap Resume to keep going.':'Esc or P to resume. Click the game to take the mouse back.')+' Your game is saved.';
  $('pauseov').hidden=false;$('pauseBtn').hidden=true;S.hold&&S.hold(true);save();$('pauseResume').focus({preventScroll:true});}
function resumeGame(){if(!paused)return;paused=false;last=performance.now();$('pauseov').hidden=true;$('pauseBtn').hidden=false;S.hold&&S.hold(false);}
$('pauseBtn').addEventListener('pointerdown',e=>e.stopPropagation());
$('pauseBtn').addEventListener('click',e=>{e.stopPropagation();pauseGame();});
$('pauseResume').addEventListener('click',resumeGame);
$('pauseQuit').addEventListener('click',()=>{save();location.reload();});
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;
  if(paused){if((e.code==='Escape'||e.code==='KeyP')&&performance.now()-pausedAt>250)resumeGame();
    if(!(e.target instanceof Node&&$('pauseov').contains(e.target)))e.stopImmediatePropagation();return;}   // game keys do nothing while paused
  if((e.code==='Escape'||e.code==='KeyP')&&canPause()){e.preventDefault();e.stopImmediatePropagation();pauseGame();}},true);
document.addEventListener('pointerlockchange',()=>{const L=!!document.pointerLockElement;if(wasLocked&&!L)pauseGame();wasLocked=L;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});

/* ======================= input ======================= */
let locked=false;const cv=renderer.domElement;
const uiOpen=()=>!$('pauseov').hidden||!$('bag').hidden||!$('mapov').hidden||!$('title').hidden||!$('noteov').hidden||!$('introov').hidden||G.dead;
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;keys[e.code]=true;
  if(/^(Arrow|Space|Tab)/.test(e.code))e.preventDefault();
  if(e.code==='Escape'){$('bag').hidden=true;$('mapov').hidden=true;$('noteov').hidden=true;$('introov').hidden=true;closePanel();}
  if(e.code==='KeyM'){$('mapov').hidden?openMap():($('mapov').hidden=true);return;}
  if(G.inBase||uiOpen()&&e.code!=='Tab'&&e.code!=='KeyI')return;
  if(e.code==='KeyE'&&!e.repeat)useNow();
  if(e.code==='KeyR')startReload();
  if(e.code==='KeyQ'||e.code==='KeyX')swapWeapon(1);
  if(e.code==='KeyF'){flashOn=!flashOn;S.click();}
  if(e.code==='Tab'||e.code==='KeyI'){$('bag').hidden?openBag():($('bag').hidden=true);}
  if(e.code==='Digit1')consume('food','pack');if(e.code==='Digit2')consume('water','pack');if(e.code==='Digit3')consume('meds','pack');if(e.code==='Digit4')consume('radaway','pack');
  dismissHint();});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE')useHeld=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;firing=false;useHeld=false;});
const ptrs=new Map(),joyEl=$('joy'),knob=$('knob');let joyId=null,lookId=null;
cv.addEventListener('pointerdown',e=>{
  if(G.inBase||uiOpen())return;
  if(e.pointerType==='mouse'){if(!locked){try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(_){}}else if(e.button===0)firing=true;return;}
  try{cv.setPointerCapture(e.pointerId);}catch(_){}dismissHint();
  if(joyId===null&&e.clientX<innerWidth*.45){joyId=e.pointerId;joy.bx=e.clientX;joy.by=e.clientY;joyEl.style.left=e.clientX+'px';joyEl.style.top=e.clientY+'px';knob.style.transform='';joyEl.hidden=false;}
  else if(lookId===null)lookId=e.pointerId;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(e.pointerId===joyId){let jx=e.clientX-joy.bx,jy=e.clientY-joy.by;const L=Math.hypot(jx,jy),mx=52;if(L>mx){jx*=mx/L;jy*=mx/L;}joy.x=jx/mx;joy.y=-jy/mx;knob.style.transform=`translate(${jx}px,${jy}px)`;}
  else if(e.pointerId===lookId){yaw-=dx*.0058;pitch=clamp(pitch-dy*.0058,-1.4,1.4);}});
const endPtr=e=>{if(e.pointerId===joyId){joyId=null;joy.x=joy.y=0;joyEl.hidden=true;}if(e.pointerId===lookId)lookId=null;ptrs.delete(e.pointerId);};
cv.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===0)firing=false;endPtr(e);});cv.addEventListener('pointercancel',endPtr);
addEventListener('mouseup',e=>{if(e.button===0)firing=false;});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;if(!locked)firing=false;});
cv.addEventListener('mousemove',e=>{if(!locked||G.inBase)return;yaw-=(e.movementX||0)*.0022;pitch=clamp(pitch-(e.movementY||0)*.0022,-1.4,1.4);});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function holdBtn(id,on,off){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_){}el.classList.add('on');on();});
  const up=()=>{el.classList.remove('on');off&&off();};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);el.addEventListener('contextmenu',e=>e.preventDefault());}
holdBtn('btnFire',()=>{firing=true;},()=>{firing=false;});
holdBtn('btnUse',useNow,()=>{useHeld=false;});
$('btnReload').addEventListener('click',startReload);$('btnSwap').addEventListener('click',()=>swapWeapon(1));
$('btnLight').addEventListener('click',()=>{flashOn=!flashOn;$('btnLight').classList.toggle('on',flashOn);});
$('btnBag').addEventListener('click',openBag);$('btnMap').addEventListener('click',openMap);$('mini').addEventListener('click',openMap);
$('baseMap').addEventListener('click',openMap);


/* ======================= secret: type ASHKING, or tap the title 7 times ======================= */
let flying=false,vert=0,codeBuf='',tapN=0,tapT=0;
const BEST_TOWER=['quarters','storage','workshop','kitchen','purifier','medbay','generator','farm','defense','radio'];
function toggleCheat(){
  if(G.cheat){G.cheat=false;flying=false;toast('Cheats off');syncCheatUI();save();return;}
  G.cheat=true;$('bag').hidden=true;
  // finish Meridian Tower: all ten floors, ordered so every requirement is met and power covers demand
  // (one generator feeds purifier 2 + farm 2 + turrets 1 + radio 1), with every floor fully staffed
  G.floors=[...BEST_TOWER];G.pop=popCap();G.fuelAcc=0;rebuildTower();
  for(const k of RK)G.stash[k]=capOf(k);
  for(const g of['prybar','snares','pack1','pack2','coat','shotgun','rifle','vest','suit','turret2','machete','filter'])G.gear[g]=true;
  if(G.weapon==='knife')G.weapon='machete';
  const pk={ammo:120,meds:5,radaway:5,food:5,water:5};for(const [k,v] of Object.entries(pk))G.pack[k]=Math.max(G.pack[k],v);
  for(const w of['pistol','shotgun','rifle'])G.mag[w]=WEAP[w].cap;
  G.radioFound=true;G.hp=100;G.food=100;G.water=100;G.rads=0;G.sta=100;
  S.build();toast('Ash King · tower fully built, every item, fast feet, V or FLY to take off',true);syncCheatUI();
  if(atHome()){if(G.inBase)needReload=true;else reloadHere();}
  if(G.inBase)renderBase();save();}
function syncCheatUI(){const c=!!G.cheat&&coarse;$('btnFly').hidden=!c;$('btnUp').hidden=$('btnDown').hidden=!(c&&flying);$('btnFly').classList.toggle('on',flying);$('btnFly').textContent=flying?'LAND':'FLY';}
function setFly(on){if(!G.cheat||inside())return;flying=on;if(!on){vert=0;vel.y=0;}syncCheatUI();toast(on?'Flying · Space up, C down, V to land':'Landed');}
function tapSecret(){const now=performance.now();if(now-tapT>2000)tapN=0;tapT=now;if(++tapN>=7){tapN=0;toggleCheat();}}
$('baseHead').addEventListener('click',e=>{if(e.target.closest('.bt b'))tapSecret();});
document.querySelector('.brand').addEventListener('pointerdown',e=>{e.stopPropagation();tapSecret();});
$('btnFly').addEventListener('click',()=>setFly(!flying));
for(const [id,d] of[['btnUp',1],['btnDown',-1]]){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_){}vert=d;el.classList.add('on');});
  const off=()=>{if(vert===d)vert=0;el.classList.remove('on');};el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off);}
addEventListener('keydown',e=>{if(e.key&&e.key.length===1){codeBuf=(codeBuf+e.key.toUpperCase()).slice(-12);if(codeBuf.endsWith('ASHKING')){codeBuf='';toggleCheat();}}
  if(e.code==='KeyV'&&G.cheat&&!G.inBase)setFly(!flying);});
/* ======================= movement ======================= */
function step(dt){
  let f=0,s=0;
  if(!uiOpen()){if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyD)s+=1;if(keys.KeyA)s-=1;
    if(keys.ArrowLeft)yaw+=1.9*dt;if(keys.ArrowRight)yaw-=1.9*dt;f+=joy.y;s+=joy.x;}
  const L=Math.hypot(f,s);if(L>1){f/=L;s/=L;}
  const wantRun=(keys.ShiftLeft||keys.ShiftRight||Math.hypot(joy.x,joy.y)>.96)&&L>.1;
  const run=wantRun&&(G.sta>3||G.cheat);G.sta=clamp(G.sta+(run&&!G.cheat?-16:11)*dt,0,100);
  const enc=packLoad()>packCap()*.85?.85:1,hurtSlow=G.hp<25?.85:1;
  const sp=(run?11.5:5.6)*enc*hurtSlow*(G.cheat?2.6:1)*(flying?2.2:1);
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const tx=(fx*f+rx*s)*sp,tz=(fz*f+rz*s)*sp;
  const a=1-Math.exp(-(flying?4:9)*dt);vel.x+=(tx-vel.x)*a;vel.z+=(tz-vel.z)*a;
  player.x+=vel.x*dt;player.z+=vel.z*dt;
  const gy=UD.groundAt(player.x,player.z);
  if(inside()){In.collide(player,.38);groundY=In.O.y;player.y=groundY+1.7;}
  else if(flying){let u=vert;if(!uiOpen()){if(keys.Space)u+=1;if(keys.KeyC||keys.ControlLeft)u-=1;}
    vel.y+=(clamp(u,-1,1)*(run?45:18)-vel.y)*a;player.y=clamp(player.y+vel.y*dt,gy+1.7,600);
    UD.collide(player,.45,player.y-1.7);groundY=player.y-1.7;}
  else{UD.collide(player,.45,groundY);if(groundY>gy+.3){groundY=Math.max(gy,groundY-18*dt);}else groundY+=(gy-groundY)*(1-Math.exp(-14*dt));player.y=groundY+1.7;}
  const spd=Math.hypot(vel.x,vel.z);bob+=spd*dt*1.15;
  const b=reduceMotion||flying?0:Math.sin(bob*2)*.05*Math.min(spd/5.6,1.5);
  recoil*=Math.exp(-10*dt);
  camera.position.set(player.x,player.y+b,player.z);camera.rotation.set(pitch+recoil,yaw,0);
  // view model sway
  const W=WEAP[G.weapon];for(const k in VM)VM[k].visible=k===G.weapon;
  vm.position.set(.2+Math.sin(bob)*.008,-.19+Math.abs(Math.cos(bob))*.008-(reloadT>0?.12:0),-.42+recoil*.8);
  vm.rotation.set(swingT>0?-Math.sin(swingT/.25*PI)*1.1:recoil*2,swingT>0?Math.sin(swingT/.25*PI)*.6:0,0);
  return spd;
}

/* ======================= HUD ======================= */
const strip=$('strip'),PX=2;let compassW=200;
(function(){let h='';const names={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
  for(let d=-360;d<=720;d+=15){const nd=((d%360)+360)%360,lb=names[nd];
    h+=lb?`<span class="${lb.length===1?'cd'+(lb==='N'?' n':''):'ord'}" style="left:${(d+360)*PX}px">${lb}</span>`:`<span class="tick" style="left:${(d+360)*PX}px"></span>`;}
  strip.innerHTML=h;})();
const AVES=['Ash','Birch','Cedar','Dover','Elm','Fulton','Grant','Harbor','Iron','Jasper','Kings','Lake','Main','Nolan','Oak','Pike','Quincy','Rose','State','Tide','Union','Vale','Walnut','Xavier','York','Zion','Ember'];
const ord=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]||'th');
const aveName=k=>AVES[clamp(k+N,0,AVES.length-1)]+' Ave',stName=l=>ord(l+N+1)+' St';
function clockText(){const t=tod(),h=Math.floor(t),m=Math.floor((t-h)*60),p=t<5?'night':t<7?'dawn':t<11?'morning':t<14?'midday':t<18?'afternoon':t<20?'dusk':'night';
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+' · '+p;}
let hudT=0,lastKey='',curRad=0,cold=false,heat=false,nearFire=false;
function setBar(id,v){$(id).style.width=clamp(v,0,100)+'%';}
const markEl=(el,bearing,heading)=>{const rel=((bearing-heading+540)%360)-180;if(Math.abs(rel)*PX>compassW/2-6){el.style.opacity=0;return;}el.style.opacity=1;el.style.transform=`translateX(${rel*PX}px)`;};
function hud(dt){
  const heading=((-yaw*180/PI)%360+360)%360;
  strip.style.transform=`translateX(${compassW/2-(heading+360)*PX}px)`;
  const bearing=(x,z)=>((Math.atan2(x-player.x,-(z-player.z))*180/PI)+360)%360;
  const ins=inside(),rp=routePoi();
  if(ins){$('homeMark').style.opacity=0;$('wpMark').style.opacity=0;}
  else{markEl($('homeMark'),bearing(TOWER.x,TOWER.z),heading);if(rp)markEl($('wpMark'),bearing(rp.x,rp.z),heading);else $('wpMark').style.opacity=0;}
  $('hitmark').style.opacity=hitT>0?1:0;hitT-=dt;
  $('vig').style.opacity=Math.max(hurtT/0.6,G.hp<30?.35+.15*Math.sin(performance.now()/300):0);hurtT=Math.max(0,hurtT-dt);
  $('radvig').style.opacity=clamp(curRad/2.5,0,.7);
  {const rs=$('radsign'),on=curRad>.05;rs.classList.toggle('on',on);rs.classList.toggle('hot',curRad>1);if(on)rs.style.setProperty('--rb',clamp(1.4-curRad*.4,.25,1.4).toFixed(2)+'s');}
  hudT+=dt;if(hudT<.12)return;hudT=0;
  $('clock').textContent=clockText();$('dayv').textContent='Day '+day();
  const temp=ambientTemp();$('wx').textContent=ins?(stormActive()?'Indoors · storm outside':'Indoors')+' · '+temp+'°C out':(stormActive()?'Toxic storm':night>.5?'Ashfall':'Ash haze')+' · '+temp+'°C';
  setBar('bHp',G.hp);setBar('bFood',G.food);setBar('bWater',G.water);setBar('bRad',G.rads);setBar('bSta',G.sta);
  $('vHp').textContent=Math.ceil(G.hp);$('vRad').textContent=Math.round(G.rads);
  let chips='';if(cold)chips+='<span class="st cold">COLD</span>';if(heat)chips+='<span class="st heat">HEAT</span>';
  if(nearFire&&!G.inBase&&temp<8)chips+='<span class="st warm">WARM</span>';if(G.food<15)chips+='<span class="st bad">STARVING</span>';if(G.water<15)chips+='<span class="st bad">PARCHED</span>';if(G.rads>50)chips+='<span class="st rad">RAD SICK</span>';
  $('chips').innerHTML=chips;
  $('pack').innerHTML=`PACK <b>${Math.round(packLoad())}</b>/${packCap()}`;
  const W=WEAP[G.weapon];$('wName').textContent=W.name;$('wAmmo').innerHTML=W.melee?'—':reloadT>0?'<em>reloading</em>':`<b>${G.mag[G.weapon]}</b> / ${G.pack.ammo}`;
  // readout
  if(ins){const key='in'+here.name+here.room;if(key!==lastKey){lastKey=key;$('district').textContent=here.name;$('street').textContent=here.room;
      $('sub').textContent=here.vault?'radiation-sealed, air still stale':G.loc.id==='tower'?'home · safe':'indoors';const tier=here.tier;
      if(tier){$('threat').innerHTML=`THREAT <i>${'▮'.repeat(tier)}${'▯'.repeat(5-tier)}</i> ${DANGER[tier]}`;$('threat').className='threat t'+tier;}else{$('threat').innerHTML='SAFE';$('threat').className='threat t1';}}
    const left=In.cur.enemies.filter(e=>!e.dead).length;$('route').textContent=left?`${left} hostile${left>1?'s':''} inside`:G.loc.id==='tower'?'Home':'Clear';}
  else{
  const k=Math.round(player.x/CELL),l=Math.round(player.z/CELL),dx=Math.abs(player.x-k*CELL),dz=Math.abs(player.z-l*CELL);
  const bi=Math.floor(player.x/CELL),bj=Math.floor(player.z/CELL),out=Math.abs(player.x)>EXT+6||Math.abs(player.z)>EXT+6;
  let dist=out?'outskirts':UD.lotType[bi+','+bj]||'outskirts';if(gzDist(player.x,player.z)<RIM+10)dist='crater';
  const lmn=UD.lmName[bi+','+bj];let st,sub;
  if(dist==='crater'){st=gzDist(player.x,player.z)<CRATER?'Glassed crater floor':'Blast rim';sub='ground zero';}
  else if(out){st='Outer wastes';sub='beyond the city limits';}
  else if(dx<ROAD/2+1&&dz<ROAD/2+1){st=`${aveName(k)} & ${stName(l)}`;sub='intersection';}
  else if(dx<ROAD/2+1){st=aveName(k);sub=`between ${stName(Math.floor(player.z/CELL))} & ${stName(Math.floor(player.z/CELL)+1)}`;}
  else if(dz<ROAD/2+1){st=stName(l);sub=`between ${aveName(Math.floor(player.x/CELL))} & ${aveName(Math.floor(player.x/CELL)+1)}`;}
  else{st=lmn||'Block off '+aveName(k);sub=lmn?'landmark':`near ${stName(l)}`;}
  const tier=UD.tierAt(player.x,player.z);
  const key=dist+st+sub+tier;if(key!==lastKey){lastKey=key;$('district').textContent=UD.DNAME[dist]||dist;$('street').textContent=st;$('sub').textContent=sub;
    $('threat').innerHTML=`THREAT <i>${'▮'.repeat(tier)}${'▯'.repeat(5-tier)}</i> ${DANGER[tier]}`;$('threat').className='threat t'+tier;}
  $('route').textContent=rp?`${rp.name} · ${Math.round(Math.hypot(rp.x-player.x,rp.z-player.z))} m`:`Home · ${Math.round(towerDist(player.x,player.z))} m`;}
  // prompt
  if(target&&!G.inBase){$('prompt').classList.add('on');$('ptext').textContent=(coarse||target.kind==='none'?'':target.dur?'Hold E · ':'E · ')+target.label;$('pbar').style.width=(target.dur?useT/target.dur*100:0)+'%';}
  else $('prompt').classList.remove('on');
  $('btnUse').hidden=!target||!coarse||target.kind==='none';
  if(ins)drawMiniInside();else drawMini();
}
const mini=$('mini'),mx=mini.getContext('2d');
function drawMini(){const S2=mini.width,c=S2/2,sc=c/150;
  mx.setTransform(1,0,0,1,0,0);mx.clearRect(0,0,S2,S2);mx.save();mx.beginPath();mx.arc(c,c,c-2,0,7);mx.clip();mx.fillStyle='rgba(16,13,10,.72)';mx.fillRect(0,0,S2,S2);
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),px=player.x,pz=player.z;
  const a=sc*rx,b=-sc*fx,cc=sc*rz,d=-sc*fz;mx.setTransform(a,b,cc,d,c-(px*a+pz*cc),c-(px*b+pz*d));
  mx.fillStyle='rgba(120,112,100,.28)';for(let i=Math.floor((px-170)/CELL);i<=Math.ceil((px+170)/CELL);i++){if(Math.abs(i)>N)continue;mx.fillRect(i*CELL-ROAD/2,pz-170,ROAD,340);}
  for(let j=Math.floor((pz-170)/CELL);j<=Math.ceil((pz+170)/CELL);j++){if(Math.abs(j)>N)continue;mx.fillRect(px-170,j*CELL-ROAD/2,340,ROAD);}
  mx.fillStyle='rgba(140,255,60,.22)';mx.beginPath();mx.arc(GZ.x,GZ.z,RIM,0,7);mx.fill();
  mx.fillStyle='rgba(140,255,60,.4)';for(const r of UD.radSpots)if(Math.abs(r.x-px)<170&&Math.abs(r.z-pz)<170){mx.beginPath();mx.arc(r.x,r.z,r.r,0,7);mx.fill();}
  for(const s of UD.loot)if(!s.got&&Math.abs(s.x-px)<45&&Math.abs(s.z-pz)<45){mx.fillStyle=s.type==='car'?'rgba(200,190,170,.6)':'#cfe86a';mx.fillRect(s.x-1.6,s.z-1.6,3.2,3.2);}
  mx.strokeStyle='#ffd29a';mx.lineWidth=1.2;for(const d of UD.doors)if(Math.abs(d.x-px)<60&&Math.abs(d.z-pz)<60)mx.strokeRect(d.x-2,d.z-2,4,4);
  mx.fillStyle='#ff5a3a';for(const e of A.list)if(!e.dead&&!e.inside&&Math.abs(e.x-px)<90&&Math.abs(e.z-pz)<90){mx.beginPath();mx.arc(e.x,e.z,2.6,0,7);mx.fill();}
  mx.fillStyle='#f2b84b';mx.fillRect(TOWER.x-TOWER.w/2,TOWER.z-TOWER.d/2,TOWER.w,TOWER.d);
  mx.setTransform(1,0,0,1,0,0);
  const edge=(wx,wz,col)=>{const ddx=wx-px,ddz=wz-pz;let sx=(ddx*rx+ddz*rz)*sc,sy=-(ddx*fx+ddz*fz)*sc;const L=Math.hypot(sx,sy),R=c-9;if(L>R){sx*=R/L;sy*=R/L;}
    mx.fillStyle=col;mx.save();mx.translate(c+sx,c+sy);mx.rotate(PI/4);mx.fillRect(-5,-5,10,10);mx.restore();};
  const rp=routePoi();if(rp)edge(rp.x,rp.z,'#ffe14a');if(towerDist(px,pz)>140)edge(TOWER.x,TOWER.z,'#f2b84b');
  mx.fillStyle='#fff';mx.beginPath();mx.moveTo(c,c-9);mx.lineTo(c+6,c+7);mx.lineTo(c,c+3);mx.lineTo(c-6,c+7);mx.closePath();mx.fill();
  mx.restore();mx.strokeStyle='rgba(243,214,160,.4)';mx.lineWidth=2;mx.beginPath();mx.arc(c,c,c-2,0,7);mx.stroke();}

function drawMiniInside(){const S2=mini.width,c=S2/2,sc=c/22,I=In.cur;
  mx.setTransform(1,0,0,1,0,0);mx.clearRect(0,0,S2,S2);mx.save();mx.beginPath();mx.arc(c,c,c-2,0,7);mx.clip();mx.fillStyle='rgba(16,13,10,.82)';mx.fillRect(0,0,S2,S2);
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),px=player.x,pz=player.z;
  const a=sc*rx,b=-sc*fx,cc=sc*rz,d=-sc*fz;mx.setTransform(a,b,cc,d,c-(px*a+pz*cc),c-(px*b+pz*d));
  const CSz=In.CS,st=insState(I.id);
  for(const cl of I.cells){if(cl.ch===' ')continue;const [x,z]=I.ctr(cl.i,cl.j);
    mx.fillStyle=cl.ch==='#'||cl.ch==='='?'rgba(150,140,125,.55)':cl.solid?'rgba(110,100,88,.45)':'rgba(70,64,56,.5)';mx.fillRect(x-CSz/2,z-CSz/2,CSz+.05,CSz+.05);}
  for(const o of I.objs){let col=null;if(o.kind==='loot'){const v=st.l[o.i+','+o.j];if(!(v&&v>day()))col='#cfe86a';}else if(o.kind==='exit')col='#3aff6a';else if(o.st==='up'||o.st==='down')col='#f3ece2';else if(o.kind==='st')col='#f2b84b';else if(o.kind==='note')col='#ffd29a';else if(o.kind==='npc')col='#8ad0ff';
    if(col){mx.fillStyle=col;mx.fillRect(o.x-.6,o.z-.6,1.2,1.2);}}
  mx.fillStyle='#ff5a3a';for(const e of I.enemies)if(!e.dead){mx.beginPath();mx.arc(e.x,e.z,.6,0,7);mx.fill();}
  mx.setTransform(1,0,0,1,0,0);mx.fillStyle='#fff';mx.beginPath();mx.moveTo(c,c-9);mx.lineTo(c+6,c+7);mx.lineTo(c,c+3);mx.lineTo(c-6,c+7);mx.closePath();mx.fill();
  mx.restore();mx.strokeStyle='rgba(243,214,160,.4)';mx.lineWidth=2;mx.beginPath();mx.arc(c,c,c-2,0,7);mx.stroke();}

/* ======================= ash fall ======================= */
const ASH=coarse?700:1400,box=60,ashH=30,ashPos=new Float32Array(ASH*3),ashSeed=new Float32Array(ASH);
for(let i=0;i<ASH;i++){ashPos.set([rr(-box,box),rr(0,ashH),rr(-box,box)],i*3);ashSeed[i]=Math.random()*6.28;}
const ashGeo=new THREE.BufferGeometry();ashGeo.setAttribute('position',new THREE.BufferAttribute(ashPos,3));
const ashMat=new THREE.PointsMaterial({size:.11,map:UD.softTex,color:C(0xd8d0c4),transparent:true,opacity:.7,depthWrite:false});
const ash=new THREE.Points(ashGeo,ashMat);ash.frustumCulled=false;scene.add(ash);

/* ======================= hint + title ======================= */
const hint=$('hint');
hint.textContent=coarse?'Left thumb walks · right thumb looks · USE opens doors, searches and works benches · tap the minimap for the map':'Click to look · WASD move · Shift run · E use, enter, search · click shoot · R reload · Q swap · F light · Tab pack · M map';
let hintGone=true;function dismissHint(){if(hintGone)return;hintGone=true;setTimeout(()=>hint.classList.add('gone'),3000);}
function showTitle(){$('title').hidden=false;$('contBtn').hidden=!hasSave();}
function start(fresh){S.init();S.resume();
  if(fresh){G=newState();UD.G=G;try{localStorage.removeItem(SAVE_KEY);}catch(e){}}else load();
  G.dead=false;G.inBase=false;$('death').hidden=true;$('base').hidden=true;document.body.classList.remove('inbase');vm.visible=true;
  for(const s of UD.loot){s.got=false;UD.setLootVisible(s,true);}for(const c of UD.camps)c.day=0;
  $('title').hidden=true;A.clear();In.unload();for(const d of[...drops])removeDrop(d);restoreLoot();rebuildTower();lastHour=Math.floor(G.t);
  hint.classList.remove('gone');hintGone=false;setTimeout(dismissHint,9000);
  if(G.loc){const l=G.loc;enterPlace(l,l.id!=='tower'?'exit':l.fl===-1?'up':l.fl===0?'exit':'down');}
  else{player.set(TOWER.door.x,1.7,TOWER.door.z+3.5);groundY=0;yaw=PI;}
  if(fresh)$('introov').hidden=false;
  syncCheatUI();running=true;$('pauseBtn').hidden=false;}
$('newBtn').addEventListener('click',()=>{if(hasSave()&&!$('contBtn').hidden&&!confirm('Start over? Your current tower and supplies will be lost.'))return;start(true);});
$('contBtn').addEventListener('click',()=>start(false));

/* ======================= main loop ======================= */
let paused=false,viewOff=false,running=false,last=performance.now(),T=0,lightT=0,geigT=0,lightningT=8;
rebuildTower();restoreLoot();applyTime();showTitle();
function frame(now){
  const dt=paused?0:Math.min(.05,(now-last)/1000),rdt=paused?0:Math.min(.25,(now-last)/1000);last=now;T+=dt;
  if(running&&!G.dead){
    G.t+=dt*24/CYCLE;const h=Math.floor(G.t);if(h!==lastHour){for(let k=lastHour+1;k<=h;k++)onHour(k,false);lastHour=h;}
  }
  const storming=stormActive();stormMix+=((storming?1:0)-stormMix)*Math.min(1,dt*.35);
  if(stormMix>.3){lightningT-=dt;if(lightningT<=0){lightningT=rr(5,14);lightning=1;S.thunder(rr(.3,2));}}
  lightning=Math.max(0,lightning-dt*5);
  wind.x=.5+stormMix*2.2;wind.z=.2+stormMix*.8;
  S.setWind(stormMix*.8+.15);
  let spd=0;
  if(G.inBase){camera.position.set(player.x,player.y,player.z);camera.rotation.set(pitch,yaw,0);
    softT+=dt;if(softT>2){softT=0;renderHead();}}
  else if(running&&!G.dead){spd=step(dt);
    // fire control
    fireCd-=dt;swingT=Math.max(0,swingT-dt);muzzle.intensity*=Math.exp(-40*dt);
    if(reloadT>0){reloadT-=dt;if(reloadT<=0){const W=WEAP[G.weapon];const n=Math.min(W.cap-G.mag[G.weapon],G.pack.ammo);G.mag[G.weapon]+=n;G.pack.ammo-=n;}}
    if(firing&&!uiOpen())fire();
    // interaction
    tgtT-=rdt;if(tgtT<=0){tgtT=.1;const nt=findTarget();if(!nt||!target||nt.label!==target.label)useT=0;target=nt;}
    if(target&&useHeld){if(!target.dur){useHeld=false;doInteract();target=null;}else{useT+=rdt;if(useT>=target.dur){useT=0;useHeld=false;doInteract();target=null;tgtT=0;}}}else useT=0;
    // survival: radiation, temperature, hunger
    let rate=0;const dg=gzDist(player.x,player.z),ins=inside();
    if(!ins){if(dg<RIM+20)rate+=2.8*(1-dg/(RIM+20))+.3;else if(dg<260)rate+=.1;
      for(const r of UD.radSpots){const dd=Math.hypot(r.x-player.x,r.z-player.z);if(dd<r.r)rate+=r.str*(1-dd/r.r);}
      if(storming)rate+=.3*stormMix;}
    rate*=G.gear.suit?.35:1;curRad=rate;
    G.rads=clamp(G.rads+rate*dt,0,100);
    if(G.rads>50)hurtTick((G.rads-50)*.012*dt);
    geigerAcc+=rate*9*dt;while(geigerAcc>1){geigerAcc-=Math.random()*1.4+.3;S.geiger();}
    const temp=ambientTemp();nearFire=false;if(!ins)for(const F of UD.fires)if(Math.abs(F.x-player.x)<7&&Math.abs(F.z-player.z)<7&&Math.hypot(F.x-player.x,F.z-player.z)<6){nearFire=true;break;}
    cold=!ins&&temp<3&&!G.gear.coat&&!nearFire;heat=!ins&&temp>36;
    if(cold)hurtTick(.07*dt);
    if(G.food<=0)hurtTick(.12*dt);if(G.water<=0)hurtTick(.15*dt);
    if(G.food>50&&G.water>50&&G.rads<30&&G.hp<100)G.hp=Math.min(100,G.hp+.04*dt);
    const tier=UD.tierAt(player.x,player.z);if(tier>G.deepest)G.deepest=tier;
    flash.intensity+=((flashOn?2.6:0)-flash.intensity)*Math.min(1,dt*12);
  }
  // world sim
  if(running){
    const ins=inside();
    A.update(dt,{px:player.x,py:player.y,pz:player.z,hidden:G.inBase||G.dead||ins,night:night>.5,storm:stormActive(),tier:UD.tierAt(player.x,player.z),spawning:!G.inBase&&!G.dead&&!ins,day:day(),...actx});
    if(ins){In.update(dt,T,{px:player.x,py:player.y,pz:player.z,hidden:G.dead||atHome(),...actx});
      const I=In.cur;if(I.enemies.length&&!I.cleared&&I.enemies.every(e=>e.dead)){I.cleared=true;insState(I.id).clr=day();toast(here.name+' · cleared',true);save();}}
    // turrets
    if(built('defense')&&powerState().ok)for(const t of turrets){t.cd-=dt;const e=A.nearest(t.x,t.z,78,true,t.y);if(!e)continue;
      const ya=Math.atan2(-(e.x-t.x),-(e.z-t.z));t.head.rotation.y+=(Math.atan2(Math.sin(ya-t.head.rotation.y),Math.cos(ya-t.head.rotation.y)))*Math.min(1,dt*6);
      if(t.cd<=0&&G.stash.ammo>0){t.cd=1.1;turretShots++;if(turretShots%4===0)G.stash.ammo--;const v=new THREE.Vector3(t.x,t.y,t.z);A.tracer(v,new THREE.Vector3(e.x,e.y+1.2,e.z),0xffe08a);
        A.damage(e,G.gear.turret2?50:25,actx);S.shot('turret',clamp(1-Math.hypot(t.x-camera.position.x,t.z-camera.position.z)/120,.05,.7));}}
    for(const d of drops){d.t+=dt;d.b.material.opacity=.6+.4*Math.sin(T*4);}
    A.animSurvivors(T,dt);
  }
  A.fx(dt);
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  lightT+=dt;if(lightT>.1){lightT=0;applyTime();}
  UD.animWorld(T,dt,camera.position,wind);
  sky.position.copy(camera.position);stars.position.copy(camera.position);
  moon.position.copy(camera.position).addScaledVector(sunDir,-2000);
  const focus=player;
  sun.position.copy(focus).addScaledVector(sunDir,400);sun.target.position.copy(focus);
  moonLight.position.copy(focus).addScaledVector(sunDir,-400);moonLight.target.position.copy(focus);
  // ash
  const cp=camera.position,fall=.5+stormMix*1.2,drift=wind.x*(1+stormMix*4);
  for(let i=0;i<ASH;i++){const o=i*3;ashPos[o]+=(Math.sin(T*.4+ashSeed[i])*.3+drift)*dt;ashPos[o+1]-=(fall+ashSeed[i]*.04)*dt;ashPos[o+2]+=(Math.cos(T*.3+ashSeed[i])*.2+wind.z*(1+stormMix*3))*dt;
    if(ashPos[o+1]<cp.y-15)ashPos[o+1]+=ashH;if(ashPos[o+1]>cp.y+15)ashPos[o+1]-=ashH;
    if(ashPos[o]-cp.x>box)ashPos[o]-=box*2;else if(ashPos[o]-cp.x<-box)ashPos[o]+=box*2;
    if(ashPos[o+2]-cp.z>box)ashPos[o+2]-=box*2;else if(ashPos[o+2]-cp.z<-box)ashPos[o+2]+=box*2;}
  ashGeo.attributes.position.needsUpdate=true;
  ashMat.color.setRGB(.55+.25*(1-night),.55+.3*(1-night)-stormMix*.05,.5+.25*(1-night)-stormMix*.25);ashMat.size=.11+stormMix*.05;
  if(running&&!G.inBase)hud(dt);else if(G.inBase&&$('vig'))$('vig').style.opacity=0;
  compassW=strip.parentElement.clientWidth||200;
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
function hurtTick(v){G.hp-=v;if(G.hp<=0)die();}
requestAnimationFrame(frame);
UD.debug={get G(){return G;},player,findTarget,use:()=>{target=findTarget();doInteract();target=null;},enterPlace,exitPlace,enterTower,enterDoor,openPanel,closePanel,In,get target(){return target;},start,setT:v=>{G.t=v;lastHour=Math.floor(v);},teleport:(x,z)=>{player.x=x;player.z=z;},look:(y,p)=>{yaw=y;pitch=p;}};
})();
