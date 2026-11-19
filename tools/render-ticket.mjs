import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(process.env.TICKET_CANVAS_PACKAGE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/package.json');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf','Ticket Serif');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ticket=await loadImage(path.join(root,'site/ticket/bilet_yolka.png'));
const clean=await loadImage(path.join(root,'design/ticket/motion-clean.png'));
const W=1870,H=841,OW=1280,OH=576,FPS=24,SECONDS=12;
const source=createCanvas(W,H),sc=source.getContext('2d');sc.drawImage(ticket,0,0);
const pixels=sc.getImageData(0,0,W,H).data;
const canvas=createCanvas(OW,OH),ctx=canvas.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function extractLetters(x0,y0,x1,y1){
  const runs=[];let start=-1;
  for(let x=x0;x<=x1;x++){
    let dark=0;
    if(x<x1)for(let y=y0;y<y1;y++){const i=(y*W+x)*4;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])<125)dark++}
    if(dark>3&&start<0)start=x;
    if(dark<=3&&start>=0){if(x-start>4)runs.push([start,x]);start=-1}
  }
  return runs.map(([x,end])=>{
    const c=createCanvas(end-x,y1-y0),d=c.getContext('2d');
    const data=d.createImageData(end-x,y1-y0);
    for(let yy=y0;yy<y1;yy++)for(let xx=x;xx<end;xx++){
      const i=(yy*W+xx)*4,j=((yy-y0)*(end-x)+(xx-x))*4;
      const ink=1-clamp((Math.max(pixels[i],pixels[i+1],pixels[i+2])-100)/75);
      data.data[j]=pixels[i];data.data[j+1]=pixels[i+1];data.data[j+2]=pixels[i+2];data.data[j+3]=Math.round(ink*255);
    }
    d.putImageData(data,0,0);return {image:c,x,y:y0,w:end-x,h:y1-y0};
  });
}
const groups=[
 {box:[34,161,751,258],letters:extractLetters(34,161,751,258),delay:0,speed:74,scale:1}
];
function paper(x,y,w,h){
  ctx.drawImage(clean,x,y,w,h,x,y,w,h);
}
const pathPoints=[[45,176],[760,176],[900,255],[1210,255],[1325,650],[1285,752],[760,752],[45,752],[45,176]];
const segments=pathPoints.slice(1).map((p,i)=>{const a=pathPoints[i],dx=p[0]-a[0],dy=p[1]-a[1];return {a,p,length:Math.hypot(dx,dy)}});
const total=segments.reduce((n,s)=>n+s.length,0);
function track(distance){
 distance=((distance%total)+total)%total;
 for(const s of segments){if(distance<=s.length){const q=distance/s.length;return {x:s.a[0]+(s.p[0]-s.a[0])*q,y:s.a[1]+(s.p[1]-s.a[1])*q}}distance-=s.length}
 return {x:45,y:176};
}
function steam(t){
 const strength=.4*smooth((t-.3)/1)*(1-smooth((t-10.1)/1.5));if(strength<=0)return;
 ctx.save();ctx.beginPath();ctx.rect(902,125,278,206);ctx.clip();
 for(let i=0;i<4;i++){
  const phase=t*.85+i*1.7;
  ctx.strokeStyle=`rgba(255,242,209,${strength*.65})`;ctx.lineWidth=5-i*.6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(1047+i*12,320);
  ctx.bezierCurveTo(1000+Math.sin(phase)*26,267,1130+Math.cos(phase)*35,234,1042+Math.sin(phase)*40,165);
  ctx.stroke();
 }
 ctx.restore();
}
function draw(t){
 ctx.setTransform(OW/W,0,0,OH/H,0,0);ctx.globalAlpha=1;ctx.drawImage(ticket,0,0,W,H);
 for(const group of groups){
   const local=t-1.5-group.delay;
   const travel=Math.max(0,Math.min(local,6.6));
   const blend=smooth(local/1.3)*(1-smooth((t-9.0)/1.6));
   if(blend<=0)continue;
   const [x0,y0,x1,y1]=group.box;ctx.globalAlpha=blend;paper(x0,y0,x1-x0,y1-y0);ctx.globalAlpha=1;
   for(const letter of group.letters){
     const target=track(letter.x-34+travel*group.speed+(group.delay?1160:0));
     const tx=letter.x+(target.x-letter.x)*blend,ty=letter.y+(target.y-letter.y)*blend;
     ctx.globalAlpha=1;ctx.drawImage(letter.image,tx,ty);
   }
 }
 steam(t);
 // A tiny illustrated snitch follows a quiet orbit over the central vignette.
 const f=smooth((t-2)/1)*(1-smooth((t-9.7)/1.1));
 if(f>0){
   const x=1050+Math.sin(t*.75)*140,y=400+Math.cos(t*.65)*95;
   ctx.save();ctx.globalAlpha=f*.85;ctx.translate(x,y);ctx.rotate(Math.sin(t)*.12);
   ctx.strokeStyle='#3c2b19';ctx.fillStyle='#b38b49';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*8,0);ctx.quadraticCurveTo(s*30,-22-Math.sin(t*6)*7,s*48,-8);ctx.quadraticCurveTo(s*32,5,s*9,5);ctx.fillStyle='#e7d2a7';ctx.fill();ctx.stroke()}
   ctx.restore();
 }
 ctx.globalAlpha=1;ctx.drawImage(ticket,1652,554,190,190,1652,554,190,190);
}
const dest=path.join(root,'site/ticket/bilet_ozhivaet.mp4');
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${OW}x${OH}`,'-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',dest],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<FPS*SECONDS;i++){
 draw(i/FPS);const rgba=ctx.getImageData(0,0,OW,OH).data;
 if(!ff.stdin.write(Buffer.from(rgba)))await once(ff.stdin,'drain');
 if(i%(FPS*4)===0)console.log(`Rendered ${i/FPS}/${SECONDS}s`);
}
ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)throw new Error(`FFmpeg ${code}`);
console.log(JSON.stringify({path:dest,width:OW,height:OH,fps:FPS,duration:SECONDS,letters:groups.map(g=>g.letters.length)}));
