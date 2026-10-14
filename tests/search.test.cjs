const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Run the actual page and its event handlers without external services.
function page({ savedQuery = '', storageBlocked = false } = {}) {
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
  const nodes = [...markup.matchAll(/<(?:input|button|select|div|main|section)[^>]*>/g)].map(match => {
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
    alert: message => alerts.push(message)
  });
  vm.runInContext(script, context);
  return {
    ids, opened, alerts, saved, context,
    run: expression => vm.runInContext(expression, context),
    query(value) { ids.q.value = value; ids.q.fire('input'); },
    pref(value) { ids.pref.value = value; ids.pref.fire('change'); },
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
  p.quick('famous');
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
  p.quick('famous');
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
