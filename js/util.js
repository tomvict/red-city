(function(){
const TAU=Math.PI*2;
const U={
 TAU,
 clamp:(v,a,b)=>v<a?a:v>b?b:v,
 lerp:(a,b,t)=>a+(b-a)*t,
 rand:(a,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a),
 irand:(a,b)=>Math.floor(U.rand(a,b+1)),
 choice:(arr)=>arr[Math.floor(Math.random()*arr.length)],
 dist:(ax,ay,bx,by)=>Math.hypot(bx-ax,by-ay),
 dist2:(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay;return dx*dx+dy*dy;},
 angleTo:(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax),
 angDiff:(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;},
 pointInRect:(x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h,
 rectsOverlap:(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,
 segRect:(x1,y1,x2,y2,r)=>{
  let tmin=0,tmax=1;const dx=x2-x1,dy=y2-y1;
  if(Math.abs(dx)<1e-9){if(x1<r.x||x1>r.x+r.w)return false;}
  else{let t1=(r.x-x1)/dx,t2=(r.x+r.w-x1)/dx;if(t1>t2){const t=t1;t1=t2;t2=t;}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return false;}
  if(Math.abs(dy)<1e-9){if(y1<r.y||y1>r.y+r.h)return false;}
  else{let t1=(r.y-y1)/dy,t2=(r.y+r.h-y1)/dy;if(t1>t2){const t=t1;t1=t2;t2=t;}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return false;}
  return true;
 },
 rectCorners:(x,y,w,h,ang)=>{
  const c=Math.cos(ang),s=Math.sin(ang),hx=w/2,hy=h/2;
  return [{x:x-hx*c+hy*s,y:y-hx*s-hy*c},{x:x+hx*c+hy*s,y:y+hx*s-hy*c},{x:x+hx*c-hy*s,y:y+hx*s+hy*c},{x:x-hx*c-hy*s,y:y-hx*s+hy*c}];
 },
 pointInOBB:(px,py,o)=>{
  const c=Math.cos(-o.ang),s=Math.sin(-o.ang),dx=px-o.x,dy=py-o.y;
  const lx=dx*c-dy*s,ly=dx*s+dy*c;
  return Math.abs(lx)<=o.w/2&&Math.abs(ly)<=o.h/2;
 },
 obbOverlap:(a,b)=>{
  const ca=U.rectCorners(a.x,a.y,a.w,a.h,a.ang||0),cb=U.rectCorners(b.x,b.y,b.w,b.h,b.ang||0);
  const axes=[];
  for(const pts of [ca,cb])for(let i=0;i<2;i++){const p1=pts[i],p2=pts[(i+1)%4];const ex=p2.x-p1.x,ey=p2.y-p1.y;const l=Math.hypot(ex,ey);axes.push({x:-ey/l,y:ex/l});}
  for(const ax of axes){
   let minA=1e18,maxA=-1e18,minB=1e18,maxB=-1e18;
   for(const p of ca){const d=p.x*ax.x+p.y*ax.y;if(d<minA)minA=d;if(d>maxA)maxA=d;}
   for(const p of cb){const d=p.x*ax.x+p.y*ax.y;if(d<minB)minB=d;if(d>maxB)maxB=d;}
   if(maxA<minB||maxB<minA)return false;
  }
  return true;
 },
 circleOBB:(cx,cy,r,o)=>U.pointInOBB(cx,cy,{x:o.x,y:o.y,w:o.w+r*2,h:o.h+r*2,ang:o.ang||0}),
 rectOBB:(r)=>({x:r.x+r.w/2,y:r.y+r.h/2,w:r.w,h:r.h,ang:0}),
 circleRect:(cx,cy,r,rc)=>{
  const nx=U.clamp(cx,rc.x,rc.x+rc.w),ny=U.clamp(cy,rc.y,rc.y+rc.h);
  return U.dist2(cx,cy,nx,ny)<=r*r;
 },
 store:{
  _m:{},
  get(k,d){try{if(typeof localStorage!=='undefined'&&localStorage.getItem(k)!==null)return localStorage.getItem(k);}catch(e){}return k in this._m?this._m[k]:d;},
  set(k,v){this._m[k]=String(v);try{if(typeof localStorage!=='undefined')localStorage.setItem(k,String(v));}catch(e){}}
 }
};
globalThis.U=U;
})();
