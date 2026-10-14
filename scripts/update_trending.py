#!/usr/bin/env python3
"""Google News RSS headlines only; never infer verified venues from titles."""
import datetime as dt
import email.utils
import json
import re
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
def fetch(query):
    params=urllib.parse.urlencode({'q':query,'hl':'ja','gl':'JP','ceid':'JP:ja'})
    url='https://news.google.com/rss/search?'+params
    req=urllib.request.Request(url,headers={'User-Agent':'GotochiGourmetRSS/1.0 (+https://github.com/fxsky2621129-tech/gotochi-gourmet)'})
    with urllib.request.urlopen(req,timeout=20) as response:
        return ET.fromstring(response.read(1_500_000))

def parse(root,now):
    result=[]
    for e in root.findall('./channel/item'):
        title=(e.findtext('title') or '').strip()
        if not FOOD.search(title) or not SNS.search(title):continue
        link=(e.findtext('link') or '').strip()
        if not link.startswith('https://news.google.com/'):continue
        try:
            published=email.utils.parsedate_to_datetime(e.findtext('pubDate') or '')
            if published.tzinfo is None:continue
            published=published.astimezone(dt.timezone.utc)
        except (ValueError,TypeError,IndexError):continue
        age=(now-published).total_seconds()
        if age< -86400 or age>31*86400:continue
        source=e.find('source')
        provider=source.text.strip() if source is not None and source.text else 'Google ニュース'
        # Location is only marked when the exact prefecture name is in the headline.
        matched=[p for p in PREFS if p in title]
        prefecture=matched[0] if len(matched)==1 else ''
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
    new=[];success=0
    for query in QUERIES:
        try:
            new.extend(parse(fetch(query),now))
            success+=1
        except (OSError, ET.ParseError, ValueError) as e:
            print('Feed unavailable:',type(e).__name__,str(e)[:180])
    if not success:
        print('All feeds unavailable: retain the existing data')
        return
    unique={}
    for item in new:
        key=(item['title'].split(' - ')[0].replace(' ','').lower())
        old=unique.get(key)
        if old is None or item['published']>old['published']:unique[key]=item
    # Keep previously seen items within 30 days if they are absent from today's RSS.
    for item in previous.get('items',[]):
        try:age=(now-dt.datetime.fromisoformat(item['published'].replace('Z','+00:00'))).total_seconds()
        except (KeyError,ValueError,TypeError):continue
        if 0<=age<=30*86400 and item.get('classification')=='sns-article' and item.get('url','').startswith('https://news.google.com/'):
            unique.setdefault(item.get('title','').split(' - ')[0].replace(' ','').lower(),item)
    output={'updated_at':now.astimezone(JST).isoformat(timespec='seconds'),
            'items':sorted(unique.values(),key=lambda x:x['published'],reverse=True)[:300],
            'note':'公開ニュースRSSの見出しをもとに抽出。SNS投稿数や店舗の所在地は検証していません。'}
    DEST.parent.mkdir(exist_ok=True)
    DEST.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Feeds:',success,'Items:',len(output['items']))

if __name__=='__main__':main()
