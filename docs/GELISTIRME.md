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
```

Her kanca kendi `try/catch`'i içinde çalışır; hata `appErr()` ile günlüğe yazılır, diğer kancalar çalışmaya devam eder.

## Test

- `node tests/regression.js` — tarayıcıda uçtan uca regresyon (Playwright).
- `node tests/unit.js` — motorların birim testleri (tarayıcısız).
