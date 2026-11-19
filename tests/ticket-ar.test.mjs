import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../site/ticket/ar-core.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const flush=()=>new Promise(r=>setImmediate(r));
const f=1/Math.tan(Math.PI/8),projection=[f/(1280/720),0,0,0,0,f,0,0,0,0,-1.0002,-1,0,0,-20.002,0];
const pose=index=>[1,0,0,0,0,1,0,0,0,0,1,0,-core.LAYOUTS[index].photoWidth/2,-core.LAYOUTS[index].photoHeight/2,-1500,1];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function cssPoint(css,x,y){const m=css.slice(9,-1).split(',').map(Number),w=m[3]*x+m[7]*y+m[15];return {x:(m[0]*x+m[4]*y+m[12])/w,y:(m[1]*x+m[5]*y+m[13])/w}}
test('both printed sides align with the camera in portrait, landscape and desktop',()=>{
 for(const [i,l] of core.LAYOUTS.entries())for(const viewport of [{width:360,height:780},{width:844,height:390},{width:1366,height:900}]){
  const marker={width:l.photoWidth,height:l.photoHeight},input={width:1280,height:720};
  const p=core.projectPoster(pose(i),projection,marker,input,viewport,l),css=core.posterTransform(p);
  const px=360*f*Math.max(viewport.width/1280,viewport.height/720)/1500;
  for(const [x,y] of [[0,0],[1870,0],[1870,841],[0,841],[935,420.5]]){
   const q=cssPoint(css,x,y);
   near(q.x,viewport.width/2+(x-l.photoX-l.photoWidth/2)*px);
   near(q.y,viewport.height/2+(y-l.photoY-l.photoHeight/2)*px);
  }
 }
});
async function harness({reduceMotion=false}={}){
 const order=[];
 class Element extends EventTarget{
  constructor(id){super();Object.assign(this,{id,hidden:false,style:{},textContent:'',currentTime:0,paused:true,readyState:4,videoWidth:1280,videoHeight:720,clientWidth:360,clientHeight:780,srcObject:null});const set=new Set();this.classList={add:n=>set.add(n),remove:n=>set.delete(n),contains:n=>set.has(n),toggle:(n,f)=>f?set.add(n):set.delete(n)}}
  play(){order.push(this.id+':play');this.paused=false;this.playCalls=(this.playCalls||0)+1;return Promise.resolve()}pause(){this.paused=true}focus(){this.focused=true}setAttribute(n,v){this[n]=v}
 }
 const html=await readFile(new URL('../site/ticket/index.html',import.meta.url),'utf8');
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));elements.camera.hidden=true;
 const document=new EventTarget();document.body=new Element('body');document.hidden=false;document.getElementById=id=>elements[id];
 const window=new EventTarget();window.visualViewport=new EventTarget();window.matchMedia=()=>({matches:reduceMotion});let now=0,frameId=0;const frames=new Map(),permissions=[],controllers=[];
 class Controller{constructor(o){Object.assign(this,o);controllers.push(this)}addImageTargetsFromBuffer(){return {dimensions:[[636,610],[694,604]]}}getProjectionMatrix(){return projection}dummyRun(){this.warmed=true}processVideo(){this.processing=true}stopProcessVideo(){this.processing=false}dispose(){this.disposed=true}}
 const context=vm.createContext({document,window,navigator:{mediaDevices:{getUserMedia(){order.push('permission');const d=deferred();permissions.push(d);return d.promise}}},performance:{now:()=>now},AbortController,DOMException,setTimeout,clearTimeout,console,requestAnimationFrame(cb){const id=++frameId;frames.set(id,cb);return id},cancelAnimationFrame:id=>frames.delete(id),fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
 const c=new vm.SyntheticModule(Object.keys(core),function(){for(const [k,v] of Object.entries(core))this.setExport(k,v)},{context});
 const t=new vm.SyntheticModule(['Controller'],function(){this.setExport('Controller',Controller)},{context});await t.link(()=>{});await t.evaluate();
 const app=new vm.SourceTextModule(await readFile(new URL('../site/ticket/app-motion.js',import.meta.url),'utf8'),{context,importModuleDynamically:async name=>{assert.equal(name,'../vendor/mindar-image.prod.js');return t}});
 await app.link(name=>{assert.equal(name,'./ar-core.mjs?v=t2');return c});await app.evaluate();
 return {elements,order,controllers,click(id){elements[id].dispatchEvent(new Event('click'))},allow(){const track={stopped:false,stop(){this.stopped=true}};permissions.at(-1).resolve({getTracks:()=>[track]});return track},frame(time){now=time;const cbs=[...frames.values()];frames.clear();cbs.forEach(cb=>cb(time))},update(index,matrix){controllers.at(-1).onUpdate?.({type:'updateMatrix',targetIndex:index,worldMatrix:matrix})},pendingFrames:()=>frames.size};
}
test('both inline films start in the tap before camera permission is requested',async()=>{
 const h=await harness();h.click('start');
 assert.deepEqual(h.order.slice(0,3),['ar-film:play','ar-film-back:play','permission']);
 const track=h.allow();await flush();await flush();assert.equal(h.controllers[0].warmed,true);
 h.click('stop');assert.equal(track.stopped,true);assert.equal(h.elements['ar-film'].paused,true);assert.equal(h.elements['ar-film-back'].paused,true);assert.equal(h.pendingFrames(),0);
});
test('turning the ticket selects its own film; the other target cannot hide it',async()=>{
 const h=await harness();h.click('start');h.allow();await flush();await flush();
 h.update(0,pose(0));h.frame(1000);assert.equal(h.elements['ar-film'].classList.contains('is-active'),true);
 h.elements['ar-film'].currentTime=6;
 h.update(1,pose(1));h.frame(1300);assert.equal(h.elements['ar-film-back'].classList.contains('is-active'),true);assert.ok(h.elements['ar-film-back'].style.transform.startsWith('matrix3d('));
 h.elements['ar-film-back'].currentTime=5;
 h.update(0,null);h.frame(2100);assert.equal(h.elements['film-layer'].classList.contains('is-tracked'),true);assert.equal(h.elements['ar-film-back'].currentTime,5);
 h.update(1,null);h.frame(2800);assert.equal(h.elements['film-layer'].classList.contains('is-tracked'),false);assert.equal(h.elements['ar-film-back'].paused,false);
 h.update(0,pose(0));h.frame(3000);assert.equal(h.elements['ar-film'].currentTime,5);assert.equal(h.elements['ar-film-back'].paused,false);h.click('stop');
});
test('the two preview controls open the correct films and restore their own focus',async()=>{
 const h=await harness();h.click('preview-back');assert.match(h.elements['preview-film'].src,/bilet_oborot_ozhivaet/);assert.match(h.elements['preview-title'].textContent,/Хогвартсе/);
 h.click('close-preview');assert.equal(h.elements['preview-back'].focused,true);assert.equal(h.elements['preview-film'].paused,true);
 h.click('preview');assert.match(h.elements['preview-film'].src,/bilet_ozhivaet/);assert.doesNotMatch(h.elements['preview-film'].src,/oborot/);
});
test('reduced motion keeps preview paused until the viewer starts playback',async()=>{
 const h=await harness({reduceMotion:true});h.click('preview-back');assert.equal(h.elements['preview-film'].paused,true);assert.equal(h.elements['preview-film'].playCalls,undefined);assert.match(h.elements['preview-status'].textContent,/воспроизведения/);
});
