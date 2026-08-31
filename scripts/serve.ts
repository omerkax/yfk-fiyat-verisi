import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { runImport } from "../src/index.js";

const PORT = 3000;
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse path
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // API: list available import periods (YYYY-MM folders) so the dashboard
  // can populate its month selector dynamically instead of hardcoding one.
  if (url.pathname === "/api/months") {
    try {
      const importsDir = join(fileURLToPath(import.meta.url), "../..", "output", "imports");
      const entries = await readdir(importsDir, { withFileTypes: true });
      const months = entries
        .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}$/.test(entry.name))
        .map((entry) => entry.name)
        .sort()
        .reverse();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(JSON.stringify(months));
    } catch {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end("[]");
    }
    return;
  }

  // API: fetch & import a given month's official data on demand (from the UI button).
  if (url.pathname === "/api/fetch") {
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const sendJson = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(body));
    };
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      sendJson(400, { ok: false, error: "Geçersiz yıl/ay" });
      return;
    }
    try {
      const report = await runImport({ year, month, outputDir: "output/imports" });
      sendJson(200, {
        ok: true,
        period: `${year}-${String(month).padStart(2, "0")}`,
        rows: report.rows.length,
        documents: report.manifest.documents.length,
      });
    } catch (error) {
      sendJson(200, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  
  // Resolve absolute file path relative to workspace root
  const rootDir = join(fileURLToPath(import.meta.url), "../..");
  const absolutePath = join(rootDir, decodeURIComponent(filePath));

  try {
    const content = await readFile(absolutePath);
    const ext = extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    
    res.writeHead(200, {
      "Content-Type": contentType,
      // Always serve the latest file from disk; avoids stale cached pages/data.
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(content);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 Not Found: ${filePath}`);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`500 Internal Server Error: ${error.message}`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Dashboard Server running at: http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop.`);
});
