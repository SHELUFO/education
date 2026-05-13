const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "content.json");
const outputPath = path.join(root, "public", "preview-data.js");

function readContent() {
  return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
}

function renderPreviewData(data) {
  return `const DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function writePreviewData() {
  const data = readContent();
  fs.writeFileSync(outputPath, renderPreviewData(data), "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

if (require.main === module) {
  writePreviewData();
}

module.exports = {
  readContent,
  renderPreviewData,
  writePreviewData,
  sourcePath,
  outputPath
};
