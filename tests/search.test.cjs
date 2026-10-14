const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cityScript = fs.readFileSync(path.join(__dirname, '../municipalities.js'), 'utf8');
const reviewScript = fs.readFileSync(path.join(__dirname, '../reviews.js'), 'utf8');

// Run the actual page and its event handlers without external services.
function page({ savedQuery = '', storageBlocked = false, cityDataUnavailable = false } = {}) {
  function element(attrs = {}) {
    const classes = new Set((attrs.class || '').split(' ').filter(Boolean));
    const node = {
      value: '', textContent: '', innerHTML: '', disabled: false,
      dataset: Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-'))
        .map(([k, v]) => [k.slice(5), v])),
      attrs: { ...attrs }, listeners: {},
      classList: {
        add: c => classes.add(c), remove: c => classes.delete(c),
        contains: c => classes.has(c),
        toggle(c, on) { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c); }
      },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); },
      fire(k, detail = {}) { for (const fn of this.listeners[k] || []) fn({ target: this, ...detail }); }
    };
    return node;
  }
  const markup = html.split('<script>')[0];
  const nodes = [...markup.matchAll(/<(?:input|button|select|div|main|section|datalist|p|details)[^>]*>/g)].map(match => {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)]
      .map(([, k, v]) => [k, v]));
    return element(attrs);
  });
  const ids = Object.fromEntries(nodes.filter(n => n.attrs.id).map(n => [n.attrs.id, n]));
  const chips = nodes.filter(n => n.dataset.mode);
  const quick = nodes.filter(n => n.dataset.quick);
  const nearby = nodes.filter(n => n.dataset.nearby);
  const opened = [], alerts = [], saved = new Map([['gourmet-last-query-v2', savedQuery]]);
  let locationRequest;
  const context = vm.createContext({
    document: {
      getElementById: id => ids[id],
      querySelectorAll: selector => ({ '.chip': chips, '[data-quick]': quick, '[data-nearby]': nearby }[selector] || [])
    },
    window: {
      location: { href: 'app' },
      open(url, target, features) {
        const win = { location: { href: url }, target, features, close() { this.closed = true; } };
        opened.push(win);
        return win;
      }
    },
    localStorage: {
      getItem(key) { if (storageBlocked) throw Error('blocked'); return saved.get(key) || null; },
      setItem(key, value) { if (storageBlocked) throw Error('blocked'); saved.set(key, value); }
    },
    navigator: { geolocation: { getCurrentPosition(ok, fail, options) { locationRequest = { ok, fail, options }; } } },
    alert: message => alerts.push(message),
    URL, setTimeout, clearTimeout
  });
  if (!cityDataUnavailable) vm.runInContext(cityScript, context);
  vm.runInContext(reviewScript, context);
  vm.runInContext(script, context);
  return {
    ids, opened, alerts, saved, context,
    run: expression => vm.runInContext(expression, context),
    query(value) { ids.q.value = value; ids.q.fire('input'); },
    pref(value) { ids.pref.value = value; ids.pref.fire('change'); },
    city(value) { ids.city.value = value; ids.city.fire('change'); },
    display(value) { ids.resultMode.value = value; ids.resultMode.fire('change'); },
    mode(value) { chips.find(n => n.dataset.mode === value).fire('click'); },
    kind(value) { ids.kind.value = value; ids.kind.fire('change'); },
    quick(value) { quick.find(n => n.dataset.quick === value).fire('click'); },
    nearby(value) { nearby.find(n => n.dataset.nearby === value).fire('click'); },
    geolocate() { locationRequest.ok({ coords: { latitude: 35.4, longitude: 136.7 } }); },
    locationFail() { locationRequest.fail({ code: 1 }); }
  };
}
function mapsText(url) {
  const parsed = new URL(url);
  return parsed.searchParams.get('query') || decodeURIComponent(parsed.pathname.split('/search/')[1].split('/')[0]);
}

test('every category searches the selected business type with the chosen region', async t => {
  const cases = {
    all: '飲食店', ramen: 'ラーメン店', famous: '人気の飲食店',
    tourist: '観光地 飲食店', roadstation: '道の駅', sweets: 'スイーツ店',
    seafood: '海鮮料理店', noodle: '麺料理店', meat: '肉料理店'
  };
  for (const [mode, term] of Object.entries(cases)) await t.test(mode, () => {
    const p = page();
    p.pref('山形');
    p.mode(mode);
    // "All" with a location and no dish must still search restaurants.
    assert.equal(mapsText(p.run('mapsSearchUrl()')), '山形県 ' + term);
    assert.equal(p.context.window.location.href, 'app');
  });
});

test('noodle and meat searches do not combine alternative dishes', () => {
  const p = page();
  p.query('長野 麺 ラーメン うどん そば');
  p.mode('noodle');
  p.kind('そば店');
  assert.equal(mapsText(p.run('mapsSearchUrl()')), '長野 そば店');
  p.mode('meat');
  p.kind('ステーキ店');
  assert.equal(mapsText(p.run('mapsSearchUrl()')), '長野 ステーキ店');
  assert.equal(p.context.window.location.href, 'app');
});

test('curated chain search uses only region and brand, ignoring national chain free text', () => {
  const p=page(); p.pref('岐阜'); p.city('岐阜市'); p.query('ガスト サイゼリヤ'); p.mode('localchain');
  p.ids.chain.value='岐阜タンメン'; p.ids.chain.fire('change');
  assert.equal(p.run('searchText()'),'岐阜県 岐阜市 岐阜タンメン');
  assert.equal(new URL(p.run('webSearchUrl()')).searchParams.get('q'),'岐阜県 岐阜市 岐阜タンメン');
  p.ids.searchBtn.fire('click');
  assert.equal(mapsText(p.context.window.location.href),'岐阜県 岐阜市 岐阜タンメン');
});

test('unselected or unregistered chain searches never fall back to broad map or API search', async () => {
  const p=page(); p.pref('北海道'); p.quick('localchain');
  assert.equal(p.context.window.location.href,'app');
  assert.equal(p.ids.chain.disabled,true);
  assert.ok(p.ids.results.innerHTML.includes('まだ登録されていません'));
  assert.ok(!p.ids.results.innerHTML.includes('href='));
  p.display('reviews'); p.ids.placesKey.value='test';
  const requests=connectMockPlaces(p,()=>({places:[]}));
  await p.run('searchStores()');
  assert.equal(requests.length,0);
  p.ids.locBtn.fire('click'); assert.equal(p.opened.length,0);
});

test('prefecture and cuisine changes invalidate incompatible selected chains', () => {
  const p=page(); p.pref('岐阜'); p.mode('localchain');
  p.ids.chain.value='岐阜タンメン'; p.ids.chain.fire('change');
  p.kind('ローカルチェーン 回転寿司');
  assert.equal(p.ids.chain.value,'');
  assert.ok(p.ids.chain.innerHTML.includes('魚魚丸'));
  assert.ok(!p.ids.chain.innerHTML.includes('岐阜タンメン'));
  p.pref('群馬'); assert.equal(p.ids.chain.disabled,true);
  p.kind('ローカルチェーン ファミリーレストラン');
  assert.ok(p.ids.chain.innerHTML.includes('フライングガーデン'));
  p.ids.chain.value='フライングガーデン'; p.ids.chain.fire('change');
  p.pref('静岡'); assert.equal(p.ids.chain.value,'');
  assert.ok(p.ids.chain.innerHTML.includes('さわやか'));
  p.mode('ramen'); assert.equal(p.ids.chainOptions.classList.contains('hidden'),true);
});

test('review search excludes national chains even when they have more reviews', async () => {
  const p=page(); p.pref('岐阜'); p.city('岐阜市'); p.mode('localchain');
  p.ids.chain.value='岐阜タンメン'; p.ids.chain.fire('change'); p.display('reviews'); p.ids.placesKey.value='test';
  const candidates=[
    store('local',10,{displayName:'岐阜タンメン 岐阜本店',formattedAddress:'岐阜県岐阜市'}),
    store('national',99999,{displayName:'ガスト 岐阜店',formattedAddress:'岐阜県岐阜市'})
  ];
  const requests=connectMockPlaces(p,()=>({places:candidates}));
  await p.run('searchStores()');
  assert.equal(requests[0].textQuery,'岐阜県 岐阜市 岐阜タンメン');
  assert.ok(p.ids.results.innerHTML.includes('岐阜タンメン 岐阜本店'));
  assert.ok(!p.ids.results.innerHTML.includes('ガスト'));
});

test('all selectable dish types keep the area and replace conflicting cuisine', async t => {
  const cases = {
    sweets: ['スイーツ店', '和菓子店', '洋菓子店', 'ケーキ店', 'パフェ専門店'],
    seafood: ['海鮮料理店', '海鮮丼専門店', '寿司店'],
    noodle: ['麺料理店', 'ラーメン店', 'うどん店', 'そば店', 'つけ麺店', 'パスタ専門店'],
    meat: ['肉料理店', '焼肉店', 'ステーキ店', '焼鳥店', 'とんかつ店', 'ハンバーグ専門店']
  };
  for (const [mode, kinds] of Object.entries(cases)) for (const kind of kinds) await t.test(kind, () => {
    const p = page();
    p.query('高山 飛騨牛 ラーメン カフェ 人気 グルメ');
    p.mode(mode);
    p.kind(kind);
    assert.equal(mapsText(p.run('mapsSearchUrl()')), '高山 ' + kind);
    assert.equal(new URL(p.run('webSearchUrl()')).searchParams.get('q'), '高山 ' + kind);
  });
});

test('ramen replaces unrelated whole keywords but keeps shop names and extra requirements', () => {
  const p = page();
  p.query('山形市・焼肉、人気，グルメ おすすめ');
  p.mode('ramen');
  assert.equal(p.run('searchText()'), '山形市 ラーメン店');
  p.query('岐南 九州ラーメンうまか 味噌 濃厚');
  assert.equal(p.run('searchText()'), '岐南 九州ラーメンうまか 味噌 濃厚 ラーメン店');
  assert.ok(p.ids.results.innerHTML.includes(encodeURIComponent('岐南 九州ラーメンうまか 味噌 濃厚 ラーメン店')));
});

test('a single compatible input dish selects its specific subtype', () => {
  const p = page();
  p.query('長野 蕎麦');
  p.mode('noodle');
  assert.equal(p.ids.kind.value, 'そば店');
  assert.equal(p.run('searchText()'), '長野 そば店');
  p.query('名古屋 焼き鳥');
  p.mode('meat');
  assert.equal(p.ids.kind.value, '焼鳥店');
  assert.equal(p.run('searchText()'), '名古屋 焼鳥店');
});

test('quick search replaces the previous category and keeps typed location', () => {
  const p = page();
  p.query('山形市 ラーメン');
  p.mode('ramen');
  p.quick('sweets');
  assert.equal(mapsText(p.context.window.location.href), '山形市 スイーツ店');
  p.quick('sweets');
  assert.equal(mapsText(p.context.window.location.href), '山形市 スイーツ店');
  assert.equal(p.ids.q.value, '山形市 ラーメン');
  p.pref('千葉');
  p.query('人気グルメ・千葉');
  p.mode('famous');
  p.ids.searchBtn.fire('click');
  assert.equal(mapsText(p.context.window.location.href), '千葉県 人気の飲食店');
});

test('all prefectures use unambiguous suffixes and do not duplicate the selected prefecture', () => {
  const p = page();
  for (const [pref, full] of [['東京', '東京都'], ['京都', '京都府'], ['大阪', '大阪府'], ['岐阜', '岐阜県'], ['北海道', '北海道']]) {
    p.query(pref + ' ラーメン');
    p.pref(pref);
    p.mode('ramen');
    assert.equal(p.run('searchText()'), full + ' ラーメン店');
  }
});

test('famous searches keep an explicitly requested cuisine', () => {
  const p = page();
  p.query('山形市 ラーメン 人気 グルメ');
  p.mode('famous');
  p.ids.searchBtn.fire('click');
  assert.equal(mapsText(p.context.window.location.href), '山形市 ラーメン 人気店');
});

test('editing the input immediately refreshes every search link without navigation', () => {
  const p = page();
  p.mode('ramen');
  p.query('山形市 焼肉');
  assert.ok(p.ids.results.innerHTML.includes(encodeURIComponent('山形市 ラーメン店')));
  assert.ok(!p.ids.results.innerHTML.includes('道の駅を検索'));
  assert.equal(p.context.window.location.href, 'app');
});

test('free-text searches and saved queries retain their original cuisine', () => {
  const p = page({ savedQuery: '白川郷 食べ歩き' });
  assert.equal(p.ids.q.value, '白川郷 食べ歩き');
  p.query('高山 飛騨牛');
  assert.equal(p.run('searchText()'), '高山 飛騨牛');
  assert.equal(p.saved.get('gourmet-last-query-v2'), '高山 飛騨牛');
  p.query('');
  assert.equal(p.run('searchText()'), '飲食店');
});

test('geolocation retains the selected dish and clears the previous location', () => {
  const p = page();
  p.query('遠い町 ステーキ');
  p.pref('山形');
  p.mode('meat');
  p.ids.locBtn.fire('click');
  assert.equal(p.ids.locBtn.disabled, true);
  p.geolocate();
  assert.equal(p.ids.locBtn.disabled, false);
  assert.equal(p.ids.pref.value, '');
  assert.equal(p.ids.q.value, '');
  assert.equal(mapsText(p.opened[0].location.href), 'ステーキ店');
  assert.ok(p.opened[0].location.href.includes('@35.4,136.7,14z'));
  p.nearby('ramen');
  assert.equal(mapsText(p.opened.at(-1).location.href), 'ラーメン店');
  assert.equal(p.run('STATE.mode'), 'ramen');
  assert.ok(new URL(p.run('webSearchUrl()')).searchParams.get('q').includes('35.4,136.7 周辺'));
  p.pref('愛知');
  assert.equal(p.run('STATE.coords'), null);
  assert.equal(mapsText(p.run('mapsSearchUrl()')), '愛知県 ラーメン店');
});

test('location cancellation and location errors restore controls', () => {
  const p = page();
  p.mode('ramen');
  p.ids.locBtn.fire('click');
  p.locationFail();
  assert.equal(p.ids.locBtn.disabled, false);
  assert.equal(p.ids.pref.disabled, false);
  assert.equal(p.opened[0].closed, true);
  assert.equal(p.run('STATE.coords'), null);
  assert.equal(p.alerts.length, 1);
  p.ids.locBtn.fire('click');
  p.geolocate();
  p.ids.locBtn.fire('click');
  assert.equal(p.run('STATE.coords'), null);
  assert.equal(p.ids.nearbyPanel.classList.contains('hidden'), true);
});

test('Enter searches but IME composition does not trigger navigation', () => {
  const p = page();
  p.query('山形市');
  p.mode('ramen');
  let prevented = 0;
  p.ids.q.fire('keydown', { key: 'Enter', isComposing: true, preventDefault() { prevented++; } });
  p.ids.q.fire('keydown', { key: 'Enter', keyCode: 229, preventDefault() { prevented++; } });
  assert.equal(p.context.window.location.href, 'app');
  p.ids.q.fire('keydown', { key: 'Enter', preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(mapsText(p.context.window.location.href), '山形市 ラーメン店');
});

test('storage restrictions do not prevent searching and input is escaped', () => {
  const p = page({ storageBlocked: true });
  p.query('<img src=x onerror=alert(1)>');
  p.mode('ramen');
  assert.ok(p.ids.results.innerHTML.includes('&lt;img'));
  assert.ok(!p.ids.results.innerHTML.includes('<img'));
  p.ids.searchBtn.fire('click');
  assert.ok(mapsText(p.context.window.location.href).endsWith('ラーメン店'));
});

test('city suggestions cover every prefecture and include towns, villages and city wards', () => {
  const p = page();
  assert.equal(p.run('Object.keys(CITY_DATA).length'), 47);
  p.pref('山形');
  assert.ok(p.ids.city.innerHTML.includes('山形市'));
  assert.ok(p.ids.city.innerHTML.includes('大石田町'));
  assert.ok(p.ids.city.innerHTML.includes('鮭川村'));
  p.pref('愛知');
  assert.ok(p.ids.city.innerHTML.includes('名古屋市 中区'));
  assert.ok(!p.ids.city.innerHTML.includes('山形市'));
  p.pref('東京');
  assert.ok(p.ids.city.innerHTML.includes('千代田区'));
});

test('city and category are used in main, quick and web searches', () => {
  const p = page();
  p.pref('山形');
  p.city('山形市');
  p.mode('ramen');
  assert.equal(p.run('searchText()'), '山形県 山形市 ラーメン店');
  assert.equal(new URL(p.run('webSearchUrl()')).searchParams.get('q'), '山形県 山形市 ラーメン店');
  p.quick('sweets');
  assert.equal(mapsText(p.context.window.location.href), '山形県 山形市 スイーツ店');
});

test('prefecture changes remove the old city and never navigate automatically', () => {
  const p = page();
  p.pref('山形');
  p.city('山形市');
  p.mode('ramen');
  p.pref('岐阜');
  assert.equal(p.ids.city.value, '');
  assert.equal(p.run('searchText()'), '岐阜県 ラーメン店');
  assert.equal(p.context.window.location.href, 'app');
});

test('city entry normalizes spaces and avoids duplicate prefecture, city and ward names', () => {
  const p = page();
  p.pref('愛知');
  p.city('名古屋市 中区');
  p.query('名古屋市 中区 ステーキ');
  p.mode('meat');
  assert.equal(p.run('searchText()'), '愛知県 名古屋市 中区 ステーキ店');
  assert.ok(p.ids.resultTitle.textContent.includes('名古屋市 中区'));
});

test('missing municipality data disables the dropdown and explains free-text fallback', () => {
  const p = page({ cityDataUnavailable: true });
  p.pref('岐阜');
  assert.equal(p.ids.city.disabled, true);
  assert.ok(p.ids.cityNote.textContent.includes('読み込めません'));
  p.query('岐阜市');
  p.mode('ramen');
  assert.equal(p.run('searchText()'), '岐阜県 岐阜市 ラーメン店');
});

test('dropdown requires a prefecture, offers all cities and rejects a mismatched city', () => {
  const p = page();
  assert.match(html, /<select id="city"/);
  assert.equal(p.ids.city.disabled, true);
  p.city('山形市');
  assert.equal(p.run('searchText()'), '飲食店');
  p.pref('岐阜');
  assert.equal(p.ids.city.disabled, false);
  assert.ok(p.ids.city.innerHTML.includes('市区町村すべて'));
  p.city('山形市');
  assert.equal(p.run('searchText()'), '岐阜県 飲食店');
  p.city('岐阜市');
  p.city('');
  assert.equal(p.run('searchText()'), '岐阜県 飲食店');
  p.pref('');
  assert.equal(p.ids.city.disabled, true);
});

test('city selection and current-location search are mutually exclusive', () => {
  const p = page();
  p.pref('山形');
  p.city('山形市');
  p.mode('ramen');
  p.ids.locBtn.fire('click');
  assert.equal(p.ids.city.disabled, true);
  p.geolocate();
  assert.equal(p.ids.city.value, '');
  assert.equal(p.ids.city.disabled, true);
  assert.equal(mapsText(p.opened[0].location.href), 'ラーメン店');
  p.pref('岐阜');
  p.city('岐阜市');
  assert.equal(p.run('STATE.coords'), null);
  assert.equal(mapsText(p.run('mapsSearchUrl()')), '岐阜県 岐阜市 ラーメン店');
});

test('location errors restore the appropriate dropdown state and selection', () => {
  for (const pref of ['', '山形']) {
    const p = page();
    p.pref(pref);
    if (pref) p.city('山形市');
    p.ids.locBtn.fire('click');
    p.locationFail();
    assert.equal(p.ids.city.disabled, !pref);
    assert.equal(p.ids.city.value, pref ? '山形市' : '');
  }
});

test('selecting a city or pressing Enter on the dropdown does not navigate', () => {
  const p = page();
  p.pref('岐阜');
  p.city('岐阜市');
  p.mode('ramen');
  p.ids.city.fire('keydown', {key:'Enter', preventDefault() {}});
  assert.equal(p.context.window.location.href, 'app');
  p.ids.searchBtn.fire('click');
  assert.equal(mapsText(p.context.window.location.href), '岐阜県 岐阜市 ラーメン店');
});

test('hamburg steak searches do not require the hamburger restaurant type', () => {
  const p = page();
  const options = {text:'ハンバーグ専門店', term:'ハンバーグ専門店', mode:'meat'};
  const api = p.context.window.GourmetReviews;
  assert.equal(api.request(options).includedType, 'restaurant');
  const candidates = [{id:'steak', displayName:'ハンバーグ店', types:['restaurant'], userRatingCount:20}];
  assert.equal(api.rank(candidates, options).length, 1);
});

function store(id, reviews, extra = {}) {
  return {
    id, displayName: 'ラーメン' + id, formattedAddress: '日本、山形県山形市',
    types: ['ramen_restaurant', 'restaurant'], primaryType: 'ramen_restaurant',
    rating: 4, userRatingCount: reviews, businessStatus: 'OPERATIONAL', ...extra
  };
}
function connectMockPlaces(p, getResult) {
  const requests = [];
  p.context.window.google = { maps: { async importLibrary(name) {
    assert.equal(name, 'places');
    return { Place: { async searchByText(request) {
      requests.push(request);
      return getResult(request);
    } } };
  } } };
  p.ids.placesKey.value = 'mock-key-for-tests-only';
  return requests;
}

test('review ranking uses actual counts before stars, excludes other cities and categories, and removes duplicate IDs', () => {
  const p = page();
  const places = [
    store('high-star', 20, {rating:5}), store('popular', 1500, {rating:3.5}),
    store('other-city', 9999, {formattedAddress:'山形県天童市'}),
    store('other-pref', 9999, {formattedAddress:'岐阜県山形市'}),
    store('wrong-type', 9999, {types:['hair_salon'], primaryType:'hair_salon'}),
    store('popular', 1500), store('closed', 9999, {businessStatus:'CLOSED_PERMANENTLY'}),
    store('future', 9999, {businessStatus:'FUTURE_OPENING'}), store('unknown', undefined)
  ];
  const ranked = p.context.window.GourmetReviews.rank(places, {
    text:'山形県 山形市 ラーメン店', pref:'山形県', city:'山形市', mode:'ramen', term:'ラーメン店'
  });
  assert.deepEqual(Array.from(ranked, s => s.id), ['popular', 'high-star', 'unknown']);
  assert.equal(places.length, 9);
});

test('equal review counts use rating to break ties and unknown counts remain after zero', () => {
  const p = page();
  const ranked = p.context.window.GourmetReviews.rank([
    store('unknown', null), store('low', 300, {rating:3}),
    store('high', 300, {rating:4.5}), store('zero', 0)
  ], {text:'ラーメン店', mode:'ramen', term:'ラーメン店'});
  assert.deepEqual(Array.from(ranked, s => s.id), ['high','low','zero','unknown']);
});

test('review search sends one request and displays the ten largest counts among retrieved candidates', async () => {
  const p = page();
  const requests = connectMockPlaces(p, () => ({places:Array.from({length:20}, (_, i) => store('店'+i, i*100))}));
  p.pref('山形'); p.city('山形市'); p.mode('ramen'); p.display('reviews');
  await p.run('searchStores()');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].textQuery, '山形県 山形市 ラーメン店');
  assert.equal(requests[0].maxResultCount, 20);
  assert.equal(requests[0].includedType, 'ramen_restaurant');
  assert.equal(requests[0].useStrictTypeFiltering, true);
  assert.ok(requests[0].fields.includes('userRatingCount'));
  const rendered = p.ids.results.innerHTML;
  assert.equal((rendered.match(/<article/g) || []).length, 10);
  assert.ok(rendered.indexOf('ラーメン店19') < rendered.indexOf('ラーメン店18'));
  assert.ok(rendered.includes('1,900件'));
  assert.ok(!rendered.includes('ラーメン店9<'));
  assert.ok(rendered.includes('地域全店を網羅するランキングではありません'));
  assert.ok(rendered.includes('Google Maps'));
  assert.equal(p.context.window.location.href, 'app');
  assert.deepEqual(Array.from(p.saved.keys()), ['gourmet-last-query-v2']);
});

test('missing API key never loads Google or substitutes a purported review-sorted map search', async () => {
  const p = page();
  p.display('reviews');
  await p.run('searchStores()');
  assert.equal(p.context.window.google, undefined);
  assert.equal(p.ids.reviewSettings.open, true);
  assert.ok(p.ids.results.innerHTML.includes('APIキーが必要'));
  assert.equal(p.context.window.location.href, 'app');
  assert.equal(p.opened.length, 0);
});

test('ordinary free searches do not call Places even if a key is present', async () => {
  const p = page();
  const requests = connectMockPlaces(p, () => ({places:[]}));
  p.pref('山形'); p.city('山形市'); p.mode('ramen');
  await p.run('searchStores()');
  assert.equal(requests.length, 0);
  assert.equal(mapsText(p.context.window.location.href), '山形県 山形市 ラーメン店');
});

test('review errors give a clear fallback and never reveal provider errors or keys', async () => {
  const p = page();
  connectMockPlaces(p, () => {throw Error('PRIVATE_KEY_OR_PROVIDER_ERROR');});
  p.display('reviews');
  await p.run('searchStores()');
  assert.ok(p.ids.results.innerHTML.includes('取得できませんでした'));
  assert.ok(p.ids.results.innerHTML.includes('口コミ件数順の指定なし'));
  assert.ok(!p.ids.results.innerHTML.includes('PRIVATE_KEY'));
  assert.ok(!p.ids.results.innerHTML.includes('mock-key-for-tests-only'));
  assert.equal(p.context.window.location.href, 'app');
});

test('changing the city while awaiting a search discards the old result', async () => {
  const p = page();
  let respond;
  const delayed = new Promise(resolve => { respond = resolve; });
  connectMockPlaces(p, () => delayed);
  p.pref('山形'); p.city('山形市'); p.mode('ramen'); p.display('reviews');
  const pending = p.run('searchStores()');
  p.pref('岐阜'); p.city('岐阜市');
  respond({places:[store('OLD-RESULT', 999)]});
  await pending;
  assert.ok(!p.ids.results.innerHTML.includes('OLD-RESULT'));
  assert.ok(p.ids.results.innerHTML.includes('岐阜市'));
});

test('nearby review candidates must be within ten kilometres and have known coordinates', () => {
  const p = page();
  const ranked = p.context.window.GourmetReviews.rank([
    store('near', 100, {location:{lat:35.4, lng:136.7}}),
    store('far', 10000, {location:{lat:36.4, lng:136.7}}),
    store('missing', 20000)
  ], {text:'ラーメン店', mode:'ramen', term:'ラーメン店', coords:{lat:35.4, lng:136.7}});
  assert.deepEqual(Array.from(ranked, s => s.id), ['near']);
});

test('shop names and data-provider labels are escaped; unsafe attribution links are excluded', async () => {
  const p = page();
  connectMockPlaces(p, () => ({places:[store('safe', undefined, {
    displayName:'<img onerror=alert(1)>',
    attributions:[
      {provider:'Good provider', providerURI:'https://example.com/source'},
      {provider:'<unsafe>', providerURI:'javascript:alert(1)'}
    ]
  })]}));
  p.mode('ramen'); p.display('reviews');
  await p.run('searchStores()');
  assert.ok(p.ids.results.innerHTML.includes('&lt;img'));
  assert.ok(p.ids.results.innerHTML.includes('件数不明'));
  assert.ok(p.ids.results.innerHTML.includes('https://example.com/source'));
  assert.ok(!p.ids.results.innerHTML.includes('javascript:'));
  assert.ok(!p.ids.results.innerHTML.includes('<unsafe>'));
});

test('first API search loads the SDK once, and changing a loaded key requires a reload', async () => {
  const p = page(), scripts = [], requests = [];
  p.context.document.createElement = tag => ({tagName:tag, remove() {this.removed = true;}});
  p.context.document.head = { appendChild(script) {
    scripts.push(script);
    p.context.window.google = {maps:{async importLibrary() {
      return {Place:{async searchByText(request) {requests.push(request); return {places:[]};}}};
    }}};
    queueMicrotask(() => p.context.window.initGourmetPlaces());
  }};
  p.ids.placesKey.value = 'first-mock-key';
  p.display('reviews');
  await p.run('searchStores()');
  await p.run('searchStores()');
  assert.equal(scripts.length, 1);
  assert.equal(new URL(scripts[0].src).searchParams.get('key'), 'first-mock-key');
  assert.equal(requests.length, 2);
  p.ids.placesKey.value = 'second-mock-key';
  await p.run('searchStores()');
  assert.equal(requests.length, 2);
  assert.ok(p.ids.results.innerHTML.includes('ページを再読み込み'));
  assert.ok(!p.ids.results.innerHTML.includes('second-mock-key'));
});

test('SDK load failures clear the pending load and display an actionable error', async () => {
  const p = page();
  let removed = false;
  p.context.document.createElement = () => ({remove() {removed = true;}});
  p.context.document.head = {appendChild(script) {queueMicrotask(() => script.onerror());}};
  p.ids.placesKey.value = 'mock-key';
  p.display('reviews');
  await p.run('searchStores()');
  assert.equal(removed, true);
  assert.equal(p.context.window.initGourmetPlaces, undefined);
  assert.ok(p.ids.results.innerHTML.includes('取得できませんでした'));
});
