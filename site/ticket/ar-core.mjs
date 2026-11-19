export const LAYOUTS = Object.freeze([
 Object.freeze({width:1870,height:841,photoX:752,photoY:162,photoWidth:636,photoHeight:610}),
 Object.freeze({width:1870,height:841,photoX:640,photoY:158,photoWidth:694,photoHeight:604})
]);
export const POSTER = LAYOUTS[0];
const mul=(m,p)=>[0,1,2,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]*p[3]);
// Marker pixels, y upwards; same centered cover crop as the native camera video.
export function projectPoster(world,projection,marker,input,viewport,layout=POSTER){
 if(![marker.width,marker.height,input.width,input.height,viewport.width,viewport.height].every(n=>n>0&&Number.isFinite(n)))return null;
 const u=marker.width/layout.photoWidth,left=-layout.photoX*u,top=marker.height+layout.photoY*u;
 const scale=Math.max(viewport.width/input.width,viewport.height/input.height),ox=(viewport.width-input.width*scale)/2,oy=(viewport.height-input.height*scale)/2;
 const corners=[[left,top],[left+layout.width*u,top],[left+layout.width*u,top-layout.height*u],[left,top-layout.height*u]].map(([x,y])=>{
  const p=mul(projection,mul(world,[x,y,0,1]));
  return p.every(Number.isFinite)&&p[3]>.00001?{x:(p[0]/p[3]+1)*input.width*scale/2+ox,y:(1-p[1]/p[3])*input.height*scale/2+oy}:null;
 });return corners.every(Boolean)?corners:null;
}
export function posterTransform(points,width=POSTER.width,height=POSTER.height){
 if(!points||points.length!==4||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%4];return sum+p.x*q.y-q.x*p.y},0))/2;if(area<4)return null;
 const rows=[];
 [[0,0],[1,0],[1,1],[0,1]].forEach(([x,y],i)=>{const {x:u,y:v}=points[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v])});
 for(let c=0;c<8;c++){
  let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
  if(Math.abs(rows[pivot][c])<1e-10)return null;
  [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
  const divisor=rows[c][c];for(let i=c;i<9;i++)rows[c][i]/=divisor;
  for(let r=0;r<8;r++){if(r===c)continue;const factor=rows[r][c];for(let i=c;i<9;i++)rows[r][i]-=factor*rows[c][i]}
 }
 const h=rows.map(r=>r[8]),m=[h[0]/width,h[3]/width,0,h[6]/width,h[1]/height,h[4]/height,0,h[7]/height,0,0,1,0,h[2],h[5],0,1];
 return m.every(Number.isFinite)?`matrix3d(${m.join(',')})`:null;
}
export class TrackingGate{
 constructor(grace=550){this.grace=grace;this.clear()}
 clear(){this.pose=null;this.lostAt=null}
 found(pose){this.pose=pose;this.lostAt=null}
 lost(now){if(this.pose&&this.lostAt===null)this.lostAt=now}
 visible(now){return !!this.pose&&(this.lostAt===null||now-this.lostAt<this.grace)}
}
export class MoviePlayback{
 constructor(video,onState=()=>{}){Object.assign(this,{video,onState,active:false,revision:0,revealed:false,blocked:false})}
 seekStart(){try{this.video.currentTime=0}catch{}}
 // Call in the tap handler before metadata, camera or network awaits.
 arm(){this.active=true;this.revealed=false;this.video.muted=this.video.defaultMuted=true;this.video.playsInline=true;this.seekStart();return this.play()}
 play(){
  const revision=++this.revision;this.blocked=false;let result;
  try{result=this.video.play()}catch(e){result=Promise.reject(e)}
  return Promise.resolve(result).then(()=>{
   if(revision!==this.revision){if(!this.active)this.video.pause();return false}
   if(!this.active){this.video.pause();return false}this.onState('playing');return true;
  },error=>{if(revision!==this.revision||!this.active)return false;this.blocked=true;this.onState(error?.name==='NotAllowedError'?'blocked':'error');return false});
 }
 reveal(){if(!this.active||this.revealed)return;this.revealed=true;this.seekStart();if(this.video.paused&&!this.blocked)this.play()}
 restart(){this.seekStart();return this.play()}
 disarm(){this.active=false;++this.revision;this.video.pause()}
}
