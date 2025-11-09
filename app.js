// ===== P∆ (Profiler iOS, web-core) =====
const VK_TOKEN = "vk1.a.3OzKnoEWbuP-K_w35uFUthvwMqu6t69jzLT-gvIncMi1iqQxaqRtNKhspzQfFnF06u5hauSSur-dHGRPOsz0bvV2sD0NAkHT_g7WSDrSPimlKnOpDE_v SMGPKCO42YMttw0foc2UbIz-rJq8JQHMiGwKxiYHEJLzi5e31JsRBr13_xcymjJFsa99hPB4dbyIJepi0qu-Qf1Hh5eKtsXc-w&"; // <= ВСТАВЬ СЮДА СВОЙ VK TOKEN (одной строкой)
const VK_VERSION = "5.131";

const UI = {
  q: id => document.getElementById(id),
  show: id => UI.q(id).classList.remove('hidden'),
  hide: id => UI.q(id).classList.add('hidden')
};

// Детект нативного моста (WKWebView)
const isNative = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeFetch);

// Упрощённый nfetch: в нативке просим iOS сходить в сеть, в вебе — обычный fetch
function nfetch(url, options){
  if(isNative){
    return new Promise(resolve=>{
      window.__nativeFetchCallback = txt => resolve(new Response(new Blob([txt]), {status:200}));
      window.webkit.messageHandlers.nativeFetch.postMessage({
        url, method: (options&&options.method)||"GET",
        headers: (options&&options.headers)||null,
        body: (options&&options.body)||null
      });
    });
  } else {
    return fetch(url, options||{});
  }
}

// NAV
document.querySelectorAll('nav.bottom [data-go]').forEach(b=>{
  b.addEventListener('click',()=>{
    ['home','saved','history'].forEach(id=> UI.q(id).classList.add('hidden'));
    UI.q(b.dataset.go).classList.remove('hidden');
  });
});

// FILTERS
UI.q('btnFilters').addEventListener('click',()=> UI.q('filters').classList.toggle('hidden'));

// SEARCH
UI.q('btnSearch').addEventListener('click', runSearch);
UI.q('q').addEventListener('keydown', e=> e.key==='Enter' && runSearch());

// STORAGE
const LS_HISTORY='pf_history', LS_SAVED='pf_saved', LS_TAGS='pf_tags';
const loadLS = (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k))||def; }catch(_){ return def; } }
const saveLS = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
function addHistory(str){ const arr=loadLS(LS_HISTORY,[]); arr.unshift({q:str,ts:Date.now()}); saveLS(LS_HISTORY,arr.slice(0,50)); renderHistory(); }
function toggleSave(item){ let arr=loadLS(LS_SAVED,[]); const i=arr.findIndex(x=> x.key===item.key); if(i>=0){arr.splice(i,1);} else{arr.unshift(item);} saveLS(LS_SAVED,arr); renderSaved(); }
function setTags(key, tags){ const map=loadLS(LS_TAGS,{}); map[key]=tags; saveLS(LS_TAGS,map); }
function getTags(key){ const map=loadLS(LS_TAGS,{}); return map[key]||[]; }
function renderHistory(){ const arr=loadLS(LS_HISTORY,[]); UI.q('historyList').innerHTML = arr.map(h=> `<div class="card"><div class="title">${esc(h.q)}</div><div class="meta">${new Date(h.ts).toLocaleString()}</div></div>`).join(''); }
function renderSaved(){ const arr=loadLS(LS_SAVED,[]); if(!arr.length){ UI.q('savedList').innerHTML='<div class="card meta">Пусто.</div>'; return; } UI.q('savedList').innerHTML = arr.map(renderCard).join(''); attachCardEvents(arr); }

// UTIL
function norm(s){ return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim(); }
function ageFromBdate(b){ if(!b || !/\d{4}/.test(b)) return null; const yy=parseInt(b.split('.').pop(),10); return (new Date().getFullYear())-yy; }
function esc(s){ return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function sleep(ms){ return new Promise(r=> setTimeout(r, ms)); }

// RENDER
function renderCard(p){
  const meta = [p.city||'', p.bdate||''].filter(Boolean).join(' • ');
  const score = (p._score||0);
  return `<div class="card prof" data-key="${esc(p.key)}">
    <div class="head">
      <img class="photo" src="${esc(p.photo||'')}" alt=""/>
      <div style="min-width:0">
        <div class="title clamp1">${esc(p.name||p.username||'—')}</div>
        <div class="meta clamp1">${esc(meta)}</div>
      </div>
      <div class="badge">${score}%</div>
    </div>
    <div class="meta" style="margin-top:6px">${esc([p.occupation,p.education].filter(Boolean).join(' • '))}</div>
    <div class="links">
      <a class="link" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="assets/external.svg"/>vk.com</a>
      ${p.detected && p.detected.length ? p.detected.map(u=>`<a class="link" href="${esc(u)}" target="_blank" rel="noopener"><img src="assets/external.svg"/>${esc(host(u))}</a>`).join('') : ''}
    </div>
  </div>`;
}
function attachCardEvents(list){
  document.querySelectorAll('.card.prof').forEach(card=>{
    card.addEventListener('click',()=>{
      const key=card.getAttribute('data-key');
      const u=list.find(x=> (x.key||'')===key);
      if(u) openModal(u);
    });
  });
}
function host(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(_){ return 'link'; } }

// MODAL
const modal = UI.q('modal');
UI.q('modalClose').addEventListener('click', ()=> modal.classList.add('hidden'));
modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.add('hidden'); });

function openModal(u){
  const tags = getTags(u.key);
  const rows = [
    ['Имя', esc(u.name||u.username||'—')],
    ['Город', esc(u.city||'—')],
    ['Дата', esc(u.bdate||'—')],
    ['Работа', esc(u.occupation||'—')],
    ['Образование', esc(u.education||'—')],
    ['VK', `<a href="${esc(u.url||'#')}" target="_blank" rel="noopener">${esc(u.url||'—')}</a>`]
  ].map(([k,v])=> `<div class="meta"><span style="display:inline-block;width:110px;color:#9d9d9d">${k}</span> ${v}</div>`).join('');

  const ylinks = (u.detected||[]).map(u=>`<a class="link" href="${esc(u)}" target="_blank" rel="noopener"><img src="assets/external.svg"/>${esc(host(u))}</a>`).join(' ');

  const tagUI = `<div style="margin-top:8px">
    <div class="meta" style="margin-bottom:4px;color:#9d9d9d">Теги</div>
    <div id="tagList">${tags.map(t=>`<span class="link">${esc(t)}</span>`).join(' ')||'<span class="meta">нет</span>'}</div>
    <div style="margin-top:6px;display:flex;gap:8px"><input id="tagInput" class="input" style="flex:1;min-height:36px" placeholder="добавить тег"/><button id="tagAdd" class="btn">Добавить</button></div>
  </div>`;

  UI.q('modalBody').innerHTML = `
    <div class="head" style="margin-bottom:10px">
      <img class="photo" src="${esc(u.photo||'')}" alt=""/>
      <div style="min-width:0">
        <div class="title">${esc(u.name||u.username||'—')}</div>
        <div class="meta clamp1">${esc([u.city,u.bdate].filter(Boolean).join(' • '))}</div>
      </div>
    </div>
    ${rows}
    ${u.detected&&u.detected.length? `<div class="card"><div class="title">Найденные совпадения</div><div class="links" style="margin-top:6px">${ylinks}</div></div>`:''}
    ${tagUI}
    <div id="analysis"></div>
  `;

  UI.q('btnSave').onclick = ()=> toggleSave(u);
  UI.q('btnGraph').onclick = ()=> alert('Граф связей будет добавлен в следующей сборке.');
  UI.q('btnPDF').onclick = ()=> window.print();
  UI.q('btnAnalyze').onclick = ()=> runLocalAnalysis(u);
  UI.q('btnAI').onclick = ()=> runAI(u);

  // tags
  UI.q('tagAdd').onclick = ()=>{
    const v = (UI.q('tagInput').value||'').trim();
    if(!v) return;
    const arr = getTags(u.key);
    if(!arr.includes(v)) arr.push(v);
    setTags(u.key, arr);
    openModal(u);
  };

  modal.classList.remove('hidden');
}

// SEARCH PIPELINE
async function runSearch(){
  const query = norm(UI.q('q').value.trim());
  if(!query){ return; }
  addHistory(query);
  UI.q('summary').textContent='Поиск…'; UI.q('results').innerHTML='';

  showAnalyze(true);

  const [vkItems, detected] = await Promise.all([
    searchVK(query).catch(_=>[]),
    yandexDetect(query).catch(_=>[])
  ]);

  // Приклеиваем найденные из Яндекса ссылки к карточкам (наивно, по доменам/никнеймам)
  const enriched = vkItems.map(u=>{
    const needle = norm(u.username||u.name||'');
    const links = (detected||[]).filter(x=> norm(x).includes(needle));
    return {...u, detected: links.slice(0,6)};
  });

  const filtered = applyFilters(enriched, query);
  await sleep(900); // эстетика: пусть сканер поживёт
  showAnalyze(false);

  UI.q('summary').textContent = filtered.length ? `Найдено: ${filtered.length}` : 'Совпадений нет.';
  UI.q('results').innerHTML = filtered.map(renderCard).join('');
  attachCardEvents(filtered);
}

// FILTERS + SCORING
function applyFilters(list, query){
  const city = norm(UI.q('fCity').value||'');
  const ageF = parseInt(UI.q('fAgeFrom').value||'',10);
  const ageT = parseInt(UI.q('fAgeTo').value||'',10);
  const sex = UI.q('fSex').value||'';
  const work = norm(UI.q('fWork').value||'');
  const handle = norm(UI.q('fHandle').value||'');
  const tags = norm(UI.q('fTags').value||'').split(',').map(x=>x.trim()).filter(Boolean);

  return list.map(p=>{
    let score=0;
    const blob = norm([p.name,p.username,p.city,p.occupation,p.education,p.status].filter(Boolean).join(' '));
    if(query && blob.includes(query)) score+=40;
    if(city && norm(p.city||'').includes(city)) score+=20;
    if(work && blob.includes(work)) score+=15;
    if(handle && (norm(p.username||'').includes(handle) || norm(p.url||'').includes(handle))) score+=25;
    const age = p.age||ageFromBdate(p.bdate);
    if(!isNaN(ageF) && age && age>=ageF) score+=5;
    if(!isNaN(ageT) && age && age<=ageT) score+=5;
    if(sex && p.sex && String(p.sex)===String(sex)) score+=3;
    p._score=score; return p;
  })
  .filter(p=>{
    let pass=true;
    if(city) pass = pass && norm(p.city||'').includes(city);
    if(work) pass = pass && norm([p.occupation,p.education,p.status].join(' ')).includes(work);
    if(handle) pass = pass && (norm(p.username||'').includes(handle) || norm(p.url||'').includes(handle));
    if(tags.length){ const t = getTags(p.key||'')||[]; pass = pass && tags.every(x=> t.map(norm).includes(x)); }
    if(sex) pass = pass && (!p.sex || String(p.sex)===String(sex));
    if(!isNaN(ageF)||!isNaN(ageT)){ const a = p.age||ageFromBdate(p.bdate); if(a){ if(!isNaN(ageF)) pass = pass && a>=ageF; if(!isNaN(ageT)) pass = pass && a<=ageT; } }
    return pass;
  })
  .sort((a,b)=> (b._score||0)-(a._score||0));
}

// VK SEARCH
async function searchVK(query){
  if(!VK_TOKEN){ return []; }
  const fields = ['photo_200','city','domain','bdate','sex','status','occupation','career','education','universities','site','about'].join(',');
  const url = `https://api.vk.com/method/users.search?v=${VK_VERSION}&access_token=${encodeURIComponent(VK_TOKEN)}&q=${encodeURIComponent(query)}&count=80&fields=${fields}`;
  const r = await nfetch(url,{headers:{'Accept':'application/json'}});
  const j = await r.json ? await r.json() : JSON.parse(await r.text());
  if(j.error) return [];
  return (j.response?.items||[]).map(u=>({
    source:'vk',
    key:`vk_${u.id}`,
    id:u.id,
    name:`${u.first_name||''} ${u.last_name||''}`.trim(),
    username: u.domain || `id${u.id}`,
    url: u.domain?`https://vk.com/${u.domain}`:`https://vk.com/id${u.id}`,
    photo: u.photo_200 || '',
    city: (u.city && (u.city.title||u.city)) || '',
    bdate: u.bdate || '',
    sex: u.sex,
    occupation: (u.occupation && u.occupation.name) || '',
    education: (u.universities && u.universities[0] && u.universities[0].name) || (u.education && u.education.university_name) || '',
    status: u.status||''
  }));
}

// Яндекс: в нативке тянем HTML и выуживаем ссылки, в вебе — возвращаем готовые поисковые URL
async function yandexDetect(query){
  const q = encodeURIComponent(query);
  const urls = [
    `https://yandex.ru/search/?text=site%3Avk.com%20${q}`,
    `https://yandex.ru/search/?text=site%3At.me%20${q}`,
    `https://yandex.ru/search/?text=site%3Ainstagram.com%20${q}`,
    `https://yandex.ru/search/?text=${q}%20vk%20telegram%20instagram`
  ];
  if(!isNative){
    // веб: просто вернём ссылки
    return [];
  }
  // натив: попробуем выдрать ссылки из первой выдачи
  let detected = [];
  for(const u of urls){
    try{
      const r = await nfetch(u, {headers:{'Accept':'text/html'}});
      const html = await (r.text ? r.text() : Promise.resolve(''));
      const matches = html.match(/https?:\/\/(?:[a-z0-9.-]+\.)?(?:vk\.com|t\.me|instagram\.com)\/[^\s"'<>()]+/gi) || [];
      detected.push(...matches.slice(0,10));
    }catch(_){}
  }
  // уникализируем
  detected = Array.from(new Set(detected));
  return detected.slice(0,12);
}

// LOCAL ANALYSIS (эвристики без ИИ)
async function runLocalAnalysis(u){
  showAnalyze(true); await sleep(1200);
  const blocks = [];
  const topics = extractTopics([u.status,u.occupation,u.education].join(' '));
  if(topics.length) blocks.push(section('Ключевые слова', topics.map(x=>`<span class="link">${esc(x)}</span>`).join(' ')));
  blocks.push(section('Статистика', list([
    ['Источник', 'VK'],
    ['Город', u.city||'—'],
    ['Работа', u.occupation||'—'],
    ['Образование', u.education||'—'],
  ])));
  UI.q('analysis').innerHTML = blocks.join('');
  showAnalyze(false);
}

// ИИ-анализ: если есть прямой эндпоинт/ключ — шлём автоматически через нативку, иначе — копируем промпт и открываем сайт
const DEEPSEEK_ENDPOINT = ""; // например, свой прокси или офиц. API, если появится
const DEEPSEEK_KEY = "";      // если когда-то решишь хранить ключ (лучше в keychain на нативке)
async function runAI(u){
  const info = [
    `Имя: ${u.name||u.username||''}`,
    `Город: ${u.city||''}`,
    `Дата: ${u.bdate||''}`,
    `Работа: ${u.occupation||''}`,
    `Образование: ${u.education||''}`,
    `Статус/о себе: ${u.status||''}`,
    `VK: ${u.url||''}`,
    `Найденные совпадения: ${(u.detected||[]).join(', ')}`
  ].join('\n');

  const prompt = `Создай краткий психологический портрет на основе приведённой информации о человеке.
Не пиши вступлений, пояснений, извинений, выводов, фраз вроде «вот ваш результат» или «конечно».
Начни ответ сразу с сути, 5–6 предложений, информативно и без лишних слов.
Информация:
${info}`;

  // если настроен нативный эндпоинт — шлём автоматом
  if(isNative && DEEPSEEK_ENDPOINT){
    try{
      showAnalyze(true);
      const r = await nfetch(DEEPSEEK_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json', ...(DEEPSEEK_KEY?{'Authorization':`Bearer ${DEEPSEEK_KEY}`}:{})},
        body: JSON.stringify({prompt})
      });
      const txt = await (r.text ? r.text() : '');
      UI.q('analysis').innerHTML = section('ИИ-анализ', `<div class="meta">${esc(txt)}</div>`);
      showAnalyze(false);
      return;
    }catch(e){}
    showAnalyze(false);
  }

  // fallback: копируем промпт и открываем сайт
  copyToClipboard(prompt);
  alert('Промпт скопирован. Откроется DeepSeek — вставь и получи анализ.');
  window.open('https://chat.deepseek.com/', '_blank','noopener');
}

// Analyze screen FX
function showAnalyze(on){
  const scr = UI.q('analyzeScreen');
  if(on){
    scr.classList.remove('hidden');
    const bars = UI.q('scanBars'); bars.innerHTML='';
    for(let i=0;i<14;i++){
      const w = Math.floor(Math.random()*100)+1;
      const bar = document.createElement('div');
      bar.style.height='6px'; bar.style.margin='4px'; bar.style.background='#e6e6e6';
      bar.style.width = w+'%';
      bars.appendChild(bar);
    }
    const noise = UI.q('scanNoise'); noise.innerHTML='';
    for(let i=0;i<10;i++){
      const row = document.createElement('div');
      row.className='noise-row';
      row.textContent = randomNoise(90);
      noise.appendChild(row);
    }
  } else {
    scr.classList.add('hidden');
  }
}

function section(title, html){ return `<div class="card"><div class="title">${esc(title)}</div><div class="meta" style="margin-top:6px">${html}</div></div>`; }
function list(pairs){ return pairs.map(([k,v])=> `<div class="meta"><span style="display:inline-block;width:140px;color:#9d9d9d">${esc(k)}</span> ${esc(v)}</div>`).join(''); }
function extractTopics(text){ const words=norm(text).split(/\W+/).filter(w=>w&&w.length>3); const f={}; words.forEach(w=> f[w]=(f[w]||0)+1); return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]); }
function randomNoise(n){ const chars='01ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let s=''; for(let i=0;i<n;i++){ s+=chars[Math.floor(Math.random()*chars.length)]; } return s; }
function copyToClipboard(text){ if(navigator.clipboard){ navigator.clipboard.writeText(text); } }

// init
(function init(){ renderHistory(); renderSaved(); })();