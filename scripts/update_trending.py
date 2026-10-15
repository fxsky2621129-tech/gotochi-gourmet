#!/usr/bin/env python3
"""Google News RSS headlines only; never infer verified venues from titles."""
import datetime as dt
import email.utils
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "trending-gourmet.json"
JST = dt.timezone(dt.timedelta(hours=9))
QUERIES = [
    '"SNSで話題" (スイーツ OR ケーキ OR パフェ OR カフェ)',
    '"TikTokで話題" (スイーツ OR ラーメン OR グルメ)',
    '"インスタで話題" (スイーツ OR 飲食店 OR グルメ)',
    '"SNSで話題" (ラーメン OR 焼肉 OR 飲食店 OR グルメ)',
]
FOOD = re.compile(r'スイーツ|ケーキ|パフェ|プリン|カフェ|和菓子|洋菓子|パン|ドーナツ|ラーメン|焼肉|寿司|グルメ|飲食店|レストラン|料理|食べ歩き|喫茶|かき氷|クレープ|ジェラート|ハンバーグ')
SNS = re.compile(r'SNS|TikTok|インスタ|Instagram|Xで話題|SNSで話題',re.I)
SWEET = re.compile(r'スイーツ|ケーキ|パフェ|プリン|和菓子|洋菓子|ドーナツ|かき氷|クレープ|ジェラート')
PREFS = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split()
def headline_prefecture(title):
    # Only classify regions mentioned in the headline, never the publisher suffix.
    headline = re.sub(r'[（(][^()（）]*[）)]\s*$', '', title.split(' - ')[0])
    matches = {p for p in PREFS if p in headline}
    remainder = headline
    for p in matches: remainder = remainder.replace(p, '')
    for p in PREFS:
        short = p if p == '北海道' else p[:-1]
        if short in remainder: matches.add(p)
    raw = (ROOT / 'municipalities.js').read_text(encoding='utf-8')
    cities = json.loads(re.sub(r',\s*}', '}', raw[raw.index('{'):raw.rindex('}')+1]))
    owners = {}
    for pref, names in cities.items():
        for name in names:
            if name.endswith('市'):
                owners.setdefault(name, set()).add(pref)
    for name, prefs in owners.items():
        if name in headline: matches.update(prefs)
    return next(iter(matches)) if len(matches) == 1 else ''

def fetch(query):
    params=urllib.parse.urlencode({'q':query,'hl':'ja','gl':'JP','ceid':'JP:ja'})
    url='https://news.google.com/rss/search?'+params
    req=urllib.request.Request(url,headers={'User-Agent':'GotochiGourmetRSS/1.0 (+https://github.com/fxsky2621129-tech/gotochi-gourmet)'})
    with urllib.request.urlopen(req,timeout=20) as response:
        root = ET.fromstring(response.read(1_500_000))
        if root.tag != 'rss' or root.find('channel') is None:
            raise ValueError('Expected RSS channel')
        return root

def safe_url(link):
    try:
        p = urllib.parse.urlsplit(link)
        return p.scheme == 'https' and p.hostname == 'news.google.com' and not p.username and not p.password and p.port in (None, 443)
    except (ValueError, TypeError):
        return False

def valid_item(item, now):
    if not isinstance(item, dict): return False
    if not all(isinstance(item.get(k), str) for k in ['title','url','source','published','prefecture','city']): return False
    if not item['title'].strip() or not safe_url(item['url']): return False
    if item.get('classification') != 'sns-article' or item.get('genre') not in ('sweets','food'): return False
    if item['prefecture'] not in ['', *PREFS] or item['city']: return False
    try:
        age = (now-dt.datetime.fromisoformat(item['published'].replace('Z','+00:00'))).total_seconds()
        return 0 <= age <= 30*86400
    except (ValueError, TypeError): return False

def deduplicate(items, now):
    unique = {}
    sources = {unicodedata.normalize('NFKC', i['source']) for i in items if isinstance(i, dict) and isinstance(i.get('source'), str)}
    for item in items:
        if not valid_item(item, now): continue
        title = unicodedata.normalize('NFKC', item['title'].split(' - ')[0]).strip()
        # Syndicated headlines may append the original provider in parentheses.
        suffix = re.search(r'\s*\(([^()]+)\)$', title)
        if suffix and suffix.group(1) in sources: title = title[:suffix.start()]
        key = re.sub(r'\s+', '', title).casefold()
        old = unique.get(key)
        if old is None or item['published'] > old['published']: unique[key] = item
    return sorted(unique.values(), key=lambda i:i['published'], reverse=True)[:300]

def parse(root,now):
    result=[]
    for e in root.findall('./channel/item'):
        title=(e.findtext('title') or '').strip()
        if not FOOD.search(title) or not SNS.search(title):continue
        link=(e.findtext('link') or '').strip()
        if not safe_url(link):continue
        try:
            published=email.utils.parsedate_to_datetime(e.findtext('pubDate') or '')
            if published.tzinfo is None:continue
            published=published.astimezone(dt.timezone.utc)
        except (ValueError,TypeError,IndexError):continue
        age=(now-published).total_seconds()
        if age<0 or age>30*86400:continue
        source=e.find('source')
        provider=source.text.strip() if source is not None and source.text else 'Google ニュース'
        # Location is only marked when the exact prefecture name is in the headline.
        prefecture=headline_prefecture(title)
        result.append({'title':title[:240],'url':link,'source':provider[:120],
           'published':published.isoformat().replace('+00:00','Z'),
           'classification':'sns-article','genre':'sweets' if SWEET.search(title) else 'food',
           'prefecture':prefecture,'city':''})
    return result

def main():
    now=dt.datetime.now(dt.timezone.utc)
    previous={'updated_at':None,'items':[]}
    if DEST.exists():
        try:previous=json.loads(DEST.read_text(encoding='utf-8'))
        except (ValueError,OSError):pass
    if not isinstance(previous, dict): previous={'updated_at':None,'items':[]}
    new=[];success=0
    for query in QUERIES:
        try:
            new.extend(parse(fetch(query),now))
            success+=1
        except (OSError, ET.ParseError, ValueError) as e:
            print('Feed unavailable:',type(e).__name__,str(e)[:180])
    if not success:
        print('All feeds unavailable: retain the existing data')
        return 1
    old_items=previous.get('items',[])
    if not isinstance(old_items,list): old_items=[]
    output={'updated_at':now.astimezone(JST).isoformat(timespec='seconds'),
            'items':deduplicate(new+old_items,now),
            'feeds_succeeded':success,'feeds_total':len(QUERIES),
            'note':'公開ニュースRSSの見出しにSNSへの言及がある記事。SNS投稿数や店舗所在地は未検証。都道府県は見出しに明記された地域です。'}
    DEST.parent.mkdir(parents=True,exist_ok=True)
    temporary=DEST.with_suffix('.tmp')
    temporary.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(DEST)
    print('Feeds:',success,'Items:',len(output['items']))

if __name__=='__main__':sys.exit(main() or 0)

