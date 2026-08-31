import type { SourceCategory, TrackedItem } from "../types.js";

function tracked(
  category: string,
  officialCode: string,
  officialName: string,
  unit: string,
  sourceCategory: SourceCategory,
): TrackedItem {
  return {
    id: `${sourceCategory}-${officialCode}`,
    displayName: officialName,
    category,
    officialCode,
    officialName,
    unit,
    sourceCategory,
  };
}

export const TRACKED_ITEMS: readonly TrackedItem[] = [
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1001", "Taşcı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1002", "Karo kaplama ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1003", "Fayans kaplama ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1004", "Seramik kaplama ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1005", "Mermer kaplama ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1008", "Doğramacı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1009", "Marangoz ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1010", "Yalıtımcı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1012", "Sıvacı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1013", "Duvarcı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1015", "Betoncu ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1017", "Dülger ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-labor", "10.100.1021", "Kaynakçı ustası", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-formwork-labor", "10.100.1086", "Ahşap Kalıpçı (Betonarme)", "Sa", "construction-rayic"),
  // Verified against 2026-08 official construction rayiç source.
  tracked("construction-formwork-labor", "10.100.1087", "Tünel Kalıpçısı (Betonarme)", "Sa", "construction-rayic"),

  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-material", "15.150.1001", "Beton santralinde üretilen veya satın alınan ve beton pompasıyla basılan, C 8/10 basınç dayanım sınıfında, gri renkte, normal hazır beton dökülmesi (beton nakli dahil)", "m³", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-material", "15.160.1003", "Ø 8 - Ø 12 mm nervürlü beton çelik çubuğu, çubukların kesilmesi, bükülmesi ve yerine konulması", "Ton", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-formwork", "15.180.1001", "Ahşaptan seri kalıp yapılması", "m²", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-formwork", "15.180.1002", "Ahşaptan düz yüzeyli beton ve betonarme kalıbı yapılması", "m²", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-formwork", "15.180.1003", "Plywood ile düz yüzeyli betonarme kalıbı yapılması", "m²", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-formwork", "15.180.1004", "Sac ile eğri yüzeyli beton ve betonarme kalıbı yapılması", "m²", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-insulation", "15.200.1001", "Bodrum perdelerinde su yalıtımı ve izolasyon pimi ile uygulanmış ısı yalıtımı üzerine HDPE esaslı drenaj ve koruma levhası temini ve yerine döşenmesi", "m²", "construction-unit-price"),
  // Verified against 2026-08 official construction unit-price source.
  tracked("construction-insulation", "15.106.1112", "Çatı örtüleri altındaki su yalıtım örtüleri ve bitümlü karton sökülmesi", "m²", "construction-unit-price"),

  // Verified against 2026-08 official mechanical rayiç source.
  tracked("mechanical-fixture", "20.100.1001", "25X40 Cm Yaylı, Kancalı Veya Vidalı Lavabolar (Ts 605)", "Ad", "mechanical-rayic"),
  // Verified against 2026-08 official mechanical rayiç source.
  tracked("mechanical-fixture", "20.100.1002", "28X35 Cm Yaylı, Kancalı Veya Vidalı. / Lavabolar (Ts 605)", "Ad", "mechanical-rayic"),
  // Verified against 2026-08 official mechanical rayiç source.
  tracked("mechanical-fixture", "20.100.1003", "28X45 Cm Yaylı, Kancalı Veya Vidalı. / Lavabolar (Ts 605)", "Ad", "mechanical-rayic"),
  // Verified against 2026-08 official mechanical rayiç source.
  tracked("mechanical-fixture", "20.100.1004", "35X45 Cm Köşe Tipi Yaylı, Kancalı Veya Vidalı / Lavabolar (Ts 605)", "Ad", "mechanical-rayic"),
  // Verified against 2026-08 official mechanical rayiç source.
  tracked("mechanical-fixture", "20.100.1005", "35X45 Cm Kancalı Veya Vidalı / Lavabolar", "Ad", "mechanical-rayic"),

  // Verified against 2026-08 official mechanical unit-price source.
  tracked("mechanical-fixture", "25.100.1001", "25x40 cm vidalı", "Ad", "mechanical-unit-price"),
  // Verified against 2026-08 official mechanical unit-price source.
  tracked("mechanical-fixture", "25.100.1002", "28x35 cm vidalı.", "Ad", "mechanical-unit-price"),
  // Verified against 2026-08 official mechanical unit-price source.
  tracked("mechanical-fixture", "25.100.1003", "28x45 cm vidalı.", "Ad", "mechanical-unit-price"),
  // Verified against 2026-08 official mechanical unit-price source.
  tracked("mechanical-fixture", "25.100.1004", "35x45 cm Köşe tipi vidalı", "Ad", "mechanical-unit-price"),
  // Verified against 2026-08 official mechanical unit-price source.
  tracked("mechanical-fixture", "25.100.1005", "35x45 cm vidalı", "Ad", "mechanical-unit-price"),

  // Verified against 2026-08 official electrical rayiç source.
  tracked("electrical-panel", "30.100.1101", "En ölçüsü en az 400 mm olan galvanizli dikili tip sac pano / Derinlik en az 400 mm / Dikili Tip Galvaniz Sac Panolar (1. Pano)", "Ad", "electrical-rayic"),
  // Verified against 2026-08 official electrical rayiç source.
  tracked("electrical-panel", "30.100.1102", "En ölçüsü en az 500 mm olan galvanizli dikili tip sac pano / Derinlik en az 400 mm / Dikili Tip Galvaniz Sac Panolar (1. Pano)", "Ad", "electrical-rayic"),
  // Verified against 2026-08 official electrical rayiç source.
  tracked("electrical-panel", "30.100.1103", "En ölçüsü en az 600 mm olan galvanizli dikili tip sac pano / Derinlik en az 400 mm / Dikili Tip Galvaniz Sac Panolar (1. Pano)", "Ad", "electrical-rayic"),
  // Verified against 2026-08 official electrical rayiç source.
  tracked("electrical-panel", "30.100.1104", "En ölçüsü en az 700 mm olan galvanizli dikili tip sac pano / Derinlik en az 400 mm / Dikili Tip Galvaniz Sac Panolar (1. Pano)", "Ad", "electrical-rayic"),
  // Verified against 2026-08 official electrical rayiç source.
  tracked("electrical-panel", "30.100.1105", "En ölçüsü en az 800 mm olan galvanizli dikili tip sac pano / Derinlik en az 400 mm / Dikili Tip Galvaniz Sac Panolar (1. Pano)", "Ad", "electrical-rayic"),

  // Verified against 2026-08 official electrical unit-price source.
  tracked("electrical-panel", "35.100.1101", "En ölçüsü en az 400 mm olan galvanizli dikili tip sac pano.", "Ad", "electrical-unit-price"),
  // Verified against 2026-08 official electrical unit-price source.
  tracked("electrical-panel", "35.100.1102", "En ölçüsü en az 500 mm olan galvanizli dikili tip sac pano.", "Ad", "electrical-unit-price"),
  // Verified against 2026-08 official electrical unit-price source.
  tracked("electrical-panel", "35.100.1103", "En ölçüsü en az 600 mm olan galvanizli dikili tip sac pano.", "Ad", "electrical-unit-price"),
  // Verified against 2026-08 official electrical unit-price source.
  tracked("electrical-panel", "35.100.1104", "En ölçüsü en az 700 mm olan galvanizli dikili tip sac pano.", "Ad", "electrical-unit-price"),
  // Verified against 2026-08 official electrical unit-price source.
  tracked("electrical-panel", "35.100.1105", "En ölçüsü en az 800 mm olan galvanizli dikili tip sac pano.", "Ad", "electrical-unit-price"),
];
