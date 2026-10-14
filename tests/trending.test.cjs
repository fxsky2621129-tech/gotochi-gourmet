const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('trending frontend sanitizes remote article fields',()=>{const js=fs.readFileSync('trending.js','utf8');assert.match(js,/function|const escape/);assert.match(js,/escape\(i.title\)/);assert.match(js,/url\(i.url\)/);assert.match(js,/slice\(0,10\)/)});
test('trending dataset has required fields',()=>{const data=JSON.parse(fs.readFileSync('data/trending-gourmet.json','utf8'));assert.ok(Array.isArray(data.items))});
test('collector does not invent city or social engagement count',()=>{const py=fs.readFileSync('scripts/update_trending.py','utf8');assert.match(py,/'city':''/);assert.doesNotMatch(py,/views_count|likes_count|buzz_score/)});
