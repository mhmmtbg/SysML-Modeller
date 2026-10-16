# Geliştirici notları

Kullanıcıya giden ürün tek dosyadır: `app/sysml-modeler.html` (ve onu gömen `SysMLModelleyici.exe`). Kullanıcı bilgisayarında kurulum, paket veya internet gerekmez. Bu dosya **elle düzenlenmez**; `src/` altındaki parçalardan üretilir.

## Kaynak düzeni

| Yol | İçerik |
|---|---|
| `src/head.html` | HTML başı, stiller, gövde iskeleti, `<script>` açılışı |
| `src/js/000-core.js` | çekirdek: model, diyagram çizimi, ağaç, özellikler, görünümler |
| `src/js/001-hooks.js` | genişletme noktaları (`HOOKS`) ve hata günlüğü (`appErr`) |
| `src/js/NNN-vX_YY-*.js` | sürüm modülleri; dosya adındaki numara birleştirme sırasıdır |
| `src/js/900-v1_18-i18n.js` | İngilizce arayüz motoru; her zaman en sonda |
| `src/i18n/dict.json` | çeviri sözlüğü (derlemede `/*I18N*/` yerine konur) |
| `src/tail.html` | kapanış |
| `tools/build.py` | birleştirici: `python3 tools/build.py` (`--check`: çıktı güncel mi) |

Yeni modül, `900` öncesine sıradaki numarayla eklenir (ör. `270-v1_36-...js`).

## Genişletme noktaları

Modüller çekirdek fonksiyonları zincirleme sarmalamaz; kayıt olur:

```js
HOOKS.props.push((target, panel) => { /* target.el, target.sh, target.ed */ });
HOOKS.menu.tools.push(items => items.push({t:'Yeni komut', f:() => {}}));   // tools | analysis | layout
PROPS_EXT.YeniTür = (el, pf) => pf('Alan', 'değer');   // özellik panelinde tür bölümü
VALIDATORS.push((add, els, idx) => { /* add(önem, kural, eleman, mesaj) */ });
FIXERS['Kural adı'] = {t:'Düğme metni', f:e => true};   // otomatik onarım
GO_EXT.YeniTür = e => openD('@görünüm');                // ağaçta çift tık
DEMO_EXT.push(X => { /* örnek modele ekleme */ });
BOOT_HOOKS.push(info => { /* açılış tamamlandı: {native, argText, autosave, lastPath, dirty} */ });
DERIVE_RULES.push({id:'kural', tr:'Ad', doc:'Açıklama', opts:[['anahtar', 'Seçenek', true]],
  gen(cfg){ return [{sig:'kararlı-imza', level:'Sistem', name:'Başlık', text:'… olacaktır', verif:'Test',
                     src:[kaynakId], satisfyBy:blokId, parent:üstGereksinimId, refineBy:davranışId}]; }});
```

**Gereksinim türetme kuralları** (`DERIVE_RULES`): `gen` modeli değiştirmez, öneri listesi döndürür. `sig` aynı kaynak için her çalıştırmada aynı olmalıdır; sihirbaz yinelenmeyi, "güncelle" ve "kaynak yok" durumlarını bu imzayla belirler. Kabulde gereksinim `derivedFrom = {rule, sig, gen, src}` taşır; `satisfyBy`, `parent`, `refineBy`, `verifyBy`, `mkTest`, `fmLink`, `riskLink`, `extra`, `vcond` alanları uygulama sırasında ilişkiye / alana çevrilir. Türkçe metin için `trConjugate(eylem)`, `trAct(konu, eylem)`, `trNum(sayı)` yardımcıları kullanılabilir. Öneri hesabı sırasında `relIdx()` tek seferlik önbelleklidir.

Her kanca kendi `try/catch`'i içinde çalışır; hata `appErr()` ile günlüğe yazılır, diğer kancalar çalışmaya devam eder.

## Test

- `node tests/regression.js` — tarayıcıda uçtan uca regresyon (Playwright).
- `node tests/unit.js` — motorların birim testleri (tarayıcısız).
- `node tests/stres.js` — gerçekçi ölçekte stres testi (~12 900 eleman, 3000 gereksinim, 60 diyagram): yükleme, kayıt, her diyagram ve görünüm, doğrulama, türetme, kapsama haritası ve tam Word raporu süre sınırlarıyla ölçülür. Performansı etkileyebilecek değişikliklerden sonra çalıştırın.
- `node tools/ozellik-test.js --check` — özellik ↔ test izlenebilirlik tablosunu (`docs/OZELLIK-TEST.md`) `tests/ozellikler.json`'dan üretir; testi olmayan özellik varsa hata verir. Yeni özellik eklerken listeye bir satır ve en az bir test ekleyin.
- `node tools/en-tarama.js` — İngilizce arayüzde tüm görünüm, menü ve pencereleri açıp çevrilmemiş Türkçe metinleri listeler (model içeriği hariç). Yeni metinler `src/i18n/dict.json`'a eklenir.

## Önbellekler ve varsayımlar

`kidsOf`, `relIdx`, `relBy`, `vtypeOf`, `allNCRs`, `topBlock` model revizyonu (`REV`) ve model nesnesiyle (`M`) önbelleklenir. Varsayım: eleman ekleme / silme (`mk`, `delModel`, doğrudan `M.els` değişikliğinden sonra `afterChange`) ve ilişki uçlarının değişmesi `bump()` ile REV'i artırır. `relIdx()` dizileri ve `relBy` haritaları paylaşılır, **yerinde değiştirilmemelidir** (sıralamadan önce `slice()`).
