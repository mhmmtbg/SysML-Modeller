//go:build windows

// SysML Modelleyici — kurulumsuz, tek dosyalık Windows uygulaması.
// Arayüz, Windows'ta yerleşik gelen WebView2 (Edge) motoruyla gösterilir;
// tarayıcı açılmaz, internet gerekmez, yönetici yetkisi gerekmez.
package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf16"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
)

//go:embed app.html
var appHTML []byte

var (
	comdlg32         = windows.NewLazySystemDLL("comdlg32.dll")
	pGetSaveFileName = comdlg32.NewProc("GetSaveFileNameW")
	pGetOpenFileName = comdlg32.NewProc("GetOpenFileNameW")
	user32           = windows.NewLazySystemDLL("user32.dll")
	pMessageBox      = user32.NewProc("MessageBoxW")
)

type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	Flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	FlagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x2
	ofnNoChangeDir     = 0x8
	ofnPathMustExist   = 0x800
	ofnFileMustExist   = 0x1000
	ofnExplorer        = 0x80000
)

// "Açıklama|*.ext|Açıklama2|*.a;*.b" -> UTF-16 çift NUL sonlu filtre
func filterUTF16(f string) *uint16 {
	if f == "" {
		f = "Tüm dosyalar (*.*)|*.*"
	}
	r := []rune(strings.ReplaceAll(f, "|", "\x00") + "\x00\x00")
	u := utf16.Encode(r)
	return &u[0]
}

func strPtr(s string) *uint16 {
	if s == "" {
		return nil
	}
	p, _ := windows.UTF16PtrFromString(s)
	return p
}

func fileDialog(owner uintptr, save bool, defName, filter, defExt string) string {
	buf := make([]uint16, 4096)
	if defName != "" {
		copy(buf, utf16.Encode([]rune(defName)))
	}
	dir := ""
	if st := loadState(); st.LastDir != "" {
		dir = st.LastDir
	} else if h, err := os.UserHomeDir(); err == nil {
		dir = filepath.Join(h, "Documents")
	}
	ofn := openFileName{
		hwndOwner:       owner,
		lpstrFilter:     filterUTF16(filter),
		nFilterIndex:    1,
		lpstrFile:       &buf[0],
		nMaxFile:        uint32(len(buf)),
		lpstrInitialDir: strPtr(dir),
		lpstrDefExt:     strPtr(defExt),
		Flags:           ofnExplorer | ofnNoChangeDir | ofnPathMustExist,
	}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	var r uintptr
	if save {
		ofn.Flags |= ofnOverwritePrompt
		r, _, _ = pGetSaveFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.Flags |= ofnFileMustExist
		r, _, _ = pGetOpenFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	runtime.KeepAlive(buf)
	if r == 0 {
		return ""
	}
	p := windows.UTF16ToString(buf)
	st := loadState()
	st.LastDir = filepath.Dir(p)
	saveState(st)
	return p
}

func msgBox(text, title string) {
	pMessageBox.Call(0, uintptr(unsafe.Pointer(strPtr(text))), uintptr(unsafe.Pointer(strPtr(title))), 0x10)
}

// ---- kalıcı durum (%LOCALAPPDATA%\SysMLModelleyici) ----
type state struct {
	LastPath string `json:"lastPath"`
	LastDir  string `json:"lastDir"`
	Dirty    bool   `json:"dirty"`
}

func appDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	d := filepath.Join(base, "SysMLModelleyici")
	os.MkdirAll(d, 0o755)
	return d
}

func loadState() state {
	var s state
	if b, err := os.ReadFile(filepath.Join(appDir(), "state.json")); err == nil {
		json.Unmarshal(b, &s)
	}
	return s
}

func saveState(s state) {
	b, _ := json.Marshal(s)
	os.WriteFile(filepath.Join(appDir(), "state.json"), b, 0o644)
}

func writeAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return os.WriteFile(path, data, 0o644)
	}
	return nil
}

func defExtOf(filter string) string {
	parts := strings.Split(filter, "|")
	if len(parts) >= 2 {
		e := strings.TrimPrefix(strings.Split(parts[1], ";")[0], "*.")
		if e != "*" {
			return e
		}
	}
	return ""
}

func main() {
	runtime.LockOSThread()

	// Uygulamayı yalnızca bu bilgisayardan erişilebilen yerel bir adresten sun
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		msgBox("Yerel sunucu başlatılamadı: "+err.Error(), "SysML Modelleyici")
		return
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(appHTML)
	})
	go http.Serve(ln, mux)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(appDir(), "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title:  "SysML Modelleyici",
			Width:  1440,
			Height: 900,
			Center: true,
			IconId: 1,
		},
	})
	if w == nil {
		msgBox("Microsoft Edge WebView2 bileşeni bu bilgisayarda bulunamadı.\n\n"+
			"Windows 10/11'de normalde yüklü gelir. Bulunamıyorsa uygulamanın HTML sürümünü (sysml-modeler.html) Edge veya Chrome ile açarak aynı şekilde kullanabilirsiniz.",
			"SysML Modelleyici")
		return
	}
	defer w.Destroy()
	hwnd := uintptr(w.Window())

	// Başlangıç bilgisi: komut satırı dosyası (exe üzerine sürüklenen dosya) ve otomatik kayıt
	w.Bind("nativeInfo", func() map[string]interface{} {
		res := map[string]interface{}{}
		if len(os.Args) > 1 {
			if b, err := os.ReadFile(os.Args[1]); err == nil {
				abs, _ := filepath.Abs(os.Args[1])
				res["argPath"] = abs
				res["argText"] = string(b)
			}
		}
		if b, err := os.ReadFile(filepath.Join(appDir(), "autosave.sysml")); err == nil {
			res["autosave"] = string(b)
			st := loadState()
			res["lastPath"] = st.LastPath
			res["dirty"] = st.Dirty
		}
		return res
	})
	w.Bind("nativeAutosave", func(data, path string, dirty bool) error {
		st := loadState()
		st.LastPath = path
		st.Dirty = dirty
		saveState(st)
		return writeAtomic(filepath.Join(appDir(), "autosave.sysml"), []byte(data))
	})
	w.Bind("nativeWrite", func(path, data string) error {
		return writeAtomic(path, []byte(data))
	})
	// Ağ klasöründe ekip çalışması: dosya okuma ve basit kilit dosyası (<dosya>.lock)
	myLocks := map[string]bool{}
	w.Bind("nativeRead", func(path string) map[string]interface{} {
		res := map[string]interface{}{}
		b, err := os.ReadFile(path)
		if err != nil {
			res["error"] = err.Error()
			return res
		}
		res["text"] = string(b)
		if st, err := os.Stat(path); err == nil {
			res["mtime"] = st.ModTime().UTC().Format(time.RFC3339)
		}
		return res
	})
	w.Bind("nativeWho", func() map[string]string {
		h, _ := os.Hostname()
		return map[string]string{"user": os.Getenv("USERNAME"), "host": h}
	})
	w.Bind("nativeLockGet", func(path string) map[string]interface{} {
		b, err := os.ReadFile(path + ".lock")
		if err != nil {
			return nil
		}
		res := map[string]interface{}{}
		if json.Unmarshal(b, &res) != nil {
			res["user"] = "?"
		}
		if st, err := os.Stat(path + ".lock"); err == nil {
			res["mtime"] = st.ModTime().UTC().Format(time.RFC3339)
		}
		return res
	})
	w.Bind("nativeLockSet", func(path, user, note string) error {
		h, _ := os.Hostname()
		js, _ := json.Marshal(map[string]string{"user": user, "winUser": os.Getenv("USERNAME"), "host": h, "time": time.Now().UTC().Format(time.RFC3339), "note": note})
		if err := os.WriteFile(path+".lock", js, 0644); err != nil {
			return err
		}
		myLocks[path] = true
		return nil
	})
	w.Bind("nativeLockClear", func(path string) error {
		delete(myLocks, path)
		err := os.Remove(path + ".lock")
		if os.IsNotExist(err) {
			return nil
		}
		return err
	})
	defer func() {
		for p := range myLocks {
			os.Remove(p + ".lock")
		}
	}()
	w.Bind("nativeSetTitle", func(t string) {
		w.Dispatch(func() { w.SetTitle(t) })
	})
	// Dosya diyaloğu: olay işleyicisi içinde değil, ana döngüde açılır; sonuç window.__ncb ile döner
	w.Bind("nativeDialog", func(id int, kind, name, filter, data string, isB64 bool) {
		w.Dispatch(func() {
			res := map[string]interface{}{}
			if kind == "open" {
				p := fileDialog(hwnd, false, "", filter, "")
				if p != "" {
					if b, err := os.ReadFile(p); err != nil {
						res["error"] = err.Error()
					} else {
						res["path"] = p
						if isB64 {
							res["b64"] = base64.StdEncoding.EncodeToString(b)
						} else {
							res["text"] = string(b)
						}
					}
				}
			} else {
				p := fileDialog(hwnd, true, name, filter, defExtOf(filter))
				if p != "" {
					var b []byte
					var err error
					if isB64 {
						b, err = base64.StdEncoding.DecodeString(data)
					} else {
						b = []byte(data)
					}
					if err == nil {
						err = writeAtomic(p, b)
					}
					if err != nil {
						res["error"] = err.Error()
					} else {
						res["path"] = p
					}
				}
			}
			js, _ := json.Marshal(res)
			w.Eval("window.__ncb(" + jsonInt(id) + "," + string(js) + ")")
		})
	})

	w.Navigate("http://" + ln.Addr().String() + "/")
	w.Run()
}

func jsonInt(i int) string { b, _ := json.Marshal(i); return string(b) }
