import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/package.json');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
for(const [file,name] of [['NotoSerif-Bold.ttf','Magic Serif'],['NotoSerif-Regular.ttf','Magic Regular']])GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/'+file,name);
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const folder=path.join(root,'design/ticket3d/scene2');
const W=960,H=432,FPS=18,SECONDS=24;
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const gate=(t,a,b,fade=.45)=>smooth((t-a)/fade)*(1-smooth((t-b+fade)/fade));
function glow(x,y,r,color,strength=1){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,255,230,${strength*.9})`);g.addColorStop(.18,color.replace('ALPHA',String(strength*.65)));g.addColorStop(1,color.replace('ALPHA','0'));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function label(text,x,y,size,{color='#ffe8ac',align='center',max=W-60}={}){
 ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`bold ${size}px "Magic Serif"`;while(ctx.measureText(text).width>max){size--;ctx.font=`bold ${size}px "Magic Serif"`}
 ctx.shadowBlur=14;ctx.shadowColor='#070d1d';ctx.shadowOffsetY=2;ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
}
function effects(meta,t){
 ctx.globalCompositeOperation='screen';
 for(const [i,p] of meta.candles.entries())if(p[2]&&p[0]>-30&&p[0]<W+30&&p[1]>-30&&p[1]<H+30)glow(p[0],p[1],13+4*Math.sin(t*3+i),`rgba(255,172,62,ALPHA)`,.7);
 if(meta.impact?.[2]){
  const [x,y]=meta.impact;
  for(const [i,p] of meta.wand_tips.entries())if(p[2]){
    const col=i?'#ffc348':'#78d9ff';ctx.strokeStyle=col;ctx.lineWidth=3;ctx.shadowBlur=18;ctx.shadowColor=col;ctx.beginPath();ctx.moveTo(p[0],p[1]);
    for(let j=1;j<=14;j++){const q=j/14;ctx.lineTo(p[0]+(x-p[0])*q+Math.sin(j*2+t*20+i)*6*Math.sin(Math.PI*q),p[1]+(y-p[1])*q+Math.sin(j*1.5+t*24)*6*Math.sin(Math.PI*q))}ctx.stroke();ctx.shadowBlur=0;
    glow(p[0],p[1],25,`rgba(${i?'255,175,40':'65,190,255'},ALPHA)`,.9);
  }
  glow(x,y,60+12*Math.sin(t*16),'rgba(140,210,255,ALPHA)',.9);
  const u=(t*2.5)%1;ctx.strokeStyle=`rgba(255,222,134,${1-u})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,y,12+u*85,7+u*40,0,0,Math.PI*2);ctx.stroke();
  for(let k=0;k<28;k++){const a=k*2.399,u=(t*1.7+k*.033)%1,r=u*115;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.65+u*u*35;glow(xx,yy,3.3,'rgba(255,197,75,ALPHA)',(1-u)*.8)}
 }
 if(meta.cup?.[2]){const p=meta.cup;glow(p[0],p[1],42,'rgba(255,188,75,ALPHA)',.45+.15*Math.sin(t*3))}
 for(let i=0;i<42;i++){const x=(i*193.71+t*9)%W,y=(i*71.2-t*4+H*20)%H;ctx.fillStyle=`rgba(255,221,157,${.2+.15*Math.sin(t+i)})`;ctx.beginPath();ctx.arc(x,y,.6+(i%3)*.25,0,Math.PI*2);ctx.fill()}
 ctx.globalCompositeOperation='source-over';
 // A restrained vignette ties the full 3D camera moves and titles together.
 const vignette=ctx.createRadialGradient(W*.5,H*.48,H*.22,W*.5,H*.48,W*.64);vignette.addColorStop(0,'rgba(3,8,20,0)');vignette.addColorStop(1,'rgba(3,8,20,.55)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 let a=gate(t,.6,4.3,.6);if(a){ctx.globalAlpha=a;label('НОВЫЙ ГОД В ХОГВАРТСЕ',W/2,H*.17,35);label('В стиле Гарри Поттера',W/2,H*.28,19,{color:'#fff2d2'});ctx.globalAlpha=1}
 a=gate(t,5.6,8.6);if(a){ctx.globalAlpha=a;label('РАСПРЕДЕЛЯЮЩАЯ ШЛЯПА',W/2,H*.88,26);ctx.globalAlpha=1}
 a=gate(t,9.2,11);if(a){ctx.globalAlpha=a;label('ЛЮМОС!',W*.17,H*.82,40,{color:'#c2f1ff'});ctx.globalAlpha=1}
 a=gate(t,11.2,13.2);if(a){ctx.globalAlpha=a;label('ЭКСПЕЛЛИАРМУС!',W/2,H*.88,28,{color:'#fff0aa'});ctx.globalAlpha=1}
 a=gate(t,13.3,17.2);if(a){ctx.globalAlpha=a;label('ВИНГАРДИУМ ЛЕВИОСА',W/2,H*.88,29);ctx.globalAlpha=1}
 a=smooth((t-18.2)/.8);if(a){
  ctx.globalAlpha=a;const g=ctx.createLinearGradient(0,0,W*.58,0);g.addColorStop(0,'rgba(5,14,32,.94)');g.addColorStop(.7,'rgba(5,14,32,.76)');g.addColorStop(1,'rgba(5,14,32,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W*.6,H);
  label('ЛИМИТИРОВАННЫЙ',38,95,27,{align:'left',max:450});label('НАПИТОК',38,145,53,{align:'left',max:450});
  label('БЕСПЛАТНО НА БАРЕ',38,211,27,{align:'left',max:450});label('Со стаканчиком «Хогвартс»',38,254,20,{align:'left',color:'#fff4dd',max:450});
  label('26 ДЕКАБРЯ · 19:00',38,345,25,{align:'left',max:450});ctx.globalAlpha=1;
 }
 if(t<.7){ctx.fillStyle=`rgba(2,7,20,${1-smooth(t/.7)})`;ctx.fillRect(0,0,W,H)}
}
const output=path.join(root,'site/ticket/bilet_ozhivaet.mp4');
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
function completePng(file){
 try{const size=fs.statSync(file).size;if(size<12)return false;const fd=fs.openSync(file,'r'),tail=Buffer.alloc(12);try{fs.readSync(fd,tail,0,12,size-12)}finally{fs.closeSync(fd)}return tail.equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]))}catch{return false}
}
for(let i=0;i<FPS*SECONDS;i++){
 const file=String(i+1).padStart(4,'0'),png=path.join(folder,file+'.png'),deadline=Date.now()+120000;
 while(!completePng(png)){if(Date.now()>deadline)throw new Error('Timed out waiting for rendered frame '+file);await delay(250)}
 const im=await loadImage(png);const meta=JSON.parse(fs.readFileSync(path.join(folder,file+'.json'),'utf8'));
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(im,0,0,W,H);effects(meta,i/FPS);
 if([30,120,210,270,360,420].includes(i))fs.writeFileSync(path.join(root,'design/ticket3d',`film_preview_${i}.png`),canvas.toBuffer('image/png'));
 const data=ctx.getImageData(0,0,W,H).data;if(!ff.stdin.write(Buffer.from(data)))await once(ff.stdin,'drain');
 if(i%(FPS*4)===0)console.log(`Composited ${i/FPS}/${SECONDS}s`);
}
ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)throw new Error('FFmpeg '+code);
fs.copyFileSync(output,path.join(root,'site/ticket/bilet_oborot_ozhivaet.mp4'));
console.log(JSON.stringify({file:output,width:W,height:H,duration:SECONDS,fps:FPS,scenes:['Great Hall feast','floating candles','Sorting Hat','wand duel','levitation','Hogwarts drink']}));
