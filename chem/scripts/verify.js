const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { resolvePublicPath } = require("../server");
const { readContent, renderPreviewData, outputPath } = require("./build-data");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readPublic(file) {
  return fs.readFileSync(path.join(publicDir, file), "utf8");
}

function readAppSource() {
  return ["js/core.js", "js/network.js", "js/learn.js", "js/quiz.js", "js/paper.js", "js/practice.js", "js/daily.js", "js/library.js", "js/app.js"]
    .map((file) => readPublic(file))
    .join("\n");
}

function verifyFiles() {
  [
    "index.html",
    "styles.css",
    "preview-data.js",
    "js/core.js",
    "js/network.js",
    "js/learn.js",
    "js/quiz.js",
    "js/paper.js",
    "js/practice.js",
    "js/daily.js",
    "js/library.js",
    "js/app.js"
  ].forEach((file) => {
    assert(fs.existsSync(path.join(publicDir, file)), `Missing public/${file}`);
  });
  assert(fs.existsSync(path.join(root, "data", "content.json")), "Missing data/content.json");
  [
    "assets/chem-knowledge-network.png",
    "assets/experiment-gas-setup.svg",
    "assets/inference-network.svg",
    "assets/process-flow.svg"
  ].forEach((file) => {
    assert(fs.existsSync(path.join(publicDir, file)), `Missing public/${file}`);
  });
}

function verifyData() {
  const content = readContent();
  const expected = renderPreviewData(content);
  const actual = fs.readFileSync(outputPath, "utf8");
  assert(actual === expected, "public/preview-data.js is not generated from data/content.json");
  const code = actual;
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${code}; this.DATA = DATA;`, context);
  const data = context.DATA;
  assert(data && Array.isArray(data.questions), "DATA.questions must exist");
  assert(data.questions.length >= 1600, "Question bank should contain at least 1600 questions");
  const ids = new Set();
  const stems = new Map();
  const requiredTypes = ["single_choice", "true_false", "fill_blank", "short_answer", "calculation", "experiment", "process", "inference"];
  const typeCounts = {};
  data.questions.forEach((question) => {
    assert(question.id, "question missing id");
    assert(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);
    const normalizedStem = String(question.stem || "")
      .replace(/\s+/g, "")
      .replace(/[，。！？；：、,.!?;:]/g, "")
      .toLowerCase();
    assert(!stems.has(normalizedStem), `duplicate question stem ${question.id} duplicates ${stems.get(normalizedStem)}`);
    stems.set(normalizedStem, question.id);
    ["moduleId", "stem", "difficulty", "questionType", "topic", "sourceType", "reviewStatus"].forEach((field) => {
      assert(question[field] !== undefined && question[field] !== "", `question ${question.id} missing ${field}`);
    });
    const type = question.questionType;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (Array.isArray(question.options) && question.options.length) {
      assert(Number.isInteger(question.answer), `objective question ${question.id} missing numeric answer`);
      assert(question.answer >= 0 && question.answer < question.options.length, `objective question ${question.id} answer out of range`);
    } else {
      assert(question.answerText, `subjective question ${question.id} missing answerText`);
    }
  });
  requiredTypes.forEach((type) => {
    assert((typeCounts[type] || 0) >= 80, `question type ${type} should contain at least 80 questions`);
  });
  assert(Array.isArray(data.edges) && data.edges.length >= 30, "Knowledge graph edges are incomplete");
  assert(Array.isArray(data.courseModules) && data.courseModules.length >= 10, "Course modules are incomplete");
}

function verifySourceManifest() {
  const manifestPath = path.join(root, "data", "exam-source-manifest.json");
  assert(fs.existsSync(manifestPath), "Missing data/exam-source-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(Array.isArray(manifest.sources), "exam-source-manifest sources must be an array");
  (manifest.sources || []).forEach((source) => {
    [
      "id",
      "exam",
      "year",
      "region",
      "paperName",
      "url",
      "sourceType",
      "copyrightStatus"
    ].forEach((field) => {
      assert(source[field] !== undefined && source[field] !== "", `source ${source.id || "(unknown)"} missing ${field}`);
    });
    assert(/^https?:\/\//.test(source.url), `source ${source.id} url must be http(s)`);
  });
}

function verifyQuestionDrafts() {
  const draftDir = path.join(root, "data", "question-drafts");
  if (!fs.existsSync(draftDir)) return;
  const summaryPath = path.join(draftDir, "summary.json");
  assert(fs.existsSync(summaryPath), "question-drafts summary.json is missing");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  assert(Array.isArray(summary.sources), "question draft summary sources must be an array");
  summary.sources.forEach((source) => {
    assert(source.sourceId, "question draft source missing sourceId");
    assert(["drafted", "split_failed", "needs_ocr"].includes(source.extractionStatus), `invalid extractionStatus for ${source.sourceId}`);
    assert(fs.existsSync(path.join(root, source.rawTextPath)), `missing raw text for ${source.sourceId}`);
    assert(fs.existsSync(path.join(root, source.draftPath)), `missing draft json for ${source.sourceId}`);
    const drafts = JSON.parse(fs.readFileSync(path.join(root, source.draftPath), "utf8"));
    drafts.forEach((draft) => {
      [
        "id",
        "sourceId",
        "examYear",
        "examRegion",
        "paperName",
        "questionNo",
        "moduleId",
        "questionType",
        "reviewStatus",
        "rawText"
      ].forEach((field) => {
        assert(draft[field] !== undefined && draft[field] !== "", `draft ${draft.id || "(unknown)"} missing ${field}`);
      });
      assert(draft.reviewStatus === "draft_extracted_needs_human_review", `draft ${draft.id} must require human review`);
    });
  });
}

function verifyExamPdfCache() {
  const manifestPath = path.join(root, "data", "exam-pdfs", "manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(Array.isArray(manifest.items), "exam PDF manifest items must be an array");
  manifest.items.forEach((item) => {
    assert(item.status === "cached", `exam PDF ${item.title || item.localPath} is not a verified cached item`);
    ["year", "paper", "title", "pageUrl", "pdfUrl", "localPath", "sha256"].forEach((field) => {
      assert(item[field] !== undefined && item[field] !== "", `exam PDF item missing ${field}`);
    });
    const localPath = path.join(root, item.localPath);
    assert(fs.existsSync(localPath), `missing cached exam PDF ${item.localPath}`);
    const header = fs.readFileSync(localPath).subarray(0, 5).toString("utf8");
    assert(header === "%PDF-", `cached exam file is not a PDF: ${item.localPath}`);
  });
}

function verifyHtmlShell() {
  const html = readPublic("index.html");
  assert(html.includes('<link rel="stylesheet" href="./styles.css" />'), "index.html must load external styles.css");
  assert(!html.includes("<style>"), "index.html should not contain inline style block");
  assert(html.includes('<script src="./preview-data.js"></script>'), "index.html must load preview data");
  [
    "./js/core.js",
    "./js/network.js",
    "./js/learn.js",
    "./js/quiz.js",
    "./js/paper.js",
    "./js/practice.js",
    "./js/daily.js",
    "./js/library.js",
    "./js/app.js"
  ].forEach((src) => {
    assert(html.includes(`<script src="${src}"></script>`), `index.html must load ${src}`);
  });
}

function verifyAssetPaths() {
  const app = readAppSource();
  assert(!app.includes("../miniprogram"), "app.js still references the source mini program");
  assert(app.includes("network-svg"), "Vector knowledge network is missing");
  const data = readPublic("preview-data.js");
  const assets = [...data.matchAll(/"src":\s*"([^"]+)"/g)].map((match) => match[1]);
  assets.forEach((src) => {
    if (/^https?:\/\//.test(src)) return;
    const local = src.startsWith("/assets/") ? src.slice(1) : src.replace(/^\/+/, "");
    assert(fs.existsSync(path.join(publicDir, local)), `Missing data asset ${src}`);
  });
}

function verifyProductFeatures() {
  const app = readAppSource();
  [
    "chem_learning_profile_v1",
    "recordAnswer",
    "toggleWrongOnly",
    "readinessSnapshot",
    "renderCommercialHealth",
    "exportProfile",
    "importProfile"
  ].forEach((needle) => {
    assert(app.includes(needle), `Missing product feature: ${needle}`);
  });
  const css = readPublic("styles.css");
  assert(css.includes(".quality-row"), "Commercial health styles are missing");
  assert(css.includes("@keyframes viewEnter"), "View transition animation is missing");
  assert(css.includes(".network-overview-panel"), "Expanded network overview layout is missing");
  assert(css.includes(".zoom-label"), "Network zoom label style is missing");
  assert(app.includes("handleNetworkWheel"), "Network wheel zoom handler is missing");
  assert(app.includes("networkOverviewFrame"), "Network overview frame id is missing");
  assert(app.includes("renderDailyPractice"), "Daily practice view is missing");
  assert(app.includes("renderStageReport"), "Stage report is missing");
  assert(app.includes("chem_daily_practice_v1"), "Daily practice storage is missing");
  assert(app.includes("renderVectorOverview"), "Vector network overview is missing");
  assert(app.includes("findNetworkPath"), "Network path finder is missing");
  assert(app.includes("setNetworkSearch"), "Network search state handler is missing");
  assert(app.includes("setNetworkFilter"), "Network filter state handler is missing");
}

function verifyModuleBoundaries() {
  const modules = {
    "js/core.js": ["const state", "function readProfile", "function recordAnswer"],
    "js/network.js": ["function renderVectorOverview", "function renderNetworkControls", "function findNetworkPath"],
    "js/learn.js": ["function renderNav", "function renderHome", "function renderNetwork", "function renderLearn"],
    "js/quiz.js": ["function filteredQuestions"],
    "js/paper.js": ["function buildWeightedPaper", "function renderPaperBuilder", "function renderGeneratedPaper"],
    "js/practice.js": ["function renderPractice", "function renderQuestionBody", "function choose"],
    "js/daily.js": ["function buildDailyPractice", "function renderDailyPractice", "function renderStageReport"],
    "js/library.js": ["function renderLibrary", "function renderCommercialHealth"],
    "js/app.js": ["function render", "render();"]
  };
  Object.keys(modules).forEach((file) => {
    const source = readPublic(file);
    modules[file].forEach((needle) => {
      assert(source.includes(needle), `${file} missing ${needle}`);
    });
  });
}

function verifyServerBoundary() {
  assert(resolvePublicPath("/") === path.join(publicDir, "index.html"), "Root should resolve to index.html");
  assert(resolvePublicPath("/../package.json") === null, "Server must block parent traversal");
}

verifyFiles();
verifyHtmlShell();
verifyData();
verifySourceManifest();
verifyQuestionDrafts();
verifyExamPdfCache();
verifyAssetPaths();
verifyProductFeatures();
verifyModuleBoundaries();
verifyServerBoundary();
execFileSync(process.execPath, [path.join(root, "scripts", "verify-browser-runtime.js")], { stdio: "inherit" });

console.log("Chem Web verification passed.");
