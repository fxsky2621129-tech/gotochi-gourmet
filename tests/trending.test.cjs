const test=require('node:test'),assert=require('node:assert/strict');
const {selected,card,url,load}=require('../trending.js');
const now=Date.parse('2026-10-15T00:00:00Z');
const item=(x={})=>({title:'SNSケーキ',url:'https://news.google.com/rss/articles/test',source:'媒体',published:'2026-10-14T00:00:00Z',prefecture:'東京都',city:'',classification:'sns-article',genre:'sweets',...x});
test('filters region, genre, keyword and never assigns unknown cities',()=>{
 const xs=[item(),item({title:'ラーメン',genre:'food',prefecture:''})];
 assert.equal(selected(xs,{pref:'東京都'},now).length,1);
 assert.equal(selected(xs,{genre:'food'},now)[0].title,'ラーメン');
 assert.equal(selected(xs,{q:'ケーキ'},now).length,1);
 assert.equal(selected(xs,{city:'新宿区'},now).length,0);
});
test('rejects invalid, future, expired and unsafe records',()=>{
 const xs=[null,{},item({published:'invalid'}),item({published:'2026-10-16'}),item({published:'2026-09-01'}),item({url:'javascript:alert(1)'}),item({city:'推測'}),item()];
 assert.equal(selected(xs,{},now).length,1);
 assert.equal(selected([item({published:'2026-10-01'})],{days:7},now).length,0);
 assert.equal(selected([item({published:'2026-10-01'})],{days:30},now).length,1);
});
test('sorts newest, removes duplicate headlines and caps at ten',()=>{
 const xs=Array.from({length:15},(_,n)=>item({title:'記事'+n,published:new Date(now-n*3600000).toISOString()}));
 const out=selected([...xs,xs[0]],{},now);assert.equal(out.length,10);assert.equal(out[0].title,'記事0');
});
test('escapes HTML and does not create unverified map links',()=>{
 const html=card(item({title:'<img onerror="alert(1)">'}));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('maps'));
 for(const u of ['https://evil.example','https://news.google.com@evil.example','http://news.google.com'])assert.equal(url(u),'');
});
test('loads latest production dataset and falls back if unavailable',async()=>{
 const calls=[];const result=await load(async path=>{calls.push(path);if(calls.length===1)throw Error('offline');return {ok:true,json:async()=>({items:[]})}},true);
 assert.equal(result.fallback,true);assert.match(calls[0],/raw.githubusercontent.com/);assert.equal(calls[1],'./data/trending-gourmet.json');
});
test('rejects malformed datasets and reports complete fetch failure',async()=>{
 await assert.rejects(load(async()=>({ok:true,json:async()=>null}),false));
 await assert.rejects(load(async()=>({ok:false}),true));
});

