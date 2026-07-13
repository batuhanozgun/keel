<!-- yazar: koordinator -->
# KT-002 — Faz Kutusu (AÇIK)

**Durum:** AÇIK. Faz A sevkte.

## Kapılar

### Faz A — devir (SEVKTE)
| Kapı | İş | Sahip | Durum | Kanıt |
|---|---|---|---|---|
| G-07 | Zemin devri | analiz | açık — sevkte | 02_kanon/zemin-devri.md |
| G-08 | Matris bölme | tasarim | açık — sevkte | test: matris.test.mjs |

### Faz B — doğrulama (iskelet)
| Kapı | İş | Sahip | Ön koşul |
|---|---|---|---|
| G-12 | Re-verify | tasarim | G-07 + G-08 |

## Kabul kriterleri
- Görev düzeyi: her G-NN dosyasının kabul bölümü.
