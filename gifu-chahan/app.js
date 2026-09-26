(()=>{
  'use strict';
  const prefs='北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県'.split(' ');
  prefs.push(...'茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県'.split(' '));
  prefs.push(...'新潟県 富山県 石川県 福井県 山梨県 長野県'.split(' '));
  prefs.push(...'岐阜県 静岡県 愛知県 三重県'.split(' '));
  prefs.push(...'滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県'.split(' '));
  prefs.push(...'鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県'.split(' '));
  prefs.push(...'福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' '));
  const regions=['北海道・東北','関東','北陸・甲信越','東海','関西','中国・四国','九州・沖縄'];
  const ends=[7,14,20,24,30,39,47];
  const regionOf=p=>regions[ends.findIndex(n=>prefs.indexOf(p)<n)];
  const raw=[
    'sanjo|焼豚ラーメン三條|岐阜県|笠松町|2063|3.9|ラーメンと炒飯の候補',
    'umaka|九州ラーメンうまか 岐南店|岐阜県|岐阜市芋島|864|3.9|にんにく・ピリ辛のうまかチャーハン',
    'hana|炒飯 花|岐阜県|高山市|564|4.6|炒飯が看板の中華料理店',
    'maruya|マルヤ飯店|岐阜県|郡上市白鳥町|449|4.2|町中華の炒飯',
    'soden|早田飯店 本店|岐阜県|岐阜市|430|4.1|炒飯やチャーシューハンなど',
    'gyoza|餃子飯店|岐阜県|岐阜市加納|309|4.2|焼豚・エビ・カニの炒飯候補',
    'hanafuku|花福|岐阜県|瑞穂市|276|4.2|昔ながらの中華系',
    'shinshin|中華料理鑫鑫|岐阜県|羽島市|269|4.2|台湾・中華料理系',
    'shizumo|しずも|岐阜県|中津川市|261|4.3|ラーメンと炒飯の候補',
    'sanbon|三本足 かがみ原店|岐阜県|各務原市|225|4.2|中華料理店の炒飯',
    'tontenko|東天紅|愛知県|安城市|707|4.1|中華料理店',
    'kinryu|チャーハン専門店 金龍 一宮森本本店|愛知県|一宮市|652|3.7|チャーハン専門店',
    'jijii|チャーハンじじい|愛知県|名古屋市港区|600|3.7|チャーハンを前面に出した店',
    'hakkai|はっかい|愛知県|名古屋市熱田区|513|4.3|町中華の候補',
    'fukuraigen|福来源|愛知県|安城市|305|4.3|中華料理店',
    'huamei|華味|静岡県|沼津市|565|4.4|エビ・五目炒飯など',
    'yokota|会飯 よこ多|静岡県|藤枝市|548|4.3|炒飯の候補',
    'ichigen|一元 八木間店|静岡県|静岡市清水区|376|4.2|ラーメン店の炒飯',
    'nikoniko|にこにこ屋|三重県|津市|360|4.2|町中華の候補',
    'hyakufuku|百福|三重県|松阪市|352|4.2|担々麺と炒飯の候補',
    'waka|和華 担々麺|三重県|四日市市|325|4.3|通常・エビ・にんにく炒飯など',
    'saisai|中華バル SAISAI。|三重県|桑名市|307|4.5|中華料理店',
  ];
  const seed=raw.map(line=>{const [id,name,pref,area,reviews,rating,note]=line.split('|');return {id,name,pref,area,reviews:+reviews,rating:+rating,note}});
  const key='gifu-chahan-personal-v1', $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data={}; try{const v=JSON.parse(localStorage.getItem(key));if(v&&typeof v==='object'&&!Array.isArray(v))data=v}catch(e){}
  let region='すべて';
  const entry=id=>Object.prototype.hasOwnProperty.call(data,id)&&data[id]&&typeof data[id]==='object'?data[id]:{};
  const val=(v,max)=>v===null||v===undefined||v===''?null:(Number.isFinite(+v)&&+v>=0&&+v<=max?+v:null);
  function save(){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){alert('端末への保存に失敗しました。空き容量を確認してください。')}}
  function customs(){return Array.isArray(data.__custom)?data.__custom.filter(s=>s&&typeof s==='object'&&prefs.includes(s.pref)&&typeof s.id==='string'):[]}
  function rows(){return seed.concat(customs()).map(s=>{const x=entry(s.id);return {...s,...x,reviews:val(x.reviews===undefined?s.reviews:x.reviews,1e7),rating:val(x.rating===undefined?s.rating:x.rating,5)}})}
  function mapURL(s){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.name+' '+s.area+' '+s.pref)}
  function searchURL(){const place=$('pref').value||(region==='すべて'?'':region);return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([place,$('query').value.trim(),'チャーハン'].filter(Boolean).join(' '))}
  function setPrefs(){const options='<option value="">全国</option>'+prefs.map(p=>'<option value="'+p+'">'+p+'</option>').join('');$('pref').innerHTML=options;$('edit-pref').innerHTML=options.replace('<option value="">全国</option>','<option value="">都道府県を選択</option>')}
  function drawAreas(){$('areas').innerHTML=['すべて',...regions].map(x=>'<button type="button" class="chip '+(region===x?'active':'')+'" data-region="'+x+'" aria-pressed="'+(region===x)+'">'+x+'</button>').join('')}
  function card(s,i,sort){
    const count=s.reviews===null?'—':s.reviews.toLocaleString('ja-JP');
    const rating=s.rating===null?'—':'★ '+s.rating.toFixed(1);
    const rank=(sort==='reviews'?'RANK ':'PICK ')+String(i+1).padStart(2,'0');
    const custom=s.id.startsWith('custom-');
    return '<article class="card"><div class="card-top"><div><div class="rank">'+rank+'</div><h3>'+esc(s.name)+'</h3><div class="place">'+esc(s.pref+' '+(s.area||''))+(s.visited?'<span class="visited"> · 訪問済み</span>':'')+'</div></div>'+
      '<button type="button" class="heart '+(s.fav?'on':'')+'" data-fav="'+esc(s.id)+'" aria-label="'+esc(s.name)+'をお気に入り'+(s.fav?'から外す':'に入れる')+'" aria-pressed="'+!!s.fav+'">'+(s.fav?'♥':'♡')+'</button></div>'+
      '<div class="figures"><div><strong>'+count+'</strong> <small>口コミ'+(s.reviews===null?'未入力':'参考値')+'</small></div><div><strong>'+rating+'</strong> <small>評価'+(s.rating===null?'未入力':'参考値')+'</small></div></div>'+
      '<div class="tag">'+esc(s.note||'')+'</div>'+(s.memo?'<div class="memo">'+esc(s.memo)+'</div>':'')+
      '<div class="actions"><a class="action primary" href="'+mapURL(s)+'" target="_blank" rel="noopener">地図・最新情報</a><button class="action" type="button" data-edit="'+esc(s.id)+'">数値・メモ</button>'+
      '<button class="action" type="button" data-visit="'+esc(s.id)+'">'+(s.visited?'訪問を取り消す':'訪問済みにする')+'</button>'+
      (custom?'<button class="action" type="button" data-delete="'+esc(s.id)+'">削除</button>':'')+'</div></article>';
  }
  function render(){
    drawAreas();const pref=$('pref').value,q=$('query').value.trim().toLocaleLowerCase('ja'),v=$('view').value,sort=$('sort').value;
    $('map-search').href=searchURL();
    let list=rows().filter(s=>(!pref||s.pref===pref)&&(region==='すべて'||regionOf(s.pref)===region)&&
      (!q||(s.name+' '+s.pref+' '+s.area+' '+(s.note||'')+' '+(s.memo||'')).toLocaleLowerCase('ja').includes(q))&&
      (v==='all'||(v==='fav'&&s.fav)||(v==='visited'&&s.visited)||(v==='todo'&&!s.visited)));
    list.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'ja'):
      sort==='rating'?(b.rating??-1)-(a.rating??-1)||(b.reviews??-1)-(a.reviews??-1):
      (b.reviews??-1)-(a.reviews??-1)||(b.rating??-1)-(a.rating??-1));
    $('result-title').textContent=v==='fav'?'お気に入り':v==='visited'?'訪問済み':v==='todo'?'未訪問':'登録店一覧';
    $('result-count').textContent=list.length+'店 / 登録'+rows().length+'店';
    $('list').innerHTML=list.length?list.map((s,i)=>card(s,i,sort)).join(''):
      '<div class="empty">この条件の登録店はありません。<br>上の地図から探して、お店を追加できます。</div>';
  }
  function openEdit(id){
    const s=id?rows().find(x=>x.id===id):{id:'',name:'',pref:$('pref').value,area:'',reviews:null,rating:null,memo:''};
    if(!s)return;
    $('edit-id').value=s.id;$('edit-title').textContent=id?s.name:'お店を追加';
    $('edit-name').value=s.name;$('edit-pref').value=s.pref;$('edit-area').value=s.area||'';
    $('edit-reviews').value=s.reviews??'';$('edit-rating').value=s.rating??'';$('edit-memo').value=s.memo||'';
    $('editor').showModal();
  }
  function toggle(id,field){data[id]={...entry(id),[field]:!entry(id)[field]};save();render()}
  $('list').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.fav)toggle(b.dataset.fav,'fav');
    else if(b.dataset.visit)toggle(b.dataset.visit,'visited');
    else if(b.dataset.edit)openEdit(b.dataset.edit);
    else if(b.dataset.delete){
      if(!confirm('この登録店を削除しますか？'))return;
      data.__custom=customs().filter(s=>s.id!==b.dataset.delete);delete data[b.dataset.delete];save();render();
    }
  });
  $('add-shop').addEventListener('click',()=>openEdit(''));
  $('cancel').addEventListener('click',()=>$('editor').close());
  $('edit-form').addEventListener('submit',e=>{
    e.preventDefault();
    const id=$('edit-id').value,name=$('edit-name').value.trim(),pref=$('edit-pref').value,area=$('edit-area').value.trim();
    const rText=$('edit-reviews').value,tText=$('edit-rating').value,r=val(rText,1e7),t=val(tText,5);
    if(!name||!prefs.includes(pref)||rText!==''&&(r===null||!Number.isInteger(r))||tText!==''&&t===null){
      alert('店名と都道府県、正しい数値を入力してください。');return;
    }
    const fields={name:name.slice(0,100),pref,area:area.slice(0,100),reviews:r,rating:t===null?null:Math.round(t*10)/10,memo:$('edit-memo').value.slice(0,1000)};
    if(id)data[id]={...entry(id),...fields};
    else{
      const newId='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
      data.__custom=[...customs(),{id:newId,name:fields.name,pref,area:fields.area,reviews:r,rating:t,note:'自分で追加した店'}];
      data[newId]={memo:fields.memo};
    }
    save();$('editor').close();render();
  });
  $('areas').addEventListener('click',e=>{
    const b=e.target.closest('button[data-region]');if(!b)return;region=b.dataset.region;
    if($('pref').value&&region!=='すべて'&&regionOf($('pref').value)!==region)$('pref').value='';
    render();
  });
  $('pref').addEventListener('change',()=>{region=$('pref').value?regionOf($('pref').value):'すべて';render()});
  ['query','sort','view'].forEach(id=>$(id).addEventListener(id==='query'?'input':'change',render));
  $('export').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({app:'zenkoku-chahan-personal',version:2,entries:data},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='全国チャーハン帖_記録.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
  $('import-btn').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>2e6)throw Error('ファイルが大きすぎます');
      const obj=JSON.parse(await file.text()),old=obj.app==='gifu-chahan-personal'&&obj.version===1;
      if(!(old||obj.app==='zenkoku-chahan-personal'&&obj.version===2)||!obj.entries||typeof obj.entries!=='object'||Array.isArray(obj.entries))
        throw Error('このアプリの記録ファイルではありません');
      const incoming=obj.entries,next={};
      for(const s of seed){
        const x=incoming[s.id];if(!x||typeof x!=='object')continue;
        next[s.id]={fav:x.fav===true,visited:x.visited===true,
          name:String(x.name||s.name).slice(0,100),pref:prefs.includes(x.pref)?x.pref:s.pref,
          area:String(x.area??s.area).slice(0,100),reviews:val(x.reviews===undefined?s.reviews:x.reviews,1e7),
          rating:val(x.rating===undefined?s.rating:x.rating,5),memo:String(x.memo||'').slice(0,1000)};
      }
      if(Array.isArray(incoming.__custom)){
        next.__custom=incoming.__custom.filter(x=>x&&typeof x==='object'&&
          typeof x.id==='string'&&/^custom-[a-z0-9-]+$/.test(x.id)&&prefs.includes(x.pref)&&x.name)
          .slice(0,1000).map(x=>({id:x.id,name:String(x.name).slice(0,100),pref:x.pref,
            area:String(x.area||'').slice(0,100),reviews:val(x.reviews,1e7),
            rating:val(x.rating,5),note:'自分で追加した店'}));
        for(const x of next.__custom){
          const y=incoming[x.id]||{};
          next[x.id]={fav:y.fav===true,visited:y.visited===true,memo:String(y.memo||'').slice(0,1000),
            reviews:y.reviews===undefined?x.reviews:val(y.reviews,1e7),
            rating:y.rating===undefined?x.rating:val(y.rating,5)};
        }
      }
      if(!confirm('現在の記録を読み込んだ記録に置き換えますか？'))return;
      data=next;save();render();alert('記録を読み込みました');
    }catch(err){alert('読み込めませんでした：'+err.message)}
    finally{e.target.value=''}
  });
  setPrefs();render();
})();
