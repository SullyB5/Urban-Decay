/* Urban Decay · audio: everything is synthesized with WebAudio, no files to load. */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;
let held=false,ac=null,master,windGain,windFilter,noiseBuf;
function init(){
  if(ac)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{ac=new AC();}catch(e){return;}
  master=ac.createGain();master.gain.value=.7;master.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // wind bed
  const src=ac.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  windFilter=ac.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=380;windFilter.Q.value=.6;
  windGain=ac.createGain();windGain.gain.value=.05;src.connect(windFilter).connect(windGain).connect(master);src.start();
}
function noise(dur,f0,f1,vol,type='lowpass',q=.8,delay=0){if(!ac)return;const t=ac.currentTime+delay;
  const s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);
  const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(master);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
function tone(type,f0,f1,dur,vol,delay=0){if(!ac)return;const t=ac.currentTime+delay;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+.05);}
UD.sfx={
  init,
  resume(){if(ac&&ac.state==='suspended'&&!held)ac.resume();},
  // pause: every sound stops where it is and picks up again on resume
  hold(p){held=!!p;if(!ac)return;try{(p?ac.suspend():ac.resume()).catch(()=>{});}catch(e){}},
  shot(kind,vol=1){if(kind==='rifle'){noise(.5,4000,200,.9*vol);tone('square',90,30,.25,.4*vol);}
    else if(kind==='shotgun'){noise(.45,2600,150,1*vol);tone('square',70,25,.3,.45*vol);}
    else if(kind==='turret'){noise(.18,3000,400,.35*vol);}
    else{noise(.25,3200,300,.7*vol);tone('square',140,40,.12,.3*vol);}},
  enemyShot(vol){noise(.22,2200,250,.45*vol);},
  click(){tone('square',1800,1200,.03,.15);},
  reload(){tone('square',600,400,.05,.12);tone('square',900,700,.05,.12,.35);},
  hit(){tone('triangle',900,600,.06,.2);},
  kill(){tone('triangle',500,250,.18,.22);},
  swing(){noise(.15,1200,400,.25,'bandpass',1.2);},
  hurt(){tone('sawtooth',160,70,.25,.25);noise(.12,800,200,.2);},
  pickup(){tone('triangle',520,780,.08,.18);tone('triangle',780,1040,.08,.14,.07);},
  build(){noise(.3,600,100,.4);tone('square',220,110,.2,.15,.1);tone('triangle',440,660,.15,.2,.3);},
  deny(){tone('square',220,160,.12,.15);},
  geiger(){if(!ac)return;const t=ac.currentTime;const s=ac.createBufferSource();s.buffer=noiseBuf;const g=ac.createGain();g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.0001,t+.012);
    const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=2500;s.connect(f).connect(g).connect(master);s.start(t,Math.random());s.stop(t+.02);},
  thunder(delay){noise(2.6,500,40,.9,'lowpass',.5,delay);noise(1.2,1200,80,.5,'lowpass',.5,delay);},
  growl(vol){tone('sawtooth',110,60,.6,.12*vol);noise(.5,500,150,.12*vol,'bandpass',2);},
  bark(vol){tone('sawtooth',380,180,.12,.18*vol);tone('sawtooth',360,170,.12,.16*vol,.18);},
  door(){noise(.8,300,60,.5);tone('square',80,40,.6,.15);},
  setWind(v){if(!ac)return;windGain.gain.setTargetAtTime(.03+v*.22,ac.currentTime,.8);windFilter.frequency.setTargetAtTime(300+v*700,ac.currentTime,.8);},
};
})();
