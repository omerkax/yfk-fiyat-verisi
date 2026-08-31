# YFK Resmi Aylik Fiyat Verisi Fetcher Tasarimi

## Amaç

Yüksek Fen Kurulu'nun resmi aylık güncel rayiç ve birim fiyat
sayfasından ayları ve gerçek belge bağlantılarını dinamik olarak bulan,
belgeleri indiren, makine tarafından okunabilir en iyi kaynaktan ayrıştıran
ve doğrulanmış fiyat satırlarını dosya olarak üreten bir TypeScript CLI
oluşturmak.

Bu teslim veritabanı, kullanıcı arayüzü, admin alanı, zamanlanmış görev veya
fiyat analizi içermez.

## Doğrulanmış Kaynak Davranışı

- Başlangıç adresi `https://yfk.csb.gov.tr/aylik-guncel-rayic-ve-birim-fiyat-listeleri-113351`.
- Ana sayfa her yıl için ay hücrelerini içerir. Bir hücre doğrudan bir belgeye
  veya ayın ayrıntı duyuru sayfasına bağlanabilir.
- Ayrıntı duyurusu, şu altı kaynak kategorisinin bağlantılarını içerir:
  inşaat rayiç, mekanik rayiç, elektrik rayiç, inşaat birim fiyat, mekanik
  birim fiyat ve elektrik birim fiyat.
- Ağustos 2026 örneğinde bu altı belge PDF'dir. İnşaat rayiç ve inşaat birim
  fiyat PDF'leri metin tabanlıdır; poz no, tanım, birim ve güncel fiyat
  çıkarılabilir.

## Kapsam

### Dahil

- Resmi ana sayfadan yıl ve ay keşfi.
- Ay ayrıntı sayfalarındaki gerçek belge bağlantılarının, link metninden
  kategoriyle birlikte keşfi.
- Aynı kategori için birden çok alternatif varsa `XLSX > CSV > HTML > PDF`
  sıralamasıyla seçim.
- XLSX, CSV, HTML tablo ve metin tabanlı PDF ayrıştırıcıları.
- PDF için sayfa koordinatlarından satır kurma; OCR veya tahmin yapılmaz.
- Kod, resmi ad, birim, fiyat, kategori, ay, yıl ve kaynak URL'sini içeren
  tüm ayrıştırılmış satırların JSON ve CSV çıktısı.
- Gerçek resmi kodlarla oluşturulan, ilk etapta 30-50 kalemlik sürümlenebilir
  izleme kataloğu.
- Katalog eşleştirmesi yalnızca tam resmi kod üzerinden yapılır. Kod bulunamaz,
  tekrar ederse veya satır geçersizse eşleşme kaydı oluşmaz; açıklamalı
  `unmatched` çıktısına yazılır.
- Kaynak URL, indirilen içerik SHA-256 özeti, belge türü ve çekim zamanı ile
  denetlenebilir import manifesti.
- Komut satırından `--year`, `--month` ve `--output-dir` seçenekleri.

### Hariç

- PostgreSQL veya başka bir veritabanı.
- Next.js ekranları, dashboard, admin, kimlik doğrulama ve cron.
- Herhangi bir fiyat karşılaştırması, değişim yüzdesi, tahmin, AI, maliyet
  hesabı veya ERP özelliği.
- Resmi belgede bulunmayan veriyi türetme ya da tahmin ederek eşleştirme.
- Görüntü tabanlı veya şifreli PDF için OCR.

## Mimari

CLI, `YfkSourceClient` ile HTML belgelerini indirir. `MonthlyPageDiscoverer`
ana sayfadaki dönem bağlantılarını keşfeder; doğrudan belge bağlantısını ya da
ay duyuru sayfasını `MonthlyDocumentDiscoverer` aracılığıyla standart
`SourceDocument` nesnelerine dönüştürür. Bir belge seçici aynı kategori için
en yüksek nitelikli formatı tercih eder.

`DocumentParser` arayüzü her dosya türünü `OfficialPriceRow[]` çıktısına
dönüştürür. Ortak doğrulama kodu, poz kodunu, birimi ve Türkçe para alanını
kontrol eder. `TrackedItemCatalog` yalnızca gerçek poz kodlarından oluşur;
`Matcher` bu kodları ayrıştırılan satırlarla bire bir bağlar. `OutputWriter`
üç çıktı oluşturur: ayrıştırılmış tüm satırlar, eşleşen izleme satırları ve
eşleşmeyen kalem raporu.

## Veri Sözleşmeleri

```ts
type SourceCategory =
  | "construction-rayic"
  | "mechanical-rayic"
  | "electrical-rayic"
  | "construction-unit-price"
  | "mechanical-unit-price"
  | "electrical-unit-price";

type SourceFormat = "xlsx" | "csv" | "html" | "pdf";

interface SourceDocument {
  year: number;
  month: number;
  category: SourceCategory;
  sourceUrl: string;
  format: SourceFormat;
  discoveredFromUrl: string;
}

interface OfficialPriceRow {
  officialCode: string;
  officialName: string;
  unit: string;
  priceTry: number;
  year: number;
  month: number;
  category: SourceCategory;
  sourceUrl: string;
}

interface TrackedItem {
  id: string;
  displayName: string;
  category: string;
  officialCode: string;
  officialName: string;
  unit: string;
  sourceCategory: SourceCategory;
}
```

## Çıktılar

`output/imports/<YYYY>-<MM>/` altında:

- `manifest.json`: seçilen belgeler, URL'ler, SHA-256, format ve çekim zamanı.
- `official-price-rows.json`: doğrulanmış tüm resmi satırlar.
- `official-price-rows.csv`: aynı satırların tablo sürümü.
- `tracked-prices.json`: katalogdaki ve kaynakta bulunan kalemler.
- `unmatched-tracked-items.json`: bulunamayan veya doğrulanamayan kalemler ve
  nedenleri.

Üretilen çıktılar çalışma verisidir ve kaynak koda dahil edilmez.

## Hata İlkeleri

- Ana sayfa ya da ay bulunamazsa komut sıfır olmayan kodla sonlanır.
- Bir kategori için belge yoksa manifestte `missing-source` ile belirtilir;
  diğer kategoriler işlenmeye devam eder.
- HTTP, içerik türü, checksum, ayrıştırma veya satır doğrulama hataları belge
  ve satır bağlamıyla kaydedilir.
- Belirsiz eşleşme ya da geçersiz parasal değer fiyat olarak yazılmaz.
- Kullanıcıya ait herhangi bir veri veya gizli anahtar çıktılara yazılmaz.

## Doğrulama

- Birim testleri format sıralamasını, ay ve belge keşfini, Türkçe para
  dönüşümünü, PDF metin satırı ayrıştırmasını, kod tabanlı eşleşmeyi ve CSV
  yazımını kapsar.
- Entegrasyon testi, kaydedilmiş HTML/PDF metin fixture'larıyla Ağustos 2026
  belge yapısını temsil eder.
- Canlı smoke testi Ağustos 2026 resmi sayfasını tarar, gerçek belgeleri
  indirir ve en az bir geçerli poz/fiyat satırı üretildiğini doğrular.

## Sonraki Aşama

Veritabanı eklendiğinde bu CLI'nin `tracked-prices.json` ve manifest veri
sözleşmeleri import tablosuna bağlanır; fetcher'ın keşif ve ayrıştırma
mantığı yeniden yazılmaz.
