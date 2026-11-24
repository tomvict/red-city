(function(){
const A={
 ctx:null,master:null,sfxG:null,musG:null,started:false,muted:false,
 engineOsc:null,sirenOn:false,musicTimer:null,intensity:0,
 init(){
  if(this.started)return;
  const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AC)return;
  this.ctx=new AC();
  this.master=this.ctx.createGain();this.master.gain.value=0.5;this.master.connect(this.ctx.destination);
  this.sfxG=this.ctx.createGain();this.sfxG.gain.value=0.9;this.sfxG.connect(this.master);
  this.musG=this.ctx.createGain();this.musG.gain.value=0.32;this.musG.connect(this.master);
  this.started=true;this.startMusic();
 },
 resume(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();},
 setMuted(m){this.muted=m;if(this.master)this.master.gain.value=m?0:0.5;},
 now(){return this.ctx?this.ctx.currentTime:0;},
 env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);},
 tone(freq,type,dur,vol,dest,freqEnd){
  if(!this.ctx)return;
  const t=this.now(),o=this.ctx.createOscillator(),g=this.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  if(freqEnd)o.frequency.exponentialRampToValueAtTime(Math.max(1,freqEnd),t+dur);
  this.env(g,t,0.005,dur,vol);o.connect(g);g.connect(dest||this.sfxG);o.start(t);o.stop(t+dur+0.05);
 },
 noise(dur,vol,filterFreq,dest){
  if(!this.ctx)return;
  const t=this.now(),len=Math.max(1,(dur*this.ctx.sampleRate)|0);
  const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  const src=this.ctx.createBufferSource();src.buffer=buf;
  const bp=this.ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=filterFreq||1000;bp.Q.value=0.9;
  const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(bp);bp.connect(g);g.connect(dest||this.sfxG);src.start(t);
 },
 shoot(){this.noise(0.12,0.5,2500);this.tone(160,'square',0.09,0.35,null,40);},
 shotgun(){this.noise(0.28,0.75,850);this.tone(90,'sawtooth',0.24,0.5,null,30);},
 smg(){this.noise(0.07,0.4,3100);this.tone(230,'square',0.05,0.24,null,60);},
 melee(){this.noise(0.09,0.35,600);},
 meleeHit(){this.noise(0.16,0.6,380);this.tone(70,'sine',0.16,0.6,null,28);},
 hurt(){this.tone(210,'sawtooth',0.16,0.4,null,70);},
 kill(){this.tone(320,'square',0.12,0.3,null,45);this.noise(0.2,0.45,300);},
 explosion(){this.noise(0.9,0.9,110);this.tone(55,'sine',0.85,0.9,null,18);},
 pickup(){this.tone(660,'square',0.07,0.22);setTimeout(()=>this.tone(990,'square',0.1,0.22),70);},
 door(){this.tone(190,'triangle',0.13,0.3,null,85);},
 horn(){this.tone(370,'square',0.28,0.18);this.tone(466,'square',0.28,0.18);},
 ricochet(){this.tone(U.rand(1800,2600),'sine',0.06,0.14,null,900);},
 reload(){this.noise(0.05,0.2,2000);setTimeout(()=>this.noise(0.05,0.2,1400),130);},
 empty(){this.tone(1200,'square',0.04,0.14,null,750);},
 siren(on){
  if(!this.ctx)return;
  if(on&&!this.sirenOn){
   this.sirenOn=true;
   const o=this.ctx.createOscillator(),g=this.ctx.createGain(),lfo=this.ctx.createOscillator(),lg=this.ctx.createGain();
   o.type='triangle';o.frequency.value=700;lfo.frequency.value=1.6;lg.gain.value=260;
   lfo.connect(lg);lg.connect(o.frequency);g.gain.value=0.055;
   o.connect(g);g.connect(this.sfxG);o.start();lfo.start();
   this._siren=[o,lfo];
  }else if(!on&&this.sirenOn){
   this.sirenOn=false;
   if(this._siren)try{this._siren[0].stop();this._siren[1].stop();}catch(e){}
   this._siren=null;
  }
 },
 engine(on){
  if(!this.ctx)return;
  if(on&&!this.engineOsc){
   const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
   o.type='sawtooth';o.frequency.value=50;f.type='lowpass';f.frequency.value=320;g.gain.value=0.05;
   o.connect(f);f.connect(g);g.connect(this.sfxG);o.start();
   this.engineOsc=o;
  }else if(!on&&this.engineOsc){
   try{this.engineOsc.stop();}catch(e){}
   this.engineOsc=null;
  }
 },
 engineSpeed(s){if(this.engineOsc)this.engineOsc.frequency.value=45+Math.abs(s)*0.13;},
 startMusic(){
  if(!this.ctx)return;
  const bass=[55,55,65.41,49],arp=[440,523.25,659.25,880,659.25,523.25,440,392];
  let step=0;const stepDur=0.235;
  this.musicTimer=setInterval(()=>{
   if(!this.ctx||this.muted)return;
   const i=step%16,bar=(step/16)|0,b=bass[bar%bass.length];
   this.tone(b,'sawtooth',0.2,0.14,this.musG);
   this.tone(b/2,'sine',0.23,0.2,this.musG);
   if(i%4===0)this.noise(0.03,0.22,6500,this.musG);
   if(i%4===2)this.noise(0.09,0.13,1700,this.musG);
   if(this.intensity>0.35)this.tone(arp[(step*7)%arp.length],'square',0.1,0.045,this.musG);
   if(this.intensity>0.7&&i%8===4)this.tone(arp[(step*5)%arp.length]*2,'sawtooth',0.12,0.04,this.musG);
   step++;
  },stepDur*1000);
 },
 setIntensity(v){this.intensity=U.clamp(v,0,1);}
};
globalThis.AudioSys=A;
})();
