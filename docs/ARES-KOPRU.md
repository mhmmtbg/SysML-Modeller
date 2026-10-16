# ARES köprüsü — veri alışverişi şeması

SysML Modelleyici, kapalı ağdaki iş bilgisayarında dil modeli çalıştırmadan, ARES gibi **yerel bir LLM türetme sistemiyle** dosya üzerinden çalışır:

1. **Araçlar ▾ → ARES bağlam paketini dışa aktar (JSON)** — `<model> - ARES bağlam paketi.json`
2. Paket ARES'in çalıştığı makineye taşınır; ARES önerilerini aşağıdaki **çıktı şemasında** JSON olarak üretir.
3. **Gereksinimler ▾ → ARES önerilerini içe aktar (JSON)** — öneriler türetme sihirbazında **ARES (yerel LLM)** kuralı altında görünür; kurallı önerilerle aynı inceleme, kalite denetimi, kabul ve izlenebilirlik akışından geçer.
4. **Gereksinimler ▾ → Türetme karşılaştırma raporu** — kurallı türetme ile ARES'in kabul oranı, kalite bulguları, kabulden sonra düzenlenme oranı ve kapsadığı kategoriler (Excel).

İçe aktarılan öneriler modelde (`aresInbox`) saklanır; dosya kaydedilip yeniden açıldığında da sihirbazda görünür. Aynı öneri ikinci kez içe aktarılırsa (aynı `id` veya aynı seviye + alt sistem + metin) yinelenmez.

## Bağlam paketi (`schema: "sysml-modeler/ares-context"`, sürüm 1)

| Alan | İçerik |
|---|---|
| `model` | model adı, gizlilik derecesi |
| `conventions` | dil (`tr`), zorunluluk eki (`-ecektir / -acaktır`), kimlik önekleri, doğrulama yöntemleri, seviyeler, kategoriler |
| `instructions` | dil modeline yönerge (tek zorunluluk fiili, birimli sayılar, yer tutucu yok, `sources` doldurulmalı) |
| `outputSchema` | beklenen çıktının örnek yapısı |
| `requirements[]` | `id, reqId, level, subsystem, title, text, verification, status, categories[], parents[], satisfiedBy[]` |
| `blocks[]` | `id, name, level, doc, parts[] (name, typeName, multiplicity), values[] (name, value, unit), ports[]` |
| `interfaces[]` | `id, icdId, name, from, to, direction (1 / -1 / 0), items[] (name, type, unit), characteristics, protocol, type` |
| `functions[]` | `id, name, kind, owner, allocatedTo[]` |
| `stateMachines[]` | `id, name, context, states[], transitions[] (from, to, trigger, guard)` |
| `environment[]` | test profilleri: `id, name, type (psd/sine/srs/thermal), level, standard, summary` |
| `failureModes[]` | `id, name, item, effect, S, rpn, action` |
| `gaps[]` | kapsama haritasındaki boş hücreler: `block, blockName, category, categoryName` |

## ARES çıktısı (`schema: "ares/suggestions"`, sürüm 1)

```json
{
  "schema": "ares/suggestions",
  "version": 1,
  "engine": "ARES v5",
  "suggestions": [
    {
      "id": "ares-0001",
      "level": "Alt Sistem",
      "subsystem": "Güç Birimi",
      "title": "Aşırı akım koruması",
      "text": "Güç Birimi çıkış akımını 12 A değerinde sınırlayacaktır.",
      "verification": "Test",
      "category": "emn",
      "parent": "SYS-001",
      "satisfiedBy": "Güç Birimi",
      "sources": ["<bağlam paketindeki eleman id>"],
      "rationale": "FMEA: Çıkış gerilimi yok",
      "confidence": 0.82
    }
  ]
}
```

| Alan | Zorunlu | Eşleme |
|---|---|---|
| `text` | evet | gereksinim metni (boşsa satır atlanır ve bildirilir) |
| `level` | hayır | "Alt Sistem" içeriyorsa veya `subsystem` doluysa alt sistem, aksi halde sistem |
| `subsystem` | hayır | alt sistem adı; aynı adlı blok varsa `satisfiedBy` yoksa ona bağlanır |
| `title` | hayır | gereksinim başlığı |
| `verification` | hayır | Test / Analiz / Muayene / Gösterim (virgülle birden fazla) |
| `category` | hayır | `fonk, perf, ara, cevre, emc, guv, bakim, emn, fiz` — kapsama haritasında kullanılır |
| `parent` | hayır | üst gereksinimin eleman id'si **veya** kimliği (`SYS-001`) → DeriveReqt |
| `satisfiedBy` | hayır | blok id'si veya adı → Satisfy |
| `sources` | hayır | modelde var olan eleman id'leri; kaynak silinirse öneri "kaynak yok" olur |
| `id` | hayır | kararlı kimlik; yoksa seviye + alt sistem + metinden üretilir |
| `rationale`, `confidence` | hayır | öneri satırında not olarak gösterilir |

Kök nesne yerine doğrudan öneri dizisi (`[ {...}, {...} ]`) de kabul edilir.

## Karşılaştırma raporu ölçütleri

- **Görülen öneri:** sihirbazda bu kaynaktan görülmüş farklı öneri sayısı
- **Kabul oranı:** kabul edilen / görülen
- **Kalite bulgusu / gereksinim:** kabul edilen ve iptal edilmemiş gereksinimlerde INCOSE denetiminin uyarı + hata sayısı ortalaması
- **Bulgusuz oranı:** hiç uyarı/hata almayan gereksinimlerin oranı
- **Kabulden sonra düzenlenen:** metni üretilen metinden farklı olan gereksinimlerin oranı (mühendis düzeltmesi göstergesi)
- **Kapsanan kategori:** kabul edilen gereksinimlerin kapsadığı kategori sayısı
