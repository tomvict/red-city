(function(){
class Renderer{
 constructor(canvas){
  this.canvas=canvas;
  this.ctx=canvas.getContext('2d');
  this.worldImg=null;this.decalImg=null;this.decalCtx=null;
  this.mm=null;this.mmBase=null;
 }
 prerender(world){
  const c=document.createElement('canvas');
  c.width=world.W;c.height=world.H;
  const x=c.getContext('2d');
  const W=world.W,H=world.H,P=world.PITCH,R=world.ROAD,B=world.BLOCK,N=world.N;
  x.fillStyle='#4c5142';x.fillRect(0,0,W,H);
  x.fillStyle='#26282c';
  for(let i=0;i<=N;i++){x.fillRect(i*P,0,R,H);x.fillRect(0,i*P,W,R);}
  for(let bi=0;bi<N;bi++)for(let bj=0;bj<N;bj++){
   x.fillStyle='#5b6052';
   x.fillRect(bi*P+R,bj*P+R,B,B);
  }
  x.strokeStyle='rgba(216,198,106,0.8)';x.lineWidth=4;x.setLineDash([26,30]);
  for(let i=0;i<=N;i++){
   x.beginPath();x.moveTo(i*P+R/2,0);x.lineTo(i*P+R/2,H);x.stroke();
   x.beginPath();x.moveTo(0,i*P+R/2);x.lineTo(W,i*P+R/2);x.stroke();
  }
  x.setLineDash([]);
  x.fillStyle='rgba(255,255,255,0.22)';
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
   for(let k=0;k<4;k++){
    x.fillRect(i*P+10+k*32,j*P+R-16,16,10);
    x.fillRect(i*P+R-16,j*P+10+k*32,10,16);
   }
  }
  for(const lot of world.lots){
   x.fillStyle='#2c2e33';x.fillRect(lot.x,lot.y,lot.w,lot.h);
   x.strokeStyle='rgba(255,255,255,0.35)';x.lineWidth=2;
   for(let lx=lot.x+14;lx<lot.x+lot.w-10;lx+=28){x.beginPath();x.moveTo(lx,lot.y+6);x.lineTo(lx,lot.y+lot.h-6);x.stroke();}
  }
  for(const pk of world.parks){
   x.fillStyle='#3d6b33';x.fillRect(pk.x,pk.y,pk.w,pk.h);
  }
  for(const t of world.trees){
   x.fillStyle='#5d4037';x.beginPath();x.arc(t.x,t.y,4,0,U.TAU);x.fill();
   x.fillStyle='#2e5228';x.beginPath();x.arc(t.x,t.y,t.r,0,U.TAU);x.fill();
   x.fillStyle='#3f7038';x.beginPath();x.arc(t.x-3,t.y-3,t.r*0.6,0,U.TAU);x.fill();
  }
  for(const b of world.buildings){
   const st=World.TYPE_STYLE[b.type];
   x.fillStyle='rgba(0,0,0,0.4)';x.fillRect(b.x+7,b.y+9,b.w,b.h);
   x.fillStyle=st.wall;x.fillRect(b.x,b.y,b.w,b.h);
   x.fillStyle=st.roof;x.fillRect(b.x+9,b.y+9,b.w-18,b.h-18);
   x.strokeStyle='rgba(0,0,0,0.4)';x.lineWidth=3;x.strokeRect(b.x+9,b.y+9,b.w-18,b.h-18);
   x.strokeStyle='rgba(255,255,255,0.10)';x.lineWidth=2;x.strokeRect(b.x+20,b.y+20,b.w-40,b.h-40);
   if(st.sym){
    x.fillStyle='rgba(0,0,0,0.55)';
    x.font='bold 44px monospace';x.textAlign='center';x.textBaseline='middle';
    x.fillText(st.sym,b.x+b.w/2,b.y+b.h/2+4);
   }
   x.fillStyle='#17171d';
   const d=b.door;
   if(d.side==='n')x.fillRect(d.bx-15,d.by-7,30,14);
   else if(d.side==='s')x.fillRect(d.bx-15,d.by-7,30,14);
   else if(d.side==='w')x.fillRect(d.bx-7,d.by-15,14,30);
   else x.fillRect(d.bx-7,d.by-15,14,30);
  }
  this.worldImg=c;
  const d2=document.createElement('canvas');
  d2.width=world.W;d2.height=world.H;
  this.decalImg=d2;this.decalCtx=d2.getContext('2d');
  const mm=document.createElement('canvas');
  mm.width=168;mm.height=168;
  const mx=mm.getContext('2d'),sc=168/W;
  mx.fillStyle='#0d0d12';mx.fillRect(0,0,168,168);
  mx.fillStyle='#3a3f45';
  for(let i=0;i<=N;i++){mx.fillRect(i*P*sc,0,R*sc,168);mx.fillRect(0,i*P*sc,168,R*sc);}
  for(const b of world.buildings){
   mx.fillStyle=World.TYPE_STYLE[b.type].roof;
   mx.fillRect(b.x*sc,b.y*sc,Math.max(1.5,b.w*sc),Math.max(1.5,b.h*sc));
  }
  this.mmBase=mm;
 }
 addDecal(x,y,r,color){
  if(!this.decalCtx)return;
  const c=this.decalCtx;
  c.fillStyle=color;
  c.beginPath();c.arc(x,y,r,0,U.TAU);c.fill();
  for(let i=0;i<3;i++){c.beginPath();c.arc(x+U.rand(-r,r),y+U.rand(-r,r),r*U.rand(0.3,0.6),0,U.TAU);c.fill();}
 }
 draw(g){
  const x=this.ctx,vw=this.canvas.width,vh=this.canvas.height;
  x.setTransform(1,0,0,1,0,0);
  x.fillStyle='#0b0b10';x.fillRect(0,0,vw,vh);
  if(g.inside)this.drawInterior(g);
  else this.drawWorld(g);
  this.drawMinimap(g);
  if(g.flash>0){
   x.fillStyle='rgba(180,0,0,'+(g.flash*0.45)+')';
   x.fillRect(0,0,vw,vh);
  }
  x.strokeStyle='#ff3355';x.lineWidth=1.5;
  x.beginPath();x.arc(Input.mouse.x,Input.mouse.y,7,0,U.TAU);x.stroke();
  x.fillStyle='#ff3355';x.fillRect(Input.mouse.x-1,Input.mouse.y-1,2,2);
 }
 drawWorld(g){
  const x=this.ctx,vw=this.canvas.width,vh=this.canvas.height;
  const cam=g.cam,shx=U.rand(-g.shake,g.shake),shy=U.rand(-g.shake,g.shake);
  if(this.worldImg){
   x.drawImage(this.worldImg,cam.x,cam.y,vw,vh,0,0,vw,vh);
   if(this.decalImg)x.drawImage(this.decalImg,cam.x,cam.y,vw,vh,0,0,vw,vh);
  }
  x.save();
  x.translate(-cam.x+shx,-cam.y+shy);
  const inView=(e,m)=>e.x>cam.x-m&&e.x<cam.x+vw+m&&e.y>cam.y-m&&e.y<cam.y+vh+m;
  const m=g.missions.active;
  if(m){
   const b=m.building,pulse=0.5+0.5*Math.sin(g.time*6);
   x.strokeStyle='rgba(255,230,80,'+(0.4+0.4*pulse)+')';
   x.lineWidth=3;x.strokeRect(b.x-7,b.y-7,b.w+14,b.h+14);
  }
  for(const b of g.world.booths||[]){}
  for(const bo of g.world.booths){
   const mm=bo.mission;
   if(!mm||mm.state==='done'||mm.state==='failed')continue;
   const pulse=0.5+0.5*Math.sin(g.time*5+bo.x);
   x.fillStyle=mm.state==='active'?'rgba(255,230,80,'+(0.6+0.4*pulse)+')':'rgba(80,220,255,'+(0.5+0.4*pulse)+')';
   x.fillRect(bo.x-11,bo.y-11,22,22);
   x.fillStyle='#111';x.font='bold 15px monospace';x.textAlign='center';x.textBaseline='middle';
   x.fillText('!',bo.x,bo.y+1);
  }
  for(const pk of g.pickups)if(inView(pk,30))this.drawPickup(x,pk);
  for(const co of g.corpses)if(!co.room&&inView(co,40))this.drawCorpse(x,co);
  for(const c of g.cars)if(!c.dead&&inView(c,80))this.drawCar(x,c,g);
  for(const pd of g.peds)if(!pd.dead&&!pd.room&&inView(pd,30))this.drawPed(x,pd);
  for(const e of g.enemies)if(!e.dead&&!e.room&&inView(e,30))this.drawEnemy(x,e);
  if(!g.player.driving&&inView(g.player,30))this.drawPlayer(x,g.player);
  for(const b of g.bullets)if(inView(b,20))this.drawBullet(x,b);
  for(const pt of g.particles)if(inView(pt,20))this.drawParticle(x,pt);
  x.restore();
 }
 drawInterior(g){
  const x=this.ctx,vw=this.canvas.width,vh=this.canvas.height;
  const it=g.inside,b=it.building,inter=b.interior;
  const s=2,cw=vw/s,ch=vh/s;
  const camx=inter.w>cw?U.clamp(g.player.x-cw/2,0,inter.w-cw):(inter.w-cw)/2;
  const camy=inter.h>ch?U.clamp(g.player.y-ch/2,0,inter.h-ch):(inter.h-ch)/2;
  const shx=U.rand(-g.shake,g.shake)/s,shy=U.rand(-g.shake,g.shake)/s;
  x.setTransform(s,0,0,s,-camx*s+shx,-camy*s+shy);
  x.fillStyle='#0b0b10';x.fillRect(camx-10,camy-10,cw+20,ch+20);
  x.fillStyle='#34343f';x.fillRect(0,0,inter.w,inter.h);
  x.strokeStyle='rgba(255,255,255,0.05)';x.lineWidth=1;
  for(let gx=0;gx<=inter.w;gx+=40){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,inter.h);x.stroke();}
  for(let gy=0;gy<=inter.h;gy+=40){x.beginPath();x.moveTo(0,gy);x.lineTo(inter.w,gy);x.stroke();}
  const pulse=0.5+0.5*Math.sin(g.time*5);
  x.fillStyle='rgba(80,255,120,'+(0.35+0.35*pulse)+')';
  x.fillRect(inter.entry.x-18,inter.entry.y-18,36,36);
  for(const sol of inter.solids){
   if(sol.furn){x.fillStyle='#6b4f2a';x.fillRect(sol.x,sol.y,sol.w,sol.h);x.strokeStyle='rgba(0,0,0,0.5)';x.lineWidth=2;x.strokeRect(sol.x,sol.y,sol.w,sol.h);}
   else{x.fillStyle='#8a8a99';x.fillRect(sol.x,sol.y,sol.w,sol.h);x.strokeStyle='#3c3c46';x.lineWidth=2;x.strokeRect(sol.x,sol.y,sol.w,sol.h);}
  }
  const o=g.obj,m=it.mission;
  if(o&&o.item&&!o.item.taken){
   x.fillStyle='#8b5a2b';x.fillRect(o.item.x-9,o.item.y-7,18,14);
   x.strokeStyle='#5e3a1a';x.lineWidth=2;x.strokeRect(o.item.x-9,o.item.y-7,18,14);
   x.fillStyle='rgba(255,230,80,'+(0.5+0.5*pulse)+')';x.font='bold 12px monospace';x.textAlign='center';x.fillText('$',o.item.x,o.item.y-12);
  }
  if(o&&o.device&&!o.device.done){
   const d=o.device;
   x.fillStyle='#2c2c34';x.fillRect(d.x-10,d.y-8,20,16);
   x.fillStyle=d.armed&&Math.floor(g.time*8)%2?'#ff2222':'#661111';
   x.beginPath();x.arc(d.x+5,d.y-3,3,0,U.TAU);x.fill();
   if(d.armed){
    x.fillStyle='#ff5555';x.font='bold 14px monospace';x.textAlign='center';
    x.fillText(Math.max(0,d.fuse).toFixed(1),d.x,d.y-16);
   }
  }
  if(o&&o.hostage&&!o.hostage.dead){
   const h=o.hostage;
   this.drawPed(x,h);
   if(!h.freed){
    x.strokeStyle='#7a5c2e';x.lineWidth=2;
    x.beginPath();x.moveTo(h.x-8,h.y-8);x.lineTo(h.x+8,h.y+8);x.moveTo(h.x+8,h.y-8);x.lineTo(h.x-8,h.y+8);x.stroke();
    x.fillStyle='rgba(255,120,120,'+(0.5+0.5*pulse)+')';x.font='bold 12px monospace';x.textAlign='center';x.fillText('!',h.x,h.y-14);
   }
  }
  for(const co of g.corpses)if(co.room)this.drawCorpse(x,co);
  for(const pd of g.peds)if(!pd.dead&&pd.room&&pd.kind!=='hostage')this.drawPed(x,pd);
  for(const e of g.enemies)if(!e.dead&&e.room)this.drawEnemy(x,e);
  if(!g.player.driving)this.drawPlayer(x,g.player);
  for(const bl of g.bullets)this.drawBullet(x,bl);
  for(const pt of g.particles)this.drawParticle(x,pt);
  x.setTransform(1,0,0,1,0,0);
 }
 drawCar(x,c,g){
  x.save();
  x.translate(c.x,c.y);
  x.rotate(c.ang);
  x.fillStyle='rgba(0,0,0,0.35)';
  x.fillRect(-c.l/2+3,-c.w/2+4,c.l,c.w);
  x.fillStyle=c.dead?'#1a1a1a':c.color;
  x.fillRect(-c.l/2,-c.w/2,c.l,c.w);
  x.fillStyle='rgba(0,0,0,0.25)';
  x.fillRect(-c.l/2,-c.w/2,c.l,4);
  x.fillStyle='#9fd3e8';
  x.fillRect(-c.l*0.08,-c.w/2+4,c.l*0.3,c.w-8);
  x.fillRect(-c.l*0.38,-c.w/2+4,c.l*0.22,c.w-8);
  x.fillStyle='#141414';
  x.fillRect(-c.l/2+4,-c.w/2-3,10,5);
  x.fillRect(-c.l/2+4,c.w/2-2,10,5);
  x.fillRect(c.l/2-14,-c.w/2-3,10,5);
  x.fillRect(c.l/2-14,c.w/2-2,10,5);
  x.fillStyle='#ffe9a3';
  x.fillRect(c.l/2-3,-c.w/2+3,3,5);
  x.fillRect(c.l/2-3,c.w/2-8,3,5);
  x.fillStyle='#c0392b';
  x.fillRect(-c.l/2,-c.w/2+3,3,5);
  x.fillRect(-c.l/2,c.w/2-8,3,5);
  if(c.type==='police'){
   x.fillStyle='#1a5276';x.fillRect(-c.l/2+6,-3,c.l-12,6);
   const on=Math.floor(g.time*8)%2===0;
   x.fillStyle=on?'#ff2222':'#661111';x.fillRect(-4,-c.w/2+5,8,4);
   x.fillStyle=on?'#661111':'#2266ff';x.fillRect(-4,c.w/2-9,8,4);
  }
  if(c.type==='taxi'){
   x.fillStyle='#f7dc6f';x.fillRect(-4,-4,8,8);
  }
  if(c.hp<c.maxHp*0.4){
   x.fillStyle='rgba(30,30,30,0.7)';
   x.fillRect(-c.l/2+6,-c.w/2+8,c.l-12,c.w-16);
  }
  x.restore();
 }
 drawPed(x,p){
  x.fillStyle='rgba(0,0,0,0.3)';
  x.beginPath();x.ellipse(p.x+2,p.y+3,p.r,p.r*0.8,0,0,U.TAU);x.fill();
  x.fillStyle=p.kind==='hostage'&&!p.freed?'#8a6d4b':p.color;
  x.beginPath();x.arc(p.x,p.y,p.r,0,U.TAU);x.fill();
  x.fillStyle='#e8b98d';
  x.beginPath();x.arc(p.x,p.y,p.r*0.52,0,U.TAU);x.fill();
  if(p.hurtT>0){x.fillStyle='rgba(200,0,0,'+(p.hurtT*2)+')';x.beginPath();x.arc(p.x,p.y,p.r,0,U.TAU);x.fill();}
 }
 drawEnemy(x,e){
  x.fillStyle='rgba(0,0,0,0.3)';
  x.beginPath();x.ellipse(e.x+2,e.y+3,e.r,e.r*0.8,0,0,U.TAU);x.fill();
  x.fillStyle=e.kind==='cop'?'#2e86c1':'#7b241c';
  x.beginPath();x.arc(e.x,e.y,e.r,0,U.TAU);x.fill();
  x.fillStyle='#e8b98d';
  x.beginPath();x.arc(e.x,e.y,e.r*0.52,0,U.TAU);x.fill();
  if(e.weapon==='pistol'){
   x.strokeStyle='#1c1c1c';x.lineWidth=3;
   x.beginPath();x.moveTo(e.x,e.y);x.lineTo(e.x+Math.cos(e.ang)*15,e.y+Math.sin(e.ang)*15);x.stroke();
  }else{
   x.strokeStyle='#6e2c00';x.lineWidth=4;
   x.beginPath();x.moveTo(e.x,e.y);x.lineTo(e.x+Math.cos(e.ang+0.6)*14,e.y+Math.sin(e.ang+0.6)*14);x.stroke();
  }
  if(e.hurtT>0){x.fillStyle='rgba(220,0,0,'+(e.hurtT*2.4)+')';x.beginPath();x.arc(e.x,e.y,e.r,0,U.TAU);x.fill();}
 }
 drawPlayer(x,p){
  x.fillStyle='rgba(0,0,0,0.35)';
  x.beginPath();x.ellipse(p.x+2,p.y+3,p.r,p.r*0.8,0,0,U.TAU);x.fill();
  x.fillStyle='#f7dc6f';
  x.beginPath();x.arc(p.x,p.y,p.r,0,U.TAU);x.fill();
  x.fillStyle='#e8b98d';
  x.beginPath();x.arc(p.x,p.y,p.r*0.52,0,U.TAU);x.fill();
  if(p.weapon!=='fists'){
   x.strokeStyle='#1c1c1c';x.lineWidth=3;
   x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x+Math.cos(p.ang)*17,p.y+Math.sin(p.ang)*17);x.stroke();
  }
  if(p.hurtT>0){x.fillStyle='rgba(220,0,0,'+(p.hurtT*2)+')';x.beginPath();x.arc(p.x,p.y,p.r,0,U.TAU);x.fill();}
 }
 drawCorpse(x,co){
  x.save();
  x.translate(co.x,co.y);x.rotate(co.ang);
  x.fillStyle='#5e0b0b';
  x.beginPath();x.ellipse(0,0,10,6,0,0,U.TAU);x.fill();
  x.fillStyle='#4a0808';
  x.beginPath();x.arc(6,0,4,0,U.TAU);x.fill();
  x.restore();
 }
 drawPickup(x,pk){
  const bob=Math.sin(pk.bob||0)*3;
  const x0=pk.x,y0=pk.y+bob;
  if(pk.kind==='weapon'){
   x.fillStyle='#2c3e50';x.fillRect(x0-8,y0-3,16,5);
   x.fillStyle='#1a252f';x.fillRect(x0-2,y0+2,5,6);
  }else if(pk.kind==='ammo'){
   x.fillStyle='#b7950b';x.fillRect(x0-6,y0-5,12,10);
   x.fillStyle='#7e5e0b';x.fillRect(x0-6,y0-5,12,3);
  }else if(pk.kind==='money'){
   x.fillStyle='#27ae60';x.fillRect(x0-7,y0-4,14,8);
   x.fillStyle='#1e8449';x.fillRect(x0-7,y0-4,14,3);
  }else if(pk.kind==='medkit'){
   x.fillStyle='#ecf0f1';x.fillRect(x0-7,y0-6,14,12);
   x.fillStyle='#c0392b';x.fillRect(x0-2,y0-4,4,8);x.fillRect(x0-5,y0-1,10,2);
  }
 }
 drawBullet(x,b){
  x.strokeStyle='rgba(255,230,109,'+Math.min(1,b.life*2)+')';
  x.lineWidth=2;
  x.beginPath();x.moveTo(b.x,b.y);x.lineTo(b.x-b.vx*0.014,b.y-b.vy*0.014);x.stroke();
 }
 drawParticle(x,pt){
  x.globalAlpha=Math.max(0,pt.life/pt.max);
  x.fillStyle=pt.color;
  x.fillRect(pt.x-pt.size/2,pt.y-pt.size/2,pt.size,pt.size);
  x.globalAlpha=1;
 }
 drawMinimap(g){
  if(!g.minimapCanvas)return;
  if(!this.mm)this.mm=g.minimapCanvas.getContext('2d');
  const x=this.mm;
  x.setTransform(1,0,0,1,0,0);
  if(this.mmBase)x.drawImage(this.mmBase,0,0);
  const sc=168/g.world.W;
  x.fillStyle='#50e0ff';
  for(const bo of g.world.booths){
   const mm=bo.mission;
   if(mm&&(mm.state==='available'))x.fillRect(bo.x*sc-2,bo.y*sc-2,4,4);
  }
  const m=g.missions.active;
  if(m){
   const b=m.building,pulse=0.5+0.5*Math.sin(g.time*6);
   x.strokeStyle='rgba(255,230,80,'+(0.5+0.5*pulse)+')';
   x.lineWidth=2;
   x.strokeRect(b.x*sc-2,b.y*sc-2,b.w*sc+4,b.h*sc+4);
  }
  if(!g.inside){
   x.fillStyle='#ff4444';
   for(const e of g.enemies)if(!e.dead&&e.kind==='cop')x.fillRect(e.x*sc-1.5,e.y*sc-1.5,3,3);
   x.fillStyle='#aaaaaa';
   for(const c of g.cars)if(!c.dead&&c.ai&&c.ai.mode==='traffic')x.fillRect(c.x*sc-1,c.y*sc-1,2,2);
  }
  x.save();
  x.translate(g.player.x*sc,g.player.y*sc);
  x.rotate(g.player.ang);
  x.fillStyle='#ffffff';
  x.beginPath();x.moveTo(5,0);x.lineTo(-4,-3.5);x.lineTo(-4,3.5);x.closePath();x.fill();
  x.restore();
 }
}
globalThis.Renderer=Renderer;
})();
