#!/usr/bin/env python3
"""SysML Modelleyici derleyici: src/ altındaki parçaları tek dosya app/sysml-modeler.html olarak birleştirir.
Kullanıcı tarafında kurulum gerekmez; bu betik yalnız geliştirme ortamında çalışır."""
import glob, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
js = ''.join(rd(os.path.relpath(p, R)) for p in sorted(glob.glob(os.path.join(R, 'src/js/*.js'))))
js = js.replace('/*I18N*//*/I18N*/', '/*I18N*/' + rd('src/i18n/dict.json') + '/*/I18N*/', 1)
out = rd('src/head.html') + js + rd('src/tail.html')
dst = os.path.join(R, 'app/sysml-modeler.html')
if '--check' in sys.argv:
    same = open(dst, encoding='utf-8').read() == out
    print('aynı' if same else 'FARKLI'); sys.exit(0 if same else 1)
open(dst, 'w', encoding='utf-8').write(out)
print('app/sysml-modeler.html yazıldı:', len(out), 'karakter,', len(glob.glob(os.path.join(R, 'src/js/*.js'))), 'modül')
