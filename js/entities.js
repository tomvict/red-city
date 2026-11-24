(function(){
const CAR_DEFS={
 sedan:{l:46,w:24,maxHp:100},
 coupe:{l:42,w:22,maxHp:80},
 suv:{l:50,w:27,maxHp:140},
 van:{l:54,w:26,maxHp:120},
 taxi:{l:46,w:24,maxHp:100},
 police:{l:48,w:25,maxHp:120}
};
const CAR_COLORS={
 sedan:['#8e44ad','#2e4053','#922b21','#1e8449','#7d3c98','#566573','#b03a2e'],
 coupe:['#c0392b','#2874a6','#d4ac0d'],
 suv:['#17202a','#6e2c00','#1a5276','#424949'],
 van:['#abb2b9','#808b96','#d5dbdb'],
 taxi:['#f1c40f'],
 police:['#ecf0f1']
};
class Car{
 constructor(o){
  Object.assign(this,{x:0,y:0,ang:0,speed:0,hp:0,driver:null,ai:null,dead:false,type:'sedan',color:'#999'},o||{});
  const d=CAR_DEFS[this.type]||CAR_DEFS.sedan;
  this.l=d.l;this.w=d.w;this.maxHp=d.maxHp;
  if(!this.hp)this.hp=d.maxHp;
 }
 get obb(){return {x:this.x,y:this.y,w:this.l,h:this.w,ang:this.ang};}
 doorPoints(){
  const px=Math.cos(this.ang+Math.PI/2),py=Math.sin(this.ang+Math.PI/2),hw=this.w/2+14;
  return [{x:this.x+px*hw,y:this.y+py*hw},{x:this.x-px*hw,y:this.y-py*hw}];
 }
 update(dt,g){
  if(this.dead)return;
  if(this.driver)this.drive(dt,g);
  else if(this.ai)this.aiDrive(dt,g);
  else this.speed=0;
 }
 drive(dt,g){
  const fwd=(Input.down('KeyW','ArrowUp')?1:0)-(Input.down('KeyS','ArrowDown')?1:0);
  const steer=(Input.down('KeyA','ArrowLeft')?-1:0)+(Input.down('KeyD','ArrowRight')?1:0);
  const maxF=320,maxR=120,accel=300;
  const target=fwd>0?maxF:fwd<0?-maxR:0;
  this.speed+=U.clamp(target-this.speed,-accel*1.6*dt,accel*dt);
  if(target===0)this.speed*=Math.pow(0.02,dt);
  if(Input.down('Space'))this.speed*=Math.pow(0.08,dt);
  const auth=U.clamp(Math.abs(this.speed)/130,0,1);
  this.ang+=steer*2.5*auth*dt*(this.speed>=0?1:-1);
  const nx=this.x+Math.cos(this.ang)*this.speed*dt,ny=this.y+Math.sin(this.ang)*this.speed*dt;
  this.moveTo(nx,ny,g,this.driver===g.player);
  AudioSys.engineSpeed(this.speed);
 }
 aiDrive(dt,g){
  const a=this.ai;
  if(a.mode==='hunt'){
   const p=g.player,d=U.dist(this.x,this.y,p.x,p.y);
   this.ang=Math.atan2(p.y-this.y,p.x-this.x);
   if(d>300){this.moveTo(this.x+Math.cos(this.ang)*a.cruise*dt,this.y+Math.sin(this.ang)*a.cruise*dt,g,false);this.speed=a.cruise;}
   else if(!a.ejected){
    a.ejected=true;
    for(let i=0;i<2;i++)g.enemies.push(new Enemy({x:this.x+U.rand(-22,22),y:this.y+U.rand(-22,22),kind:'cop',weapon:'pistol',speed:125,alert:true}));
    AudioSys.horn();
   }
   return;
  }
  a.speed=U.lerp(a.speed,a.targetSpeed,dt*2);
  this.speed=a.speed;
  if(a.axis==='v'){
   this.ang=a.dir>0?Math.PI/2:-Math.PI/2;
   const laneX=a.band*World.PITCH+World.ROAD/2+a.lane*36;
   this.x+=(laneX-this.x)*Math.min(1,dt*4);
   this.y+=a.dir*a.speed*dt;
   const mod=((this.y%World.PITCH)+World.PITCH)%World.PITCH;
   if(mod>World.ROAD/2-14&&mod<World.ROAD/2+14&&Math.random()<dt*1.5){
    a.axis='h';a.band=U.clamp(Math.round(this.y/World.PITCH),0,World.N);
    a.dir=Math.random()<0.5?1:-1;a.lane=Math.random()<0.5?1:-1;
   }
  }else{
   this.ang=a.dir>0?0:Math.PI;
   const laneY=a.band*World.PITCH+World.ROAD/2+a.lane*36;
   this.y+=(laneY-this.y)*Math.min(1,dt*4);
   this.x+=a.dir*a.speed*dt;
   const mod=((this.x%World.PITCH)+World.PITCH)%World.PITCH;
   if(mod>World.ROAD/2-14&&mod<World.ROAD/2+14&&Math.random()<dt*1.5){
    a.axis='v';a.band=U.clamp(Math.round(this.x/World.PITCH),0,World.N);
    a.dir=Math.random()<0.5?1:-1;a.lane=Math.random()<0.5?1:-1;
   }
  }
  this.x=U.clamp(this.x,World.ROAD+30,World.W-World.ROAD-30);
  this.y=U.clamp(this.y,World.ROAD+30,World.H-World.ROAD-30);
  const ax=this.x+Math.cos(this.ang)*72,ay=this.y+Math.sin(this.ang)*72;
  let blocked=false;
  for(const c of g.cars){if(c===this||c.dead)continue;if(U.dist2(ax,ay,c.x,c.y)<55*55){blocked=true;break;}}
  if(!blocked)for(const e of g.humans()){if(e.dead)continue;if(U.dist2(ax,ay,e.x,e.y)<46*46){blocked=true;break;}}
  if(!blocked){const p=g.player;const dc=p.driving;if(dc&&U.dist2(ax,ay,dc.x,dc.y)<62*62)blocked=true;else if(!dc&&U.dist2(ax,ay,p.x,p.y)<50*50)blocked=true;}
  a.targetSpeed=blocked?0:a.cruise;
  if(blocked&&Math.random()<dt*0.4)AudioSys.horn();
  for(const c of g.cars){
   if(c===this||c.dead)continue;
   if(U.obbOverlap(this.obb,c.obb)){
    this.speed=0;c.speed=0;this.hp-=5;c.hp-=5;
    if(c.hp<=0)g.explode(c.x,c.y,170,300,false);
    if(this.hp<=0)g.explode(this.x,this.y,170,300,false);
    break;
   }
  }
 }
 moveTo(nx,ny,g,isPlayer){
  const ox=this.x,oy=this.y;
  this.x=nx;this.y=ny;
  for(const s of g.solids()){
   if(U.obbOverlap(this.obb,U.rectOBB(s))){
    this.x=ox;this.y=oy;
    const imp=Math.abs(this.speed);
    if(imp>150){
     const dmg=(imp-150)*0.15;
     this.hp-=dmg;
     if(isPlayer&&g.player.driving===this)g.damagePlayer(dmg*0.4,'crash',this.ang+Math.PI,60);
     g.addShake(U.clamp(imp*0.02,2,9));
     AudioSys.meleeHit();
     if(this.hp<=0)g.explode(this.x,this.y,170,300,isPlayer);
    }
    this.speed*=-0.35;
    return;
   }
  }
  for(const c of g.cars){
   if(c===this||c.dead)continue;
   if(U.obbOverlap(this.obb,c.obb)){
    const dmg=Math.abs(this.speed)*0.05+8;
    this.hp-=dmg;c.hp-=dmg;this.speed*=0.55;
    const dx=c.x-this.x,dy=c.y-this.y,d=Math.hypot(dx,dy)||1;
    c.x+=dx/d*6;c.y+=dy/d*6;
    if(this.hp<=0)g.explode(this.x,this.y,170,300,isPlayer);
    if(c.hp<=0)g.explode(c.x,c.y,170,300,isPlayer);
    return;
   }
  }
  for(const e of g.humans()){
   if(e.dead)continue;
   if(e===g.player&&g.player.driving)continue;
   if(U.circleOBB(e.x,e.y,e.r,this.obb)){g.runOver(e,this);this.speed*=0.86;}
  }
 }
}
class Player{
 constructor(o){
  Object.assign(this,{x:0,y:0,r:9,ang:0,hp:100,maxhp:100,money:0,weapon:'fists',
   weapons:{fists:{ammo:Infinity},pistol:{ammo:36},shotgun:{ammo:0},smg:{ammo:0}},
   attackCd:0,hurtT:0,driving:null,kx:0,ky:0},o||{});
 }
 update(dt,g){
  this.attackCd-=dt;this.hurtT-=dt;
  if(this.driving){
   const c=this.driving;
   c.update(dt,g);
   this.x=c.x;this.y=c.y;this.ang=c.ang;
   this.kx*=Math.pow(0.001,dt);this.ky*=Math.pow(0.001,dt);
   return;
  }
  const mv=Input.moveVec(),sp=190;
  const vx=mv.x*sp+this.kx,vy=mv.y*sp+this.ky;
  const solids=g.solids();
  this.x+=vx*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.x-=vx*dt;break;}
  this.y+=vy*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.y-=vy*dt;break;}
  if(!g.inside){
   for(const c of g.cars){
    if(c.dead)continue;
    if(U.circleOBB(this.x,this.y,this.r,c.obb)){
     const dx=this.x-c.x,dy=this.y-c.y,d=Math.hypot(dx,dy)||1;
     this.x=c.x+dx/d*(this.r+c.w/2+2);this.y=c.y+dy/d*(this.r+c.w/2+2);
    }
   }
  }
  this.kx*=Math.pow(0.0001,dt);this.ky*=Math.pow(0.0001,dt);
  const mw=g.mouseWorld();
  this.ang=Math.atan2(mw.y-this.y,mw.x-this.x);
  if(Input.mouse.down&&this.attackCd<=0)g.playerAttack();
 }
}
class Ped{
 constructor(o){
  Object.assign(this,{x:0,y:0,r:8,hp:30,dead:false,kind:'ped',color:'#cccccc',sp:60,tx:null,ty:null,wanderT:0,fleeT:0,fx:0,fy:0,kx:0,ky:0,hurtT:0,room:false,freed:false,ang:0},o||{});
 }
 moveLike(a,sp,dt,g){
  const solids=g.solids();
  this.x+=Math.cos(a)*sp*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.x-=Math.cos(a)*sp*dt;break;}
  this.y+=Math.sin(a)*sp*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.y-=Math.sin(a)*sp*dt;break;}
  this.x+=this.kx*dt;this.y+=this.ky*dt;
  this.kx*=Math.pow(0.0001,dt);this.ky*=Math.pow(0.0001,dt);
  this.ang=a;
 }
 update(dt,g){
  if(this.dead)return;
  this.hurtT-=dt;this.wanderT-=dt;this.fleeT-=dt;
  if(this.kind==='hostage'&&!this.freed)return;
  if(g.noiseNear(this.x,this.y,260)&&this.fleeT<=0){
   this.fleeT=2.4;
   const n=g.nearestNoise(this.x,this.y);
   if(n){this.fx=n.x;this.fy=n.y;}
  }
  const p=g.player,dc=p.driving;
  if(!g.inside&&dc&&Math.abs(dc.speed)>60&&U.dist(this.x,this.y,dc.x,dc.y)<70&&this.fleeT<=0){this.fleeT=2;this.fx=dc.x;this.fy=dc.y;}
  if(this.fleeT>0)this.moveLike(Math.atan2(this.y-this.fy,this.x-this.fx),150,dt,g);
  else{
   if(this.wanderT<=0){
    this.wanderT=U.rand(2,4);
    if(g.inside){this.tx=U.rand(30,g.inside.building.interior.w-30);this.ty=U.rand(30,g.inside.building.interior.h-30);}
    else{const pt=g.world.randomSidewalkPoint();this.tx=pt.x;this.ty=pt.y;}
   }
   if(this.tx!==null&&this.tx!==undefined)this.moveLike(Math.atan2(this.ty-this.y,this.tx-this.x),this.sp,dt,g);
  }
 }
}
class Enemy{
 constructor(o){
  Object.assign(this,{x:0,y:0,r:9,hp:55,dead:false,kind:'gang',weapon:'pistol',ang:0,speed:100,
   shootCd:U.rand(0.4,1.1),meleeCd:0,wanderT:0,tx:null,ty:null,alert:false,room:false,kx:0,ky:0,hurtT:0},o||{});
  if(this.kind==='cop')this.speed=125;
 }
 moveToward(tx,ty,sp,dt,g){
  const a=Math.atan2(ty-this.y,tx-this.x);
  const solids=g.solids();
  this.x+=Math.cos(a)*sp*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.x-=Math.cos(a)*sp*dt;break;}
  this.y+=Math.sin(a)*sp*dt;
  for(const s of solids)if(U.circleRect(this.x,this.y,this.r,s)){this.y-=Math.sin(a)*sp*dt;break;}
  this.x+=this.kx*dt;this.y+=this.ky*dt;
  this.kx*=Math.pow(0.0001,dt);this.ky*=Math.pow(0.0001,dt);
  this.ang=a;
 }
 update(dt,g){
  if(this.dead)return;
  this.shootCd-=dt;this.meleeCd-=dt;this.wanderT-=dt;this.hurtT-=dt;
  const p=g.player,d=U.dist(this.x,this.y,p.x,p.y);
  if(!this.alert){
   if(this.room)this.alert=true;
   else if(this.kind==='cop'&&g.wanted>0)this.alert=true;
   else if(g.noiseNear(this.x,this.y,480))this.alert=true;
   else if(d<360&&g.los(this.x,this.y,p.x,p.y))this.alert=true;
  }
  if(this.alert){
   const los=g.los(this.x,this.y,p.x,p.y);
   if(this.weapon==='melee'){
    if(d>42)this.moveToward(p.x,p.y,this.speed,dt,g);
    else{
     this.ang=Math.atan2(p.y-this.y,p.x-this.x);
     if(this.meleeCd<=0){this.meleeCd=0.8;g.enemyMelee(this);}
    }
   }else{
    if(los&&d<460&&this.shootCd<=0)g.enemyShoot(this);
    if(d>300||!los)this.moveToward(p.x,p.y,this.speed,dt,g);
    else if(d<150)this.moveToward(2*this.x-p.x,2*this.y-p.y,this.speed*0.8,dt,g);
   }
  }else{
   if(this.wanderT<=0){
    this.wanderT=U.rand(1.5,3.5);
    this.tx=this.x+U.rand(-130,130);this.ty=this.y+U.rand(-130,130);
   }
   if(this.tx!==null&&this.tx!==undefined)this.moveToward(this.tx,this.ty,this.speed*0.45,dt,g);
  }
 }
}
globalThis.E={Car,Player,Ped,Enemy,CAR_DEFS,CAR_COLORS};
})();
