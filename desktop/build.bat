@echo off
REM SysML Modelleyici - Windows exe derleme betigi
REM Gereksinim: Go 1.22+ (https://go.dev/dl/) ve internet erisimi (ilk derlemede bagimliliklar indirilir)
setlocal
cd /d "%~dp0"
copy /Y "..\app\sysml-modeler.html" "app.html" >nul || goto :err
go mod tidy || goto :err
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
if not exist "..\dist" mkdir "..\dist"
go build -trimpath -ldflags "-H windowsgui -s -w" -o "..\dist\SysMLModelleyici.exe" . || goto :err
echo.
echo Tamamlandi: dist\SysMLModelleyici.exe
exit /b 0
:err
echo Derleme basarisiz.
exit /b 1
