# Kullanım Kılavuzu

## İçindekiler

1. [Arayüz](#1-arayüz)
2. [Model ağacı](#2-model-ağacı)
3. [Diyagram oluşturma ve düzenleme](#3-diyagram-oluşturma-ve-düzenleme)
4. [Diyagram türleri](#4-diyagram-türleri)
5. [İç içe diyagramlar ve gezinme](#5-iç-içe-diyagramlar-ve-gezinme)
5a. [Gereksinim yönetimi ve izlenebilirlik](#5a-gereksinim-yönetimi-ve-izlenebilirlik)
6. [Otomatik düzen ve hizalama](#6-otomatik-düzen-ve-hizalama)
7. [İkonlar](#7-ikonlar)
8. [Özellikler paneli](#8-özellikler-paneli)
9. [Kaydetme, açma ve paylaşma](#9-kaydetme-açma-ve-paylaşma)
10. [Görüntü olarak dışa aktarma](#10-görüntü-olarak-dışa-aktarma)
11. [Klavye kısayolları](#11-klavye-kısayolları)
12. [Sık sorulanlar](#12-sık-sorulanlar)

---

## 1. Arayüz

| Bölge | Görevi |
|---|---|
| **Araç çubuğu** (üst) | Yeni / Aç / Kaydet, gezinme (◀ ▶), geri al, PNG/SVG/pano, yakınlaştırma, **Düzen ▾**, **İkon**, Yardım |
| **Model ağacı** (sol üst) | Modelin tamamı: paketler, bloklar, part'lar, aktörler, aktiviteler, diyagramlar, ilişkiler |
| **Özellikler** (sol alt) | Seçili elemanın adı, tipi, çokluğu, ikonu, açıklaması vb. |
| **Palet** | Açık diyagram türüne özel elemanlar ve ilişkiler |
| **Sekmeler + tuval** | Açık diyagramlar; çalışma alanı |
| **Durum çubuğu** (alt) | Diyagram bilgisi ve o anki araç için ipucu |

Paneller arasındaki ayırıcılar sürüklenerek boyutlandırılabilir.

## 2. Model ağacı

- **Sağ tık** menüsünde şunlar var:
  - Yeni eleman: Paket, Blok, Aktör, Use Case, Aktivite, Part, Value, Port…
  - Yeni diyagram
  - Yeniden adlandırma (`F2`)
  - Modelden silme (`Del`)
  - Açık diyagrama ekleme
- **Çift tık:**
  - Diyagramı açar.
  - Alt diyagramı olan bir elemanda o diyagrama gider.
  - Diğer elemanlarda dalı açar/kapatır.
- **Ağaç içinde sürükle:** Elemanı başka bir paket veya bloğun altına taşır.
- **Ağaçtan diyagrama sürükle:** Mevcut elemanı diyagramda gösterir; modelde var olan ilişkileri de otomatik çizilir.
  - IBD'ye bir **blok** bırakılırsa o tipte yeni bir *part* oluşur. Bir part'ın üzerine bırakılırsa o part'ın tipi değişir.
  - Aktivite diyagramına bir **aktivite** bırakılırsa onu çağıran bir aksiyon oluşur. Bir **blok** bırakılırsa nesne düğümü oluşur.
- İlişkiler, sahibi olan elemanın altında **İlişkiler (n)** grubunda listelenir.

## 3. Diyagram oluşturma ve düzenleme

- **Eleman ekleme:** Paletten tuvale sürükleyin ya da paletteki elemana tıklayıp tuvale tıklayın. Paletteki öğeye **çift tıklarsanız** araç sabitlenir ve art arda ekleme yapabilirsiniz; `Esc` ile bırakılır.
- **İlişki çizme:** Paletten ilişki türünü seçin, kaynak elemandan hedef elemana sürükleyin. Kurallara uymayan bağlantılar engellenir ve nedeni gösterilir.
- **Seçme:**
  - Tıklama: tek seçim
  - `Shift`/`Ctrl` + tıklama: çoklu seçim
  - Boş alanda sürükleme: alan seçimi
  - `Ctrl+A`: tümünü seçme
- **Taşıma:** Sürükleyin; ızgaraya oturur, `Alt` basılıyken ızgarasız taşınır. Ok tuşları 10 px (`Shift` ile 1 px) taşır.
- **Boyutlandırma:** Seçili şeklin köşe tutamaklarını sürükleyin.
- **Bağlantı rotası:** Seçili dik açılı bağlantının ortasındaki mavi tutamak sürüklenir. Sağ tık → *Düz çizgi yap* / *Rotayı sıfırla*.
- **Ad düzenleme:**
  - `F2` ya da `Alt`+çift tık ad düzenler.
  - Alt diyagramı olmayan elemanlarda düz çift tık da ad düzenler.
  - Notlarda düzenleme `Ctrl+Enter` ile bitirilir.
- **Silme:**
  - `Del`: elemanı **modelden** siler; tüm diyagramlardan kalkar.
  - `Shift+Del`: yalnızca **bu diyagramdan** kaldırır, eleman modelde kalır.
- **Yakınlaştırma:** `Ctrl` + fare tekerleği, araç çubuğundaki − / + ya da **Sığdır**.
- **Kaydırma:** Fare tekerleği, `Boşluk` + sürükleme veya orta tuşla sürükleme.

## 4. Diyagram türleri

### Blok Tanım Diyagramı (BDD)
**Elemanlar:** Blok, Paket, Aktör, Not
**İlişkiler:** Composition, Aggregation, Association, Generalization, Dependency, Not bağlantısı

- Bloklar *parts / references / values / ports* bölmelerini otomatik gösterir.
- **Composition** veya **Aggregation** çizildiğinde bütün blokta hedef blok tipinde bir *part* oluşur. Part adı hedef bloğun adından türetilir, sonradan değiştirilebilir.

### İç Blok Diyagramı (IBD)
**Elemanlar:** Part, Port, Value Property, Not
**İlişkiler:** Connector, Dependency, Not bağlantısı

- IBD bir bloğa aittir; açıldığında o bloğun part'ları, portları ve connector'ları otomatik yerleşir.
- **Port** bir part'ın üzerine bırakılınca kenarına oturur ve part'ın tipi olan bloğa eklenir; dolayısıyla BDD'de de görünür.
- Port yönü (in / out / inout) Özellikler panelinden seçilir ve port üzerinde ok olarak gösterilir.
- Part'a sağ tık → **Portları göster**: tip bloğun portlarını yerleştirir.

### Use Case Diyagramı
**Elemanlar:** Aktör, Use Case, Sistem Sınırı, Not
**İlişkiler:** Association, Include, Extend, Generalization, Dependency, Not bağlantısı

### Aktivite Diyagramı
**Elemanlar:** Aksiyon, Başlangıç, Aktivite Sonu, Akış Sonu, Karar, Birleştirme, Fork, Join, Nesne Düğümü, Kulvar, Not
**İlişkiler:** Control Flow, Object Flow, Dependency, Not bağlantısı

- Karar düğümünden çıkan akışa çift tıklanınca **koşul** (guard) yazılır, ör. `[başarılı]`.
- Bir aksiyon bir aktiviteyi **çağırabilir**. Çağrı Özellikler panelindeki *Çağırır* alanından kurulur ve aksiyonun sağ altında SysML "tırmık" simgesiyle gösterilir.

### Gereksinim Diyagramı (req)
**Elemanlar:** Gereksinim, Blok, Test Durumu, Not (ağaçtan aktivite, aksiyon, use case, part da bırakılabilir)
**İlişkiler:** Derive (türetilen → kaynak), Satisfy (model elemanı → gereksinim), Verify (test → gereksinim), Refine, Trace, Dependency

- Gereksinim kutusu `Id`, `Text` ve doğrulama yöntemini gösterir; sağ üstteki etiket seviyeyi (Sistem / Alt sistem) belirtir.
- Diyagramda çizilen her ilişki gereksinim tablosuna, matrise ve kapsama analizine anında yansır. Tersi de geçerlidir: tabloda kurulan bir ilişki, iki eleman da diyagramdaysa bağlantı olarak çizilebilir (sağ tık → *İlişkili elemanları göster*).

### Durum Makinesi Diyagramı (stm)
**Elemanlar:** Durum, Başlangıç, Son durum, Seçim (choice), Not
**İlişki:** Geçiş (Transition)

- Durumların Özellikler panelinden `entry /`, `do /`, `exit /` davranışları yazılır.
- Geçiş etiketi `tetik [koşul] / etki` biçimindedir: *Ad* alanı tetik, *Koşul* ve *Etki* ayrı alanlardır. Bir durum kendisine de geçiş yapabilir.
- Durum makinesi bir bloğa aittir: bloğa sağ tık → *Yeni alt diyagram* veya ağaçta *Yeni diyagram → Durum Makinesi*.

### Sıralama (Sequence) Diyagramı (sd)
**Elemanlar:** Yaşam çizgisi, Not
**İlişkiler:** Senkron mesaj (dolu ok), Asenkron mesaj (açık ok), Yanıt mesajı (kesikli)

- Ağaçtan bir **blok, aktör veya part** bırakmak o tipte yaşam çizgisi oluşturur.
- Mesaj, kaynak yaşam çizgisinden hedefe sürüklenerek çizilir; bıraktığınız yükseklikte yer alır. Aynı yaşam çizgisine bırakmak kendine mesaj (self message) oluşturur.
- Seçili mesajın mavi tutamağı yukarı/aşağı sürüklenerek sıra değiştirilir; numaralar otomatik güncellenir.
- *Düzen → Sıralı yerleşim* yaşam çizgilerini yan yana dizer, mesajları eşit aralıklar.

### Parametrik Diyagram (par)
**Elemanlar:** Kısıt özelliği, Parametre, Value property, Not
**İlişki:** Binding connector

- Önce BDD paletinden bir **Kısıt Bloğu** oluşturun; Özellikler panelinden ifadesini (ör. `P = V * I`) ve parametrelerini girin.
- Kısıt bloğunu ağaçtan parametrik diyagrama bırakmak, parametreleri kenarına dizilmiş bir kısıt özelliği oluşturur.
- Bloğun value property'lerini parametrelere binding connector ile bağlayın.

### Paket Diyagramı (pkg)
**Elemanlar:** Paket, Blok, Gereksinim, Not
**İlişkiler:** Dependency, Import

Paket şekilleri içerdikleri elemanları (türleriyle birlikte) listeler.

## 5. İç içe diyagramlar ve gezinme

Bir elemana **çift tıklandığında**, elemanın bir alt diyagramı varsa o açılır:

| Eleman | Açılan diyagram |
|---|---|
| Blok | Bloğun IBD'si (veya sahip olduğu diğer diyagramlar) |
| Part / Nesne düğümü | Tip bloğunun diyagramı |
| Aksiyon | Çağırdığı aktivitenin diyagramı |
| Use Case | Bağlı akış (aktivite) diyagramı |
| Paket | İçindeki diyagramlar |
| Herhangi bir eleman | **Bağlı diyagram** (hiperlink) olarak seçilmiş diyagram |

- Birden fazla aday varsa seçim menüsü çıkar.
- Alt diyagramı olan şekillerin sağ alt köşesinde küçük mavi bir **diyagram simgesi** görünür. Bu simge görüntü çıktısına girmez.
- **Yeni alt diyagram:** Şekle sağ tık → *Yeni alt diyagram*. Örneğin bir aksiyon için yeni aktivite oluşturur, aksiyonun onu çağırmasını sağlar ve diyagramını açar.
- **Bağlı diyagram:** Herhangi bir elemana Özellikler panelinden veya sağ tık → *Diyagram bağla* ile bir diyagram bağlanabilir.
- **Gezinme:** Araç çubuğunda ◀ ▶, `Alt+←` / `Alt+→` ya da farenin geri/ileri tuşları.

## 5a. Gereksinim yönetimi ve izlenebilirlik

Araç çubuğundaki **Gereksinimler ▾** menüsü üç görünüm açar. Bunlar diyagram sekmeleri gibi sekmede açılır ve modelle canlı bağlıdır.

### Gereksinim tablosu

![Gereksinim tablosu](images/gereksinim-tablosu.png)

- **+ Sistem gereksinimi / + Alt sistem gereksinimi:**
  - Yeni satır ekler; ID otomatik verilir (varsayılan `SYS-001`, `SUB-001`).
  - Gereksinimler ağaçta *Gereksinimler → Sistem / Alt Sistem Gereksinimleri* paketlerine yerleşir.
- **Düzenleme:**
  - Hücreye tıklayıp yazın. `Enter` kaydeder ve alt satıra geçer, `Shift+Enter` satır içinde yeni satır açar, `Esc` vazgeçer.
  - Seviye açılır listeden değiştirilir; değişince ID'yi yeniden numaralandırmayı sorar.
- **Doğrulama yöntemi:** **T** (Test), **A** (Analiz), **M** (Muayene), **G** (Gösterim) düğmeleri aç/kapa çalışır; birden fazlası seçilebilir.
- **İzlenebilirlik sütunları** (mor başlıklı):
  - Türetildiği sistem gereksinimi
  - Alt sistem gereksinimleri
  - Karşılayan model elemanları
  - Fonksiyonlar
  - Doğrulayan test
  - Kapsama durumu

  Her hücredeki **+** düğmesi arama yapılabilen bir seçim penceresi açar. İşaretleyip *Uygula* deyince ilişkiler kurulur, işareti kaldırınca silinir.
  - Test seçiminde *+ Yeni test durumu* ile doğrudan test oluşturulabilir.
- **Filtreler:** Seviye, arama (ID, metin, ister no, özellik değerleri), *Yalnız eksikler*. Başlığa tıklamak sütuna göre sıralar.
- **Özellikler paneli:** Satıra tıklanınca gereksinimin tüm alanları ve izlenebilirliği Özellikler panelinde de açılır.

#### Sütunlar ve özel özellikler

**☰ Sütunlar / özellikler** penceresinden:
- Sütunları gizleyin veya gösterin (gizli sütunlar Excel'e aktarılmaz).
- **Yeni özellik** ekleyin (ör. *Öncelik, Durum, Sorumlu, Alt sistem, Kaynak doküman*). Her gereksinimde ayrı alan olarak tutulur, tabloda ve Excel'de sütun olur.
- Özellikleri yeniden adlandırın veya silin (silinince tüm değerleri de silinir).
- Sistem ve alt sistem **ID öneklerini** ve hane sayısını ayarlayın.

### İlişki türleri

| İlişki | Yön | Anlamı |
|---|---|---|
| **Derive** (deriveReqt) | alt sistem gereksinimi → sistem gereksinimi | Alt gereksinim, üst gereksinimden türetilmiştir |
| **Satisfy** | model elemanı / fonksiyon → gereksinim | Blok, part, use case… veya aktivite/aksiyon (fonksiyon) gereksinimi karşılar |
| **Verify** | test durumu → gereksinim | Test, gereksinimi doğrular |
| Refine / Trace | herhangi ↔ gereksinim | Detaylandırma / genel iz |
| Allocate | fonksiyon → blok/part | Fonksiyonun yapıya tahsisi (BDD ve aktivite paletinde) |

**Fonksiyon izlenebilirliği:**
- Aktiviteler ve aksiyonlar *fonksiyon* olarak kabul edilir. Bir gereksinimi karşılayan fonksiyonlar tabloda ayrı sütunda, matriste *Fonksiyonlar* kümesinde ve kapsama analizinde ayrı göstergede izlenir.
- Fonksiyonun hangi bloğa tahsis edildiği **Allocate** ile modellenir.

### İzlenebilirlik matrisi

![Matris](images/izlenebilirlik-matrisi.png)

- **Satırlar:** sistem / alt sistem / tüm gereksinimler.
- **Sütunlar:** alt sistem veya sistem gereksinimleri, fonksiyonlar, bloklar, tüm model elemanları, test durumları, use case'ler.
- **İlişki türü:** *Otomatik* seçiliyken gereksinim × gereksinim için **Derive**, test için **Verify**, diğerleri için **Satisfy** kullanılır. İsterseniz türü elle seçin.
- **Hücreye tıklamak** ilişkiyi kurar veya kaldırır (`Ctrl+Z` ile geri alınır).
- **Kırmızı satır/sütun başlığı:** Hiç ilişkisi olmayan eleman. *Yalnız boş satırlar* yalnızca bunları gösterir.

### Kapsama analizi

![Kapsama](images/kapsama-analizi.png)

**Göstergeler:**
- Karşılanan sistem gereksinimi yüzdesi
- Alt sisteme türetilmiş yüzde
- Fonksiyona izlenen yüzde
- Üst gereksinimi olan alt sistem gereksinimi yüzdesi
- Model veya fonksiyonla karşılanan yüzde
- Doğrulama yöntemi tanımlı yüzde
- Test ile doğrulanan yüzde

**Durum kuralları:**

| Seviye | Eksik | Kısmi | Tam |
|---|---|---|---|
| Sistem | Ne alt sistem gereksinimine türetilmiş ne de bir model elemanı/fonksiyon tarafından karşılanıyor | Karşılanıyor ama doğrulama yöntemi yok | Karşılanıyor ve doğrulama yöntemi var |
| Alt sistem | Hiçbir model elemanı/fonksiyon karşılamıyor | Karşılanıyor ama üst gereksinimi yok (**yetim**) veya doğrulama yöntemi yok | Hepsi tamam |

- Her satırın **Eksikler** sütunu neyin eksik olduğunu yazar. *Yalnız eksikleri göster* ile yalnızca boşluklar listelenir.
- Sayfanın sonunda **hiçbir gereksinime izlenmeyen bloklar ve fonksiyonlar** (gereksiz/fazladan tasarım adayları) listelenir.

### Excel'den içe aktarma

![Excel içe aktarma](images/excel-ice-aktar.png)

1. **⤓ Excel'den aktar** ile `.xlsx` veya `.csv` dosyası seçin (CSV'de `;`, `,` veya sekme ayracı ve Türkçe Windows kodlaması otomatik tanınır).
2. Birden fazla sayfa varsa sayfayı, gerekirse başlık satırını seçin.
3. Her Excel sütunu için aktarılacağı alanı kontrol edin. Başlıklar otomatik eşleşir; örneğin *"Gereksinim No"* → ID, *"Müşteri İster No"* → müşteri ister no, *"Üst Gereksinim"* → Derive. Eşleşmeyen sütunlar **yeni özellik** olarak eklenir; istemediğiniz sütunu *Yok say* yapın.
4. Dosyada seviye sütunu yoksa varsayılan seviyeyi seçin. Seviye değerinde *alt/sub/birim* geçiyorsa **Alt Sistem** sayılır.
5. *Aynı ID'yi güncelle* işaretliyse mevcut gereksinimler güncellenir, yeniler eklenir.

İlişki sütunları:
- **Üst gereksinim ID'leri** (virgül, noktalı virgül veya satır ile ayrılmış) Derive ilişkisi olarak kurulur.
- **Karşılayan model elemanı** ve **fonksiyon** sütunlarındaki adlar mevcut elemanlarla eşleştirilip Satisfy kurulur.
- **Doğrulayan test** adları test durumu olarak oluşturulur ve Verify kurulur.
- Bulunamayan adlar işlem sonunda bildirilir.

Doğrulama yöntemi metinleri (*T, A, Test, Analiz, Muayene, Inspection, Gösterim, Demo…*) standart değerlere çevrilir.

### Excel'e dışa aktarma

**⤒ Excel'e aktar** tek bir `.xlsx` dosyası üretir:

| Sayfa | İçerik |
|---|---|
| Gereksinimler | Görünen tüm sütunlar (özel özellikler ve izlenebilirlik dahil), filtreli başlık, renkli kapsama durumu |
| Sistem-Alt Sistem | Sistem × alt sistem türetme matrisi (X) |
| Gereksinim-Fonksiyon | Gereksinim × fonksiyon karşılama matrisi |
| Gereksinim-Blok | Gereksinim × blok karşılama matrisi |
| Kapsama Analizi | Gösterge özetleri ve her gereksinimin durum/eksik listesi |

Dışa aktarılan dosya tekrar içe aktarılabilir. Ortak ID'ler güncellenir ve ilişkiler korunur; Excel'de toplu düzenleme yapıp geri almak için kullanılabilir.

## 6. Otomatik düzen ve hizalama

**Düzen ▾** menüsü (`Ctrl+Shift+L` ilk düzeni uygular) veya boş alana sağ tık → *Otomatik düzen*.

![Düzen menüsü](images/duzen-menusu.png)

| Diyagram | Düzenler |
|---|---|
| **BDD** | Hiyerarşik yukarıdan aşağı (bütün üstte, parçalar altta; genellemede üst sınıf yukarıda), hiyerarşik soldan sağa, ızgara, dairesel |
| **IBD** | Akış soldan sağa veya yukarıdan aşağı (connector yönü out → in). Portlar bağlı oldukları part'a bakan kenara taşınıp sıraya girer; value'lar alta dizilir. |
| **Use Case** | Aktörler solda, aktörler iki yanda, use case ızgarası. Use case'ler sistem sınırının içine alınır; include/extend sağa doğru açılır. |
| **Aktivite** | Akış yukarıdan aşağı (kulvarlar varsa her düğüm kendi kulvarında kalır, kulvarlar içeriğe göre boyutlanır), akış soldan sağa |
| **Gereksinim** | Hiyerarşik: kaynak (sistem) gereksinimler üstte, türetilenler ve karşılayan elemanlar altta; ızgara |
| **Durum makinesi** | Akış yukarıdan aşağı / soldan sağa, dairesel |
| **Sıralama** | Yaşam çizgileri yan yana, mesajlar sırasıyla eşit aralıklı |
| **Parametrik** | Value'lar solda, kısıt özellikleri sağda; parametreler bağlı oldukları value'ya bakacak şekilde sıralanır |
| **Paket** | Hiyerarşik, ızgara |
| **Hepsi** | **Toparla:** Yerleşimi bozmadan çakışmaları giderir ve ızgaraya oturtur. |

- Düzen kısa bir animasyonla uygulanır ve tek `Ctrl+Z` ile geri alınır.
- Notlar, bağlı oldukları elemanın hizasında diyagramın sağına dizilir.
- **Hizala / dağıt** (en az iki şekil seçiliyken; menüde ve sağ tıkta): sola, sağa, üste, alta hizala; yatay/dikey ortala; yatay/dikey eşit dağıt; aynı boyuta getir.

## 7. İkonlar

![İkon seçici](images/ikon-secici.png)

- **Atama:** Blok, part veya aktör seçip araç çubuğundaki **İkon** düğmesine basın, sağ tık → *İkon ata…* deyin ya da Özellikler panelinden *İkon seç…*'i kullanın.
- **Seçici:**
  - Arama kutusu ("radar", "batarya", "sunucu"…), 10 kategori ve renk seçimi var.
  - `Enter` ilk sonucu atar.
  - Birden fazla eleman seçiliyse ikon hepsine birden atanır.
- **Kategoriler:**
  - Otomotiv
  - Havacılık ve Uzay
  - Bilgisayar ve Elektronik
  - Savunma Sistemleri
  - Enerji ve Güç
  - Sensör ve Haberleşme
  - Mekanik ve Üretim
  - Yazılım ve Veri
  - İnsan ve Organizasyon
  - Genel
- **Gösterim (bloklarda):** *Köşede küçük* veya *Başlıkta büyük*.
- **Renk:** Varsayılan olarak kategori rengidir; Özellikler panelinden değiştirilebilir.
- **Kalıtım:** Part'lar ve nesne düğümleri ikonu **tip bloğundan** otomatik alır.
- **Aktörler:** İkon atanmış aktörde çöp adam yerine ikon görünür.
- **Her yerde görünür:** İkonlar model ağacında ve PNG/SVG çıktısında da yer alır.

## 8. Özellikler paneli

![Özellikler](images/ozellikler.png)

Seçili elemana göre alanlar değişir:

- **Tüm elemanlar:** Ad, sahip (tıklanabilir yol), açıklama, bağlı diyagram, gösterildiği diyagramlar
- **Part:** Tip (blok), çokluk (`1`, `0..1`, `1..*`), toplama türü (composite/shared)
- **Value:** Tip (Real, Integer, Boolean, String…), varsayılan değer, birim
- **Port:** Yön (in / out / inout), tip
- **Aksiyon:** Çağırdığı aktivite
- **Kulvar:** Temsil ettiği blok
- **Blok:** Parts / Values / Ports listeleri (+ Ekle), bloğu tip olarak kullananlar
- **Şekil görünümü:** Dolgu rengi, konum ve boyut

## 9. Kaydetme, açma ve paylaşma

| İşlem | HTML sürümü | Masaüstü (exe) sürümü |
|---|---|---|
| Otomatik kayıt | Tarayıcının yerel deposuna | `%LOCALAPPDATA%\SysMLModelleyici\autosave.sysml` |
| **Kaydet** (`Ctrl+S`) | `.sysml.json` dosyası indirir | Aynı `.sysml` dosyasının üzerine yazar; ilk seferde konum sorar |
| **Farklı kaydet** (`Ctrl+Shift+S`) | — | Windows kaydet penceresi |
| **Aç** (`Ctrl+O`) | `.sysml`, `.json` veya gömülü `.html` | Aynı, Windows aç penceresiyle |
| **HTML olarak kaydet** | Modeli içine gömülü uygulama dosyası üretir | Aynı |

- Masaüstü sürümde kaydedilmemiş değişiklik varsa pencere başlığında `*` görünür. Uygulama kapatılsa bile son durum otomatik kayıttan geri gelir.
- Bir `.sysml` dosyasını **exe'nin üzerine sürükleyip bırakırsanız** uygulama o dosyayla açılır.
- **Paylaşma:** *HTML olarak kaydet* ile üretilen dosyayı gönderdiğiniz kişi, hiçbir şey kurmadan açıp modeli hazır görür.
- İki sürüm aynı dosya biçimini kullanır; biriyle kaydedilen model diğeriyle açılır.

## 10. Görüntü olarak dışa aktarma

- **PNG:** Yüksek çözünürlüklü (2×) beyaz arka planlı görüntü
- **SVG:** Vektörel; ölçeklenebilir, düzenlenebilir
- **Panoya kopyala:** Word, PowerPoint veya e-postaya doğrudan yapıştırılır.

Çıktıya SysML diyagram çerçevesi (`bdd [Package] Yapı [Sistem Yapısı]` gibi) dahil edilir. Seçim işaretleri ve gezinme simgeleri dahil edilmez.

## 11. Klavye kısayolları

| Kısayol | İşlev |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Geri al / yinele |
| `Ctrl+S` / `Ctrl+Shift+S` | Kaydet / farklı kaydet |
| `Ctrl+O` | Aç |
| `Ctrl+A` | Diyagramdaki tümünü seç |
| `Ctrl+Shift+L` | Diyagram türünün varsayılan otomatik düzeni |
| `Del` / `Shift+Del` | Modelden sil / diyagramdan kaldır |
| `F2` | Ad düzenle |
| `Esc` | Aracı bırak, seçimi temizle, pencereyi kapat |
| `Alt+←` / `Alt+→` | Önceki / sonraki diyagram |
| Ok tuşları | Seçiliyi taşı (`Shift` ile 1 px) |
| `Ctrl` + tekerlek | Yakınlaştır / uzaklaştır |
| `Boşluk` + sürükle | Tuvali kaydır |

## 12. Sık sorulanlar

**Exe açılmıyor ya da "WebView2 bulunamadı" diyor.**
Bilgisayarda Microsoft Edge WebView2 bileşeni yok demektir. HTML sürümünü Edge veya Chrome ile açın; özellikler aynıdır.

**Exe güvenlik yazılımı tarafından engellendi.**
Exe dijital imzalı değildir. Kurum politikası imzasız programları engelliyorsa HTML sürümünü kullanın.

**HTML sürümünde modelim kayboldu.**
Otomatik kayıt tarayıcının yerel deposundadır; tarayıcı verisi temizlenirse silinir. Önemli modelleri **Kaydet** ile dosya olarak saklayın.

**Cameo'ya aktarabilir miyim?**
Şimdilik hayır; XMI desteği yok. Diyagramları PNG/SVG olarak alabilirsiniz.
