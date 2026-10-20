/* Urban Decay · actors: hostiles of the wasteland, survivors at the tower, tracers and hit puffs. */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;
const {scene,C,clamp,rr,rpick,TOWER,CELL,ROAD,EXT}=UD;
const PI=Math.PI;
const mat=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:C(c),roughness:.9},o||{}));
const MAT={ghoulSkin:mat(0x7a876a),ghoulRag:mat(0x3a3328),hound:mat(0x4a3a2e),houndSkin:mat(0x8a5a4a),
  jacket:mat(0x4a3a2a),pants:mat(0x2a2622),bandana:mat(0x8a2a20),skin:mat(0xa8826a),gun:mat(0x161616,{metalness:.6,roughness:.4}),
  bruteSkin:mat(0x6a7a4a,{emissive:C(0x203a08),emissiveIntensity:.6}),survTop:[mat(0x3a5a6a),mat(0x6a5a3a),mat(0x5a3a4a),mat(0x4a5a3a)],survPants:mat(0x34332e),
  eye:new THREE.MeshBasicMaterial({color:C(0xd8ff6a)}),eyeRed:new THREE.MeshBasicMaterial({color:C(0xff4a2a)})};
const BX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
function limb(parent,geo,m,x,y,z,len){const piv=new THREE.Group();piv.position.set(x,y,z);const mesh=new THREE.Mesh(geo,m);mesh.position.y=-len/2;mesh.castShadow=true;piv.add(mesh);parent.add(piv);return piv;}
function humanoid(o){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const torso=new THREE.Mesh(BX(.56,.72,.32),o.top);torso.position.y=1.32;torso.castShadow=true;body.add(torso);
  const head=new THREE.Mesh(BX(.32,.34,.32),o.skin);head.position.y=1.88;head.castShadow=true;body.add(head);
  if(o.band){const b=new THREE.Mesh(BX(.34,.12,.34),o.band);b.position.y=1.8;body.add(b);}
  if(o.eye)for(const s of[-1,1]){const e=new THREE.Mesh(BX(.07,.05,.02),o.eye);e.position.set(s*.08,1.9,-.17);body.add(e);}
  const armL=limb(body,BX(.15,.66,.15),o.arm||o.top,-.37,1.64,0,.66),armR=limb(body,BX(.15,.66,.15),o.arm||o.top,.37,1.64,0,.66);
  const legL=limb(body,BX(.2,.92,.2),o.legs,-.15,.95,0,.92),legR=limb(body,BX(.2,.92,.2),o.legs,.15,.95,0,.92);
  if(o.gun){const gun=new THREE.Mesh(BX(.09,.66,.13),MAT.gun);gun.position.set(0,-.82,-.04);armR.add(gun);}
  if(o.hunch){torso.rotation.x=-.38;head.position.z=-.2;head.position.y=1.8;for(const c of body.children)if(c.geometry&&c.geometry.parameters.height===.05){c.position.z=-.37;c.position.y=1.82;}}
  g.scale.setScalar(o.scale||1);
  return{g,body,head,armL,armR,legL,legR,quad:false,hunch:!!o.hunch,gun:!!o.gun};
}
function houndModel(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const torso=new THREE.Mesh(BX(.42,.42,1.1),MAT.hound);torso.position.y=.74;torso.castShadow=true;body.add(torso);
  const head=new THREE.Mesh(BX(.3,.3,.44),MAT.houndSkin);head.position.set(0,.9,-.7);head.castShadow=true;body.add(head);
  const snout=new THREE.Mesh(BX(.18,.16,.24),MAT.houndSkin);snout.position.set(0,.82,-.98);body.add(snout);
  for(const s of[-1,1]){const e=new THREE.Mesh(BX(.06,.04,.02),MAT.eyeRed);e.position.set(s*.09,.96,-.93);body.add(e);}
  const legs=[];for(const [x,z] of[[-.15,-.4],[.15,-.4],[-.15,.4],[.15,.4]])legs.push(limb(body,BX(.12,.58,.12),MAT.hound,x,.6,z,.58));
  const tail=limb(body,BX(.08,.45,.08),MAT.hound,0,.88,.55,.45);tail.rotation.x=-2.2;
  return{g,body,head,legs,tail,quad:true};
}
const TYPES=UD.ETYPES={
  ghoul:{name:'Ghoul',hp:45,walk:1.4,run:5.1,dmg:10,aggro:30,reach:1.7,cd:1.1,mk:()=>humanoid({skin:MAT.ghoulSkin,top:MAT.ghoulRag,legs:MAT.ghoulRag,arm:MAT.ghoulSkin,eye:MAT.eye,hunch:true}),drops:{scrap:[0,2],cloth:[0,2],parts:[0,1]},r:.45,cy:1.15,hy:1.8},
  hound:{name:'Rad hound',hp:30,walk:2,run:9.2,dmg:7,aggro:42,reach:1.9,cd:.75,mk:houndModel,drops:{meat:[1,2]},r:.5,cy:.75,hy:.9},
  raider:{name:'Raider',hp:60,walk:2,run:4.8,dmg:9,aggro:52,ranged:true,cd:1.7,range:40,mk:()=>humanoid({skin:MAT.skin,top:MAT.jacket,legs:MAT.pants,band:MAT.bandana,gun:true}),drops:{ammo:[4,10],scrap:[0,3],meds:[0,1],food:[0,1]},r:.42,cy:1.25,hy:1.88},
  brute:{name:'Glowing brute',hp:180,walk:1.3,run:4.3,dmg:24,aggro:34,reach:2.5,cd:1.6,mk:()=>humanoid({skin:MAT.bruteSkin,top:MAT.bruteSkin,legs:MAT.ghoulRag,eye:MAT.eye,hunch:true,scale:1.5}),drops:{parts:[1,3],scrap:[2,5],tech:0},r:.68,cy:1.7,hy:2.7},
};
const list=[];
function spawn(type,x,z,opts){const T=TYPES[type],m=T.mk();m.g.position.set(x,UD.groundAt(x,z),z);scene.add(m.g);
  const e=Object.assign({type,T,m,x,z,yaw:Math.random()*6.28,hp:T.hp,dead:false,deadT:0,cd:rr(.3,1),ph:Math.random()*6,wt:0,tx:x,tz:z,alert:0,canSee:false,losT:0,stuckT:0,sx:0,sz:0,spd:0,atk:0,raid:false,raidT:0,voiceT:rr(2,8)},opts||{});
  list.push(e);return e;}
function remove(e){scene.remove(e.m.g);const i=list.indexOf(e);if(i>=0)list.splice(i,1);}
function pickType(tier,night){const r=Math.random();
  if(tier<=1)return r<.55?'hound':'ghoul';
  if(tier===2)return r<.5?'ghoul':r<.8?'hound':'raider';
  if(tier===3)return r<.38?'ghoul':r<.72?'raider':r<.92?'hound':'brute';
  if(tier===4)return r<.32?'raider':r<.64?'ghoul':r<.8?'hound':'brute';
  return r<.5?'ghoul':r<.85?'brute':'hound';}
// find a spawn point on a road near a ring around (x,z)
function roadPoint(x,z,dmin,dmax){for(let k=0;k<12;k++){const a=Math.random()*6.283,d=rr(dmin,dmax);let px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;
    if(Math.random()<.5)px=Math.round(px/CELL)*CELL+rr(-4,4);else pz=Math.round(pz/CELL)*CELL+rr(-4,4);
    if(Math.abs(px)>EXT+230||Math.abs(pz)>EXT+230)continue;if(UD.solidAt(px,1,pz))continue;return[px,pz];}return null;}
let spawnT=0;
const _v=new THREE.Vector3();
function update(dt,ctx){
  // spawning
  spawnT-=dt;
  if(spawnT<=0&&ctx.spawning){spawnT=1.3;
    const base=[0,1,3,5,7,7][ctx.tier]||1;let target=Math.round(base*(ctx.night?1.6:1)+(ctx.storm?2:0));target=Math.min(target,12);
    if(UD.towerDist(ctx.px,ctx.pz)<60)target=Math.min(target,1);
    let near=0;for(const e of list)if(!e.dead&&!e.raid&&!e.inside&&Math.hypot(e.x-ctx.px,e.z-ctx.pz)<140)near++;
    if(near<target){const p=roadPoint(ctx.px,ctx.pz,75,115);if(p&&UD.towerDist(p[0],p[1])>70)spawn(pickType(UD.tierAt(p[0],p[1]),ctx.night),p[0],p[1]);}
    for(const c of UD.camps){if(c.day===ctx.day)continue;if(Math.hypot(c.x-ctx.px,c.z-ctx.pz)<120){c.day=ctx.day;for(let k=0;k<c.n;k++)spawn('raider',c.x+rr(-6,6),c.z+rr(-6,6),{home:c});}}
  }
  for(let i=list.length-1;i>=0;i--){const e=list[i],T=e.T,m=e.m;if(e.inside)continue;
    const dx=ctx.px-e.x,dz=ctx.pz-e.z,d=Math.hypot(dx,dz);
    if(e.dead){e.deadT+=dt;const k=Math.min(1,e.deadT/.45);
      if(m.quad){m.g.rotation.z=k*PI/2;}else{m.g.rotation.x=-k*PI/2*e.fallDir;m.g.position.y=UD.groundAt(e.x,e.z)+k*.2;}
      if(e.deadT>30||d>220)remove(e);continue;}
    if(!e.raid&&d>190&&!e.home){remove(e);continue;}
    e.cd-=dt;e.alert-=dt;e.atk=Math.max(0,e.atk-dt);e.losT-=dt;
    if(e.losT<=0){e.losT=.35+Math.random()*.2;e.canSee=!ctx.hidden&&d<T.aggro*2&&UD.los(e.x,e.y+T.hy,e.z,ctx.px,ctx.py,ctx.pz);}
    const aggro=T.aggro*(ctx.night?1.25:1)*(ctx.storm?.8:1);
    let chase=!ctx.hidden&&((d<aggro&&(e.canSee||d<7))||(e.alert>0&&d<aggro*2.2));
    if(chase&&e.alert<3)e.alert=3;
    let mx=0,mz=0,spd=0;
    if(chase){const ux=dx/(d||1),uz=dz/(d||1);
      if(T.ranged){if(d<11){mx=-ux;mz=-uz;spd=T.run*.8;}else if(d>T.range*.7||!e.canSee){mx=ux;mz=uz;spd=T.run;}else{const s=Math.sin(e.ph*.3)>0?1:-1;mx=-uz*s;mz=ux*s;spd=T.walk*1.2;}}
      else if(d>T.reach*.8){mx=ux;mz=uz;spd=T.run;}
      e.yaw=Math.atan2(-dx,-dz);
      if(T.ranged){if(e.canSee&&d<T.range&&e.cd<=0){e.cd=T.cd*rr(.8,1.4);ctx.enemyShot(e,d);}}
      else if(d<T.reach&&e.cd<=0){e.cd=T.cd;e.atk=.3;ctx.hitPlayer(T.dmg,e);}
      e.voiceT-=dt;if(e.voiceT<=0){e.voiceT=rr(3,7);ctx.voice(e,d);}
    }else if(e.raid){const tdx=TOWER.door.x-e.x,tdz=TOWER.door.z+4-e.z,td=Math.hypot(tdx,tdz);
      if(td>9){mx=tdx/td;mz=tdz/td;spd=T.run*.7;e.yaw=Math.atan2(-mx,-mz);}else{e.raidT+=dt;if(e.raidT>8&&!e.stole){e.stole=true;ctx.raidSteal(e);e.raid=false;e.wt=0;}
        if(T.ranged&&e.cd<=0){e.cd=T.cd;ctx.enemyShot(e,99,true);e.yaw=Math.atan2(-tdx,-tdz);}}}
    else{e.wt-=dt;
      if(e.wt<=0){e.wt=rr(3,8);if(Math.random()<.35){e.tx=e.x;e.tz=e.z;}else{const hx=e.home?e.home.x:e.x,hz=e.home?e.home.z:e.z,a=Math.random()*6.283,r=rr(4,e.home?8:16);e.tx=hx+Math.cos(a)*r;e.tz=hz+Math.sin(a)*r;}}
      const wx=e.tx-e.x,wz=e.tz-e.z,wd=Math.hypot(wx,wz);if(wd>.8){mx=wx/wd;mz=wz/wd;spd=T.walk;e.yaw=Math.atan2(-mx,-mz);}}
    // keep wanderers off the tower's doorstep
    if(!e.raid){const tdd=UD.towerDist(e.x,e.z);if(tdd<45){const ax=(e.x-TOWER.x)/tdd,az=(e.z-TOWER.z)/tdd;mx+=ax*1.5;mz+=az*1.5;const L=Math.hypot(mx,mz);mx/=L;mz/=L;spd=Math.max(spd,T.walk);}}
    // stuck handling: sidestep along walls
    if(e.stuckT>0){e.stuckT-=dt;const sx=e.sx,sz=e.sz;mx=sx;mz=sz;}
    const ox=e.x,oz=e.z;
    _v.set(e.x+mx*spd*dt,0,e.z+mz*spd*dt);UD.collide(_v,T.r,e.y);
    e.x=_v.x;e.z=_v.z;
    const moved=Math.hypot(e.x-ox,e.z-oz);
    if(spd>0&&moved<spd*dt*.3&&e.stuckT<=0){e.stuckT=rr(.6,1.2);const s=Math.random()<.5?1:-1;e.sx=-mz*s;e.sz=mx*s;}
    e.spd+=(moved/Math.max(dt,1e-4)-e.spd)*Math.min(1,dt*8);
    e.y=UD.groundAt(e.x,e.z);
    m.g.position.set(e.x,e.y,e.z);
    let dy=e.yaw-m.g.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));m.g.rotation.y+=dy*Math.min(1,dt*10);
    // animation
    e.ph+=dt*(2+e.spd*2.2);const amp=Math.min(1,e.spd/3)*.8;
    if(m.quad){m.legs.forEach((l,k)=>l.rotation.x=Math.sin(e.ph*1.4+(k===0||k===3?0:PI))*amp*1.1);m.tail.rotation.z=Math.sin(e.ph*3)*.4;m.body.position.y=Math.abs(Math.sin(e.ph*1.4))*.08*amp;m.head.rotation.x=e.atk>0?-.5:0;}
    else{m.legL.rotation.x=Math.sin(e.ph)*amp;m.legR.rotation.x=-Math.sin(e.ph)*amp;
      if(m.hunch){m.armL.rotation.x=1.2+Math.sin(e.ph*.7)*.15+(e.atk>0?.5:0);m.armR.rotation.x=1.25+Math.cos(e.ph*.6)*.15+(e.atk>0?.5:0);}
      else if(m.gun&&chase){m.armR.rotation.x=1.5;m.armL.rotation.x=1.2;m.armL.rotation.z=-.4;}
      else{m.armL.rotation.x=-Math.sin(e.ph)*amp*.7;m.armR.rotation.x=Math.sin(e.ph)*amp*.7;m.armL.rotation.z=0;}
      m.body.position.y=Math.abs(Math.sin(e.ph))*.05*amp;}
  }
}
function damage(e,amt,ctx){if(e.dead)return false;e.hp-=amt;e.alert=10;puff(e.x,e.y+e.T.cy*(e.m.g.scale.y),e.z,0x7a1a12);
  if(e.hp<=0){e.dead=true;e.fallDir=Math.random()<.5?1:-1;ctx&&ctx.onKill&&ctx.onKill(e);return true;}return false;}
// ray vs spheres for every live enemy; returns the nearest hit
function hitscan(o,dir,range){let best=null;
  for(const e of list){if(e.dead)continue;const s=e.m.g.scale.y;
    for(const [cy,r,head] of[[e.T.cy*s,e.T.r*s,false],[e.T.hy*s,.2*s,true]]){
      const cx=e.x-o.x,cyy=e.y+cy-o.y,cz=e.z-o.z,tca=cx*dir.x+cyy*dir.y+cz*dir.z;if(tca<0||tca>range)continue;
      const d2=cx*cx+cyy*cyy+cz*cz-tca*tca;if(d2>r*r)continue;const t=tca-Math.sqrt(r*r-d2);
      if(!best||t<best.t)best={e,t,head:head&&!e.T.r?false:head};}}
  return best;}
function nearest(x,z,range,needLos,y=0){let best=null,bd=range;for(const e of list){if(e.dead||e.inside)continue;const d=Math.hypot(e.x-x,e.z-z);if(d<bd){if(needLos&&!UD.los(x,y,z,e.x,e.y+1.2,e.z))continue;bd=d;best=e;}}return best;}
function spawnRaid(n){const out=[];for(let k=0;k<n;k++){const p=roadPoint(TOWER.x,TOWER.z,120,150);if(!p)continue;out.push(spawn(Math.random()<.7?'raider':'ghoul',p[0],p[1],{raid:true}));}return out;}
function clear(){for(let i=list.length-1;i>=0;i--)if(!list[i].inside)remove(list[i]);}

/* ---------- survivors living at the tower ---------- */
const surv=[];
function setSurvivors(n,roofY){
  while(surv.length<n){const k=surv.length,m=humanoid({skin:MAT.skin,top:MAT.survTop[k%4],legs:MAT.survPants,gun:k%3===0});scene.add(m.g);surv.push({m,k,ph:Math.random()*6});}
  while(surv.length>n){const s=surv.pop();scene.remove(s.m.g);}
  surv.forEach((s,i)=>{if(i%2===0){const a=i*.9;s.x=TOWER.x+Math.cos(a)*7;s.z=TOWER.door.z+3+Math.abs(Math.sin(a))*3;s.y=.25;}
    else{const c=[[-1,-1],[1,-1],[-1,1],[1,1]][i%4];s.x=TOWER.x+c[0]*8;s.z=TOWER.z+c[1]*8;s.y=roofY;}
    s.m.g.position.set(s.x,s.y,s.z);});
}
function animSurvivors(t,dt){for(const s of surv){s.ph+=dt;s.m.g.rotation.y=Math.sin(s.ph*.2+s.k)*1.4+(s.y>1?PI:0);s.m.armL.rotation.x=Math.sin(s.ph*.8)*.08;s.m.body.position.y=Math.sin(s.ph*1.1)*.01;if(s.m.gun)s.m.armR.rotation.x=.5;}}

/* ---------- fx: tracers + puffs ---------- */
const TR=32,trPos=new Float32Array(TR*6),trCol=new Float32Array(TR*6),trLife=new Float32Array(TR);let trI=0;
const trGeo=new THREE.BufferGeometry();trGeo.setAttribute('position',new THREE.BufferAttribute(trPos,3));trGeo.setAttribute('color',new THREE.BufferAttribute(trCol,3));
const tracers=new THREE.LineSegments(trGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));tracers.frustumCulled=false;tracers.userData.always=true;scene.add(tracers);
const _c=new THREE.Color();
function tracer(a,b,hex){const i=trI++%TR;trPos.set([a.x,a.y,a.z,b.x,b.y,b.z],i*6);_c.set(hex).convertSRGBToLinear().multiplyScalar(2);trCol.set([_c.r,_c.g,_c.b,_c.r*.3,_c.g*.3,_c.b*.3],i*6);trLife[i]=.07;
  trGeo.attributes.position.needsUpdate=true;trGeo.attributes.color.needsUpdate=true;}
const PF=48,pfPos=new Float32Array(PF*3),pfVel=new Float32Array(PF*3),pfLife=new Float32Array(PF),pfCol=new Float32Array(PF*3);let pfI=0;
const pfGeo=new THREE.BufferGeometry();pfGeo.setAttribute('position',new THREE.BufferAttribute(pfPos,3));pfGeo.setAttribute('color',new THREE.BufferAttribute(pfCol,3));
const puffs=new THREE.Points(pfGeo,new THREE.PointsMaterial({size:.35,map:UD.softTex,vertexColors:true,transparent:true,depthWrite:false}));puffs.frustumCulled=false;puffs.userData.always=true;scene.add(puffs);
for(let i=0;i<PF;i++)pfPos[i*3+1]=-999;
function puff(x,y,z,hex){_c.set(hex).convertSRGBToLinear();for(let k=0;k<6;k++){const i=pfI++%PF;pfPos.set([x,y,z],i*3);pfVel.set([rr(-1.5,1.5),rr(.5,2.5),rr(-1.5,1.5)],i*3);pfLife[i]=rr(.3,.6);pfCol.set([_c.r,_c.g,_c.b],i*3);}}
function fx(dt){for(let i=0;i<TR;i++)if(trLife[i]>0){trLife[i]-=dt;if(trLife[i]<=0){trPos.fill(0,i*6,i*6+6);trGeo.attributes.position.needsUpdate=true;}}
  for(let i=0;i<PF;i++)if(pfLife[i]>0){pfLife[i]-=dt;pfVel[i*3+1]-=6*dt;for(let k=0;k<3;k++)pfPos[i*3+k]+=pfVel[i*3+k]*dt;if(pfLife[i]<=0)pfPos[i*3+1]=-999;}
  pfGeo.attributes.position.needsUpdate=true;}

UD.Actors={list,spawn,remove,update,damage,hitscan,nearest,spawnRaid,clear,setSurvivors,animSurvivors,tracer,puff,fx,TYPES,humanoid,MAT};
})();
