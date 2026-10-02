# Değişiklik Günlüğü

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
