import {MoviePlayback, TrackingGate, projectPoster, posterTransform, LAYOUTS} from './ar-core.mjs?v=t1';
const $=id=>document.getElementById(id);
const films=[$('ar-film'),$('ar-film-back')],feed=$('camera-feed'),previewFilm=$('preview-film');
let film=films[0],session=null,previewing=false,previewTrigger='preview',trackerModule=null,targetBuffer=null;
const playbacks=films.map((video,index)=>new MoviePlayback(video,state=>{
 if(!session)return;session.states[index]=state;if(session.targetIndex!==index)return;session.playbackState=state;
 $('restart-film').textContent=state==='playing'?'Смотреть сначала':'Запустить анимацию';showStatus(session);
}));
let playback=playbacks[0];
function selectSide(s,index){
 s.targetIndex=index;s.marker=s.markers?.[index];film=films[index];playback=playbacks[index];
 s.playbackState=s.states[index];films.forEach((video,i)=>video.classList.toggle('is-active',i===index));
}
const current=s=>!!s&&session===s&&!s.closed;
function showStatus(s){
 if(!current(s))return;
 let message='Наведите камеру на рисунок со стаканчиком в центре билета';
 if(!s.ready)message='Подготавливаем распознавание…';
 else if(s.playbackState==='blocked')message='Нажмите «Запустить анимацию»';
 else if(s.playbackState==='error')message='Ролик не загрузился. Нажмите «Запустить анимацию»';
 else if(s.gate.lostAt!==null)message='Верните рисунок со стаканчиком в кадр';
 else if(s.gate.pose)message=film.readyState<2?'Загружаем анимацию…':'Билет ожил!';
 if($('tracking-status').textContent!==message)$('tracking-status').textContent=message;
}
function clearController(s){
 const c=s.controller;s.controller=null;if(!c)return;c.onUpdate=null;
 try{c.stopProcessVideo();c.dispose()}catch{}
}
function stop(){
 const s=session;session=null;for(const movie of playbacks)movie.disarm();$('film-layer').classList.remove('is-tracked');
 if(s){s.closed=true;s.abort.abort();cancelAnimationFrame(s.frame);clearTimeout(s.resizeTimer);clearController(s);for(const t of s.stream?.getTracks()||[])t.stop()}
 feed.pause();feed.srcObject=null;$('camera').hidden=true;document.body.classList.remove('scanning');$('start').disabled=false;
}
function fail(s,message){if(current(s)){stop();$('intro-status').textContent=message}}
function errorText(e){
 if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')return 'Разрешите доступ к камере в браузере и нажмите «Открыть камеру».';
 if(e.name==='NotFoundError')return 'Браузер не нашёл камеру. Попробуйте открыть страницу на телефоне.';
 if(e.name==='NotReadableError')return 'Камера занята. Закройте другие приложения с камерой и попробуйте ещё раз.';
 if(/webgl|gl context|backend|gpu/i.test(e.message||''))return 'Браузер не смог включить распознавание. Обновите Chrome или Safari. Обе анимации можно посмотреть ниже, без камеры.';
 return e.message||'Не удалось включить распознавание. Обновите страницу и попробуйте ещё раз.';
}
function mediaDimensions(video,signal){
 if(video.videoWidth&&video.videoHeight&&video.readyState>=2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const events=['loadeddata','canplay','resize'];
  const finish=error=>{clearTimeout(timer);for(const name of events)video.removeEventListener(name,ready);video.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);error?reject(error):resolve()};
  const ready=()=>{if(video.videoWidth&&video.videoHeight&&video.readyState>=2)finish()};
  const failed=()=>finish(new Error('Не удалось получить изображение с камеры. Закройте камеру и попробуйте ещё раз.'));
  const aborted=()=>finish(new DOMException('Camera closed','AbortError'));
  const timer=setTimeout(failed,15000);
  for(const name of events)video.addEventListener(name,ready);
  video.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
 });
}
async function initializeTracking(s){
 if(!current(s))return;
 const generation=++s.trackingGeneration;s.ready=false;s.gate.clear();$('film-layer').classList.remove('is-tracked');clearController(s);showStatus(s);
 await mediaDimensions(feed,s.abort.signal);
 const [module,buffer]=await Promise.all([
  trackerModule||=import('../vendor/mindar-image.prod.js').catch(e=>{trackerModule=null;throw e}),
  targetBuffer?Promise.resolve(targetBuffer):fetch('ticket.mind?v=t1',{signal:s.abort.signal}).then(async r=>{if(!r.ok)throw new Error('Не удалось загрузить образец билета. Проверьте интернет и обновите страницу.');return targetBuffer=await r.arrayBuffer()})
 ]);
 if(!current(s)||generation!==s.trackingGeneration)return;
 s.input={width:feed.videoWidth,height:feed.videoHeight};feed.width=s.input.width;feed.height=s.input.height;
 const controller=new module.Controller({inputWidth:s.input.width,inputHeight:s.input.height,maxTrack:1,warmupTolerance:3,missTolerance:6,onUpdate(data){
  if(!current(s)||generation!==s.trackingGeneration||data.type!=='updateMatrix'||!Number.isInteger(data.targetIndex)||data.targetIndex<0||data.targetIndex>=films.length)return;
  if(data.worldMatrix){
   if(data.targetIndex!==s.targetIndex){s.gate.clear();selectSide(s,data.targetIndex)}
   s.gate.found(data.worldMatrix);
  }else if(data.targetIndex===s.targetIndex)s.gate.lost(performance.now());
  showStatus(s);
 }});
 s.controller=controller;
 const {dimensions}=controller.addImageTargetsFromBuffer(buffer);
 if(dimensions.length!==2||!dimensions.every(d=>d?.[0]>0&&d?.[1]>0))throw new Error('Не удалось прочитать обе стороны билета. Обновите страницу.');
 s.markers=dimensions.map(d=>({width:d[0],height:d[1]}));selectSide(s,s.targetIndex);s.projection=controller.getProjectionMatrix();
 controller.dummyRun(feed);if(!current(s)||generation!==s.trackingGeneration)return;
 s.ready=true;controller.processVideo(feed);showStatus(s);
}
function render(s,now){
 if(!current(s))return;
 const root=$('scene-root');let visible=false;
 if(s.ready&&s.gate.visible(now)){
  const transform=posterTransform(projectPoster(s.gate.pose,s.projection,s.marker,s.input,{width:root.clientWidth,height:root.clientHeight},LAYOUTS[s.targetIndex]));
  if(transform){film.style.transform=transform;playback.reveal();visible=true}
 }
 $('film-layer').classList.toggle('is-tracked',visible);s.frame=requestAnimationFrame(t=>render(s,t));
}
$('start').addEventListener('click',()=>{
 if(session)return;$('intro-status').textContent='';
 if(!navigator.mediaDevices?.getUserMedia){$('intro-status').textContent='Камера недоступна. Откройте страницу в Chrome или Safari на телефоне.';return}
 const s={closed:false,abort:new AbortController(),stream:null,controller:null,trackingGeneration:0,ready:false,gate:new TrackingGate(),frame:0,resizeTimer:null,playbackState:'loading',states:['loading','loading'],targetIndex:0};
 session=s;$('start').disabled=true;$('camera').hidden=false;document.body.classList.add('scanning');
 // Native playback starts in this tap, before metadata or camera permission awaits.
 selectSide(s,0);for(const movie of playbacks)movie.arm();showStatus(s);s.frame=requestAnimationFrame(t=>render(s,t));
 (async()=>{
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  if(!current(s)){for(const t of stream.getTracks())t.stop();return}
  s.stream=stream;feed.muted=feed.defaultMuted=true;feed.playsInline=true;feed.srcObject=stream;await feed.play();if(current(s))await initializeTracking(s);
 })().catch(e=>{if(current(s)&&e.name!=='AbortError')fail(s,errorText(e))});
});
function resize(){
 const s=session;if(!current(s)||!s.ready)return;
 // Toolbar resizes reproject automatically; decoded rotation needs new tracking input.
 if(feed.videoWidth!==s.input.width||feed.videoHeight!==s.input.height){clearTimeout(s.resizeTimer);s.resizeTimer=setTimeout(()=>initializeTracking(s).catch(e=>fail(s,errorText(e))),180)}
}
feed.addEventListener('resize',resize);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
$('stop').addEventListener('click',stop);$('restart-film').addEventListener('click',()=>playback.restart());
for(const [index,video] of films.entries()){
 video.addEventListener('playing',()=>{if(session){session.states[index]='playing';if(session.targetIndex===index){session.playbackState='playing';showStatus(session)}}});
 video.addEventListener('error',()=>{if(session){session.states[index]='error';if(session.targetIndex===index){session.playbackState='error';showStatus(session);$('restart-film').textContent='Запустить анимацию'}}});
}
function openPreview(index){
 previewTrigger=index?'preview-back':'preview';previewing=true;$('preview-modal').hidden=false;$('preview-status').textContent='';
 $('preview-title').textContent=index?'Оборот билета оживает':'Лицевая сторона оживает';
 previewFilm.src=index?'bilet_oborot_ozhivaet.mp4?v=t1':'bilet_ozhivaet.mp4?v=t1';
 previewFilm.poster=index?'bilet_oborot.png?v=t1':'bilet_yolka.png?v=t1';
 previewFilm.setAttribute('aria-label',index?'Анимация оборотной стороны билета':'Анимация лицевой стороны билета');
 $('close-preview').focus();previewFilm.currentTime=0;
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){previewFilm.pause();$('preview-status').textContent='Нажмите кнопку воспроизведения на ролике, чтобы запустить анимацию.'}
 else previewFilm.play().catch(()=>{$('preview-status').textContent='Нажмите кнопку воспроизведения на ролике.'});
}
$('preview').addEventListener('click',()=>openPreview(0));$('preview-back').addEventListener('click',()=>openPreview(1));
function closePreview(){previewing=false;previewFilm.pause();$('preview-modal').hidden=true;$(previewTrigger).focus()}
$('close-preview').addEventListener('click',closePreview);
previewFilm.addEventListener('error',()=>{$('preview-status').textContent='Не удалось загрузить ролик. Проверьте интернет и обновите страницу.'});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(previewing)closePreview();else stop()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){previewFilm.pause();stop()}else if(previewing)previewFilm.play().catch(()=>{})});
window.addEventListener('pagehide',()=>{previewFilm.pause();stop()});
