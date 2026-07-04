# agent-os-template

Durumsuz LLM ajanlarıyla bir yazılım projesini **sıfırdan kurup yürütmek** için bir işletim
disiplini şablonu. Merkezinde, boş bir hedefi çalışan bir **ekibe + panoya** çeviren
**GENESIS (kurulum)** vardır.

## Nasıl başlanır

1. Bu klasörü **boş/yeni bir proje klasörüne kopyala** (kaynağın içine kurulum yapma —
   `.template-source` guard'ı bunu hatırlatır).
2. Kopyada `.template-source`'u **sil**.
3. O klasörün kökünde bir **Claude Code** oturumu aç ve **"selam"** yaz. `CLAUDE.md` seni
   yönlendirir; GENESIS kuruluma başlar, sana sorular sorar, ekibi + panoyu kurar.

Kurulduktan sonra günlük kullanım: `00_pano/PANO.md` + kök `NASIL_KULLANILIR.md`.

**Gerekenler:** **Claude Code** (GENESIS'i o yürütür — dosyalar tek başına tariftir, çalıştıran
zekâ Claude'dur) + kokpit panosu için **Node.js**.

## Ne var

- `GENESIS.md` — kurucu mimar promptu + sabit çalışma planı (G0–G5).
- `CLAUDE.md` — deterministik giriş yönlendirmesi ("kurulu mu?").
- `tools/kokpit/` — salt-okunur izleme panosu (tek ekrandan ışıklar · sıradaki adım · kutu
  kapıları · roller) + `PANO_SOZLESMESI.md` (format sözleşmesi) + `test/fixtures/` (minik biçim
  örneği). GENESIS makine-biçimini bunlardan alır; ayrı örnek proje yoktur.
- `00_genesis/` — GENESIS koltuğu + `GENESIS_DURUM.md` (yarım-kurulum toparlama çapası).

## Kokpit (kurulumdan sonra)

`tools/kokpit/launcher/Kokpit.command`'i Masaüstüne kopyala + çift tıkla, ya da
`cd tools/kokpit && npm start` → tarayıcıda `http://127.0.0.1:4173`. Salt-okunur, harici
bağımlılık yok (`npm install` gerekmez).
