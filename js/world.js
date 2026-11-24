(function(){
const ROAD=150,BLOCK=360,PITCH=510,N=6;
const W=N*PITCH+ROAD,H=W;
const TYPE_STYLE={
 house:{roof:'#6e5138',wall:'#9c8570',sym:''},
 shop:{roof:'#3d5a80',wall:'#6b8cb8',sym:'$'},
 bar:{roof:'#6c3483',wall:'#a569bd',sym:'~'},
 office:{roof:'#4d5656',wall:'#839192',sym:''},
 warehouse:{roof:'#9a7d0a',wall:'#b7950b',sym:'#'},
 restaurant:{roof:'#922b21',wall:'#cd6155',sym:''},
 bank:{roof:'#626567',wall:'#b2babb',sym:'$'},
 hospital:{roof:'#c0392b',wall:'#f4f6f6',sym:'+'},
 police:{roof:'#1a5276',wall:'#5d6d7e',sym:'\u2605'}
};
const BUILDING_TYPES=['house','house','shop','bar','office','restaurant','warehouse'];
const CAR_POOL=['sedan','sedan','sedan','coupe','suv','van','taxi'];
const World={
 W,H,ROAD,BLOCK,PITCH,N,TYPE_STYLE,
 buildings:[],solids:[],parked:[],trees:[],booths:[],border:[],lots:[],parks:[],
 build(){
  this.buildings=[];this.solids=[];this.parked=[];this.trees=[];this.booths=[];this.lots=[];this.parks=[];
  const specials={'1,1':'hospital','3,4':'police','4,1':'bank'};
  for(let bi=0;bi<N;bi++)for(let bj=0;bj<N;bj++){
   const bx=bi*PITCH+ROAD,by=bj*PITCH+ROAD,key=bi+','+bj;
   if(specials[key]){this.addBlock(bx,by,[{type:specials[key],fx:0.08,fy:0.08,fw:0.84,fh:0.84}]);continue;}
   const roll=Math.random();
   if(roll<0.07){this.park(bx,by);continue;}
   if(roll<0.16){this.parkingLot(bx,by);continue;}
   if(Math.random()<0.45)this.addBlock(bx,by,[{type:U.choice(BUILDING_TYPES),fx:0.07,fy:0.07,fw:0.86,fh:0.86}]);
   else if(Math.random()<0.5)this.addBlock(bx,by,[{type:U.choice(BUILDING_TYPES),fx:0.06,fy:0.06,fw:0.42,fh:0.88},{type:U.choice(BUILDING_TYPES),fx:0.52,fy:0.06,fw:0.42,fh:0.88}]);
   else this.addBlock(bx,by,[{type:U.choice(BUILDING_TYPES),fx:0.06,fy:0.06,fw:0.88,fh:0.42},{type:U.choice(BUILDING_TYPES),fx:0.06,fy:0.52,fw:0.88,fh:0.42}]);
  }
  this.border=[{x:-40,y:-40,w:W+80,h:40},{x:-40,y:H,w:W+80,h:40},{x:-40,y:-40,w:40,h:H+80},{x:W,y:-40,w:40,h:H+80}];
  this.solids=this.solids.concat(this.border);
  this.parkCars();
  return this;
 },
 isRoad(x,y){const mx=((x%PITCH)+PITCH)%PITCH,my=((y%PITCH)+PITCH)%PITCH;return mx<ROAD||my<ROAD;},
 addBlock(bx,by,list){
  for(const f of list){
   const b={x:bx+f.fx*BLOCK,y:by+f.fy*BLOCK,w:f.fw*BLOCK,h:f.fh*BLOCK,type:f.type,id:this.buildings.length,interior:null,burnt:false};
   b.door=this.makeDoor(b);
   this.buildings.push(b);
   this.solids.push({x:b.x,y:b.y,w:b.w,h:b.h,building:b});
  }
 },
 makeDoor(b){
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  const dL=cx-b.x,dR=b.x+b.w-cx,dT=cy-b.y,dB=b.y+b.h-cy;
  const m=Math.min(dL,dR,dT,dB);let side,bx,by;
  if(m===dL){side='w';bx=b.x;by=cy;}
  else if(m===dR){side='e';bx=b.x+b.w;by=cy;}
  else if(m===dT){side='n';bx=cx;by=b.y;}
  else{side='s';bx=cx;by=b.y+b.h;}
  const off={'n':[0,-16],'s':[0,16],'w':[-16,0],'e':[16,0]}[side];
  return {x:bx+off[0],y:by+off[1],side,bx,by};
 },
 park(bx,by){
  this.parks.push({x:bx,y:by,w:BLOCK,h:BLOCK});
  for(let i=0;i<9;i++){
   const t={x:bx+U.rand(26,BLOCK-26),y:by+U.rand(26,BLOCK-26),r:U.rand(9,15)};
   this.trees.push(t);this.solids.push({x:t.x-4,y:t.y-4,w:8,h:8});
  }
 },
 parkingLot(bx,by){this.lots.push({x:bx+18,y:by+18,w:BLOCK-36,h:BLOCK-36});},
 parkCars(){
  for(let i=0;i<=N;i++){
   const rx=i*PITCH,ry=i*PITCH;
   for(let y=ROAD+40;y<H-ROAD-40;y+=U.rand(95,160)){
    if(Math.random()<0.55){
     const side=Math.random()<0.5;
     this.parked.push({x:side?rx+18:rx+ROAD-18,y,ang:-Math.PI/2,type:U.choice(CAR_POOL),color:U.choice(['#8e44ad','#2e4053','#922b21','#1e8449','#7d3c98','#566573','#b03a2e','#2874a6','#d4ac0d'])});
    }
   }
   for(let x=ROAD+40;x<W-ROAD-40;x+=U.rand(95,160)){
    if(Math.random()<0.55){
     const side=Math.random()<0.5;
     this.parked.push({x,y:side?ry+18:ry+ROAD-18,ang:0,type:U.choice(CAR_POOL),color:U.choice(['#8e44ad','#2e4053','#922b21','#1e8449','#7d3c98','#566573','#b03a2e','#2874a6','#d4ac0d'])});
    }
   }
  }
 },
 makeInterior(b){
  const t=16,m=10;
  const ix=b.x+m,iy=b.y+m,iw=Math.max(80,b.w-2*m),ih=Math.max(80,b.h-2*m);
  const solids=[];
  const dlx=U.clamp(b.door.bx-ix,40,iw-40),dly=U.clamp(b.door.by-iy,40,ih-40);
  const gap=70;
  const side=b.door.side;
  if(side==='n'){
   solids.push({x:0,y:-t,w:dlx-gap/2,h:t},{x:dlx+gap/2,y:-t,w:iw-dlx-gap/2,h:t});
   solids.push({x:0,y:ih,w:iw,h:t},{x:-t,y:0,w:t,h:ih},{x:iw,y:0,w:t,h:ih});
  }else if(side==='s'){
   solids.push({x:0,y:-t,w:iw,h:t});
   solids.push({x:0,y:ih,w:dlx-gap/2,h:t},{x:dlx+gap/2,y:ih,w:iw-dlx-gap/2,h:t});
   solids.push({x:-t,y:0,w:t,h:ih},{x:iw,y:0,w:t,h:ih});
  }else if(side==='w'){
   solids.push({x:-t,y:0,w:t,h:dly-gap/2},{x:-t,y:dly+gap/2,w:t,h:ih-dly-gap/2});
   solids.push({x:0,y:-t,w:iw,h:t},{x:0,y:ih,w:iw,h:t},{x:iw,y:0,w:t,h:ih});
  }else{
   solids.push({x:iw,y:0,w:t,h:dly-gap/2},{x:iw,y:dly+gap/2,w:t,h:ih-dly-gap/2});
   solids.push({x:0,y:-t,w:iw,h:t},{x:0,y:ih,w:iw,h:t},{x:-t,y:0,w:t,h:ih});
  }
  if(iw>170&&Math.random()<0.75){
   const wx=U.rand(0.3,0.7)*iw,gy=U.rand(0.25,0.75)*ih;
   solids.push({x:wx-8,y:0,w:16,h:Math.max(0,gy-38)},{x:wx-8,y:gy+38,w:16,h:Math.max(0,ih-gy-38)});
  }
  if(ih>170&&Math.random()<0.6){
   const wy=U.rand(0.3,0.7)*ih,gx=U.rand(0.25,0.75)*iw;
   solids.push({x:0,y:wy-8,w:Math.max(0,gx-38),h:16},{x:gx+38,y:wy-8,w:Math.max(0,iw-gx-38),h:16});
  }
  const entry={'n':{x:dlx,y:t+24},'s':{x:dlx,y:ih-t-24},'w':{x:t+24,y:dly},'e':{x:iw-t-24,y:dly}}[side];
  const furniture=[];
  const nf=U.irand(3,6);
  for(let i=0;i<nf;i++){
   const fw=U.rand(24,60),fh=U.rand(18,44);
   const fx=U.rand(t+8,Math.max(t+9,iw-t-8-fw)),fy=U.rand(t+8,Math.max(t+9,ih-t-8-fh));
   if(U.dist(fx+fw/2,fy+fh/2,entry.x,entry.y)<80)continue;
   const f={x:fx,y:fy,w:fw,h:fh,furn:true};
   furniture.push(f);solids.push(f);
  }
  const spawns=[];
  for(let i=0;i<40&&spawns.length<6;i++){
   const sx=U.rand(t+26,iw-t-26),sy=U.rand(t+26,ih-t-26);
   if(U.dist(sx,sy,entry.x,entry.y)<Math.max(80,Math.max(iw,ih)*0.4))continue;
   let bad=false;
   for(const f of furniture)if(U.pointInRect(sx,sy,{x:f.x-16,y:f.y-16,w:f.w+32,h:f.h+32})){bad=true;break;}
   if(bad)continue;
   spawns.push({x:sx,y:sy});
  }
  if(!spawns.length){
   const cands=[{x:iw*0.25,y:ih*0.25},{x:iw*0.75,y:ih*0.25},{x:iw*0.25,y:ih*0.75},{x:iw*0.75,y:ih*0.75}];
   cands.sort((a,b)=>U.dist(b.x,b.y,entry.x,entry.y)-U.dist(a.x,a.y,entry.x,entry.y));
   spawns.push(cands[0]);
  }
  const loot=[];
  for(let i=0;i<3;i++)loot.push({x:U.rand(t+20,iw-t-20),y:U.rand(t+20,ih-t-20)});
  b.interior={w:iw,h:ih,solids,furniture,spawns,loot,entry,doorSide:side,dlx,dly};
  return b.interior;
 },
 randomSidewalkPoint(){
  for(let i=0;i<60;i++){
   const x=U.rand(ROAD+6,W-ROAD-6),y=U.rand(ROAD+6,H-ROAD-6);
   if(this.isRoad(x,y))continue;
   let inB=false;
   for(const b of this.buildings)if(U.pointInRect(x,y,b)){inB=true;break;}
   if(inB)continue;
   return {x,y};
  }
  return {x:W/2,y:H/2};
 }
};
globalThis.World=World;
})();
