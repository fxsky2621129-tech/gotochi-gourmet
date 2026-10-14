(() => {
'use strict';
const $=id=>document.getElementById(id);
const pref=$('pref'), city=$('city'), genre=$('genre'), days=$('days'), search=$('search'), results=$('results');
const data=typeof MUNICIPALITIES==='undefined'?{}:MUNICIPALITIES;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
let items=[];
for(const p of Object.keys(data)){const o=document.createElement('option');o.value=p;o.textContent=p;pref.append(o)}
function refreshCities(){
 const cities=data[pref.value]||[];
 city.replaceChildren(new Option('市区町村すべて',''),...cities.map(c=>new Option(c,c)));
 city.disabled=!pref.value;city.value='';
 render();
}
function selected(items,opts,now=Date.now()){
 const cutoff=now-Number(opts.days)*86400000;
 return items.filter(i=>{
   const t=Date.parse(i.published);if(!Number.isFinite(t)||t<cutoff||t>now+86400000)return false;
   if(opts.pref && i.prefecture!==opts.pref)return false;
   if(opts.city && i.city!==opts.city)return false;
   if(opts.genre && i.genre!==opts.genre)return false;
   if(opts.q && ![i.title,i.source,i.prefecture,i.city].join(' ').toLowerCase().includes(opts.q.toLowerCase()))return false;
   return url(i.url);
 }).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)).slice(0,10);
}
function render(){
 const list=selected(items,{pref:pref.value,city:city.value,genre:genre.value,days:days.value,q:search.value.trim()});
 if(!list.length){results.innerHTML='<div class="notice">該当する記事はありません。地域・期間を広げてください。無料RSSで取得できた記事に限られます。</div>';return}
 results.innerHTML='<p class="small">掲載日が新しい順・最大10件（人気順ではありません）</p>'+list.map(i=>{
 const link=url(i.url);const area=[i.prefecture,i.city].filter(Boolean).join(' ');
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([i.title,area].filter(Boolean).join(' '));
 return '<article class="card"><h2>'+escape(i.title)+'</h2><div class="meta">'+escape(i.source)+' ／ '+escape(i.published.slice(0,10))+'</div>'+
 '<span class="pill">'+(i.genre==='sweets'?'スイーツ':'飲食店・料理')+'</span>'+
 '<span class="pill">'+(i.classification==='sns-article'?'SNS話題と紹介された記事':'グルメ記事')+'</span>'+
 (area?'<span class="pill">'+escape(area)+'</span>':'<span class="pill">所在地未確認</span>')+
 '<div class="actions"><a href="'+escape(link)+'" target="_blank" rel="noopener noreferrer">記事を読む ↗</a>'+
 '<a href="'+escape(maps)+'" target="_blank" rel="noopener noreferrer">Googleマップで再確認 ↗</a></div></article>';
 }).join('');
}
pref.addEventListener('change',refreshCities);
for(const x of [city,genre,days])x.addEventListener('change',render);
search.addEventListener('input',render);
fetch('./data/trending-gourmet.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
 items=Array.isArray(data.items)?data.items:[];
 $('updated').textContent='データ更新：'+(data.updated_at||'未取得')+' ／ 保存記事 '+items.length+'件';
 render();
}).catch(()=>{results.innerHTML='<div class="notice">記事データを取得できませんでした。通信状態を確認してください。</div>'});
window.GourmetTrending={selected};
})();