// Extracts 장 list (PDF bookmarks) and the 3쪽 목차 link areas into src/book.json.
import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdf = new URL("../../data_book/공유 및 제출용.pdf", import.meta.url);
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdf)), verbosity: 0 }).promise;
const pageOf = async (dest) => {
  const d = typeof dest === "string" ? await doc.getDestination(dest) : dest;
  return (await doc.getPageIndex(d[0])) + 1;
};

const chapters = [];
for (const o of await doc.getOutline()) chapters.push({ title: o.title, page: await pageOf(o.dest) });

const tocLinks = {};
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const [, , w, h] = page.view;
  const links = [];
  for (const a of await page.getAnnotations()) {
    if (a.subtype !== "Link" || !a.dest) continue;
    const [x1, y1, x2, y2] = a.rect;
    const pct = (v, t) => +((v / t) * 100).toFixed(2);
    links.push({ to: await pageOf(a.dest), left: pct(x1, w), top: pct(h - y2, h), width: pct(x2 - x1, w), height: pct(y2 - y1, h) });
  }
  if (links.length) tocLinks[n] = links;
}

const book = { title: "2026년 경북 데이터 인사이트 연구회 자료집", pageCount: doc.numPages, chapters, links: tocLinks };
fs.writeFileSync(new URL("../src/book.json", import.meta.url), JSON.stringify(book, null, 2) + "\n");
console.log(`${doc.numPages}쪽, ${chapters.length}장, 링크 있는 쪽: ${Object.keys(tocLinks).join(",")}`);
