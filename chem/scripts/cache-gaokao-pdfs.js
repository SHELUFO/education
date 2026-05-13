const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "data", "exam-pdfs");
const manifestPath = path.join(outDir, "manifest.json");

const targets = [
  { year: 2023, paper: "新课标理综", title: "2023年高考新课标理综化学真题（原卷版/可用版本）", pageUrl: "https://www.tthaoke.com/shijuan_3679.html" },
  { year: 2023, paper: "全国甲卷", title: "2023年高考全国甲卷化学真题（原卷版）", pageUrl: "https://www.tthaoke.com/shijuan_3687.html" },
  { year: 2023, paper: "全国乙卷", title: "2023年高考全国乙卷化学真题（解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3686.html" },
  { year: 2022, paper: "全国甲卷", title: "2022年全国统一高考化学试卷（全国甲卷）（解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3704.html" },
  { year: 2022, paper: "全国乙卷", title: "2022年全国统一高考化学试卷（全国乙卷）（原卷版）", pageUrl: "https://tthaoke.com/shijuan_3703.html" }
  ,
  { year: 2021, paper: "新课标I卷", title: "2021年全国统一高考化学试卷（新课标Ⅰ）（原卷版）", pageUrl: "https://www.tthaoke.com/shijuan_3725.html" },
  { year: 2020, paper: "全国I卷", title: "2020年全国统一高考化学试卷（新课标Ⅰ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3794.html" },
  { year: 2020, paper: "全国II卷", title: "2020年全国统一高考化学试卷（新课标Ⅱ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3793.html" },
  { year: 2020, paper: "全国III卷", title: "2020年全国统一高考化学试卷（新课标Ⅲ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3792.html" },
  { year: 2019, paper: "全国I卷", title: "2019年全国统一高考化学试卷（新课标Ⅰ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3733.html" },
  { year: 2019, paper: "全国II卷", title: "2019年全国统一高考化学试卷（新课标Ⅱ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3732.html" },
  { year: 2019, paper: "全国III卷", title: "2019年全国统一高考化学试卷（新课标Ⅲ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3729.html" },
  { year: 2018, paper: "全国III卷", title: "2018年全国统一高考化学试卷（新课标Ⅲ）（含解析版）", pageUrl: "https://www.tthaoke.com/shijuan_3739.html" }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "")
    .slice(0, 120);
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 Chem-Web internal reference cache"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"");
}

function findPdfUrl(html) {
  const matches = [...html.matchAll(/<li\s+data-ext="pdf"\s+data-url="([^"]+\.pdf[^"]*)"[\s\S]*?<span class="na">([^<]+\.pdf)/gi)]
    .map((match) => ({ url: decodeHtml(match[1]), name: decodeHtml(match[2]).trim() }));
  if (matches.length) return matches[0];
  const hrefs = [...html.matchAll(/https?:\/\/[^"'<>]+\.pdf/gi)].map((match) => decodeHtml(match[0]));
  return hrefs[0] ? { url: hrefs[0], name: path.basename(hrefs[0]) } : null;
}

function titleMatches(target, pdfName) {
  const haystack = `${target.title} ${target.paper}`;
  const yearOk = String(pdfName).includes(String(target.year));
  const paperTokens = String(target.paper).replace(/[卷]/g, "").split(/[\/\s]+/).filter(Boolean);
  const paperOk = paperTokens.some((token) => String(pdfName).includes(token)) ||
    (target.paper.includes("I") && /Ⅰ|I|1/.test(pdfName)) ||
    (target.paper.includes("II") && /Ⅱ|II|2/.test(pdfName));
  return yearOk && (paperOk || haystack.includes("新课标"));
}

async function cacheOne(target) {
  const page = (await fetchBuffer(target.pageUrl)).toString("utf8");
  const pdfFile = findPdfUrl(page);
  if (!pdfFile) {
    return { ...target, status: "pdf_url_not_found" };
  }
  const mismatch = !titleMatches(target, pdfFile.name);
  const pdf = await fetchBuffer(pdfFile.url);
  const filename = `${target.year}-${safeName(target.paper)}-${safeName(target.title)}.pdf`;
  const localPath = path.join(outDir, filename);
  fs.writeFileSync(localPath, pdf);
  return {
    ...target,
    status: mismatch ? "cached_title_mismatch" : "cached",
    sourceSite: "tthaoke",
    pdfUrl: pdfFile.url,
    pdfName: pdfFile.name,
    localPath: path.relative(root, localPath).replace(/\\/g, "/"),
    bytes: pdf.length,
    sha256: crypto.createHash("sha256").update(pdf).digest("hex"),
    cachedAt: new Date().toISOString()
  };
}

async function main() {
  ensureDir(outDir);
  const previous = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : { description: "内部参考版近年高考化学 PDF 原卷缓存清单", items: [] };
  const byKey = new Map((previous.items || []).map((item) => [`${item.year}-${item.paper}-${item.title}`, item]));
  for (const target of targets) {
    const key = `${target.year}-${target.paper}-${target.title}`;
    try {
      const item = await cacheOne(target);
      byKey.set(key, item);
      console.log(`${item.status}: ${target.title}`);
    } catch (error) {
      byKey.set(key, { ...target, status: "download_failed", error: error.message, checkedAt: new Date().toISOString() });
      console.log(`download_failed: ${target.title} (${error.message})`);
    }
  }
  const manifest = {
    description: "内部参考版近年高考化学 PDF 原卷缓存清单；仅作本地学习与拆题草稿来源，不自动导入正式题库。",
    updatedAt: new Date().toISOString(),
    items: [...byKey.values()].sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper, "zh-CN"))
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(root, manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
