#!/usr/bin/env python3
"""SysML Modelleyici derleyici: src/ altındaki parçaları tek dosya app/sysml-modeler.html olarak birleştirir.
Kullanıcı tarafında kurulum gerekmez; bu betik yalnız geliştirme ortamında çalışır."""
import glob, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
js = ''.join(rd(os.path.relpath(p, R)) for p in sorted(glob.glob(os.path.join(R, 'src/js/*.js'))))
js = js.replace('/*I18N*//*/I18N*/', '/*I18N*/' + rd('src/i18n/dict.json') + '/*/I18N*/', 1)
import re, collections
decl = collections.Counter(re.findall(r'^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)', js, re.M))
fdecl = collections.Counter(re.findall(r'^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)', js, re.M))
dup = [k for k, v in decl.items() if v > 1] + [k for k, v in fdecl.items() if v > 1] + [k for k in decl if k in fdecl]
dup = [k for k in dup if k not in ('$', 'cur')]  # inceleme paketi şablon dizesindeki bağımsız betik (gerçek çakışma değil)
if dup:
    print('HATA: aynı adla birden fazla üst düzey tanım:', ', '.join(sorted(set(dup)))); sys.exit(2)
out = rd('src/head.html') + js + rd('src/tail.html')
dst = os.path.join(R, 'app/sysml-modeler.html')
if '--check' in sys.argv:
    same = open(dst, encoding='utf-8').read() == out
    print('aynı' if same else 'FARKLI'); sys.exit(0 if same else 1)
open(dst, 'w', encoding='utf-8').write(out)
print('app/sysml-modeler.html yazıldı:', len(out), 'karakter,', len(glob.glob(os.path.join(R, 'src/js/*.js'))), 'modül')
