import {locations,navigationUrl,progress} from './locations.js';
const $=s=>document.querySelector(s);
const tones=['#e9dfc7','#dbe5d5','#dae7e6','#efdbcc','#e5deed'];
let records=new Map(), filter='all', selected=null, busy=false, database;
const dbReady=new Promise((resolve,reject)=>{
 const request=indexedDB.open('suslik-adventure',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('visits',{keyPath:'id'});
 request.onsuccess=()=>{database=request.result;resolve(database)};
 request.onerror=()=>reject(request.error);
});
async function transaction(mode,action){const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction('visits',mode);action(tx.objectStore('visits'));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
async function load(){await transaction('readonly',store=>{const req=store.getAll();req.onsuccess=()=>records=new Map(req.result.map(r=>[r.id,r]))})}
function render(){
 const count=records.size;$('#counter').textContent=`${count} / ${locations.length}`;$('#progress').value=count;$('#percent').textContent=count?`${progress(count,locations.length)}% света уже вернулось`:'Приключение начинается!';
 $('#story-title').textContent=count===locations.length?'Красноярск снова сияет!':'Вернём городу краски';
 $('#story').textContent=count===locations.length?'Все хранители вместе! Туман Забывайка рассеялся, а ваша семья сохранила целую коллекцию встреч. Спасибо за приключение!':'Туман спрятал городские воспоминания. Каждая встреча с сусликом возвращает немного света.';
 const search=$('#search').value.trim().toLocaleLowerCase('ru');
 const shown=locations.filter(p=>p.name.includes(search)&&(filter==='all'||(filter==='done'===records.has(p.id))));
 $('#cards').replaceChildren(...shown.map(p=>{
 const visit=records.get(p.id);const button=document.createElement('button');button.className='card';button.style.setProperty('--tone',tones[p.id%tones.length]);
 button.innerHTML=`<div class="art"><span class="status">${visit?'✓ НАЙДЕН':'✦ ХРАНИТЕЛЬ'}</span>${visit?'<img alt="Ваше фото суслика">':'<span class="animal" aria-hidden="true">🐿️</span><span class="item" aria-hidden="true">'+p.icon+'</span>'}</div><div class="card-body"><h3>${p.name}</h3><p>Красноярск · место ${String(p.id+1).padStart(2,'0')}</p><div class="card-bottom"><span>${visit?'В вашей коллекции':'Познакомиться'}</span><span>↗</span></div></div>`;
 if(visit)button.querySelector('img').src=visit.photo;
 button.addEventListener('click',()=>openDetail(p));return button;
 }));$('#empty').hidden=shown.length>0;
}
function openDetail(p){
 selected=p;const visit=records.get(p.id);$('#message').textContent='';
 $('#detail-content').innerHTML=`<div class="detail-icon" aria-hidden="true">${p.icon}</div><span class="eyebrow">ХРАНИТЕЛЬ ${String(p.id+1).padStart(2,'0')} / 24</span><h2 style="text-transform:capitalize">${p.name}</h2><p>Этот маленький хранитель ждёт вашу семью. Найдите его и помогите вернуть городу ещё одну искру света.</p><p class="mission">Задание для команды: рассмотрите суслика. Какая деталь рассказывает о его занятии? Придумайте вместе, чем он мог бы помочь городу.</p><p class="coordinates">${p.lat}, ${p.lon} · координаты предоставлены автором проекта</p>${visit?'<img class="detail-photo" alt="Ваш памятный снимок"><p>✓ Встреча сохранена в вашей коллекции.</p>':''}<div class="detail-actions"><a class="button" href="${navigationUrl(p)}" target="_blank" rel="noopener noreferrer">Открыть точку в Яндекс Картах ↗</a><label class="upload">${visit?'Заменить памятное фото':'Сфотографировать или выбрать фото'}<input id="photo" type="file" accept="image/*" capture="environment"></label><button class="button" id="save">${visit?'Сохранить новое фото':'Мы нашли суслика! ✦'}</button>${visit?'<button class="secondary" id="remove">Убрать отметку и фото</button>':''}</div><p style="font-size:11px">Геолокация не проверяется. Фото сохраняется на этом устройстве и никуда не отправляется.</p>`;
 if(visit)$('#detail-content img').src=visit.photo;
 $('#save').onclick=saveVisit;
 if(visit)$('#remove').onclick=async()=>{if(busy)return;busy=true;try{await transaction('readwrite',store=>store.delete(p.id));records.delete(p.id);render();openDetail(p)}catch{$('#message').textContent='Не удалось удалить отметку. Попробуйте ещё раз.'}finally{busy=false}};
 if(!$('#detail').open)$('#detail').showModal();
}
async function photoData(file){
 if(!file.type.startsWith('image/'))throw new Error('Выберите изображение.');
 if(file.size>25*1024*1024)throw new Error('Фото слишком большое. Выберите файл до 25 МБ.');
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('Не удалось прочитать фото. Попробуйте JPEG или PNG.');});
 const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.8);
}
async function saveVisit(){
 if(busy)return;const file=$('#photo').files[0];if(!file){$('#message').textContent='Сначала сделайте или выберите фото суслика.';return}
 const point=selected;busy=true;$('#save').disabled=true;$('#message').textContent='Сохраняем вашу встречу…';
 try{const record={id:point.id,photo:await photoData(file),date:new Date().toISOString()};await transaction('readwrite',store=>store.put(record));records.set(point.id,record);render();if(selected===point&&$('#detail').open){openDetail(point);$('#message').textContent='Искра света возвращена! Фото и отметка сохранены.'}}
 catch(e){$('#message').textContent=e.name==='QuotaExceededError'?'На устройстве не хватает места для фото. Освободите место и попробуйте снова.':e.message||'Не удалось сохранить фото.'}
 finally{busy=false;const button=$('#save');if(button)button.disabled=false}
}
$('#search').addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});render()});
$('.close').onclick=()=>$('#detail').close();
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#detail').close()}});
try{await load();render()}catch{render();$('#story').textContent='Браузер не разрешил локальное хранение. Просматривать места можно, но для сохранения фото откройте игру в браузере с доступным хранилищем.'}
