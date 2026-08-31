import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

interface TextItem {
  str: string;
  transform: number[];
}

export async function pdfCells(data: Uint8Array): Promise<string[][]> {
  const standardFontDataUrl = fileURLToPath(new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url));
  const document = await pdfjs.getDocument(
    {
      data,
      disableWorker: true,
      standardFontDataUrl,
      verbosity: 0,
    } as unknown as Parameters<typeof pdfjs.getDocument>[0],
  ).promise;
  const cells: string[][] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter(isTextItem) as unknown as TextItem[];
      const lines = groupByY(items);
      cells.push(...lines.map((line) => line.sort((a, b) => a.transform[4] - b.transform[4])
        .map((item) => item.str)));
    }

    return cells;
  } finally {
    await document.destroy();
  }
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null
    && "str" in item && typeof item.str === "string"
    && "transform" in item && Array.isArray(item.transform);
}

function groupByY(items: TextItem[]): TextItem[][] {
  const lines: Array<{ y: number; items: TextItem[] }> = [];
  for (const item of [...items].sort((a, b) => b.transform[5] - a.transform[5])) {
    const y = item.transform[5];
    const line = lines.find((group) => Math.abs(group.y - y) < 2);
    if (line) line.items.push(item);
    else lines.push({ y, items: [item] });
  }
  return lines.map((line) => line.items);
}
