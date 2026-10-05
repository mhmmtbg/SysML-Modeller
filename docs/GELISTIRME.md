# Geliştirme ve Derleme

## Mimari

Uygulamanın tamamı tek bir dosyadadır: **`app/sysml-modeler.html`**. Harici kütüphane, CDN veya internet bağlantısı kullanmaz. Saf HTML, CSS, JavaScript ve SVG ile yazılmıştır.

Dosya içindeki ana bölümler (`/* ===== ... ===== */` başlıklarıyla ayrılmıştır):

| Bölüm | İçerik |
|---|---|
| META | Eleman türleri, diyagram türleri, palet içerikleri, sahiplik kuralları |
| ICON LIBRARY | 200+ çizgi ikonun SVG tanımları ve kategorileri |
| STATE | Model (`M`), arayüz durumu (`ST`), geri al/yinele yığınları |
| DIAGRAM CORE | Şekil ekleme, port yerleşimi, ilişki oluşturma, doğrulama, silme |
| AUTO LAYOUT | Katmanlı (Sugiyama tarzı) yerleşim, kulvarlar, use case düzeni, ızgara, dairesel, toparla, hizalama |
| REQUIREMENTS & TRACEABILITY | Gereksinim tablosu, izlenebilirlik matrisi, kapsama analizi, sütun yönetimi, bağımlılıksız XLSX yazıcı/okuyucu (ZIP + DecompressionStream), CSV |
| SHAPE / EDGE DRAWING | SVG çizimi, dik açılı bağlantı rotalama, ok uçları |
| TREE / TABS / PALETTE | Model ağacı, sekmeler, palet |
| CANVAS INTERACTION | Fare/klavye etkileşimi, sürükle-bırak, satır içi düzenleme |
| PROPERTIES | Özellikler paneli |
| EXPORT / PERSIST | PNG/SVG, kaydet/aç, otomatik kayıt, masaüstü köprüsü |

### Model biçimi (`.sysml`)

```json
{
  "uid": "…", "v": 1, "rootId": "…",
  "els": {
    "<id>": { "id": "…", "kind": "Block", "owner": "<id>", "name": "Güç Birimi", "doc": "", "icon": "battery" },
    "<id>": { "kind": "Composition", "src": "<id>", "tgt": "<id>", "part": "<id>" },
    "<id>": { "kind": "Diagram", "dtype": "bdd", "shapes": [ … ], "edges": [ … ] }
  },
  "ui": { "open": [ … ], "cur": "…", "exp": [ … ] }
}
```

- Tüm model elemanları ve diyagramlar düz bir `els` sözlüğündedir; hiyerarşi `owner` alanıyla kurulur.
- Diyagramlar yalnızca görünüm bilgisini (şekil konumları, bağlantı rotaları) tutar; anlam model elemanlarındadır.
- `v` alanı **dosya biçimi sürümüdür** (şu an `2`), `app` alanı kaydeden uygulama sürümüdür. Dosya açılırken `migrateModel()` eski sürümleri yükseltir ve bozuklukları onarır: sahipsiz elemanlar köke taşınır, sahiplik döngüleri kırılır, ucu olmayan ilişkiler ve diyagramdaki geçersiz şekil/bağlantılar atılır, tanınmayan eleman türleri (daha yeni sürümden) not olarak korunur. Yapılan onarımlar kullanıcıya bildirilir.
- Biçimi değiştiren bir geliştirmede `FMT_VER` artırılır ve `migrateModel()` içine yükseltme adımı eklenir; eski dosyalar her zaman açılabilmelidir.

## Performans notları

- `kidsOf()`, gereksinim listesi ve sonraki gereksinim numarası, model revizyon sayacına (`REV`, `bump()`) bağlı önbellektedir. Modeli değiştiren kod `snap()` / `afterChange()` / `mk()` üzerinden geçtiği sürece önbellek kendiliğinden geçersizleşir; `M.els` veya `owner` alanını doğrudan değiştiren yeni kodda `bump()` çağrılmalıdır.
- Dik açılı bağlantı rotaları, yalnız yerel engellere göre anahtarlanan `ROUTE_CACHE` ile yeniden kullanılır. Büyük diyagramlarda sürükleme sırasında yalnız taşınan şeklin bağlantıları hesaplanır, bırakınca tam rota arka planda yenilenir.
- Gereksinim tablosu ve kapsama analizi 250'şer satır gösterir (**+250 daha göster / Tümünü göster**).

## Otomatik test

```sh
npm i -D playwright      # bir kez
node tests/regression.js
```

Test, uygulamayı başsız Chromium'da açar ve şunları denetler: tüm diyagram türleri ve görünümler, paletten eleman oluşturma, kaydet → aç gidiş-dönüşü, gömülü HTML, bozuk/eski dosya onarımı, SVG/PNG/Excel/ReqIF/XMI çıktıları, XMI gidiş-dönüşü, parametrik çözücü, bütçe, tahsis, simülasyon, şablonlar ve ~6000 elemanlı modelde performans (her işlem < 2 sn). Her sürümden önce çalıştırılmalıdır; hata olursa çıkış kodu 1'dir.

## Masaüstü (exe) sürümü

`desktop/` klasörü, aynı HTML'i bir Windows penceresinde gösteren küçük bir Go programıdır:

- **[go-webview2](https://github.com/jchv/go-webview2):** Saf Go, CGO gerektirmez. Windows'taki Edge WebView2 motorunu kullanır.
- HTML, `go:embed` ile exe'nin içine gömülür ve yalnızca `127.0.0.1` üzerinden sunulur.
- Masaüstüne özel işlevler, JavaScript'e bağlanan fonksiyonlarla sağlanır:
  - `nativeInfo`, `nativeAutosave`, `nativeWrite`, `nativeSetTitle`, `nativeDialog` (Windows aç/kaydet pencereleri; ikili dosyalar base64 ile taşınır)
- HTML bu fonksiyonları bulamazsa normal tarayıcı moduna döner. Yani `app/sysml-modeler.html` iki sürüm için de tek kaynaktır.

### Derleme

Gereksinim: [Go 1.22+](https://go.dev/dl/) ve ilk derlemede bağımlılıkları indirmek için internet.

**Windows:**
```bat
desktop\build.bat
```

**Linux / macOS (çapraz derleme):**
```sh
./desktop/build.sh
```

Çıktı: `dist/SysMLModelleyici.exe`. Betik, `app/sysml-modeler.html` dosyasını derlemeden önce `desktop/app.html` olarak kopyalar.

Uygulama ikonu `desktop/rsrc_windows_amd64.syso` kaynak dosyasındadır (`assets/icon.png`'den üretilmiştir).

## Yayınlama (GitHub Releases)

Exe dosyası depoya eklenmez (`.gitignore`), **Releases** üzerinden dağıtılır:

1. `desktop/build.bat` ile exe'yi derleyin.
2. GitHub'da depo sayfası → **Releases** → **Draft a new release**.
3. Etiket olarak sürüm numarası verin (ör. `v1.0.0`).
4. `dist/SysMLModelleyici.exe` ve `app/sysml-modeler.html` dosyalarını sürükleyip **Publish release** deyin.
