import importlib.util
import datetime as dt
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('collector',Path(__file__).resolve().parents[1]/'scripts/update_trending.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CollectorTests(unittest.TestCase):
 def setUp(self): self.now=dt.datetime(2026,10,15,tzinfo=dt.timezone.utc)
 def rss(self,title='東京都 SNSで話題のケーキ',date='Wed, 14 Oct 2026 00:00:00 GMT',url='https://news.google.com/rss/articles/test'):
  return ET.fromstring(f'<rss><channel><item><title>{title}</title><link>{url}</link><pubDate>{date}</pubDate><source>媒体</source></item></channel></rss>')
 def test_classification_and_region(self):
  i=m.parse(self.rss(),self.now)[0];self.assertEqual(i['prefecture'],'東京都');self.assertEqual(i['city'],'');self.assertEqual(i['genre'],'sweets')
  self.assertEqual(m.parse(self.rss('東京都 大阪府 SNS ケーキ'),self.now)[0]['prefecture'],'')
  self.assertEqual(m.parse(self.rss('ケーキのニュース'),self.now),[])
 def test_invalid_dates_links_and_future(self):
  for date in ['bad','Fri, 16 Oct 2026 00:00:00 GMT','Tue, 01 Sep 2026 00:00:00 GMT']:
   self.assertEqual(m.parse(self.rss(date=date),self.now),[])
  self.assertEqual(m.parse(self.rss(url='https://evil.example'),self.now),[])
 def test_deduplication(self):
  i=m.parse(self.rss(),self.now)[0];self.assertEqual(len(m.deduplicate([i,i,None,{}],self.now)),1)
  syndicated={**i,'title':i['title']+'（媒体） - Yahoo!ニュース','source':'Yahoo!ニュース'}
  self.assertEqual(len(m.deduplicate([i,syndicated],self.now)),1)
 def test_total_failure_preserves_previous_file(self):
  with tempfile.TemporaryDirectory(dir=Path.cwd()) as tmp:
   dest=Path(tmp)/'data.json';dest.write_text('{"items":[]}',encoding='utf-8');before=dest.read_bytes()
   with patch.object(m,'DEST',dest),patch.object(m,'fetch',side_effect=OSError('offline')):
    self.assertEqual(m.main(),1)
   self.assertEqual(dest.read_bytes(),before)
if __name__=='__main__': unittest.main()

