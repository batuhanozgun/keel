// hasım-inceleme — KEEL şablon sürümü (V2 Öbek-1 T1, tasarı mühürlü 2026-07-23).
// Verilen commit paketini çok-mercekli BUL → ÇÜRÜT hattından geçirir; SALT-OKUNUR.
// Soy: danışman koltuğunda 2026-07-20 provasıyla kanıtlanan sürüm; mercekler burada projeye-
// bağımsız GENELDİR (proje-özel hedef/bağlam args ile gelir, mercek metnine gömülmez).
// Tetik İNSANDADIR: bu dosyayı .claude/skills/hasim-inceleme/SKILL.md çağırır (disable-model-invocation).
// Salt-okunurluk güvencesi talimat+kanıt katmanıdır: inceleme sonrası `git status --porcelain`
// karşılaştırması SKILL adımıdır (bilinen sınır — ajan kilidi değil; Golden-09 dersi).
// Prova dersi: args kanalı bazı ortamlarda JSON-metin ulaşır → çift-biçim okuma aşağıda.
export const meta = {
  name: 'hasim-inceleme',
  description: 'Hasım inceleme ritüeli: verilen commit paketini çok-mercekli bul → çürüt hattından geçirir (salt-okunur)',
  phases: [
    { title: 'Bul', detail: 'her mercek bağımsız tarar (5 mercek)' },
    { title: 'Çürüt', detail: 'her bulguya bağımsız hasım çürütücü' },
  ],
}

const ham = (typeof args === 'string') ? JSON.parse(args) : args
const targets = (ham && ham.targets) || []
if (targets.length === 0) log('UYARI: hedef listesi boş ulaştı — inceleme anlamsızdır; SKILL adım 2 hedef paketi onaylatmalıydı')
const hedefMetni = JSON.stringify(targets, null, 1)

const ORTAK = `KEEL hasım incelemesinde SALT-OKUNUR bir incelemecisin.
İncelenecek commit paketi (repo yolu + commit + not):
${hedefMetni}
Kurallar:
- Hiçbir dosyayı DEĞİŞTİRME. Yazma yapan hiçbir komut YASAK (git add/commit/checkout/restore/stash dahil).
- Yalnız Read/Grep/Glob araçları ve salt-okunur git komutları (git -C <repo> show/log/diff) kullan.
- Önce her hedefte "git -C <repo> show <ref>" ile diff'i oku; gerekirse dosyaların güncel halini Read ile aç.
- Bulgu = bu commit'lerin GETİRDİĞİ somut kusur/risk iddiası; genel öneri ya da "keşke" listesi DEĞİL.
- En fazla 6 bulgu; en önemlileri seç. Bulgu yoksa boş liste MEŞRUDUR — doldurmak için bulgu üretme (şişme defosu).
- Her bulguda kanıt zorunlu: dosya + (varsa satır) + neden kusur olduğunun mekanik gerekçesi.`

const MERCEKLER = [
  { ad: 'dogruluk', gorev: 'Kural/karar tutarlılığı: paketin dokunduğu kural-metinleri (EL_KITABI, ROL sözleşmeleri, kanon kararları, bekçi/kanca yorum-tarifleri) kendi içinde ve dokunulmayan komşu kurallarla çelişiyor mu; «alan» disiplini bozulmuş mu; "Ders:" satırları silinmiş mi; iddia edilen davranış ile yazılan metin örtüşüyor mu.' },
  { ad: 'kabuk', gorev: 'Kabuk-script sağlamlığı (paket .sh/test dosyasına dokunuyorsa): macOS bash 3.2 uyumu (declare -A yasak) · LC_ALL/Türkçe harf birebirliği (grep -i yasağı) · nullglob/boş-glob · tırnaklama · ERR-trap sınırı (fonksiyon içi korumasız $() tuzağı) · `ls -d` tuzağı · dar PATH varsayımı. Paket kabuk dosyası içermiyorsa bunu doğrula ve boş liste dön.' },
  { ad: 'test', gorev: 'Test kapsamı ve gerçekliği: değişen her davranışın testi ya da kanıt çalıştırması var mı; yeni/değişen test, kural olmasa da geçer miydi; kanıt diye sunulan sayılar gerçek dönemden mı türetilmiş.' },
  { ad: 'gerileme', gorev: 'Gerileme riski: değişiklik komşu davranışları (diğer denetim kategorileri, kanca/tören akışı, tavan-şema-sözleşme iddiaları) değiştiriyor mu; sayısal iddiaları (boy/tavan/marj/sayaç) kendin yeniden hesaplamayı dene; yanlış-pozitif ve yanlış-negatif üretme ihtimalini ayrı ayrı tart.' },
  { ad: 'sizinti', gorev: 'Sır ve kişisel-veri sızıntısı: pakete anahtar/şifre/token, kişisel veri ya da dışarı çıkmaması gereken iç bilgi sızmış mı; dışa dönük yüzeyler (README, rapor, commit mesajı) kişisel-veri süzgecinden arınık mı.' },
]

const BULGU_SEMASI = {
  type: 'object', required: ['bulgular'],
  properties: { bulgular: { type: 'array', items: {
    type: 'object', required: ['baslik', 'dosya', 'aciklama', 'siddet', 'kanit'],
    properties: {
      baslik: { type: 'string' }, dosya: { type: 'string' }, satir: { type: 'number' },
      aciklama: { type: 'string' }, siddet: { type: 'string', enum: ['yuksek', 'orta', 'dusuk'] },
      kanit: { type: 'string' },
    } } } },
}

const HUKUM_SEMASI = {
  type: 'object', required: ['ayakta', 'gerekce'],
  properties: { ayakta: { type: 'boolean' }, gerekce: { type: 'string' } },
}

const sonuclar = await pipeline(
  MERCEKLER,
  m => agent(ORTAK + '\n\nSENİN MERCEĞİN (yalnız bu): ' + m.gorev, { label: 'bul:' + m.ad, phase: 'Bul', schema: BULGU_SEMASI }),
  (res, m) => {
    const bulgular = (res && res.bulgular) ? res.bulgular.slice(0, 6) : []
    return parallel(bulgular.map(b => () =>
      agent(ORTAK + '\n\nHasım ÇÜRÜTÜCÜSÜN. Aşağıdaki bulguyu ÇÜRÜTMEYE çalış: iddiayı kaynağında kendin doğrula (diff\'i ve dosyaları kendin oku; bulan ajanın sözüne güvenme). Bulgu ancak mekanik kanıtla ayakta kalır; emin değilsen ayakta=false.\nBULGU: ' + JSON.stringify(b) + '\n(mercek: ' + m.ad + ')',
        { label: 'curut:' + m.ad, phase: 'Çürüt', schema: HUKUM_SEMASI })
        .then(h => ({ mercek: m.ad, bulgu: b, hukum: h }))
    ))
  }
)

const duz = sonuclar.filter(Boolean).flat().filter(Boolean)
const gorulen = new Set()
const tekil = []
for (const s of duz) {
  const anahtar = s.bulgu.dosya + '|' + (s.bulgu.satir || s.bulgu.baslik)
  if (gorulen.has(anahtar)) continue
  gorulen.add(anahtar)
  tekil.push(s)
}
const ayakta = tekil.filter(s => s.hukum && s.hukum.ayakta)
const dusen = tekil.filter(s => !s.hukum || !s.hukum.ayakta)
const sira = { yuksek: 0, orta: 1, dusuk: 2 }
ayakta.sort((a, b) => (sira[a.bulgu.siddet] !== undefined ? sira[a.bulgu.siddet] : 3) - (sira[b.bulgu.siddet] !== undefined ? sira[b.bulgu.siddet] : 3))
log('Bul: ' + duz.length + ' ham bulgu -> tekil ' + tekil.length + ' | ayakta ' + ayakta.length + ' | düşen ' + dusen.length)
return {
  hamBulgu: duz.length,
  ayakta: ayakta.map(s => ({ mercek: s.mercek, siddet: s.bulgu.siddet, baslik: s.bulgu.baslik, dosya: s.bulgu.dosya, satir: s.bulgu.satir, aciklama: s.bulgu.aciklama, kanit: s.bulgu.kanit, curutucu: s.hukum.gerekce })),
  dusen: dusen.map(s => ({ mercek: s.mercek, baslik: s.bulgu.baslik, gerekce: s.hukum ? s.hukum.gerekce : 'çürütücü sonuçsuz' })),
}
