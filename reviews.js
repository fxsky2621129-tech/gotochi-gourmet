// Google Places content stays in memory and is never saved to browser storage.
(() => {
  'use strict';
  let loader, loadedKey;
  const TYPES = {
    ラーメン店:'ramen_restaurant', つけ麺店:'ramen_restaurant',
    海鮮料理店:'seafood_restaurant', 海鮮丼専門店:'seafood_restaurant', 寿司店:'sushi_restaurant',
    ステーキ店:'steak_house', 焼肉店:'yakiniku_restaurant', 焼鳥店:'yakitori_restaurant',
    とんかつ店:'tonkatsu_restaurant',
    ケーキ店:'cake_shop', 和菓子店:'confectionery', 洋菓子店:'pastry_shop'
  };
  const DESSERT_TYPES = ['dessert_shop','dessert_restaurant','cake_shop','confectionery',
    'candy_store','pastry_shop','bakery','ice_cream_shop'];
  const compact = text => String(text || '').normalize('NFKC').replace(/\s+/g, '');
  const count = place => Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0 ?
    place.userRatingCount : -1;
  const rating = place => typeof place.rating === 'number' && place.rating >= 0 && place.rating <= 5 ?
    place.rating : -1;

  async function load(key) {
    if (!key) throw Error('KEY_REQUIRED');
    if (loadedKey && key !== loadedKey) throw Error('KEY_CHANGED');
    if (!window.google?.maps?.importLibrary) {
      if (!loader) {
        loadedKey = key;
        loader = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timer = setTimeout(() => fail(), 15000);
          function cleanup() { clearTimeout(timer); delete window.initGourmetPlaces; }
          function fail() {
            cleanup(); script.remove(); loader = null;
            reject(Error('LOAD_FAILED'));
          }
          window.initGourmetPlaces = () => { cleanup(); resolve(); };
          script.onerror = fail;
          script.async = true;
          script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) +
            '&v=weekly&loading=async&libraries=places&language=ja&region=JP&callback=initGourmetPlaces';
          document.head.appendChild(script);
        });
      }
      await loader;
    }
    return window.google.maps.importLibrary('places');
  }

  function request(options) {
    const req = {
      textQuery: options.text,
      fields: ['id','displayName','formattedAddress','types','primaryType','rating',
        'userRatingCount','googleMapsURI','attributions','businessStatus','location'],
      language:'ja', region:'jp', maxResultCount:20
    };
    const type = TYPES[options.term] ||
      (options.mode === 'roadstation' || options.mode === 'sweets' ||
       (options.mode === 'localchain' && ['軽食・持ち帰り','カフェ・喫茶'].includes(options.chainKind)) ? '' : 'restaurant');
    if (type) { req.includedType = type; req.useStrictTypeFiltering = true; }
    if (options.coords) req.locationBias = {
      center: {lat:options.coords.lat, lng:options.coords.lng}, radius:10000
    };
    return req;
  }

  function distanceKm(a, b) {
    const rad = n => n * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1-x)));
  }
  function position(place) {
    if (!place.location) return null;
    const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
    const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
  }
  function rank(places, options) {
    const seen = new Set(), type = request(options).includedType;
    return places.filter(place => {
      if (options.mode === 'localchain') {
        const names = [options.chainName, ...(options.chainAliases || [])].filter(Boolean);
        if (!names.some(name => compact(place.displayName).includes(compact(name)))) return false;
      }
      if (!place.id || seen.has(place.id)) return false;
      seen.add(place.id);
      if (place.businessStatus === 'CLOSED_PERMANENTLY' || place.businessStatus === 'FUTURE_OPENING') return false;
      const address = compact(place.formattedAddress);
      if (options.pref && !address.includes(compact(options.pref))) return false;
      if (options.city && !address.includes(compact(options.city))) return false;
      const types = [...(place.types || []), place.primaryType].filter(Boolean);
      if (type && !types.includes(type)) return false;
      if (!type && options.mode === 'localchain' &&
        !types.some(t => t === 'food' || t === 'meal_takeaway' || t === 'convenience_store' || t.endsWith('restaurant') ||
          (options.chainKind === 'カフェ・喫茶' && ['cafe','coffee_shop','tea_house'].includes(t)))) return false;
      if (!type && options.mode === 'sweets' && !types.some(t => DESSERT_TYPES.includes(t))) return false;
      if (options.mode === 'roadstation' && !compact(place.displayName).includes('道の駅')) return false;
      if (options.coords) {
        const pos = position(place);
        if (!pos || distanceKm(options.coords, pos) > 10) return false;
      }
      return true;
    }).sort((a, b) => count(b) - count(a) || rating(b) - rating(a) ||
      String(a.displayName || '').localeCompare(String(b.displayName || ''), 'ja'));
  }

  async function search(key, options) {
    const {Place} = await load(key);
    const {places} = await Place.searchByText(request(options));
    const candidates = Array.isArray(places) ? places : [];
    return {candidates:candidates.length, places:rank(candidates, options)};
  }
  window.GourmetReviews = {search, request, rank, count, rating};
})();
