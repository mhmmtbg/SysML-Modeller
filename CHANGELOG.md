# Değişiklik Günlüğü

## v1.10.0 — 2026-10-05

Birlikte çalışabilirlik ve şablonlar:

- **XMI dışa aktarma** (UML 2.5 / SysML 1.6, Cameo/MagicDraw uyumlu stereotip uygulamaları): paketler, bloklar, arayüz/kısıt blokları, değer tipleri, numaralandırmalar, sinyaller, part/port/value/akış özellikleri, connector ve binding, gereksinimler (id, metin, iç içe), test durumları, tüm SysML gereksinim ilişkileri, allocate, generalization, association, aktör/use case, aktiviteler (pin, koşul, kulvar, çağrı), durum makineleri (bileşik, bölge, sözde durumlar)
- **XMI içe aktarma:** Cameo/MagicDraw, Papyrus ve EA XMI dosyaları ayrı bir pakete; diyagramların otomatik oluşturulması ve düzenlenmesi
- **Şablonlar:** MIL-STD-810H çevresel kalifikasyon (14 yöntem), SMC-S-016 uzay aracı kalifikasyon testleri — gereksinim + test durumu + Verify; proje paket iskeleti

## v1.9.0 — 2026-10-05

Editör ergonomisi:

- **Bükme noktaları:** bağlantılara sürükleyerek bükme noktası ekleme, taşıma, çift tıkla silme; düz çizgide eğik, dik açılıda basamaklı rota; uçları birlikte taşınınca bükme noktaları da taşınır
- **Taşınabilir etiketler:** bağlantı adı, koşul, «stereotip» ve mesaj etiketleri sürüklenebilir
- **Mini harita:** diyagram ekrana sığmadığında görünen, tıklanıp sürüklenerek gezinilen genel görünüm
- **Biçim boyacısı:** seçili şeklin/bağlantının renk ve görünümünü diğerlerine uygulama
- **Lejant** elemanı: renk açıklamaları, diyagramdaki renklerden otomatik doldurma
- **PDF:** bağımlılıksız PDF yazıcı; açık diyagram, açık sekmeler veya tüm diyagramlar tek PDF'te (A4/A3, otomatik yön); tarayıcıda yazdırma
- Diyagram çerçevesini gizleme seçeneği; PNG/SVG/pano **Dışa aktar ▾** menüsünde toplandı

## v1.8.0 — 2026-10-05

Analiz ve simülasyon (yeni **Analiz ▾** menüsü):

- **Parametrik hesap:** kısıt bloklarının denklemleri binding connector'lar üzerinden çözülür (güvenli ifade ayrıştırıcı, zincirleme çözüm, tek bilinmeyende sayısal kök bulma, çelişki denetimi); sonuçlar diyagramlarda `= değer ⚙`
- **Bütçe analizi:** kütle/güç/maliyet toplama (composition ve çokluk), sınır, tasarım payı, kalan marj, tahmin–hesap farkı uyarısı, modele yazma, Excel
- **Simülasyon:** aktivite token akışı (fork/join, karar seçimi, pin, sinyal) ve durum makinesi (olay düğmeleri, tamamlanma geçişleri, bileşik durum, geçmiş, entry/do/exit günlüğü); adım adım veya otomatik
- **Tahsis matrisi:** fonksiyon × blok/part, tıklayarak «allocate», kulvardan dolaylı tahsis, Excel
- **Genel tablo:** her eleman türü için düzenlenebilir tablo, stereotip etiketi sütunları, Excel
- **İlişki haritası:** seçili elemanın ilişkilerini katmanlı gösteren gezinilebilir harita
- Örnek modele bütçe, parametrik girdi ve tahsis örnekleri eklendi

## v1.7.0 — 2026-10-05

SysML dil tamlığı:

- **Arayüz bloğu** ve **akış özellikleri** (in/out/inout); port tipi arayüz bloğu olunca port yönü akış özelliklerinden türetilir; **eşlenik (~) port**, port türü (proxy/full), port çokluğu
- **Değer tipi** (temel tip, birim, büyüklük türü), **numaralandırma**, **sinyal**; value property tip listesi modeldeki tipleri önerir; **SI birim kütüphanesi** (Araçlar ▾)
- **Stereotipler:** profil paketinde kullanıcı tanımlı stereotip, uygulanabileceği eleman türleri, etiket tanımları (`ad : tip = varsayılan`), dolgu rengi; elemanda etiket değerleri, şekillerde «stereotip» ve *tags* bölmesi
- **Aktivite:** pin (in/out), aktivite parametresi ve çağıran aksiyonda otomatik pin üretimi, Sinyal Gönder / Olay Kabul / Zaman Olayı aksiyonları, kesilebilir bölge ve kesme akışı; aksiyon etiketi `ad : ÇağrılanAktivite`
- **Sıralama:** birleşik parçalar (alt, opt, loop, par, break, critical, seq, strict, neg, assert, ignore, consider, ref), sürüklenebilir operand ayırıcıları, fragment ile birlikte taşınan mesajlar; otomatik **yürütme çubukları**
- **Durum makinesi:** bileşik durum (iç içe yerleşim model ağacına yansır), bölge (region), geçmiş (H / H*), kavşak (junction)
- Karşılıklı iki bağlantı (A→B, B→A) artık üst üste binmez; etiketleri iki yana yerleşir
- Otomatik düzen bileşik durumları, kesilebilir bölgeleri ve fragmentleri birlikte taşır
- Model doğrulama, Word/HTML rapor, birleştirme ve izlenebilirlik yeni elemanları tanır (arayüzler ve tipler bölümü, uygunsuz stereotip, boş numaralandırma, tek operandlı fragment…)
- Örnek modele arayüzler, değer tipleri, «LRU» stereotipi, pinler, bileşik durum ve loop fragmenti eklendi

## v1.6.0 — 2026-10-03

- **Araçlar ▾** menüsü
- **Rapor oluştur:** seçilen bölümler ve diyagramlarla Word (.docx) rapor — kapak, içindekiler, başlık stilleri, sayfa numaralı alt bilgi, şekil başlıkları, her sayfada tekrar eden tablo başlıkları — veya yazdırılabilir HTML rapor (PDF'e yazdırma)
- **Model doğrulama:** 25'i aşkın tutarlılık kuralı (kopuk ilişki, döngüsel kompozisyon/kalıtım, tipsiz part, başlangıç/bitişi olmayan aktivite, ulaşılamayan durum, aktörsüz use case, port yön uyumsuzluğu, bağlantısız test…); hata/uyarı/bilgi sınıfları, filtre, Excel'e aktarma, bulguya tıklayınca elemana gitme
- **Modeli birleştir:** başka bir .sysml dosyasından seçilen paketleri diyagram ve ilişkileriyle aktarma; ortak kimlikli elemanlarda güncelle / atla / kopya seçenekleri; çakışan gereksinim ID uyarısı
- **ReqIF 1.2:** gereksinimleri öznitelikleri, Derive/Refine/Trace ilişkileri ve sistem/alt sistem hiyerarşisiyle dışa aktarma; .reqif dosyalarını içe aktarma
- Araç çubuğu etiketleri kısaltıldı (HTML kaydet, Panoya); yardım, README ve kullanım kılavuzu v1.3–v1.6 özellikleriyle güncellendi

## v1.5.0 — 2026-10-03

- Test durumu alanları: prosedür no, yöntem (Test/Analiz/Muayene/Gösterim), doğrulama seviyesi (Birim → Kalifikasyon), test edilen birim, standart/referans, sorumlu, planlanan başlangıç/bitiş, sonuç (Planlandı/Yapılmadı/Geçti/Kaldı/Koşullu), sonuç tarihi, rapor no; diyagramda sonuç rozeti
- **Doğrulama Matrisi (VCRM):** gereksinim × T/A/M/G, doğrulama seviyesi, test/prosedür, sonuç, rapor no ve hesaplanan doğrulama durumu; seviye/alt sistem, durum ve yöntem filtreleri
- Doğrulama durumu (Doğrulandı / Kısmen / Kaldı / Planlandı / Faaliyet yok) gereksinim tablosunda, kapsama analizinde ve Excel çıktısında
- **Test kampanyası:** testlerin düzenlenebilir tablosu ve seviyeye/sonuca/birime göre gruplanan zaman çizelgesi (Gantt); bugün çizgisi, gecikmiş test uyarısı
- Excel: VCRM ve Test Durumları sayfaları; test sonuçlarını Excel'den geri aktarma (prosedür no veya ada göre eşleşir, Excel tarih biçimlerini tanır)

## v1.4.0 — 2026-10-03

- Gereksinim kalite kontrolü (INCOSE kuralları): "-malıdır" kipi, birden fazla ister, belirsiz ifadeler (uygun, yeterli, hızlı…), TBD/TBC, birimsiz sayılar, aşırı uzun metin, yinelenen ID, birbirine çok benzeyen gereksinimler; tabloda rozet, özelliklerde uyarı listesi, **Kalite raporu** görünümü ve Excel'de "Kalite" sayfası
- Durum iş akışı: Taslak → İncelemede → Onaylı → Değişiklikte → İptal; onaylı bir gereksinimin metni/doğrulama yöntemi/seviyesi değişince otomatik "Değişiklikte" olur; tabloda durum sütunu ve filtresi; İptal edilenler kapsama analizine girmez
- Değişiklik geçmişi: her gereksinim değişikliği kim/ne zaman/eski → yeni değer ve isteğe bağlı gerekçeyle kaydedilir; kelime düzeyinde fark gösterimi; Excel'e aktarma
- Taban çizgileri (baseline): modelin gereksinim durumunu adla dondurma, iki taban çizgisini veya taban çizgisini güncel modelle karşılaştırma (eklenen/silinen/değişen), farkı Excel'e aktarma
- Etki analizi: bir gereksinim veya model elemanı değişirse etkilenen üst/alt gereksinimler, karşılayan elemanlar, testler ve diyagramlar ağaç olarak
- Kullanıcı adı ayarı (geçmiş kayıtlarında görünür)

## v1.3.0 — 2026-10-03

- Kopyala / yapıştır / çoğalt (`Ctrl+C`, `Ctrl+V`, `Ctrl+Shift+V`, `Ctrl+D`): aynı elemanı başka diyagramda gösterme veya yeni eleman olarak kopyalama; bloklar iç yapılarıyla birlikte kopyalanır
- Model içinde arama (`Ctrl+F`): ad, gereksinim ID ve metni, açıklama ve özellik değerlerinde; sonuca tıklayınca ağaçta ve diyagramda gösterir
- Model ağacında çoklu seçim (`Ctrl`/`Shift` + tık) ve seçili elemanları diyagrama tek seferde sürükleme
- Bağlantı uçlarını başka elemana sürükleyerek yeniden bağlama
- Görünüm: şekil ve bağlantı çizgi rengi, blok bölmelerini gizleme, diyagram yazı boyutu, elle rota sonrası "otomatik rotaya dön"
- Aktivite diyagramında yatay kulvar; "soldan sağa" düzen yatay kulvarları kullanır

## v1.2.0 — 2026-10-02

- Bağlantılar artık elemanların üzerinden geçmiyor: engelden kaçan dik açılı yönlendirici; aynı kenara gelen bağlantılar ayrı noktalara dağıtılıyor, üst üste binen hatlar ayrılıyor
- Düz çizgili bağlantılar (use case, durum makinesi, not bağlantısı) bir elemanı keserse otomatik olarak etrafından dolaşıyor
- Otomatik düzende notlar bağlı oldukları elemanın hemen yanına (sağ, sol, üst veya alt boş yere) yerleşiyor
- Alt sistem gereksinimlerinde **alt sistem adı**: eklerken sorulur, tabloda/özelliklerde düzenlenir, ağaçta her alt sistem kendi paketine yerleşir
- Gereksinim filtresi: Sistem, tüm alt sistemler veya tek tek alt sistem adları
- İzlenebilirlik matrisinde alt sistem bazında satır/sütun kümeleri; kapsama analizinde alt sistem etiketi
- Excel'de "Alt Sistem" sütunu içe/dışa aktarılır

## v1.1.0 — 2026-10-02

- Yeni diyagram türleri: Gereksinim (req), Durum Makinesi (stm), Sıralama/Sequence (sd), Parametrik (par), Paket (pkg)
- Yeni elemanlar: Gereksinim, Test Durumu, Durum Makinesi, Durum, Seçim, Etkileşim, Yaşam Çizgisi, Kısıt Bloğu, Kısıt Özelliği, Parametre
- Yeni ilişkiler: Derive, Satisfy, Verify, Refine, Trace, Allocate, Geçiş, senkron/asenkron/yanıt mesajı, Binding Connector, Import
- Gereksinim tablosu: sistem/alt sistem gereksinimleri, doğrulama yöntemi, müşteri ister no/isteri, özel özellikler, sütun yönetimi, ID önekleri
- İzlenebilirlik: sistem ↔ alt sistem, gereksinim ↔ model elemanı, gereksinim ↔ fonksiyon, gereksinim ↔ test
- İzlenebilirlik matrisi (hücreye tıklayarak ilişki kurma) ve kapsama analizi (eksik/kısmi/tam, yetim gereksinimler, izlenmeyen elemanlar)
- Excel (.xlsx) ve CSV içe aktarma (otomatik sütun eşleme, güncelleme, ilişki kurma); çok sayfalı .xlsx dışa aktarma
- Masaüstü sürümünde Excel dosyalarının Windows açma penceresiyle okunması

## v1.0.0 — 2026-10-02

İlk sürüm.

- BDD, IBD, Use Case ve Aktivite diyagramları; model ağacı ile senkron çalışma
- Diyagrama özel palet, sürükle-bırak, ilişki doğrulama
- Composition/Aggregation ile otomatik part oluşturma; IBD'de otomatik part, port ve connector yerleşimi
- İç içe diyagramlar: çift tıkla alt diyagrama geçiş, bağlı (hiperlink) diyagram, ◀ ▶ gezinme
- Otomatik düzenler (hiyerarşik, akış, kulvarlı, use case, ızgara, dairesel, toparla), hizalama ve dağıtma araçları
- 10 kategoride 200'ü aşkın ikon; bloklarda köşe veya başlık gösterimi; part'larda tip bloğundan kalıtım
- PNG/SVG dışa aktarma, panoya resim kopyalama
- Otomatik kayıt, `.sysml` dosyası, modeli gömülü HTML olarak kaydetme
- Kurulumsuz Windows masaüstü sürümü (Go + WebView2): yerel dosya pencereleri, otomatik kayıt, exe'ye sürükle-bırak ile açma
