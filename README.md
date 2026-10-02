# SysML Modelleyici

Kurulum gerektirmeyen, internetsiz çalışan, Cameo benzeri hafif bir **SysML modelleme aracı**.
Model ağacı, diyagrama özel palet, sürükle-bırak, otomatik düzen ve ikon kütüphanesi içerir.
Kapalı ağdaki, yönetici yetkisi olmayan bilgisayarlarda çalışmak üzere tasarlandı.

![Blok Tanım Diyagramı](docs/images/ekran-bdd.png)

## Öne çıkanlar

- **4 diyagram türü:** Blok Tanım (BDD), İç Blok (IBD), Use Case, Aktivite
- **Model ağacı:** Diyagramda yapılan her değişiklik ağaca anında yansır. Bir eleman birden çok diyagramda gösterilebilir.
- **Diyagrama özel palet:** Açık diyagramın türüne göre elemanlar ve ilişkiler; sürükle-bırak veya tıkla-yerleştir
- **Modelle senkron davranışlar:**
  - BDD'de Composition/Aggregation çizilince bütün blokta otomatik *part* oluşur.
  - IBD açılınca bloğun part, port ve connector'ları kendiliğinden yerleşir.
- **İç içe diyagramlar:**
  - Çift tıklamayla alt diyagrama geçilir: bloktan IBD'ye, aksiyondan çağırdığı aktiviteye, use case'ten akışına.
  - ◀ ▶ düğmeleriyle önceki ve sonraki diyagrama dönülür.
- **Otomatik düzen:** Diyagram türüne göre hiyerarşik, akış, kulvarlı, aktörler-solda, ızgara, dairesel ve "toparla" düzenleri; hizalama ve dağıtma araçları
- **İkon kütüphanesi:** 10 kategoride 200'ü aşkın ikon (otomotiv, havacılık ve uzay, bilgisayar, savunma, enerji, sensör ve haberleşme, mekanik, yazılım, organizasyon, genel)
- **Dışa aktarma:** Diyagramlar SysML çerçevesiyle PNG/SVG olarak indirilebilir veya panoya resim olarak kopyalanıp Word/PowerPoint'e yapıştırılabilir.
- **Kayıt:**
  - Otomatik kayıt
  - `.sysml` (JSON) model dosyası
  - Modeli içine gömülü, tek dosyalık HTML (paylaşım için)
- **Geri al / yinele**, yakınlaştırma, ızgara, çoklu seçim, kısayollar

## İndirme ve çalıştırma

İki sürüm vardır; ikisi de aynı uygulamadır ve aynı model dosyalarını açar.

| Sürüm | Dosya | Nasıl çalışır |
|---|---|---|
| **Masaüstü (Windows)** | `SysMLModelleyici.exe` ([Releases](../../releases) sayfasından) | Çift tıklayın. Kurulum ve yönetici yetkisi gerekmez; kendi penceresinde açılır. Windows dosya pencereleriyle kaydeder. |
| **Tarayıcı** | [`app/sysml-modeler.html`](app/sysml-modeler.html) | Dosyayı indirip Edge veya Chrome ile açın. İnternet gerekmez. |

> Exe sürümü ekranı göstermek için Windows'ta yerleşik gelen **Microsoft Edge WebView2** bileşenini kullanır (Windows 10/11'de normalde yüklüdür).
> Exe dijital imzalı değildir; kurum güvenlik politikası engellerse HTML sürümünü kullanın.

## Hızlı başlangıç

1. Uygulamayı açın; örnek bir model (Araç Sistemi) yüklü gelir. Boş başlamak için **Yeni**'ye basın.
2. Model ağacında bir pakete **sağ tıklayın → Yeni diyagram** (BDD, IBD, Use Case, Aktivite).
3. Soldaki **paletten** elemanları diyagrama sürükleyin. İlişki için ilişki türünü seçip kaynaktan hedefe sürükleyin.
4. Dağınık mı oldu? **Düzen ▾** menüsünden bir düzen seçin (`Ctrl+Shift+L`).
5. Bloklara **İkon** atayın, sonra **PNG** ile görüntüyü indirin.
6. **Kaydet** (`Ctrl+S`) ile modeli `.sysml` dosyası olarak saklayın.

Ayrıntılı kullanım için: **[docs/KULLANIM.md](docs/KULLANIM.md)**

## Ekran görüntüleri

| İç Blok Diyagramı | Use Case Diyagramı |
|---|---|
| ![IBD](docs/images/ekran-ibd.png) | ![Use Case](docs/images/ekran-uc.png) |

| Aktivite Diyagramı | İkon seçici |
|---|---|
| ![Aktivite](docs/images/ekran-act.png) | ![İkon seçici](docs/images/ikon-secici.png) |

PNG çıktısı örneği:

![PNG çıktısı](docs/images/cikti-bdd.png)

## Depo yapısı

```
app/sysml-modeler.html   Uygulamanın tamamı (tek dosya, bağımlılıksız HTML/JS/SVG)
desktop/                 Windows masaüstü sarmalayıcısı (Go + WebView2)
  main.go                Pencere, dosya diyalogları, otomatik kayıt
  build.bat / build.sh   exe derleme betikleri
docs/                    Kullanım kılavuzu ve ekran görüntüleri
assets/icon.png          Uygulama ikonu
```

Exe'yi kendiniz derlemek için: **[docs/GELISTIRME.md](docs/GELISTIRME.md)**

## Bilinen sınırlamalar

- Henüz yalnızca BDD, IBD, Use Case ve Aktivite diyagramları var; State Machine, Sequence, Requirement ve Parametric yok.
- XMI içe/dışa aktarma yok; Cameo ile doğrudan dosya alışverişi yapılamaz.
- Kulvarlar yalnızca dikey çizilir.
