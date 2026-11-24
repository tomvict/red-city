(function(){
const WEAPONS={
 fists:{name:'Poings',dmg:100,range:54,arc:2.2,cd:0.32,knock:180},
 pistol:{name:'Pistolet',dmg:55,cd:0.24,bspeed:760,spread:0.03,ammo:12,pellets:1},
 shotgun:{name:'Fusil à pompe',dmg:26,cd:0.85,bspeed:640,spread:0.22,ammo:6,pellets:7},
 smg:{name:'SMG',dmg:22,cd:0.085,bspeed:820,spread:0.09,ammo:32,pellets:1}
};
class Game{
 constructor(canvas,opts){
  this.canvas=canvas;
  this.ctx=canvas.getContext('2d');
  this.opts=opts||{};
  this.world=World.build();
  this.renderer=new Renderer(canvas);
  this.renderer.prerender(this.world);
  this.minimapCanvas=null;
  this.crt=U.store.get('crt','1')==='1';
  this.applyCRT();
  this.reset();
 }
 reset(){
  this.state='menu';
  this.player=new E.Player({x:World.PITCH+World.ROAD/2,y:World.PITCH*3+World.ROAD/2});
  this.cars=this.world.parked.map(p=>new E.Car(p));
  this.peds=[];this.enemies=[];this.bullets=[];this.particles=[];this.corpses=[];this.decals=[];
  this.pickups=this.initialPickups();
  this.traffic=[];
  this.wanted=0;this.wantedT=0;this.crimeT=0;
  this.kills=0;this.time=0;
  this.inside=null;this.obj=null;
  this.missions=Missions.init(this.world);
  this._itemTaken=false;this._hostageFreed=false;
  this.shake=0;this.hitstop=0;this.flash=0;
  this.cam={x:0,y:0};
  this.noises=[];this.pendingExplosions=[];
  this.copT=2;this.policeCarT=6;this.pedT=0;this.trafficT=0;
  this.msg={text:'',t:0};
  this._prev={};
  this._h={};
  this.spawnTraffic(8);
  for(let i=0;i<14;i++)this.spawnPed();
 }
 solids(){return this.inside?this.inside.building.interior.solids:this.world.solids;}
 humans(){return this.peds.concat(this.enemies);}
 mouseWorld(){return {x:Input.mouse.x+this.cam.x,y:Input.mouse.y+this.cam.y};}
 los(x1,y1,x2,y2){for(const s of this.solids())if(U.segRect(x1,y1,x2,y2,s))return false;return true;}
 noise(x,y){this.noises.push({x,y,t:0});}
 noiseNear(x,y,r){for(const n of this.noises)if(n.t<1.5&&U.dist2(x,y,n.x,n.y)<r*r)return true;return false;}
 nearestNoise(x,y){let best=null,bd=1e18;for(const n of this.noises)if(n.t<1.5){const d=U.dist2(x,y,n.x,n.y);if(d<bd){bd=d;best=n;}}return best;}
 addShake(n){this.shake=Math.min(20,this.shake+n);}
 setMsg(t){this.msg={text:t,t:3};}
 blood(x,y,n){
  for(let i=0;i<n;i++)this.particles.push({x,y,vx:U.rand(-160,160),vy:U.rand(-160,160),life:U.rand(0.3,0.8),max:0.8,color:'#a10606',size:U.rand(2,5)});
 }
 spark(x,y){
  for(let i=0;i<5;i++)this.particles.push({x,y,vx:U.rand(-260,260),vy:U.rand(-260,260),life:0.25,max:0.25,color:'#ffe66d',size:2});
 }
 muzzle(e,a){
  this.particles.push({x:e.x+Math.cos(a)*18,y:e.y+Math.sin(a)*18,vx:Math.cos(a)*60,vy:Math.sin(a)*60,life:0.06,max:0.06,color:'#ffe66d',size:7});
 }
 addWanted(n){this.wanted=Math.min(5,this.wanted+n);this.crimeT=0;}
 witnessCrime(x,y,r,n){
  for(const e of this.humans()){
   if(e.dead)continue;
   if((e.kind==='ped'||e.kind==='cop')&&U.dist2(x,y,e.x,e.y)<r*r){this.addWanted(n);return;}
  }
 }
 start(){
  if(this.state==='dead')this.reset();
  if(this.state==='menu'||this.state==='dead'){
   this.state='playing';
   AudioSys.init();AudioSys.resume();
   const menu=document.getElementById('menu'),over=document.getElementById('over');
   if(menu)menu.classList.add('hidden');
   if(over)over.classList.add('hidden');
  }
 }
 pressed(c){return !!Input.keys[c]&&!this._prev[c];}
 toggleCRT(){
  this.crt=!this.crt;
  U.store.set('crt',this.crt?'1':'0');
  this.applyCRT();
 }
 applyCRT(){
  if(typeof document!=='undefined'&&document.body)document.body.classList.toggle('crt',this.crt);
  const b=document.getElementById&&document.getElementById('crtBtn');
  if(b)b.textContent='CRT : '+(this.crt?'ON':'OFF');
 }
 toggleMute(){AudioSys.setMuted(!AudioSys.muted);this.setMsg(AudioSys.muted?'Son coupé':'Son actif');}
 togglePause(){
  if(this.state==='playing'){this.state='paused';const p=document.getElementById('pauseEl');if(p)p.classList.remove('hidden');}
  else if(this.state==='paused'){this.state='playing';const p=document.getElementById('pauseEl');if(p)p.classList.add('hidden');}
 }
 update(dt){
  if(this.pressed('KeyC'))this.toggleCRT();
  if(this.pressed('KeyM'))this.toggleMute();
  if(this.pressed('KeyP')||this.pressed('Escape'))this.togglePause();
  if(this.state==='dead'&&this.pressed('KeyR'))this.start();
  if(this.state==='playing'){
   this.interact();
   if(this.hitstop>0)this.hitstop-=dt;
   else{
    this.time+=dt;
    if(this.inside)this.interiorUpdate(dt);
    else this.overworldUpdate(dt);
   }
   this.commonUpdate(dt);
  }
  this._prev=Object.assign({},Input.keys);
  this.updateHUD();
 }
 commonUpdate(dt){
  const p=this.player,vw=this.canvas.width,vh=this.canvas.height,W=this.world.W,H=this.world.H;
  if(this.inside){
   const iw=this.inside.building.interior.w,ih=this.inside.building.interior.h;
   const cw=vw/2,ch=vh/2;
   this.cam.x=iw>cw*2?U.clamp(p.x-cw,0,iw-cw*2):(iw-cw*2)/2;
   this.cam.y=ih>ch*2?U.clamp(p.y-ch,0,ih-ch*2):(ih-ch*2)/2;
  }else{
   this.cam.x=W>vw?U.clamp(p.x-vw/2,0,W-vw):(W-vw)/2;
   this.cam.y=H>vh?U.clamp(p.y-vh/2,0,H-vh):(H-vh)/2;
  }
  this.shake*=Math.pow(0.001,dt);if(this.shake<0.1)this.shake=0;
  this.flash=Math.max(0,this.flash-dt*1.6);
  if(this.msg.t>0)this.msg.t-=dt;
  for(const n of this.noises)n.t+=dt;
  this.noises=this.noises.filter(n=>n.t<2);
  for(const pe of [...this.pendingExplosions]){
   pe.t-=dt;
   if(pe.t<=0){this.pendingExplosions.splice(this.pendingExplosions.indexOf(pe),1);this.explode(pe.x,pe.y,170,300,pe.byPlayer);}
  }
  AudioSys.setIntensity(U.clamp(this.wanted/5+(this.inside?0.25:0),0,1));
  AudioSys.siren(this.wanted>=2&&!this.inside);
  AudioSys.engine(!!this.player.driving);
  Missions.update(this);
 }
 overworldUpdate(dt){
  this.player.update(dt,this);
  for(const e of [...this.enemies])if(!e.dead)e.update(dt,this);
  for(const pd of [...this.peds])if(!pd.dead)pd.update(dt,this);
  for(const c of this.cars)c.update(dt,this);
  this.spawners(dt);
  this.updateBullets(dt);
  this.updateParticles(dt);
  for(const pk of [...this.pickups]){
   pk.bob+=dt*4;
   if(U.dist(this.player.x,this.player.y,pk.x,pk.y)<20)this.applyPickup(pk);
  }
 }
 interiorUpdate(dt){
  this.player.update(dt,this);
  const m=this.inside?this.inside.mission:null,o=this.obj;
  if(o&&o.device&&o.device.armed&&!o.device.done){
   o.device.fuse-=dt;
   if(o.device.fuse<=0){
    o.device.done=true;
    if(m&&m.def.type==='destroy')this.completeMission(m);
    this.explode(o.device.x,o.device.y,190,400,true);
   }
  }
  if(o&&o.hostage&&o.hostage.freed&&!o.hostage.dead){
   const h=o.hostage,p=this.player,d=U.dist(p.x,p.y,h.x,h.y);
   if(d>34){const a=Math.atan2(p.y-h.y,p.x-h.x);h.x+=Math.cos(a)*150*dt;h.y+=Math.sin(a)*150*dt;}
  }
  for(const e of [...this.enemies])if(!e.dead&&e.room)e.update(dt,this);
  for(const pd of [...this.peds])if(!pd.dead&&pd.room)pd.update(dt,this);
  this.updateBullets(dt);
  this.updateParticles(dt);
  for(const pk of [...this.pickups]){
   pk.bob+=dt*4;
   if(U.dist(this.player.x,this.player.y,pk.x,pk.y)<20)this.applyPickup(pk);
  }
 }
 spawners(dt){
  this.pedT-=dt;
  if(this.pedT<=0){
   this.pedT=1.5;
   const alive=this.peds.filter(p=>!p.dead).length;
   if(alive<14)this.spawnPed();
  }
  this.trafficT-=dt;
  if(this.trafficT<=0){
   this.trafficT=2;
   const n=this.cars.filter(c=>!c.dead&&c.ai&&c.ai.mode==='traffic').length;
   if(n<8)this.spawnTrafficCar();
  }
  this.copT-=dt;
  if(this.wanted>=1&&this.copT<=0){
   const cops=this.enemies.filter(e=>!e.dead&&e.kind==='cop').length;
   if(cops<this.wanted*2+1)this.spawnCop();
   this.copT=Math.max(1.0,3.5-this.wanted*0.5);
  }
  this.policeCarT-=dt;
  if(this.wanted>=3&&this.policeCarT<=0){
   const pc=this.cars.filter(c=>!c.dead&&c.ai&&c.ai.mode==='hunt').length;
   if(pc<2)this.spawnPoliceCar();
   this.policeCarT=9;
  }
  this.crimeT+=dt;
  if(this.crimeT>14&&this.wanted>0){
   this.wantedT+=dt;
   if(this.wantedT>10){this.wanted--;this.wantedT=0;}
  }else this.wantedT=0;
 }
 spawnPed(){
  const pt=this.world.randomSidewalkPoint();
  if(U.dist(pt.x,pt.y,this.player.x,this.player.y)<350)return;
  const colors=['#e59866','#85c1e9','#f8c471','#bb8fce','#76d7c4','#f1948a'];
  this.peds.push(new E.Ped({x:pt.x,y:pt.y,color:U.choice(colors)}));
 }
 spawnTraffic(n){for(let i=0;i<n;i++)this.spawnTrafficCar();}
 spawnTrafficCar(){
  const band=U.irand(0,World.N),axis=Math.random()<0.5?'v':'h';
  const type=U.choice(['sedan','sedan','coupe','suv','van','taxi']);
  const color=U.choice(E.CAR_COLORS[type]);
  let x,y;
  if(axis==='v'){x=band*World.PITCH+World.ROAD/2+(Math.random()<0.5?1:-1)*30;y=U.rand(World.ROAD+60,World.H-World.ROAD-60);}
  else{y=band*World.PITCH+World.ROAD/2+(Math.random()<0.5?1:-1)*30;x=U.rand(World.ROAD+60,World.W-World.ROAD-60);}
  if(U.dist(x,y,this.player.x,this.player.y)<420)return;
  const c=new E.Car({x,y,type,color,ai:{mode:'traffic',axis,band,dir:Math.random()<0.5?1:-1,lane:Math.random()<0.5?1:-1,speed:0,targetSpeed:0,cruise:U.rand(60,95)}});
  this.cars.push(c);
 }
 spawnCop(){
  for(let i=0;i<10;i++){
   const a=U.rand(0,U.TAU),d=U.rand(520,700);
   const x=U.clamp(this.player.x+Math.cos(a)*d,World.ROAD+20,World.W-World.ROAD-20);
   const y=U.clamp(this.player.y+Math.sin(a)*d,World.ROAD+20,World.H-World.ROAD-20);
   let bad=false;
   for(const s of this.world.solids)if(U.pointInRect(x,y,s)){bad=true;break;}
   if(bad)continue;
   this.enemies.push(new E.Enemy({x,y,kind:'cop',weapon:'pistol',speed:125,alert:true}));
   return;
  }
 }
 spawnPoliceCar(){
  const band=U.irand(0,World.N);
  const x=band*World.PITCH+World.ROAD/2,y=U.clamp(this.player.y+U.rand(-600,600),World.ROAD+60,World.H-World.ROAD-60);
  const c=new E.Car({x,y,ang:0,type:'police',color:'#ecf0f1',ai:{mode:'hunt',ejected:false,cruise:175}});
  this.cars.push(c);
  AudioSys.siren(true);
 }
 initialPickups(){
  const list=[];
  const find=t=>this.world.buildings.find(b=>b.type===t);
  const addNear=(b,kind,sub,amount)=>{if(b)list.push({x:b.door.x+U.rand(-28,28),y:b.door.y+U.rand(-28,28),kind,sub,amount,bob:0});};
  addNear(find('police'),'weapon','shotgun',6);
  addNear(find('hospital'),'medkit',null,50);
  addNear(find('bank'),'money',null,300);
  addNear(find('warehouse'),'weapon','smg',64);
  for(let i=0;i<6;i++){
   const pt=this.world.randomSidewalkPoint();
   list.push({x:pt.x,y:pt.y,kind:Math.random()<0.5?'money':'ammo',sub:'pistol',amount:U.irand(30,90),bob:0});
  }
  return list;
 }
 applyPickup(pk){
  this.pickups.splice(this.pickups.indexOf(pk),1);
  const p=this.player;
  if(pk.kind==='weapon'){
   p.weapons[pk.sub].ammo+=pk.amount;
   if(p.weapon==='fists')p.weapon=pk.sub;
   this.setMsg('Arme ramassée : '+WEAPONS[pk.sub].name);
  }else if(pk.kind==='ammo'){p.weapons[pk.sub].ammo+=pk.amount;this.setMsg('Munitions +'+pk.amount);}
  else if(pk.kind==='money'){p.money+=pk.amount;this.setMsg('+$'+pk.amount);}
  else if(pk.kind==='medkit'){p.hp=Math.min(p.maxhp,p.hp+pk.amount);this.setMsg('Soigné +'+pk.amount+' PV');}
  AudioSys.pickup();
 }
 playerAttack(){
  const p=this.player,w=WEAPONS[p.weapon];
  if(p.weapon==='fists'){
   p.attackCd=w.cd;
   AudioSys.melee();
   let hitAny=false;
   for(const e of this.humans()){
    if(e.dead)continue;
    const d=U.dist(p.x,p.y,e.x,e.y);
    if(d<w.range+e.r){
     const a=U.angleTo(p.x,p.y,e.x,e.y);
     if(Math.abs(U.angDiff(p.ang,a))<w.arc/2){this.damageHuman(e,w.dmg,'melee',a,w.knock);hitAny=true;}
    }
   }
   if(hitAny){AudioSys.meleeHit();this.addShake(2);this.hitstop=Math.max(this.hitstop,0.03);}
   return;
  }
  const st=p.weapons[p.weapon];
  if(st.ammo<=0){AudioSys.empty();p.weapon='fists';return;}
  st.ammo--;
  p.attackCd=w.cd;
  const mw=this.mouseWorld(),base=Math.atan2(mw.y-p.y,mw.x-p.x);
  for(let i=0;i<w.pellets;i++){
   const a=base+U.rand(-w.spread,w.spread);
   this.bullets.push({x:p.x+Math.cos(base)*16,y:p.y+Math.sin(base)*16,vx:Math.cos(a)*w.bspeed,vy:Math.sin(a)*w.bspeed,dmg:w.dmg,from:'player',life:0.8});
  }
  this.muzzle(p,base);
  if(p.weapon==='pistol')AudioSys.shoot();
  else if(p.weapon==='shotgun')AudioSys.shotgun();
  else AudioSys.smg();
  this.addShake(p.weapon==='shotgun'?4:1.5);
  this.noise(p.x,p.y,650);
  if(!this.inside)this.witnessCrime(p.x,p.y,600,1);
 }
 enemyShoot(e){
  const p=this.player,a=Math.atan2(p.y-e.y,p.x-e.x)+U.rand(-0.14,0.14);
  this.bullets.push({x:e.x+Math.cos(a)*14,y:e.y+Math.sin(a)*14,vx:Math.cos(a)*640,vy:Math.sin(a)*640,dmg:e.kind==='cop'?13:10,from:'enemy',life:0.9});
  this.muzzle(e,a);
  this.noise(e.x,e.y,650);
  AudioSys.shoot();
  e.shootCd=U.rand(0.55,1.2);
 }
 enemyMelee(e){
  const p=this.player;
  if(U.dist(e.x,e.y,p.x,p.y)<52)this.damagePlayer(18,'melee',Math.atan2(p.y-e.y,p.x-e.x),260);
  AudioSys.meleeHit();
 }
 damageHuman(e,dmg,cause,ang,knock){
  if(e.dead)return;
  e.hp-=dmg;e.hurtT=0.25;e.alert=true;
  if(knock){e.kx+=Math.cos(ang)*knock;e.ky+=Math.sin(ang)*knock;}
  this.blood(e.x,e.y,8);
  if(e.hp<=0)this.killHuman(e,cause,cause!=='enemy');
 }
 killHuman(e,cause,byPlayer){
  if(e.dead)return;
  e.dead=true;
  this.corpses.push({x:e.x,y:e.y,ang:e.ang||0,room:!!e.room,color:e.kind==='cop'?'#2e86c1':'#7b241c'});
  this.blood(e.x,e.y,26);
  if(this.renderer)this.renderer.addDecal(e.x,e.y,U.rand(18,30),'rgba(122,10,10,0.8)');
  if(byPlayer){
   this.kills++;
   this.hitstop=Math.max(this.hitstop,0.05);
   this.addShake(3);
   AudioSys.kill();
   if(e.kind==='cop')this.addWanted(2);
   else if(e.kind==='ped')this.addWanted(1);
   const r=Math.random();
   if(e.kind!=='ped'&&r<0.3)this.pickups.push({x:e.x,y:e.y,kind:'weapon',sub:'pistol',amount:12,bob:0});
   else if(r<0.5)this.pickups.push({x:e.x,y:e.y,kind:'money',amount:U.irand(40,180),bob:0});
   else if(r<0.58)this.pickups.push({x:e.x,y:e.y,kind:'medkit',amount:35,bob:0});
   if(e.kind==='hostage'&&this.inside&&this.inside.mission&&this.inside.mission.def.type==='rescue')this.failMission('L\'otage est mort.');
  }
 }
 runOver(e,car){
  if(e.dead)return;
  const byPlayer=car.driver===this.player;
  this.blood(e.x,e.y,30);
  if(this.renderer)this.renderer.addDecal(e.x,e.y,U.rand(22,34),'rgba(122,10,10,0.85)');
  if(byPlayer){this.addShake(4);this.hitstop=Math.max(this.hitstop,0.04);AudioSys.meleeHit();this.noise(e.x,e.y,500);}
  this.killHuman(e,'car',byPlayer);
 }
 damagePlayer(dmg,cause,ang,knock){
  const p=this.player;
  if(this.state!=='playing'||p.driving)return;
  p.hp-=dmg;p.hurtT=0.3;
  this.flash=0.5;this.addShake(6);
  if(knock){p.kx+=Math.cos(ang||0)*knock;p.ky+=Math.sin(ang||0)*knock;}
  AudioSys.hurt();
  if(p.hp<=0)this.die();
 }
 die(){
  this.state='dead';
  this.failMission('');
  const best=Math.max(parseInt(U.store.get('best','0'),10)||0,this.player.money);
  U.store.set('best',String(best));
  const stats=document.getElementById('stats');
  if(stats)stats.textContent='Argent: $'+this.player.money+'  |  Kills: '+this.kills+'  |  Temps: '+Math.round(this.time)+'s  |  Record: $'+best;
  const over=document.getElementById('over');
  if(over)over.classList.remove('hidden');
  AudioSys.siren(false);AudioSys.engine(false);
  AudioSys.tone(300,'sawtooth',0.5,0.4,null,60);
 }
 explode(x,y,r,dmg,byPlayer){
  for(let i=0;i<50;i++)this.particles.push({x,y,vx:U.rand(-380,380),vy:U.rand(-380,380),life:U.rand(0.3,0.9),max:0.9,color:Math.random()<0.5?'#ff7b00':'#ffd23f',size:U.rand(3,8)});
  if(this.renderer)this.renderer.addDecal(x,y,r*0.7,'rgba(12,12,12,0.85)');
  this.addShake(14);this.hitstop=Math.max(this.hitstop,0.12);
  this.noise(x,y,r*2.5);
  AudioSys.explosion();
  for(const e of this.humans()){
   if(e.dead)continue;
   const d=U.dist(x,y,e.x,e.y);
   if(d<r){e.hp-=dmg*(1-d/r);if(e.hp<=0)this.killHuman(e,'explosion',byPlayer);else e.alert=true;}
  }
  for(const c of this.cars){
   if(c.dead)continue;
   const d=U.dist(x,y,c.x,c.y);
   if(d<r+c.l/2){
    c.hp-=dmg*(1-d/(r+c.l));
    if(c.hp<=0){c.dead=true;this.pendingExplosions.push({t:0.12+Math.random()*0.25,x:c.x,y:c.y,byPlayer});}
   }
  }
  const p=this.player;
  if(!p.driving){
   const d=U.dist(x,y,p.x,p.y);
   if(d<r)this.damagePlayer(dmg*(1-d/r)*0.8,'explosion',U.angleTo(x,y,p.x,p.y),150);
  }else{
   const c=p.driving,d=U.dist(x,y,c.x,c.y);
   if(!c.dead&&d<r+c.l/2){c.hp-=dmg;if(c.hp<=0){c.dead=true;this.pendingExplosions.push({t:0.05,x:c.x,y:c.y,byPlayer});}}
  }
  if(byPlayer)this.addWanted(2);
 }
 updateBullets(dt){
  const solids=this.solids();
  const cars=this.inside?[]:this.cars;
  for(const b of [...this.bullets]){
   b.life-=dt;
   let dead=b.life<=0;
   const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/6));
   for(let i=0;i<steps&&!dead;i++){
    b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
    for(const s of solids){
     if(U.pointInRect(b.x,b.y,s)){
      dead=true;this.spark(b.x,b.y);
      if(Math.random()<0.3&&b.from==='player')AudioSys.ricochet();
      break;
     }
    }
    if(dead)break;
    for(const c of cars){
     if(c.dead)continue;
     if(U.pointInOBB(b.x,b.y,c.obb)){
      dead=true;c.hp-=b.dmg;this.spark(b.x,b.y);
      if(b.from==='player')this.witnessCrime(c.x,c.y,550,1);
      if(c.hp<=0)this.explode(c.x,c.y,170,300,b.from==='player');
      break;
     }
    }
    if(dead)break;
    if(b.from==='player'){
     for(const e of this.humans()){
      if(e.dead)continue;
      if(U.dist2(b.x,b.y,e.x,e.y)<(e.r+3)*(e.r+3)){dead=true;this.damageHuman(e,b.dmg,'bullet',Math.atan2(b.vy,b.vx),140);break;}
     }
    }else{
     const p=this.player;
     if(!p.driving){
      if(U.dist2(b.x,b.y,p.x,p.y)<(p.r+3)*(p.r+3)){dead=true;this.damagePlayer(b.dmg,'bullet',Math.atan2(b.vy,b.vx),120);}
     }else if(U.pointInOBB(b.x,b.y,p.driving.obb)){
      dead=true;p.driving.hp-=b.dmg;
      if(p.driving.hp<=0)this.explode(p.driving.x,p.driving.y,170,300,false);
     }
     if(!dead)for(const pd of this.peds){
      if(pd.dead)continue;
      if(U.dist2(b.x,b.y,pd.x,pd.y)<(pd.r+3)*(pd.r+3)){dead=true;this.damageHuman(pd,b.dmg,'enemy',Math.atan2(b.vy,b.vx),140);break;}
     }
    }
   }
   if(dead)this.bullets.splice(this.bullets.indexOf(b),1);
  }
 }
 updateParticles(dt){
  for(const pt of [...this.particles]){
   pt.life-=dt;
   pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;
   pt.vx*=Math.pow(0.01,dt);pt.vy*=Math.pow(0.01,dt);
   if(pt.life<=0)this.particles.splice(this.particles.indexOf(pt),1);
  }
  if(this.particles.length>600)this.particles.splice(0,this.particles.length-600);
 }
 nearestInteract(){
  const p=this.player;
  if(this.inside)return this.insideInteract();
  if(p.driving)return {label:'E : sortir de la voiture  |  Clic : klaxon',act:()=>this.exitCar()};
  let bb=null,bd=1e18;
  for(const b of this.world.buildings){
   const d=U.dist(p.x,p.y,b.door.x,b.door.y);
   if(d<bd){bd=d;bb=b;}
  }
  let bc=null,cd=1e18;
  for(const c of this.cars){
   if(c.dead)continue;
   for(const dp of c.doorPoints()){
    const d=U.dist(p.x,p.y,dp.x,dp.y);
    if(d<cd){cd=d;bc=c;}
   }
  }
  let bm=null,md=1e18;
  for(const m of this.missions.list){
   if(m.state!=='available')continue;
   const d=U.dist(p.x,p.y,m.booth.x,m.booth.y);
   if(d<md){md=d;bm=m;}
  }
  const cands=[];
  if(bd<42){
   const isM=this.missions.active&&this.missions.active.building===bb;
   cands.push({d:bd,label:isM?'E : entrer (MISSION EN COURS)':'E : entrer dans le bâtiment',act:()=>this.enterBuilding(bb)});
  }
  if(cd<42)cands.push({d:cd,label:bc.ai?'E : voler la voiture':'E : entrer dans la voiture',act:()=>this.enterCar(bc)});
  if(md<48)cands.push({d:md,label:'E : mission « '+bm.def.name+' » (+'+bm.def.reward+'$)',act:()=>this.acceptMission(bm)});
  if(!cands.length)return null;
  cands.sort((a,b)=>a.d-b.d);
  return cands[0];
 }
 insideInteract(){
  const p=this.player,it=this.inside,inter=it.building.interior;
  const m=it.mission,o=this.obj;
  if(m&&o){
   if(o.hostage&&!o.hostage.dead&&!o.hostage.freed&&U.dist(p.x,p.y,o.hostage.x,o.hostage.y)<34)
    return {label:'E : libérer l\'otage',act:()=>{o.hostage.freed=true;this._hostageFreed=true;this.setMsg('Otage libéré ! Escortez-le dehors.');AudioSys.pickup();}};
   if(o.item&&!o.item.taken&&U.dist(p.x,p.y,o.item.x,o.item.y)<30)
    return {label:'E : prendre la mallette',act:()=>{o.item.taken=true;this._itemTaken=true;this.setMsg('Mallette récupérée ! Ressortez.');AudioSys.pickup();}};
   if(o.device&&!o.device.armed&&!o.device.done&&U.dist(p.x,p.y,o.device.x,o.device.y)<34)
    return {label:'E : armer le dispositif',act:()=>{o.device.armed=true;o.device.fuse=3;this.setMsg('3 secondes... éloignez-vous !');AudioSys.reload();}};
  }
  if(U.dist(p.x,p.y,inter.entry.x,inter.entry.y)<42)return {label:'E : sortir',act:()=>this.exitBuilding()};
  return null;
 }
 interact(){
  if(!this.pressed('KeyE'))return;
  const it=this.nearestInteract();
  if(it)it.act();
 }
 enterCar(c){
  if(c.ai&&c.ai.mode==='traffic'){
   const dp=c.doorPoints()[0];
   this.peds.push(new E.Ped({x:dp.x,y:dp.y,color:'#e59866',fleeT:3,fx:c.x,fy:c.y}));
   this.addWanted(1);
   this.setMsg('Voiture volée !');
   AudioSys.horn();
  }
  c.ai=null;c.driver=this.player;
  this.player.driving=c;
  AudioSys.door();
 }
 exitCar(){
  const c=this.player.driving;
  if(!c)return;
  c.speed=0;c.driver=null;
  const p=this.player;
  const px=Math.cos(c.ang+Math.PI/2),py=Math.sin(c.ang+Math.PI/2);
  let placed=false;
  for(const s of [1,-1]){
   const nx=c.x+px*(c.w/2+16)*s,ny=c.y+py*(c.w/2+16)*s;
   let bad=false;
   for(const sol of this.world.solids)if(U.circleRect(nx,ny,p.r,sol)){bad=true;break;}
   if(!bad){p.x=nx;p.y=ny;placed=true;break;}
  }
  if(!placed){p.x=c.x;p.y=c.y;}
  p.driving=null;
  AudioSys.door();
 }
 enterBuilding(b){
  if(!b.interior)World.makeInterior(b);
  const mission=(this.missions.active&&this.missions.active.building===b)?this.missions.active:null;
  this.inside={building:b,mission};
  const inter=b.interior;
  this.player.x=inter.entry.x;this.player.y=inter.entry.y;
  this.player.kx=0;this.player.ky=0;
  this.bullets.length=0;
  if(mission)this.startMissionInterior(mission);
  else if(Math.random()<0.55){
   const lp=U.choice(inter.loot);
   this.pickups.push({x:lp.x,y:lp.y,kind:Math.random()<0.5?'money':'ammo',sub:'pistol',amount:U.irand(40,120),bob:0});
  }
  AudioSys.door();
 }
 exitBuilding(){
  const b=this.inside.building,m=this.inside.mission;
  this.player.x=b.door.x;this.player.y=b.door.y;
  this.player.kx=0;this.player.ky=0;
  this.inside=null;this.obj=null;
  this.bullets.length=0;
  this.enemies=this.enemies.filter(e=>!e.room);
  this.peds=this.peds.filter(e=>!e.room);
  if(m){
   if(m.def.type==='retrieve'&&this._itemTaken)this.completeMission(m);
   else if(m.def.type==='rescue'&&this._hostageFreed)this.completeMission(m);
  }
  this._itemTaken=false;this._hostageFreed=false;
  AudioSys.door();
 }
 startMissionInterior(m){
  const b=m.building,inter=b.interior;
  m.roomEnemies=[];
  const def=m.def,spawns=inter.spawns;
  const mk=(i,kind,weapon)=>{
   const s=spawns[i%spawns.length];
   const e=new E.Enemy({x:s.x,y:s.y,kind,weapon,room:true,alert:true});
   if(weapon==='melee')e.hp=120;
   else if(kind==='cop')e.hp=75;
   m.roomEnemies.push(e);
   this.enemies.push(e);
   return e;
  };
  if(def.type==='killall'){
   for(let i=0;i<def.count;i++)mk(i,Math.random()<0.25?'cop':'gang',Math.random()<0.45?'melee':'pistol');
   this.obj={};
  }else if(def.type==='retrieve'){
   const s=spawns[spawns.length-1];
   this.obj={item:{x:s.x,y:s.y,taken:false}};
   mk(0,'gang','pistol');mk(1,'gang','pistol');
  }else if(def.type==='rescue'){
   const s=spawns[spawns.length-1];
   const h=new E.Ped({x:s.x,y:s.y,kind:'hostage',room:true,color:'#f8c471'});
   this.peds.push(h);
   this.obj={hostage:h};
   mk(0,'gang','melee');mk(1,'gang','pistol');mk(2,'gang','pistol');
  }else if(def.type==='destroy'){
   const s=spawns[spawns.length-1];
   this.obj={device:{x:s.x,y:s.y,armed:false,fuse:0,done:false}};
   mk(0,'cop','pistol');mk(1,'gang','melee');
  }
  this.setMsg('Mission : '+def.desc);
 }
 acceptMission(m){
  if(this.missions.active)return;
  m.state='active';
  this.missions.active=m;
  this.setMsg('Mission « '+m.def.name+' » acceptée : '+m.def.desc);
  AudioSys.pickup();
 }
 completeMission(m){
  if(m.state!=='active')return;
  m.state='done';
  if(this.missions.active===m)this.missions.active=null;
  this.player.money+=m.def.reward;
  this.setMsg('MISSION RÉUSSIE : +'+m.def.reward+'$');
  AudioSys.pickup();
 }
 failMission(msg){
  const m=this.missions.active;
  if(m){m.state='failed';this.missions.active=null;}
  if(msg)this.setMsg('MISSION ÉCHOUÉE : '+msg);
 }
 render(){this.renderer.draw(this);}
 updateHUD(){
  const get=id=>{if(!this._h[id])this._h[id]=document.getElementById(id);return this._h[id];};
  const p=this.player;
  const hpFill=get('hpFill');
  if(hpFill)hpFill.style.width=Math.max(0,100*p.hp/p.maxhp)+'%';
  const set=(id,v)=>{const el=get(id);if(el&&el.textContent!==v)el.textContent=v;};
  set('hpText',Math.max(0,Math.ceil(p.hp))+' PV');
  set('weapName',WEAPONS[p.weapon].name);
  set('ammoText',p.weapon==='fists'?'--':String(p.weapons[p.weapon].ammo));
  set('moneyText','$ '+p.money);
  set('starsText','\u2605'.repeat(this.wanted)+'\u2606'.repeat(5-this.wanted));
  const m=this.missions.active;
  set('objectiveText',m?('\u25B6 '+m.def.name+' : '+m.def.desc):'');
  const it=this.state==='playing'?this.nearestInteract():null;
  set('promptText',it?it.label:'');
  set('msgText',this.msg.t>0?this.msg.text:'');
 }
}
globalThis.Game=Game;
globalThis.WEAPONS=WEAPONS;
})();
