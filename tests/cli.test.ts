import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli, runImport } from "../src/index.js";

const cleanup: string[] = [];

const indexHtml = (href: string, month = "Ağustos") => `
  <h2>2026</h2>
  <table><tr><td>${month}</td><td><a href="${href}">İndir</a></td></tr></table>
`;

const announcementHtml = `
  <a href="https://webdosya.csb.gov.tr/files/2026/08/insaat-rayicleri.csv">
    İnşaat Rayiçleri
  </a>
`;

const dependencies = (source: string, logs: string[] = []) => ({
  fetchText: async (url: string) => url.includes("aylik-guncel") ? indexHtml(
    "https://yfk.csb.gov.tr/duyuru?donem=2026-08",
  ) : announcementHtml,
  fetchBytes: async () => new TextEncoder().encode(source),
  now: () => new Date("2026-08-31T10:00:00.000Z"),
  log: (message: string) => logs.push(message),
});

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => fs.rm(path, { recursive: true, force: true })));
});

describe("CLI orchestration", () => {
  it("rejects a month outside 1 through 12", async () => {
    await expect(runCli(["--year", "2026", "--month", "13"])).rejects.toThrow(
      "month must be between 1 and 12",
    );
  });

  it("returns a report only after at least one verified official row", async () => {
    const outputBase = await fs.mkdtemp(join(tmpdir(), "yfk-empty-import-"));
    cleanup.push(outputBase);

    await expect(runImport(
      { year: 2026, month: 8, outputDir: outputBase },
      dependencies("code,name,unit,price\nnot-a-code,Example,Sa,1"),
    )).rejects.toThrow("No verified official price rows");
    await expect(fs.stat(join(outputBase, "2026-08"))).rejects.toThrow();
  });

  it("writes under the requested base/month directory and summarizes each category", async () => {
    const outputBase = await fs.mkdtemp(join(tmpdir(), "yfk-cli-import-"));
    cleanup.push(outputBase);
    const logs: string[] = [];

    const report = await runImport(
      { year: 2026, month: 8, outputDir: outputBase },
      dependencies('code,name,unit,price\n10.100.1001,Taşcı ustası,Sa,"354,41"', logs),
    );

    expect(report.artifactDirectory).toBe(join(outputBase, "2026-08"));
    await expect(fs.readFile(join(report.artifactDirectory, "manifest.json"), "utf8"))
      .resolves.toContain("insaat-rayicleri.csv");
    expect(logs).toContainEqual(expect.stringMatching(
      /construction-rayic.*selected=.*insaat-rayicleri\.csv.*parsed=1.*matched=1.*unmatched=/,
    ));
    expect(logs.at(-1)).toBe(`artifacts=${report.artifactDirectory}`);
  });

  it("downloads and manifests a direct combined month document only once", async () => {
    const outputBase = await fs.mkdtemp(join(tmpdir(), "yfk-combined-import-"));
    cleanup.push(outputBase);
    let downloads = 0;
    const directUrl = "https://webdosya.csb.gov.tr/files/2026/01/1-BF-ocak-2026.pdf";

    const report = await runImport(
      { year: 2026, month: 1, outputDir: outputBase },
      {
        fetchText: async () => indexHtml(directUrl, "Ocak"),
        fetchBytes: async () => {
          downloads += 1;
          return new TextEncoder().encode("one official combined document");
        },
        parseDocument: async (document) => [{
          officialCode: "10.100.1001",
          officialName: "Taşcı ustası",
          unit: "Sa",
          priceTry: 354.41,
          year: document.year,
          month: document.month,
          category: "construction-rayic",
          sourceUrl: document.sourceUrl,
        }],
        now: () => new Date("2026-01-31T10:00:00.000Z"),
        log: () => undefined,
      },
    );

    expect(downloads).toBe(1);
    expect(report.manifest.documents).toHaveLength(1);
    expect(report.manifest.documents[0]).toMatchObject({
      category: "combined",
      sourceUrl: directUrl,
    });
  });
});
