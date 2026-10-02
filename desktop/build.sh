#!/usr/bin/env sh
# SysML Modelleyici - Windows exe derleme betiği (Linux/macOS'ta çapraz derleme)
# Gereksinim: Go 1.22+ ve internet erişimi (ilk derlemede bağımlılıklar indirilir)
set -e
cd "$(dirname "$0")"
cp ../app/sysml-modeler.html app.html
go mod tidy
mkdir -p ../dist
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../dist/SysMLModelleyici.exe .
echo "Tamamlandı: dist/SysMLModelleyici.exe"
