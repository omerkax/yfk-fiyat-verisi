# YFK Fiyat Verisi

Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu'nun (YFK)
aylık **rayiç ve birim fiyat** listelerini resmi kaynaktan çeker, ayrıştırır ve
bir panelde ay ay gösterir.

## Kurulum

Gerekenler: Node.js 22+, pnpm (npm de olur).

```sh
pnpm install
pnpm dev
```

Panel: **http://localhost:3000**

İlk açılışta veri yoksa sağ üstteki **"Veri Çek"** butonuna basıp bir ay indir.
İnen aylar seçicide otomatik görünür.

## Nasıl çalışır

1. Resmi aylık indeks sayfasından ilgili ayın belgeleri bulunur.
2. Altı kategori (inşaat / mekanik / elektrik — rayiç ve birim fiyat) PDF'leri
   indirilir; yalnızca `yfk.csb.gov.tr` ve `webdosya.csb.gov.tr` kabul edilir.
3. PDF'lerden fiyat satırları ayrıştırılıp doğrulanır ve
   `output/imports/YYYY-MM/` altına JSON/CSV olarak yazılır.
4. Panel bu dosyaları okuyup gösterir. "Veri Çek" butonu de aynı işi yapar.

## Panel

- **Genel Bakış** — seçili ayın toplamları ve kategori dağılımı.
- **Katalog İzleme** — takip edilen kalemlerin resmi kod eşleşmeleri.
- **KOBİ Müteahit** — hafriyat, işçilik, beton, demir, kalıp, duvar gibi temel
  gider kalemleri; ay ay.
- **m² Maliyet** — kaba + ince yapı için yaklaşık m² maliyeti; her kalemin
  metrajını değiştirince toplam anında güncellenir.
- **Aylık Fiyat Tablosu** — her poz, çekilen her ay için bir fiyat sütunu.
- **Kaynak Denetimi** — belgelerin URL ve SHA-256 özetleri.

## Komut satırı

Panel yerine terminalden de çekebilirsin:

```sh
pnpm fetch -- --year 2026 --month 8
```

Yıl/ay verilmezse İstanbul saatine göre içinde bulunulan ay kullanılır.

## Notlar

- Tüm fiyatlar **KDV hariçtir** (YFK böyle yayımlar). Birim fiyatlara %25
  müteahit karı + genel gider dahildir; rayiçler ham girdi maliyetidir.
- Veri git'e dahil değildir; herkes kendi çekebilir.

## Testler

```sh
pnpm typecheck
pnpm test
```
