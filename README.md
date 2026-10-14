# ご当地グルメ検索 v7.11

ローカルチェーン検索は、地域・種類に合う登録チェーン名を選ぶ方式に変更。一般語「ローカルチェーン」で検索しません。未選択・未登録の場合は検索せず説明を表示し、全国チェーンを含む一般検索へ自動で戻しません。保存済みの全国チェーン名などが混ざらないよう、このカテゴリでは自由入力を使用しません。Googleマップの関連候補は完全には制御できません。口コミ順では選択したブランド名を店名に含む候補のみ表示（所属の公式認定ではなく名称照合）。

公開URL：https://fxsky2621129-tech.github.io/gotochi-gourmet/

「店舗を検索」またはEnterで、入力したキーワード・都道府県・市区町村・カテゴリを使ってGoogleマップの店舗検索を同じタブで開きます。戻る操作で検索画面に戻れます。店舗一覧はGoogleマップ側に表示されます。

市区町村をプルダウンで選択できます。都道府県を選ぶと候補が切り替わります。「市区町村すべて」で都道府県全体を検索します。都道府県が全国の場合は市区町村欄を無効化します。都道府県の変更時と現在地への切替時は前の市区町村をクリアします。候補データを読み込めない場合はその旨を表示し、上の検索窓への入力を案内します。

市区町村候補の出典：[国土地理院の地理院地図・市区町村データ](https://maps.gsi.go.jp/js/muni.js)（2026-10-14取得）。都道府県別の1,917地域（政令市の行政区を含む）の名称候補に加工しています。行政区分の正式な台帳ではありません。名称変更等で候補にない場合は上の検索窓に入力してください。[国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)。

表示方法の初期値は無料の「Googleマップで探す」です。Googleマップの検索リンク自体には口コミ件数順の指定パラメーターがありません。「口コミ・評価件数の多い順」を選択し、Google Maps PlatformのAPIキーをこのタブで入力すると、Places API（New）の実際の評価件数を取得してアプリ内に降順で表示します。検索ボタンを押した時にのみ取得します。キーが未入力の場合は接続設定を案内し、APIへアクセスしません。キーはGitHub・localStorage・sessionStorageに保存しません。

1回の検索で最大20候補を取得し、住所の都道府県・市区町村、業態、閉業状況を確認してから、口コミ・評価件数の多い順に最大10店（ローカルチェーンは最大20店）を表示します。同じ店舗IDを重複表示しません。件数が同じ場合は評価の高い順です。件数不明は「件数不明」として末尾に置きます。現在地検索は取得候補のうち10km以内に限定します。取得できた候補内の並べ替えであり、その地域の全店舗からの上位10店を保証するものではありません。件数には文章のない評価も含まれます。

ラーメン・寿司・焼肉等、Googleが対応する業態では厳密なタイプ指定を使用します。細かな料理や業態データがない店舗は検索語・登録された業態による候補となり、メニューを保証しません。API未設定でも市区町村検索は無料のGoogleマップ検索で使用できます。取得エラー時に「口コミ順」の表示を偽装した無料検索へ自動で切り替えません。条件変更前の古い検索結果も表示しません。APIの店舗データはブラウザの表示中だけ使用し、保存しません。

## 口コミ・評価件数順の設定

1. Google Cloudで自身のプロジェクトに請求先を設定し、Maps JavaScript APIとPlaces API（New）を有効にします。
2. APIキーのアプリケーション制限を「ウェブサイト」にして、`https://fxsky2621129-tech.github.io/*` を登録します。API制限も上記2 APIに限定します。
3. 利用料金・割り当てをGoogle Cloudで確認し、必要な上限を設定します。評価件数の取得は有料SKUに該当し、無料枠を超えた使用量に料金が発生する場合があります。
4. アプリの「表示方法」を口コミ・評価件数順にし、「接続設定」にAPIキーを入力します。地域と料理を指定して「店舗を検索」を押します。

キーはこのタブを閉じる・再読み込みすると消えます。Googleのスクリプトを読み込んだ後にキーを変更する場合も再読み込みします。

参考：[Google Maps JavaScript APIのText Search](https://developers.google.com/maps/documentation/javascript/place-search)、[SearchByTextRequest仕様](https://developers.google.com/maps/documentation/javascript/reference/place#SearchByTextRequest)、[Google Maps Platform APIセキュリティ](https://developers.google.com/maps/api-security-best-practices)、[Text Searchの料金対象フィールド](https://developers.google.com/maps/documentation/places/web-service/text-search)、[利用条件・プライバシー](./usage.html)。

クイック検索の「人気グルメ」ボタンを削除しました。「道の駅検索」は指定地域の道の駅を検索します。クイック検索は入力済みの地名も保持します。都道府県とカテゴリの変更は条件を更新し、自動では画面移動しません。

「ラーメン」カテゴリーを追加しました。スイーツ・海鮮・麺・肉では「料理の種類」を選択できます。うどん・そば・焼肉・ステーキなどは一種類ずつ検索し、複数の業態を一度に検索語へ追加しません。カテゴリー選択時は、検索窓に市町村・駅名・店名を入力してください。

料理のカテゴリーでは、入力内の単独の料理キーワードを選択したカテゴリー・種類に置き換えます。例：「山形市 焼肉 人気 グルメ」でラーメンを選ぶと「山形市 ラーメン店」を検索します。「九州ラーメンうまか」など店名に含まれる語や「味噌」「濃厚」などの追加条件は保持します。「麺」を選ぶ時に「長野 そば」と入力済みなら、そばが選択されます。都道府県は正式名称で検索します。

クイック検索はカテゴリーを切り替え、以前のカテゴリーを重ねません。GoogleマップとWeb検索は同じ料理条件を使い、実際の検索語を画面に表示します。現在地の取得時も選択中のカテゴリーと料理の種類を引き継ぎます。現在地へ切り替える際は入力済みの地域・店名をクリアします。

検索結果はGoogleマップが決定するため、関連候補の表示を完全に除外する機能ではありません。混在する場合は料理の種類や市町村・駅名を指定して絞り込んでください。

食べログ・Retty・ホットペッパー・Tripadvisorへのリンクは削除しました。

現在地を使うと取得座標でGoogleマップの周辺検索を開きます。現在地検索を解除、または都道府県の変更で解除できます。位置情報は保存しません。最後の検索語は保存可能な場合のみ端末に保存します。

旧版の料理一覧・お気に入り・オフライン機能は提供しません。sw.jsは旧版Service Workerの終了処理です。GitHub Pagesはmainブランチのルートから公開します。

検索処理の回帰テスト：`node --test tests/search.test.cjs`。カテゴリー、市区町村プルダウン・切替・未選択・データ読込失敗、現在地、検索遷移、IME、口コミ件数順、件数不明、地域・業態の除外、重複除去、キー未入力、エラー、古い結果の破棄を模擬環境で確認します。実際のGoogle接続は利用者のキー設定後の確認が必要です。

## v7.5 検証（2026-10-14）

- 国土地理院の当日公開データと照合し、加工後の47都道府県・1,917地域に差分・重複がないことを確認。自治体の正式な現行台帳や店舗数の検証ではありません。
- 検索・地域切替・現在地・口コミソートなどの自動テスト64件が成功（外部APIは模擬応答）。
- ハンバーグの検索にハンバーガー店専用の `hamburger_restaurant` を指定していた誤りを修正。料理名を維持して飲食店を検索します。料理提供の有無は保証しません。
- 無料検索の店舗順位・営業情報はGoogleマップ側が決定します。口コミ順は最大20候補内の並べ替えであり、地域の全店ランキングではありません。実APIによる店舗照合・検索精度の定量測定は未実施です。
- 検索窓に別の地域名が残っている場合、選択した地域と両方が検索語に含まれます。地域切替時は表示される検索語を確認してください。店名を壊さないため自由入力語を自動削除しません。

## v7.11 地域チェーン（2026-10-15）

80から103チェーンへ拡充。47都道府県すべてで種類「すべて」の候補を4件以上登録。候補は上限で打ち切らず全件表示します。件数はブランド数であり支店数ではありません。市区町村内の出店は各検索結果で確認してください。

地域を中心に展開するブランドを公式店舗情報に基づいて手動選定。一部他地域に出店するブランドや暖簾分けを含みます。全国全チェーン・全出店県の網羅は保証しません。閉店や出店予定だけを根拠に県を追加しません。各情報源の更新時期は異なります。

カフェ・喫茶、カレー、とんかつ、居酒屋、寿司の種類を追加。カフェは専用の施設種別にも対応。「三宝亭／さんぽう亭」などの表記違いを登録し、口コミの店舗判定で取りこぼしを減らしました。APIから返った候補の中でブランド・地域を確認し最大20店舗を表示します。Googleマップ側の結果は外部サービスの検索に依存します。

自動テスト76件成功。全47県の最低件数・全候補表示、種類切替、別名、全国チェーン除外、地域外除外を確認。実Google APIを使った検索精度の定量測定は未実施です。

### 登録チェーンと確認元

| チェーン | 登録地域 | 情報源 |
|---|---|---|
| 越前つるきそば | 福井 | [公式店舗情報](https://www.echizen-tsurukisoba.com/)  |
| 長崎ちゃんめん | 山口・広島・岡山・兵庫・大阪 | [公式店舗情報](https://ys-holdings.co.jp/nagasakichanmen/?page_id=676)  |
| 寿司めいじん | 大分・佐賀 | [公式店舗情報](https://www.sushimeijin.com/shop/)  |
| ポーたま | 沖縄・東京・愛知・大阪・福岡・熊本 | [公式店舗情報](https://porktamago.com/shop/)  |
| 麺屋ひしお | 和歌山 | [公式店舗情報](https://sp-ad.jp/hishio_honten/)  |
| とんでん | 北海道・群馬・埼玉・千葉・東京・神奈川 | [公式店舗情報](https://www.tonden.co.jp/shop)  |
| みよしの | 北海道 | [公式店舗情報](https://miyoshino-sapporo.jp/menu-shop-list/)  |
| まるまつ | 青森・岩手・宮城・秋田・山形・福島・栃木 | [公式店舗情報](https://www.re-marumatu.co.jp/information/restaurant_list.html)  |
| やまなか家 | 青森・岩手・宮城・秋田・山形・福島 | [公式店舗情報](https://stores.yamanakaya.jp/)  |
| ばんどう太郎 | 茨城・栃木・千葉 | [公式店舗情報](https://shop.bandotaro.co.jp/)  |
| ぎょうざの満洲 | 群馬・埼玉・東京・神奈川・大阪・兵庫 | [公式店舗情報](https://www.mansyu.co.jp/shop/)  |
| みかづき | 新潟 | [公式店舗情報](https://www.mikazuki-italian.com/)  |
| フレンド | 新潟 | [公式店舗情報](https://www.e-friend.co.jp/)  |
| ８番らーめん | 富山・石川・福井 | [公式店舗情報](https://www.hachiban.jp/shop/)  |
| すし食いねぇ！ | 石川・富山 | [公式店舗情報](https://www.sushikuine.co.jp/shops/)  |
| ヨーロッパ軒 | 福井 | [公式店舗情報](https://yo-roppaken.gourmet.coocan.jp/sub3.htm)  |
| 小作 | 山梨・長野 | [公式店舗情報](https://www.kosaku.co.jp/)  |
| ほうとう不動 | 山梨 | [県公式観光情報](https://www.yamanashi-kankou.jp/kankou/eat/p3_0111.html)  |
| テンホウ | 長野 | [公式店舗情報](https://tenhoo.jp/stores/)  |
| 岐阜タンメン | 岐阜・愛知 | [公式店舗情報](https://gifu-tanmen.com/99_access/)  |
| 魚魚丸 | 愛知・岐阜・静岡 | [公式店舗情報](https://comline.co.jp/list.html)  |
| あみやき亭 | 愛知・岐阜・三重・滋賀 | [公式店舗情報](https://shop.amiyakitei.co.jp/)  |
| 炭焼きレストランさわやか | 静岡 | [公式店舗情報](https://www.genkotsu-hb.com/shop)  |
| フライングガーデン | 群馬・栃木・茨城・埼玉・千葉 | [公式店舗情報](https://www.fgarden.co.jp/restaurant/)  |
| おにぎりの桃太郎 | 三重 | [公式店舗情報](https://onigiri-momotaro.jp/store/)  |
| にぎり長次郎 | 埼玉・愛知・滋賀・京都・大阪・兵庫・奈良・和歌山 | [公式店舗情報](https://www.chojiro.jp/shop/)  |
| 香の川製麺 | 京都・大阪・兵庫・奈良 | [公式店舗情報](https://kanokawa.joyfull.co.jp/shop)  |
| グリーンコーナー | 和歌山 | [市公式観光情報](https://www.city.wakayama.wakayama.jp/kankou/kankouspot/1027585/1036196.html)  |
| たまき | 鳥取・島根 | [公式店舗情報](https://izumo-tamaki.com/web/locations/)  |
| 回転すし北海道 | 鳥取・島根 | [公式店舗情報](https://sushibenkei.co.jp/shop)  |
| すわき後楽中華そば | 岡山 | [公式店舗情報](https://ffn.co.jp/store/)  |
| ちから | 広島 | [公式店舗情報](https://www.chikara.jp/)  |
| どんどん | 東京・岡山・広島・島根・山口・福岡 | [公式店舗情報](https://www.s-dondon.co.jp/shoplist/)  |
| こがね製麺所 | 東京・神奈川・富山・石川・兵庫・岡山・徳島・香川・愛媛・高知 | [公式店舗情報](https://www.koganeseimensyo.com/guide.html)  |
| こだわり麺や | 香川 | [公式店舗情報](https://kodawarimenya.com/shop_list.html)  |
| セルフうどんやま | 徳島 | [公式店舗情報](https://yumekubo.com/)  |
| じゃんじゃか | 愛媛・徳島・広島・山口 | [公式店舗情報](https://the-fff.com/?cn=100009)  |
| くいしんぼ如月 | 高知 | [公式店舗情報](https://www.nanban-tabetai.jp/shopinfo)  |
| 庄屋 | 福岡・佐賀・長崎・熊本・大分 | [公式店舗情報](https://www.sho-ya.co.jp/shop/archives/category/shoya)  |
| どんどん亭 | 山口・福岡・佐賀・長崎・熊本・大分 | [公式店舗情報](https://www.dondontei.com/shop/)  |
| 味のおぐら | 宮崎 | [公式店舗情報](https://www.ogurachain.com/)  |
| おぐらきんなべ | 宮崎 | [公式店舗情報](https://www.ogurakinnabe.jp/store/)  |
| ふく福 | 鹿児島 | [公式店舗情報](https://www.jf-group.co.jp/brand/fukufuku)  |
| 寿庵 | 鹿児島 | [公式店舗情報](https://www.jf-group.co.jp/brand/juan/juan-shops/)  |
| A&W | 沖縄 | [公式店舗情報](https://www.awok.co.jp/shopsearch/)  |
| ジェフ | 沖縄 | [公式店舗情報](https://jefokinawa.co.jp/)  |
| ラッキーピエロ | 北海道 | [公式店舗情報](https://luckypierrot.jp/shop/)  |
| なごやか亭 | 北海道・滋賀 | [公式店舗情報](https://www.mitsuboshi.net/nagoyakatei/nagoyakatei_sidemenu/)  |
| 半田屋 | 北海道・青森・岩手・宮城・埼玉 | [公式店舗情報](https://www.handaya.jp/shop)  |
| 南部家敷 | 岩手・宮城・秋田・山形 | [公式店舗情報](https://www.nanbuyashiki.jp/shoplist/shoplist.html)  |
| 三宝亭 | 新潟・秋田・宮城・山形・福島・埼玉・長野・愛知・東京 | [公式店舗情報](https://sanpou-g.co.jp/map/)  |
| いっちょう | 栃木・群馬・埼玉・茨城・長野 | [公式店舗情報](https://www.icho.co.jp/)  |
| 山田うどん | 埼玉・東京・神奈川・千葉・栃木・茨城・群馬 | [公式店舗情報](https://www.yamada-udon.co.jp/shop)  |
| 五味八珍 | 静岡・愛知・山梨・神奈川 | [公式店舗情報](https://gomihattin.co.jp/info/)  |
| スガキヤ | 愛知・岐阜・三重・静岡・大阪・京都・奈良・兵庫・滋賀 | [公式店舗情報](https://www.sugakico.co.jp/brand/sugakiya/?post_type=area&prefectures=)  |
| 丸田屋 | 和歌山・大阪 | [公式店舗情報](https://www.chukasoba.com/)  |
| 天理スタミナラーメン | 奈良・三重 | [公式店舗情報](https://www.tensuta.jp/)  |
| りょう花 | 愛媛・香川・徳島・高知 | [公式店舗情報](https://ryoka-ism.com/shopmenu/)  |
| 寿司まどか | 鹿児島・宮崎・熊本・大分 | [公式店舗情報](https://www.kousei-grp.co.jp/madoka/tenpoitiran/)  |
| 若竹丸 | 長崎・佐賀・福岡・熊本・神奈川 | [公式店舗情報](https://wakatakemaru.com/shop/)  |
| ステーキハウス88 | 沖縄 | [公式店舗情報](https://s88.co.jp/)  |
| 海鮮アトム | 福井 | [公式店舗情報](https://www.kaisenatom.com/shop/)  |
| すし玉 | 富山・石川 | [公式店舗情報](https://sushitama.co.jp/locations/)  |
| あっぷるぐりむ | 長野・新潟 | [公式店舗情報](https://appleivy.co.jp/applegrimm/shop/)  |
| 奥出雲そば処一福 | 島根・広島・岡山・兵庫 | [公式店舗情報](https://www.ippuku.co.jp/shopinfo.html)  |
| 幡龍 | 青森 | [公式店舗情報](https://banryu.stores.jp/about)  |
| 豚太郎 | 高知・愛媛 | [公式店舗情報](https://www.tontaro-kochi.com/wdoc/?group=grp04) [追加公式情報](https://mys1115.com/) |
| 天領うどん | 宮崎 | [公式店舗情報](https://www.tenryo-udon.com/company.html)  |
| ふぁみり庵はいから亭 | 鹿児島・宮崎 | [公式店舗情報](https://www.kousei-grp.co.jp/familian/tenpo/)  |
| 一鶴 | 香川・神奈川・大阪・福岡 | [公式店舗情報](https://www.ikkaku.co.jp/profile.html)  |
| メヒコ | 福島・茨城・東京 | [公式店舗情報](https://mehico.com/shop/index.html)  |
| 新福菜館 | 京都・大阪 | [公式店舗情報](https://shinpukusaikan.net/)  |
| 歩成 | 山梨 | [公式店舗情報](https://www.funari.jp/)  |
| 徳川 | 広島 | [公式店舗情報](https://www.tokugawa.jp/shops.html)  |
| 拉麺屋神楽 | 鳥取・島根 | [公式店舗情報](https://page.line.me/227dwnst/showcase/1177368800478316)  |
| レストラン三宝 | 新潟 | [公式店舗情報](https://sanpou-g.co.jp/map/)  |
| 黒亭 | 熊本 | [公式店舗情報](https://kokutei.co.jp/access/)  |
| 牧のうどん | 福岡・佐賀・長崎 | [公式店舗情報](https://www.makinoudon.jp/cont6/main.html)  |
| ハングリータイガー | 神奈川 | [公式店舗情報](https://hungrytiger.co.jp/location/)  |
| るーぱん | 埼玉 | [公式店舗情報](https://www.ru-pan.com/store)  |
| 小嶋屋総本店 | 新潟 | [公式店舗情報](https://www.kojimaya.co.jp/kojimaya/tenpo.html)  |
| 彩華ラーメン | 奈良・大阪・京都・愛知 | [公式店舗情報](https://www.saikaramen.com/shop/)  |
| もっこす | 兵庫 | [公式店舗情報](https://moccos.jp/shop/)  |
| 味千拉麺 | 熊本 | [公式店舗情報](https://www.aji1000.co.jp/shop/)  |
| さか枝うどん | 香川 | [県公式観光情報](https://www.my-kagawa.jp/udon/511) [追加公式情報](https://www.kensanpin.org/toshiakeudonmap/detail.php?id=40) |
| どんどん庵 | 愛知・岐阜・三重 | [公式店舗情報](https://www.sagami.co.jp/dondonan/)  |
| 福しん | 東京・埼玉 | [公式店舗情報](https://www.fuku-sin.co.jp/shop.html)  |
| みっちゃん総本店 | 広島 | [公式店舗情報](https://www.okonomi.co.jp/)  |
| ぎょうざの美鈴 | 三重 | [公式店舗情報](https://www.gyouzanomisuzu.com/)  |
| すなば珈琲 | 鳥取・岩手 | [公式店舗情報](https://sunaba.coffee/store/)  |
| ヒライ | 熊本・福岡・大分 | [公式店舗情報](https://www.hirai-wa.com/shop_map/)  |
| 焼肉・冷麺ヤマト | 岩手・宮城 | [公式店舗情報](https://yamato55.com/tenpo/)  |
| インデアンカレー（大阪発祥） | 大阪・兵庫・東京 | [公式店舗情報](https://www.indiancurry.jp/)  |
| 寧々家 | 岩手・宮城・秋田・山形・福島・茨城・栃木・新潟・長野・静岡・愛知 | [公式店舗情報](https://www.d-neneya.com/shop/)  |
| さぶろうべい | 石川・富山 | [公式店舗情報](https://saburoubei.jp/) [追加公式情報](https://su-bee.jp/news) |
| チャンピオンカレー | 石川・富山・福井 | [公式店舗情報](https://chancurry.com/area/hokuriku/)  |
| かつ時 | 石川・福井・長野・岐阜・愛知 | [公式店舗情報](https://www.atom-corp.co.jp/brand/brand.php?brand_no=82)  |
| 牛右衛門 | 長崎 | [公式店舗情報](https://gyuemon.com/shoplist/)  |
| 岡田珈琲 | 熊本 | [公式店舗情報](https://okada-coffee.com/shopinfo)  |
| 焼肉なべしま | 鹿児島・宮崎・熊本・福岡・佐賀 | [公式店舗情報](https://www.nabeshima-jp.com/company/)  |
| 平禄寿司 | 北海道・青森・岩手・宮城・東京 | [公式店舗情報](https://ys-holdings.co.jp/shop/?f=&shop-brand%5B%5D=heiroku-sushi&shop-prefectures=)  |
| 金沢まいもん寿司 | 石川・東京・神奈川・埼玉・千葉・愛知・京都・大阪・兵庫・福岡・沖縄・広島 | [公式店舗情報](https://www.maimon-susi.com/shop/)  |
| むすびのむさし | 広島 | [市公式情報](https://www.city.hiroshima.lg.jp/hiroshima-brand/tokusan/1026502/1026504/1014706.html)  |

補足確認元：南部家敷の秋田・山形は https://www.nanbuyashiki.co.jp/store/ 、新福菜館の大阪は https://keihan-mall.jp/author/shinpukusaikan/ 、麺屋ひしおの複数店舗は和歌山市公式ラーメンマップ https://www.city.wakayama.wakayama.jp/_res/projects/default_project/_page_/001/027/769/ramen_map_202603.pdf 。

### 都道府県別の候補数（種類「すべて」）

| 都道府県 | チェーン数 |
|---|---:|
| 北海道 | 6 |
| 青森 | 5 |
| 岩手 | 8 |
| 宮城 | 8 |
| 秋田 | 5 |
| 山形 | 5 |
| 福島 | 5 |
| 茨城 | 6 |
| 栃木 | 6 |
| 群馬 | 5 |
| 埼玉 | 11 |
| 千葉 | 5 |
| 東京 | 12 |
| 神奈川 | 9 |
| 新潟 | 7 |
| 富山 | 6 |
| 石川 | 8 |
| 福井 | 6 |
| 山梨 | 4 |
| 長野 | 7 |
| 岐阜 | 6 |
| 静岡 | 5 |
| 愛知 | 13 |
| 三重 | 6 |
| 滋賀 | 4 |
| 京都 | 6 |
| 大阪 | 12 |
| 兵庫 | 10 |
| 奈良 | 5 |
| 和歌山 | 4 |
| 鳥取 | 4 |
| 島根 | 5 |
| 岡山 | 5 |
| 広島 | 9 |
| 山口 | 4 |
| 徳島 | 4 |
| 香川 | 5 |
| 愛媛 | 4 |
| 高知 | 4 |
| 福岡 | 10 |
| 佐賀 | 6 |
| 長崎 | 5 |
| 熊本 | 10 |
| 大分 | 5 |
| 宮崎 | 6 |
| 鹿児島 | 5 |
| 沖縄 | 5 |
