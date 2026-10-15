(() => {
'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(s){try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='news.google.com'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}}
function selected(items,opts,now=Date.now()){
 const days=Number(opts.days)===7?7:30, seen=new Set();
 return (Array.isArray(items)?items:[]).filter(i=>{
  if(!i||!['title','url','source','published','prefecture','city'].every(k=>typeof i[k]==='string'))return false;
  const t=Date.parse(i.published);
  if(!i.title.trim()||!url(i.url)||!Number.isFinite(t)||t>now||t<now-days*86400000)return false;
  if(i.classification!=='sns-article'||!['sweets','food'].includes(i.genre)||i.city)return false;
  if(opts.pref&&i.prefecture!==opts.pref||opts.city||opts.genre&&i.genre!==opts.genre)return false;
  return !opts.q||[i.title,i.source,i.prefecture].join(' ').toLowerCase().includes(opts.q.toLowerCase());
 }).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)).filter(i=>{
  const key=i.title.split(' - ')[0].replace(/\s+/g,'').toLowerCase();
  if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,10);
}
function card(i){return '<article class="card"><a class="card-link" href="'+escape(url(i.url))+'"><h2>'+escape(i.title)+'</h2><div class="meta">'+escape(i.source)+' ／ '+escape(i.published.slice(0,10))+'</div><span class="pill">'+(i.genre==='sweets'?'スイーツ':'飲食店・料理')+'</span><span class="pill">SNSに言及したグルメ記事</span><p class="small">'+(i.prefecture?'見出しの地域：'+escape(i.prefecture):'地域未特定')+' ／ 店舗所在地は未確認</p><div class="actions"><span>記事サイトへ →</span></div></a></article>'}
async function load(fetcher,production){
 const local='./data/trending-gourmet.json';
 const paths=production?['https://raw.githubusercontent.com/fxsky2621129-tech/gotochi-gourmet/main/data/trending-gourmet.json',local]:[local];
 for(let n=0;n<paths.length;n++){
  try{const r=await fetcher(paths[n],{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP');const d=await r.json();if(!d||!Array.isArray(d.items))throw Error('Invalid data');return {data:d,fallback:n>0}}catch(e){if(n===paths.length-1)throw e}
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={selected,card,url,load};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),pref=$('pref'),genre=$('genre'),days=$('days'),search=$('search'),results=$('results');
let items=[];
for(const p of Object.keys(typeof MUNICIPALITIES==='undefined'?{}:MUNICIPALITIES))pref.add(new Option(p,p));
const initialPref=new URLSearchParams(location.search).get('pref')||'';
if(Array.from(pref.options).some(o=>o.value===initialPref))pref.value=initialPref;
function render(){const list=selected(items,{pref:pref.value,genre:genre.value,days:days.value,q:search.value.trim()});results.innerHTML='<p class="small">検索地域：'+escape(pref.value||'全国')+' ／ '+list.length+'件</p>'+(list.length?'<p class="small">新着順・最大10件（人気順ではありません）</p>'+list.map(card).join(''):'<div class="notice">該当する記事はありません。地域・期間を広げてください。地域未特定の記事は全国で表示します。</div>')}
for(const x of [pref,genre,days])x.addEventListener('change',render);
search.addEventListener('input',render);
load(fetch,location.hostname==='fxsky2621129-tech.github.io').then(({data,fallback})=>{
 items=data.items;const t=Date.parse(data.updated_at);
 $('updated').textContent='最終取得：'+(Number.isFinite(t)?new Date(t).toLocaleString('ja-JP'):'未取得')+(fallback?' ／ 最新データを取得できないため公開時の保存データを表示':'')+(!Number.isFinite(t)||Date.now()-t>2*86400000?' ／ 更新が止まっている可能性があります':'')+(data.feeds_succeeded<data.feeds_total?' ／ 一部のRSS取得に失敗':'');render();
}).catch(()=>{results.textContent='記事データを取得できませんでした。通信状態を確認して再読み込みしてください。'});
})();

