import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(process.env.TICKET_CANVAS_PACKAGE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/package.json');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf','Ticket Ink');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const back=await loadImage(path.join(root,'site/ticket/bilet_oborot.png'));
const W=1870,H=841,OW=1280,OH=576,FPS=24,SECONDS=12;
const canvas=createCanvas(OW,OH),ctx=canvas.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function draw(t){
 ctx.setTransform(OW/W,0,0,OH/H,0,0);ctx.globalAlpha=1;ctx.drawImage(back,0,0,W,H);
 const amount=smooth((t-.9)/1.1)*(1-smooth((t-9.7)/1.1));if(!amount)return;
 // Ink travels across the engraved letter; the handwritten name and bar mark stay still.
 ctx.save();ctx.beginPath();ctx.rect(648,162,676,598);ctx.clip();
 const words='ТЕБЯ ЖДУТ В ШКОЛЕ ВОЛШЕБСТВА';
 ctx.font='bold 35px "Ticket Ink"';ctx.textBaseline='middle';
 const lead=1070-(t-1)*39;
 for(let i=0;i<words.length;i++){
   const distance=lead+i*24;
   const x=690+((distance%560)+560)%560;
   const y=624+Math.sin((distance/560)*Math.PI*2)*42;
   ctx.save();ctx.translate(x,y);ctx.rotate(Math.cos((distance/560)*Math.PI*2)*.12);
   ctx.globalAlpha=amount*.94;ctx.fillStyle='#efd5a7';ctx.strokeStyle='#472e20';ctx.lineWidth=1;
   ctx.strokeText(words[i],0,0);ctx.fillText(words[i],0,0);ctx.restore();
 }
 // A small paper invitation glides out of the envelope and settles back.
 const f=amount*.68,q=t*.5;
 ctx.save();ctx.translate(1100+Math.sin(q)*90,385-Math.sin(q*.7)*45);ctx.rotate(-.12+Math.sin(q)*.05);ctx.globalAlpha=f;
 ctx.fillStyle='#eed4a7';ctx.strokeStyle='#6f4c2c';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-67,-39);ctx.lineTo(68,-39);ctx.lineTo(68,40);ctx.lineTo(-67,40);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-67,-39);ctx.lineTo(0,8);ctx.lineTo(68,-39);ctx.stroke();
 ctx.fillStyle='#6c2722';ctx.beginPath();ctx.arc(0,8,12,0,Math.PI*2);ctx.fill();
 ctx.restore();ctx.restore();ctx.globalAlpha=1;
}
const dest=path.join(root,'site/ticket/bilet_oborot_ozhivaet.mp4');
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${OW}x${OH}`,'-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',dest],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<FPS*SECONDS;i++){
 draw(i/FPS);const rgba=ctx.getImageData(0,0,OW,OH).data;
 if(!ff.stdin.write(Buffer.from(rgba)))await once(ff.stdin,'drain');
}
ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)throw new Error(`FFmpeg ${code}`);
console.log(JSON.stringify({path:dest,width:OW,height:OH,fps:FPS,duration:SECONDS}));
