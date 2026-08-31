import { OFFICIAL_HOSTS } from "../src/config.js";
import { runImport } from "../src/index.js";

async function smokeLive(): Promise<void> {
  const report = await runImport({ year: 2026, month: 8, outputDir: "output/imports" });

  if (report.manifest.documents.length === 0) {
    throw new Error("Live smoke found no parsed official source document");
  }
  if (report.rows.length === 0) {
    throw new Error("Live smoke found no verified official price row");
  }

  const selectedUrls = report.manifest.documents.flatMap((document) => [
    document.sourceUrl,
    document.discoveredFromUrl,
  ]);
  const nonOfficialUrl = selectedUrls.find((url) => !OFFICIAL_HOSTS.has(new URL(url).hostname));
  if (nonOfficialUrl) throw new Error(`Live smoke selected a non-official URL: ${nonOfficialUrl}`);
  const nonOfficialRow = report.rows.find((row) => !OFFICIAL_HOSTS.has(new URL(row.sourceUrl).hostname));
  if (nonOfficialRow) throw new Error(`Live smoke parsed a non-official row: ${nonOfficialRow.sourceUrl}`);

  console.log(
    `live-smoke verified documents=${report.manifest.documents.length} `
    + `rows=${report.rows.length} artifacts=${report.artifactDirectory}`,
  );
}

smokeLive().catch((error: unknown) => {
  console.error(`Live smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
