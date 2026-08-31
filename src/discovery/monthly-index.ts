import { load } from "cheerio";
import { resolveOfficialUrl } from "../config.js";

export type MonthEntry =
  | { kind: "announcement"; url: string; year: number; month: number }
  | { kind: "document"; url: string; year: number; month: number };

const TURKISH_MONTHS: Record<string, number> = {
  ocak: 1,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  eylul: 9,
  ekim: 10,
  kasim: 11,
  aralik: 12,
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

const isDirectDocument = (url: string) => /\.(?:xlsx|csv|html?|pdf)(?:$|[?#])/i.test(url);

export function findMonthEntry(html: string, year: number, month: number): MonthEntry {
  const $ = load(html);
  const heading = $("h1, h2, h3, h4, h5, h6").filter((_, element) =>
    $(element).text().includes(String(year)),
  ).first();
  const table = tableFollowingHeading($, heading);

  if (!heading.length || !table.length) {
    throw new Error(`No official monthly table found for ${year}`);
  }

  const row = table.find("tr").filter((_, element) => {
    const label = normalize($(element).find("td, th").first().text());
    return TURKISH_MONTHS[label] === month;
  }).first();
  const href = row.find("a[href]").first().attr("href");

  if (!row.length || !href) throw new Error(`No official entry found for ${year}-${month}`);

  const url = resolveOfficialUrl(href, "https://yfk.csb.gov.tr");
  return { kind: isDirectDocument(url) ? "document" : "announcement", url, year, month };
}

function tableFollowingHeading($: ReturnType<typeof load>, heading: ReturnType<ReturnType<typeof load>>): ReturnType<ReturnType<typeof load>> {
  let sibling = heading.next();
  while (sibling.length) {
    if (sibling.is("h1, h2, h3, h4, h5, h6")) break;
    const table = sibling.is("table") ? sibling : sibling.find("table").first();
    if (table.length) return table;
    sibling = sibling.next();
  }
  return $([]);
}
